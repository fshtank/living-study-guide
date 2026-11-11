# Living Study Guide

A private, AI-powered study application that turns personal notes into interactive flashcards and quiz questions grounded directly in user source material, featuring a strict human-in-the-loop approval workflow.

---

## Architecture & Technology Stack

- **Backend:** FastAPI (Python 3.15), SQLAlchemy ORM, Pydantic, PostgreSQL (`psycopg`), `pypdf` for note imports, OpenAI API for grounded card generation.
- **Frontend:** React 19 Single Page Application with TypeScript, Vite, Tailwind CSS v4, Lucide Icons, and `@tanstack/react-query`.
- **Database:** PostgreSQL running in Docker (Colima).

---

## Features

1. **Source Notes Management:** Create, edit, search, and import notes (plain text, markdown, or PDF files).
2. **AI Card Generation:** Generate flashcards, multiple-choice questions (MCQs), and fill-in-the-blank questions with configurable cognitive depth (basic recall, application-level, conceptual synthesis).
3. **Exact Source Grounding:** Every card strictly cites and validates the exact verbatim excerpt/sentence from the user's note.
4. **Human-in-the-Loop Review:** Dedicated pending queue where AI cards are displayed side-by-side with their source sentence. Cards can be approved, rejected, edited, or regenerated before entering the library.
5. **Approved Study Library:** Searchable, filterable persistent library with interactive card flipping and soft-deletion/activation controls.
6. **Interactive Quiz Mode:** Self-testing studio supporting flashcards, MCQs, and fill-in-the-blank questions with automated scoring and historical progress tracking.

---

## Running Locally

### 1. Database Setup
Ensure PostgreSQL is running (e.g. in Docker/Colima). Create the database if needed:
```sh
docker exec postgres psql -U postgres -c "CREATE DATABASE living_study_guide;"
```

### 2. Backend Setup
Synchronize dependencies and run the FastAPI server:
```sh
uv sync
uv run uvicorn main:app --reload --port 8000
```

### 3. Frontend Development / Build
For live development with Hot Module Replacement:
```sh
cd frontend
npm install
npm run dev
```
For production asset compilation (served directly by FastAPI):
```sh
cd frontend
npm run build
```

---

## Running Automated Tests

Run backend integration and endpoint test suites with `pytest`:
```sh
uv run pytest
```
