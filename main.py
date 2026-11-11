import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.database import Base, engine
from app.routes import router as api_router

# Ensure tables and enum types are created
with engine.connect() as conn:
    conn.execute(text("""
        DO $$ BEGIN
            CREATE TYPE card_status_enum AS ENUM ('pending', 'approved', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
            CREATE TYPE card_type_enum AS ENUM ('flashcard', 'mcq', 'fill_blank');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    conn.commit()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Living Study Guide API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Mount frontend build static files if present
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "Living Study Guide API is running. Build frontend to view the UI."}
