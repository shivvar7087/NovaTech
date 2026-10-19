import os
try:
    from dotenv import load_dotenv
    load_dotenv()
    parent_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    if os.path.exists(parent_env):
        load_dotenv(parent_env)
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.data_loader import data_loader

app = FastAPI(
    title="Campus Resource Intelligence Assistant API",
    description="Backend API powered by Python, Pandas, and Gemma 4 for campus electricity intelligence.",
    version="1.0.0"
)

# Enable CORS for frontend development
cors_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [orig.strip() for orig in cors_env.split(",") if orig.strip()] if cors_env else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    success = data_loader.load_default()
    summary = data_loader.get_summary()
    print("=" * 60)
    print("🚀 Campus Resource Intelligence Assistant API Started")
    print(f"📊 Dataset Loaded: {summary.filename} ({summary.total_records} rows)")
    print(f"🏢 Buildings: {', '.join(summary.buildings)}")
    print("=" * 60)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

if os.path.exists(frontend_dist) and os.path.exists(os.path.join(frontend_dist, "index.html")):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path == "openapi.json":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "app": "Campus Resource Intelligence Assistant",
            "version": "1.0.0",
            "docs_url": "/docs",
            "health_check": "/api/health"
        }

