#!/usr/bin/env python3
"""
Living Study Guide — mock payload executor.

Reads the executable manifest in this folder (``payloads.json``), seeds its own
source data, and then executes EVERY REST endpoint declared in ``app/routes.py``
using the mock payloads. It validates each response and writes a machine-readable
report to ``tests/results/run_<timestamp>.json`` plus a console summary.

Two execution backends are supported:

    * in-process (default): a FastAPI ``TestClient`` against the real app + real
      PostgreSQL. No running server required — great for CI.
    * live server:         set ``LSG_BASE_URL`` (e.g. ``http://127.0.0.1:8000``)
      and every operation is sent as a real HTTP request over the wire.

    uv run python tests/data/run_payloads.py            # in-process
    LSG_BASE_URL=http://127.0.0.1:8000 uv run python tests/data/run_payloads.py

The runner is idempotent: it creates a single tagged "PayloadSuite" note and its
derived cards, and deletes all of them (including the seeded note) on exit, so it
can be run repeatedly without polluting the library.

Exit code is non-zero if any assertion fails.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
# Ensure the project root (which contains main.py / the `app` package) is importable
# whether the script is launched directly or under pytest.
sys.path.insert(0, str(HERE.parent.parent))

MANIFEST_PATH = HERE / "payloads.json"
RESULTS_DIR = HERE.parent / "results"


# --------------------------------------------------------------------------- #
# Token resolution helpers
# --------------------------------------------------------------------------- #
def _as_uuid(value: Any) -> Any:
    """Coerce a value (str token or UUID) to a UUID for DB filtering; non-UUIDs pass through."""
    import uuid

    if isinstance(value, str):
        try:
            return uuid.UUID(value)
        except (ValueError, TypeError):
            return value
    return value


def resolve(value: Any, ctx: dict[str, Any]) -> Any:
    """Recursively replace ``$key`` / ``$seed.key`` / ``$seed.0.id`` tokens.
    Context keys are stored without the leading '$' (e.g. 'seed.note_id')."""
    if isinstance(value, str):
        token = value.strip()
        if token.startswith("$"):
            key = token[1:]
            if key in ctx:
                return ctx[key]
            return value
        return value
    if isinstance(value, dict):
        return {k: resolve(v, ctx) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve(v, ctx) for v in value]
    return value


def get_path(obj: Any, dotted: str) -> Any:
    """Navigate a dotted path that mixes dict keys and list indices, e.g. '0.id' or 'response.0.id'."""
    current = obj
    for part in dotted.split("."):
        if isinstance(current, list):
            current = current[int(part)]
        elif isinstance(current, dict):
            current = current[part]
        else:
            raise KeyError(f"cannot index into {type(current).__name__} with '{part}'")
    return current


# --------------------------------------------------------------------------- #
# Request backends
# --------------------------------------------------------------------------- #
class InProcessClient:
    def __init__(self, app: Any) -> None:
        from fastapi.testclient import TestClient
        self.client = TestClient(app)
        self.base_url = "in-process"
        self.is_live = False

    def request(self, method: str, path: str, query: dict | None,
                json_body: Any, multipart: dict | None) -> tuple[int, Any]:
        c = self.client
        params = None
        if query:
            params = {k: v for k, v in query.items() if v is not None}
        if multipart is not None:
            import io
            files = {}
            data = {}
            for field, spec in multipart.items():
                if isinstance(spec, dict):
                    raw = spec.get("content", "")
                    raw_bytes = raw.encode() if isinstance(raw, str) else raw
                    # httpx/Starlette TestClient accepts (filename, bytes, content_type) tuples
                    files[field] = (
                        spec.get("filename", "upload"),
                        io.BytesIO(raw_bytes),
                        spec.get("content_type", "text/plain"),
                    )
                else:
                    data[field] = spec
            resp = c.request(method, path, params=params, data=data or None,
                             files=files or None)
        elif json_body is not None:
            resp = c.request(method, path, params=params, json=json_body)
        else:
            resp = c.request(method, path, params=params)
        return resp.status_code, resp.json()


class LiveClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.is_live = True

    def request(self, method: str, path: str, query: dict | None,
                json_body: Any, multipart: dict | None) -> tuple[int, Any]:
        url = f"{self.base_url}{path}"
        if query:
            params = {k: v for k, v in query.items() if v is not None}
            url = f"{url}?{urllib.parse.urlencode(params)}"

        if multipart is not None:
            data, boundary = _encode_multipart(multipart)
            req = urllib.request.Request(url, data=data, method=method)
            req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
            body = urllib.request.urlopen(req)
            raw = body.read()
            return 200, json.loads(raw or b"{}")
        else:
            body_bytes = json.dumps(json_body).encode() if json_body is not None else None
            req = urllib.request.Request(url, data=body_bytes, method=method)
            if json_body is not None:
                req.add_header("Content-Type", "application/json")
            try:
                resp = urllib.request.urlopen(req)
                raw = resp.read()
                return resp.status, json.loads(raw or b"{}")
            except urllib.error.HTTPError as e:
                raw = e.read()
                return e.code, json.loads(raw or b"{}")


def _encode_multipart(multipart: dict) -> tuple[bytes, str]:
    boundary = "----lsgrunner" + datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    lines: list[bytes] = []
    for field, spec in multipart.items():
        if isinstance(spec, dict):
            filename = spec.get("filename", "upload")
            ctype = spec.get("content_type", "text/plain")
            content = spec.get("content", "")
            lines.append(f"--{boundary}".encode())
            lines.append(
                f'Content-Disposition: form-data; name="{field}"; filename="{filename}"'.encode()
            )
            lines.append(f"Content-Type: {ctype}".encode())
            lines.append(b"")
            lines.append(content.encode() if isinstance(content, str) else content)
        else:
            lines.append(f"--{boundary}".encode())
            lines.append(f'Content-Disposition: form-data; name="{field}"'.encode())
            lines.append(b"")
            val = spec if isinstance(spec, str) else json.dumps(spec)
            lines.append(val.encode())
    lines.append(f"--{boundary}--".encode())
    body = b"\r\n".join(lines)
    return body, boundary


# --------------------------------------------------------------------------- #
# Assertion helpers
# --------------------------------------------------------------------------- #
def assert_expect(actual: Any, expected: Any, path_label: str = "$") -> list[str]:
    """Compare actual against expected (supports literal match and ``{"$gte": n}``/``{"$in": [...]}`` operators).
    Returns a list of failure messages (empty = pass)."""
    failures: list[str] = []
    if isinstance(expected, dict):
        for k, sub in expected.items():
            if k == "$gte":
                if not (isinstance(actual, (int, float)) and actual >= sub):
                    failures.append(f"{path_label}: expected >= {sub}, got {actual!r}")
            elif k == "$in":
                if actual not in sub:
                    failures.append(f"{path_label}: expected one of {sub}, got {actual!r}")
            else:
                val = actual.get(k) if isinstance(actual, dict) else None
                failures += assert_expect(val, sub, f"{path_label}.{k}")
    else:
        if actual != expected:
            failures.append(f"{path_label}: expected {expected!r}, got {actual!r}")
    return failures


# --------------------------------------------------------------------------- #
# Execution
# --------------------------------------------------------------------------- #
def run() -> int:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    ctx: dict[str, Any] = {}

    # Select backend
    base_url = os.environ.get("LSG_BASE_URL")
    if base_url:
        client = LiveClient(base_url)
        backend = f"live HTTP ({base_url})"
    else:
        from main import app
        client = InProcessClient(app)
        backend = "in-process TestClient"

    results: list[dict] = []
    total = 0
    passed = 0

    def do(op: dict, group: str) -> None:
        nonlocal total, passed
        total += 1
        method = op["method"]
        path = op["path"]
        query = op.get("query")
        json_body = op.get("body")
        multipart = op.get("multipart")

        path = resolve(path, ctx)["path"] if isinstance(path, dict) else path
        # path_params substitution
        if op.get("path_params"):
            for k, v in op["path_params"].items():
                path = path.replace("{" + k + "}", str(resolve(v, ctx)))

        q = resolve(query, ctx) if query else None
        jb = resolve(json_body, ctx) if json_body else None
        mp = resolve(multipart, ctx) if multipart else None

        # Build the exact request payload (what a developer would send)
        request_payload = {"method": method, "url": (f"{client.base_url}{path}" if client.is_live else path)}
        if q:
            request_payload["query"] = q
        if jb is not None:
            request_payload["json_body"] = jb
        if mp is not None:
            request_payload["multipart"] = mp

        status, resp = client.request(method, path, q, jb, mp)
        fail: list[str] = []

        # status assertion
        if "expect_status" in op and status != op["expect_status"]:
            fail.append(f"status expected {op['expect_status']}, got {status}")
        # array minimum
        if "expect_array_min" in op and isinstance(resp, list) and len(resp) < op["expect_array_min"]:
            fail.append(f"array length {len(resp)} < min {op['expect_array_min']}")
        # field assertions (expect is NOT token-resolved: its operator keys like $gte/$in must stay literal)
        if "expect" in op:
            fail += assert_expect(resp, op["expect"])
        # collect tokens for downstream steps
        if "collect" in op:
            for key, dotted in op["collect"].items():
                if dotted == "$__RESP__":
                    ctx[f"seed.{key}"] = resp
                elif "." in dotted:
                    ctx[f"seed.{key}"] = get_path(resp, dotted)
                else:
                    ctx[f"seed.{key}"] = resp.get(dotted) if isinstance(resp, dict) else resp

        ok = not fail
        passed += 1 if ok else 0
        results.append({
            "group": group,
            "label": op.get("label", op.get("id", "")),
            "endpoint": f"{method} {path}",
            "status": status,
            "ok": ok,
            "failures": fail,
            "request": request_payload,
            "response": resp,
        })
        tag = "PASS" if ok else "FAIL"
        print(f"[{tag}] {method:5} {path:45} -> {status}  {op.get('label','')}")
        for msg in fail:
            print(f"        - {msg}")

    print(f"\n=== Seeding ===  backend: {backend}\n")
    for step in manifest.get("seed", {}).get("steps", []):
        do(step, "seed")

    print("\n=== Operations (endpoint coverage) ===\n")
    for op in manifest.get("operations", []):
        do(op, "operation")

    # ---- Cleanup (idempotent, best-effort) ----
    cleanup: list[dict] = []
    try:
        from app.database import SessionLocal
        from app.models import Note
        db = SessionLocal()
        note_ids = [v for k, v in ctx.items() if k.endswith("note_id") and not isinstance(v, (list, dict))]
        existing = db.query(Note).filter(Note.id.in_([_as_uuid(i) for i in note_ids])).all()
        for n in existing:
            db.delete(n)  # 'all, delete-orphan' cascade removes the note's flashcards
        db.commit()
        db.close()
        cleanup.append({"removed_note_ids": [str(i) for i in note_ids],
                        "note": "Seeded note rows deleted; SQLAlchemy 'all, delete-orphan' cascade removes their flashcards"})
        print(f"\n=== Cleanup ===  removed {len(existing)} seeded note row(s) + cascaded cards")
    except Exception as e:  # noqa: BLE001
        cleanup.append({"error": f"{type(e).__name__}: {e}"})
        print(f"\n=== Cleanup ===  WARNING: {e}")

    # ---- Report ----
    RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    report_path = RESULTS_DIR / f"run_{ts}.json"
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "backend": backend,
        "manifest": str(MANIFEST_PATH.name),
        "summary": {"total": total, "passed": passed, "failed": total - passed},
        "results": results,
        "collected_tokens": ctx,
        "cleanup": cleanup,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n=== Summary ===  {passed}/{total} passed, {total - passed} failed")
    print(f"    report -> {report_path}")
    print(f"    tokens -> {', '.join(sorted(ctx))}")
    return 0 if total - passed == 0 else 1


if __name__ == "__main__":
    sys.exit(run())
