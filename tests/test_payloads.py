"""
Integrate the ``tests/data`` mock payload suite into the pytest runner.

This test imports the payload executor and runs it end-to-end (in-process
FastAPI TestClient + the real PostgreSQL), asserting that every REST endpoint
in ``app/routes.py`` behaves as specified in REQUIREMENT.md / SPEC.md.

It is fully idempotent: the executor seeds its own data and cleans it up on
exit, so it can run alongside the rest of the suite without leaving residue.

Run with:
    uv run pytest -v
    uv run pytest -k payloads
"""
import importlib.util
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
RUNNER_PATH = DATA_DIR / "run_payloads.py"

# Load the payload runner as a module (keeps it out of the pytest package tree).
_spec = importlib.util.spec_from_file_location("lsgrunner", RUNNER_PATH)
runner = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(runner)  # type: ignore[union-attr]


def test_all_api_payloads_pass():
    """Execute every mock payload and assert 100% pass with a clean teardown."""
    exit_code = runner.run()
    assert exit_code == 0, "One or more API payload operations failed; see tests/results/ for details."
