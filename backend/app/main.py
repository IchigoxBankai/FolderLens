import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.db import init_db
from app.api import folders, products, search, auth, intelligence
from app.embeddings.clip_engine import get_clip_model

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("product_finder.main")

STORAGE_DIR = os.getenv("STORAGE_DIR", "./uploads")
os.makedirs(os.path.join(STORAGE_DIR, "original"), exist_ok=True)
os.makedirs(os.path.join(STORAGE_DIR, "thumbnails"), exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FolderLens backend database...")
    init_db()
    logger.info("Backend service startup complete. Server ready on port 8000.")
    yield
    logger.info("Shutting down FolderLens backend service.")

app = FastAPI(
    title="FolderLens AI Visual Matching API",
    version="2.0.0",
    description="Backend API for visual product similarity search, multi-signal fingerprint matching, and folder management",
    lifespan=lifespan
)

# Enable CORS for Admin Web App and Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local Chrome Extension and Web App
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

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Product Finder Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
