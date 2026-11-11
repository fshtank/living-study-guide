# Technology to be used in this project

## Platform and tools

- Python 3.15
- FastAPI
- PostgreSQL
- Docker
- Git
- `uv` for Python dependency management and virtual-environment synchronization
- Node.js (LTS) & `npm` for frontend package management and build tooling
- React with Vite for the frontend Single-Page Application (SPA)

## Frontend packages (React)

The frontend user interface is structured as a client application (e.g., in a `frontend/` directory) that communicates with the FastAPI backend REST API (`/api/*`). The frontend dependencies are managed via `package.json`.

| Package | Dependency type | Use in this project |
|---------|-----------------|---------------------|
| `react`, `react-dom` | Runtime | Core React library and DOM rendering for UI components. |
| `vite`, `@vitejs/plugin-react` | Development | High-performance frontend build tool and local dev server with Hot Module Replacement (HMR). |
| `typescript`, `@types/react`, `@types/react-dom` | Development | Type safety and autocompletion across API contracts and UI models. |
| `tailwindcss`, `@tailwindcss/vite` (or PostCSS) | Development | Utility-first CSS framework for clean, distraction-free study and card layouts. |
| `lucide-react` | Runtime | Lightweight icons for card statuses (pending, approved, rejected), quiz navigation, and actions. |
| `clsx`, `tailwind-merge` | Runtime | Utility helpers for conditional and dynamic styling of card states and quiz feedback. |
| `@tanstack/react-query` *(recommended)* | Runtime | Manage server state, caching, and mutations for notes, pending card approvals, and library search. |
| `react-router-dom` *(optional)* | Runtime | Client-side routing between main views (Notes, Pending Review, Library, Quiz Mode); alternatively, simple tab/view state can be used. |

### Frontend setup and development workflow

Initialize and install the React SPA in a `frontend/` directory:

```sh
# Create Vite React app (TypeScript template recommended)
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install

# Add UI and utility packages
npm install lucide-react clsx tailwind-merge @tanstack/react-query
npm install -D tailwindcss @tailwindcss/vite
```

For development and production builds:

```sh
# Start Vite development server (proxied to FastAPI backend)
npm run dev

# Build production assets (emitted to frontend/dist to be served by FastAPI or CDN)
npm run build
```

## Python packages

The project manifest, `pyproject.toml`, is the source of truth for Python dependencies, and `uv.lock` records their resolved versions. The current manifest declares `fastapi` and `uvicorn`; the packages below should be added to that manifest as the corresponding features are built. Adding dependencies with `uv add` updates the manifest and lockfile, and `uv sync` installs the declared dependencies into the project `.venv` (creating it if needed).

| Package | Dependency type | Use in this project |
|---------|-----------------|---------------------|
| `fastapi`, `uvicorn` | Runtime (already declared) | API framework and ASGI server. |
| `sqlalchemy`, `psycopg[binary]`, `alembic` | Runtime | PostgreSQL models and driver, and database schema migrations. |
| `openai` or `anthropic` | Runtime; choose one | Call the selected hosted LLM to generate flashcards and quiz questions. |
| `pypdf` | Optional runtime | Extract text from PDF uploads; no PDF parser is needed for plain text or Markdown notes. |
| `pytest`, `httpx`, `ruff` | Development | Test application logic and FastAPI endpoints, and lint/format Python code. |

Add the core runtime packages and development tools with `uv`:

```sh
uv add sqlalchemy 'psycopg[binary]' alembic
uv add --dev pytest httpx ruff
```

Choose and add only the LLM provider used by the application:

```sh
uv add openai
# Or, instead:
uv add anthropic
```

If PDF upload support is included, add its parser separately:

```sh
uv add pypdf
```

After changing dependencies, run `uv sync` to synchronize `.venv` from the manifest and lockfile. For a fresh build-out, run `uv sync` after checking out the project; use `uv run` for project commands so they run in the managed environment.

FastAPI already depends on Pydantic for request and response validation, so it does not need to be added separately unless application code imports it directly as a declared dependency. PostgreSQL full-text search can support the searchable library without another package. Validate generated source references against the original note text in application logic, and enforce owner-based access checks on every user-owned record; a package alone does not guarantee either requirement. Before adding packages, verify Python 3.15 and deployment compatibility; if a package cannot resolve or install for the project's Python version, resolve that compatibility before proceeding with the build-out.
