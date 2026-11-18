The **12-Factor Methodology** is a set of best practices for building modern, scalable Software-as-a-Service (SaaS) applications. Originally published in 2011 by Adam Wiggins and Heroku engineers, it provides a framework for building apps that are portable across deployment platforms, resilient to failures, and easy to scale.

While the methodology is language-agnostic, Python developers have specific tools and patterns to implement these principles effectively. Here’s how each factor applies specifically to Python:

###### 1. Codebase
**One codebase tracked in version control, many deploys.**

In Python, this means your entire application lives in a single repository (Git). Whether you deploy to Heroku, AWS ECS, or Kubernetes, the same commit hash produces the artifact.

*   **Python Practice:** Use a monorepo structure for microservices if they share core libraries, but keep each service's *deployable unit* tied to one codebase. Avoid copying code between projects; use private PyPI indexes or Git dependencies instead.
*   **Tooling:** `git`, `setuptools`/`pyproject.toml` for packaging.

### 2. Dependencies
**Explicitly declare and isolate dependencies.**

Never rely on system-installed packages or implicit imports. Every dependency must be pinned and isolated from the host OS.

*   **Python Practice:** Use virtual environments (`venv`) and lock files. Never install packages globally with `pip install`.
*   **Tooling:**
    *   `pyproject.toml`: The modern standard for declaring dependencies.
    *   `uv` or `Poetry`: For deterministic dependency resolution and locking (`uv.lock` or `poetry.lock`).
    *   `pip-tools`: If you prefer staying closer to vanilla pip.
*   **Key Rule:** Your `Dockerfile` should create a fresh venv and install *only* what’s in your lock file. No `apt-get install python3-requests`.

### 3. Config
**Store config in the environment.**

Configuration that varies between deployments (dev, staging, prod) must never be hardcoded. In Python, this is critical because hardcoded secrets are a top security risk.

*   **Python Practice:** Read config from `os.environ`. Never commit `.env` files to version control.
*   **Tooling:**
    *   `python-dotenv`: For local development convenience (loads `.env` into `os.environ`).
    *   `pydantic-settings`: The gold standard for typed, validated configuration. It reads from env vars and validates types automatically.
    ```python
    # settings.py
    from pydantic_settings import BaseSettings

    class Settings(BaseSettings):
        database_url: str
        redis_host: str = "localhost"
        debug: bool = False

        class Config:
            env_file = ".env"  # Only for local dev

    settings = Settings()
    ```

### 4. Backing Services
**Treat backing services as attached resources.**

Databases, caches, queues, and APIs are all "attached resources." The app shouldn't care if it's talking to a local Postgres or a managed RDS instance—only the connection string changes.

*   **Python Practice:** Use connection strings passed via env vars. Libraries like SQLAlchemy, Redis-py, and Boto3 all accept connection URIs.
*   **Anti-Pattern:** Hardcoding `host="localhost"` or `port=5432` in your code.
*   **Best Practice:** Abstract service clients behind interfaces so you can swap implementations (e.g., swap Redis for Memcached) without changing business logic.

### 5. Build, Release, Run
**Strictly separate build and run stages.**

The **Build** stage compiles assets and installs deps. The **Release** stage combines the build with config. The **Run** stage executes the app. Each release has an immutable ID.

*   **Python Practice:**
    *   **Build:** `docker build` creates an image with all dependencies installed. This image is immutable.
    *   **Release:** CI/CD tags the image with a unique version (e.g., `myapp:v1.2.3-abc123`) and injects config.
    *   **Run:** `docker run` or Kubernetes pod starts the container.
*   **Key Rule:** Never modify code or install packages at runtime. If you need to migrate the DB, do it as a separate "release" step, not inside the running app.

### 6. Processes
**Execute the app as one or more stateless processes.**

Any data that needs to persist must go to a backing service. Local disk storage is ephemeral and lost on restart. Session data must go to Redis or a database.

*   **Python Practice:**
    *   **Sessions:** Use `Flask-Session` with Redis backend, or `django-redis-sessions`. Never use server-side session storage in memory.
    *   **File Uploads:** Stream directly to S3/GCS/Azure Blob. Never save to `/tmp` expecting persistence.
    *   **Caching:** Use external caches (Redis/Memcached), not `functools.lru_cache` for shared state across multiple instances.

### 7. Port Binding
**Export services via port binding.**

The app is self-contained and listens on a port. It doesn't rely on Apache/Nginx to route traffic internally.

*   **Python Practice:** Your WSGI/ASGI server binds to a port specified by `$PORT`.
    ```python
    # main.py (FastAPI example)
    import os
    import uvicorn
    from fastapi import FastAPI

    app = FastAPI()

    @app.get("/")
    def read_root():
        return {"Hello": "World"}

    if __name__ == "__main__":
        port = int(os.environ.get("PORT", 8000))
        uvicorn.run(app, host="0.0.0.0", port=port)
    ```
*   **Production:** Use `gunicorn` or `uvicorn` with `--bind 0.0.0.0:$PORT`.

### 8. Concurrency
**Scale out via the process model.**

Scale by adding more processes, not by adding threads within a single process. Python's GIL makes CPU-bound threading ineffective, so multi-process scaling is natural.

*   **Python Practice:**
    *   **Web Apps:** Use `gunicorn --workers 4` or `uvicorn --workers 4`. Each worker is a separate OS process.
    *   **Background Jobs:** Use Celery, RQ, or Dramatiq with multiple workers. Scale workers independently from web dynos.
    *   **Async I/O:** Use `asyncio`/`FastAPI`/`aiohttp` for high-concurrency I/O-bound tasks within a single process, but still scale horizontally for resilience.

### 9. Disposability
**Maximize robustness with fast startup and graceful shutdown.**

Processes can be killed at any time. Apps must start quickly and shut down gracefully, finishing in-flight requests before exiting.

*   **Python Practice:**
    *   **Fast Startup:** Pre-compile bytecode, avoid heavy initialization at import time. Lazy-load expensive modules.
    *   **Graceful Shutdown:** Handle `SIGTERM` signals.
    ```python
    import signal
    import sys

    def graceful_shutdown(signum, frame):
        print("Shutting down gracefully...")
        # Close DB connections, finish pending tasks
        sys.exit(0)

    signal.signal(signal.SIGTERM, graceful_shutdown)
    ```
    *   **Idempotency:** Ensure jobs can be safely retried if killed mid-execution.

### 10. Dev/Prod Parity
**Keep development, staging, and production as similar as possible.**

Minimize gaps between environments. Same OS, same Python version, same backing services.

*   **Python Practice:**
    *   **Containers:** Develop inside Docker containers identical to production.
    *   **Database:** Use the same DB engine locally (Postgres in dev, Postgres in prod). Don't use SQLite in dev and Postgres in prod.
    *   **CI/CD:** Run tests against the exact production image.
    *   **Dependency Parity:** Use the same lock file everywhere. No "works on my machine."

### 11. Logs
**Treat logs as event streams.**

Write logs to `stdout`/`stderr`. Let the execution environment collect, aggregate, and store them.

*   **Python Practice:**
    *   Configure the `logging` module to output to `sys.stdout`.
    *   Use structured JSON logging for easier parsing by log aggregators (Datadog, ELK, CloudWatch).
    ```python
    import logging
    import json
    import sys

    class JSONFormatter(logging.Formatter):
        def format(self, record):
            log_entry = {
                "timestamp": self.formatTime(record),
                "level": record.levelname,
                "message": record.getMessage(),
                "module": record.module,
            }
            return json.dumps(log_entry)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logger = logging.getLogger("myapp")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    ```
*   **Never:** Write to local log files (`/var/log/myapp.log`).

### 12. Admin Processes
**Run admin/management tasks as one-off processes.**

Database migrations, data backfills, and shell access should run in the same environment as the app, using the same codebase and config.

*   **Python Practice:**
    *   **Migrations:** Use `alembic upgrade head` or `python manage.py migrate` as a pre-deploy step in CI/CD, not inside the app container.
    *   **One-off Tasks:** `docker run myapp:v1.2.3 python scripts/backfill_users.py`
    *   **Shell Access:** `docker exec -it <container> bash` or `heroku run bash`.
*   **Key Rule:** Admin tasks inherit the same env vars, dependencies, and code as the running app. No separate "admin tool" with its own dependencies.

---

### Summary Checklist for Python Developers

| Factor | Key Python Tool/Pattern | Anti-Pattern to Avoid |
| :--- | :--- | :--- |
| **Codebase** | Single Git repo, `pyproject.toml` | Copy-pasting code between repos |
| **Dependencies** | `uv.lock` / `poetry.lock`, `venv` | Global `pip install`, system packages |
| **Config** | `pydantic-settings`, `os.environ` | Hardcoded secrets, config files in git |
| **Backing Services** | Connection URIs from env vars | Hardcoded hosts/ports |
| **Build/Release/Run** | Immutable Docker images | Installing packages at runtime |
| **Processes** | Stateless, external sessions | Storing state in memory/local disk |
| **Port Binding** | `uvicorn --bind 0.0.0.0:$PORT` | Relying on Nginx internal routing |
| **Concurrency** | Multiple gunicorn/uvicorn workers | Scaling via threads only |
| **Disposability** | SIGTERM handling, fast startup | Long startup times, no graceful shutdown |
| **Dev/Prod Parity** | Docker for dev, same DB engines | SQLite in dev, Postgres in prod |
| **Logs** | JSON logs to stdout | Writing to local log files |
| **Admin Processes** | `alembic`, one-off Docker runs | Separate admin tools with own deps |

Would you like a sample `Dockerfile` and `pyproject.toml` that implements all 12 factors for a FastAPI application?