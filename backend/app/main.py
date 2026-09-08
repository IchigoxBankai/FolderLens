import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.db import init_db
from app.api import folders, products, search, auth, intelligence

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("product_finder.main")

START_TIME = time.time()
STORAGE_DIR = os.getenv("STORAGE_DIR", "./uploads")
os.makedirs(os.path.join(STORAGE_DIR, "original"), exist_ok=True)
os.makedirs(os.path.join(STORAGE_DIR, "thumbnails"), exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FolderLens lightweight backend database...")
    init_db()
    logger.info("Backend service startup complete. Server ready on port.")
    yield
    logger.info("Shutting down FolderLens backend service.")

app = FastAPI(
    title="FolderLens Lightweight Vector API",
    version="2.1.0",
    description="Ultra-lightweight backend for visual product similarity search, vector indexing, and folder management",
    lifespan=lifespan
)

# Enable CORS for Admin Web App and Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded static media
app.mount("/uploads", StaticFiles(directory=STORAGE_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(products.router)
app.include_router(search.router)
app.include_router(intelligence.router)

@app.get("/")
def root():
    """Root endpoint for health checks & Render verification"""
    return {
        "status": "online",
        "service": "FolderLens Lightweight Vector API",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Ultra-lightweight health check endpoint for Render monitoring"""
    return {
        "status": "healthy",
        "service": "FolderLens Vector Backend",
        "version": "2.1.0"
    }

@app.get("/api/system/memory")
def system_memory():
    """Diagnostic endpoint to inspect memory usage on Render"""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        rss_mb = round(mem_info.rss / (1024 * 1024), 2)
        vms_mb = round(mem_info.vms / (1024 * 1024), 2)
        mem_percent = round(process.memory_percent(), 2)
        cpu_percent = round(process.cpu_percent(interval=0.1), 2)
    except Exception:
        rss_mb = -1.0
        vms_mb = -1.0
        mem_percent = -1.0
        cpu_percent = -1.0

    return {
        "status": "ok",
        "memory_rss_mb": rss_mb,
        "memory_vms_mb": vms_mb,
        "memory_percent": mem_percent,
        "cpu_percent": cpu_percent,
        "uptime_seconds": round(time.time() - START_TIME, 1)
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
