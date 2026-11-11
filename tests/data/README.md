# Mock Payload Suite — `tests/data`

Executable, self-resolving **mock payloads** that drive **every REST endpoint**
declared in `app/routes.py`, validating the Living Study Guide build against
`REQUIREMENT.md` / `SPEC.md` using the technology stack in `TECHNOLOGY.md`
(FastAPI + SQLAlchemy + PostgreSQL + OpenAI-with-heuristic-fallback).

## Contents

| File | Purpose |
|------|---------|
| `payloads.json` | The single executable manifest: a `seed` section that creates its own source data, followed by `operations` that exercise all 17 endpoints. Runtime-generated IDs are wired together via `$seed.*` tokens. |
| `run_payloads.py` | The executor. Resolves tokens, runs each request (in-process `TestClient` by default, or a live server via `LSG_BASE_URL`), asserts status + response fields, cleans up its own data, and writes a report. |
| `payloads.http` | IntelliJ IDEA / VS Code REST-client template. Same payloads with `{{...}}` UUID placeholders for manual, click-through execution. |
| `../test_payloads.py` | A pytest wrapper that runs this whole suite as part of `uv run pytest`. |
| `../results/` | Per-run JSON reports (`run_<timestamp>.json`) with every request/response and a pass/fail summary. |

## How to run

```sh
# In-process (no server needed; uses the real PostgreSQL in .env)
uv run python tests/data/run_payloads.py

# Against a live server
uv run uvicorn main:app --port 8000 &
LSG_BASE_URL=http://127.0.0.1:8000 uv run python tests/data/run_payloads.py

# As part of the automated test suite
uv run pytest -v
```

Exit code is non-zero if any operation fails.

## Endpoint coverage (17 / 17)

| # | Method + Path | Requirement | Payload op id |
|---|---------------|-------------|---------------|
| 1 | `POST /api/notes` | FR-01/02 | `POST-note-create` |
| 2 | `GET /api/notes` | FR-01/26 | `GET-notes-list-all` |
| 3 | `GET /api/notes?q=` | FR-03 | `GET-notes-search` |
| 4 | `GET /api/notes/{id}` | FR-01 | `GET-note-detail` |
| 5 | `POST /api/notes/upload` | FR-01 | `POST-note-upload-text` |
| 6 | `PUT /api/notes/{id}` | FR-04 | `PUT-note-update` |
| 7 | `DELETE /api/notes/{id}` | FR-04 | `DELETE-note` |
| 8 | `POST /api/cards/generate` | FR-05/06/07/08/10 | *seed step 2* |
| 9 | `GET /api/cards/pending` | FR-10/11 | `GET-pending-cards` |
| 10 | `PATCH /api/cards/{id}/approve` | FR-12 | `PATCH-card-approve` |
| 11 | `PATCH /api/cards/{id}/reject` | FR-13 | `PATCH-card-reject` |
| 12 | `PUT /api/cards/{id}/edit` | FR-14 | `PUT-card-edit` |
| 13 | `POST /api/cards/{id}/regenerate` | FR-15 | `POST-card-regenerate` |
| 14 | `GET /api/cards/library` | FR-18 | `GET-library-search` / `GET-library-filter-by-type` |
| 15 | `PATCH /api/cards/{id}/toggle-active` | FR-19 | `PATCH-card-toggle-active` |
| 16 | `DELETE /api/cards/{id}` | FR-20 | `DELETE-card-permanent` |
| 17 | `POST /api/quiz/session` | FR-22/23 | `POST-quiz-start` |
| 18 | `POST /api/quiz/session/{id}/complete` | FR-25 | `POST-quiz-complete` |
| 19 | `GET /api/quiz/results` | FR-25 | `GET-quiz-results` |

## Notes on grounding & determinism

With no `OPENAI_API_KEY` in `.env` (the current dev setup), the LLM service
falls back to a deterministic, **source-grounded heuristic generator**
(`app/services/llm.py::generate_mock_grounded_cards`). Every generated card's
`source_reference` is a verbatim substring of the source note, satisfying
FR-07 without a network call — which is also why the suite is fully
deterministic and offline-friendly.

## Idempotency

The executor seeds exactly the data it needs and deletes all of it (including
the seeded note, whose `cascade="all, delete-orphan"` removes its cards) on
exit. Repeated runs therefore do not accumulate residue in the library.
