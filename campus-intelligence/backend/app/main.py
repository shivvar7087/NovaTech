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

@app.get("/")
async def root():
    return {
        "app": "Campus Resource Intelligence Assistant",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }

