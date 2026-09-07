import os
import uuid
import io
import re
import logging
from typing import List, Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.db import get_db, FolderModel, ProductModel
from app.models.schema import FolderCreate, FolderUpdate, FolderResponse, FolderDetailResponse, ProductResponse
from app.embeddings.clip_engine import generate_image_embedding
from app.embeddings.hash_engine import compute_sha256, compute_dhash

router = APIRouter(prefix="/api/folders", tags=["Folders"])
logger = logging.getLogger("product_finder.folders")

STORAGE_DIR = os.getenv("STORAGE_DIR", "./uploads")

def ensure_storage_dirs():
    os.makedirs(os.path.join(STORAGE_DIR, "original"), exist_ok=True)
    os.makedirs(os.path.join(STORAGE_DIR, "thumbnails"), exist_ok=True)

def format_product_name_from_filename(filename: str) -> str:
    """Formats a clean human-readable product name from filename"""
    base = os.path.basename(filename)
    name_no_ext = os.path.splitext(base)[0]
    clean_name = re.sub(r'[-_]+', ' ', name_no_ext).strip()
    return clean_name.title() if clean_name else "Product Image"

@router.get("", response_model=List[FolderResponse])
def list_folders(db: Session = Depends(get_db)):
    """List all folders with their product counts"""
    folders = db.query(FolderModel).order_by(FolderModel.name.asc()).all()
    result = []
    for f in folders:
        prod_count = db.query(ProductModel).filter(ProductModel.folder_id == f.id).count()
        result.append(
            FolderResponse(
                id=f.id,
                name=f.name,
                product_count=prod_count,
                created_at=f.created_at,
                updated_at=f.updated_at,
            )
        )
    return result

@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(payload: FolderCreate, db: Session = Depends(get_db)):
    """Create a new product folder"""
    existing = db.query(FolderModel).filter(FolderModel.name.ilike(payload.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Folder with name '{payload.name}' already exists."
        )

    folder_id = str(uuid.uuid4())
    folder = FolderModel(
        id=folder_id,
        name=payload.name.strip()
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)

    return FolderResponse(
        id=folder.id,
        name=folder.name,
        product_count=0,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )

from app.embeddings.clip_engine import generate_image_embedding, generate_image_embeddings_batch

@router.post("/upload", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def upload_folder_from_pc(
    folder_name: str = Form(...),
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    High-speed bulk folder uploader.
    Processes images in parallel PyTorch CLIP batches for up to 10x faster indexing.
    """
    clean_folder_name = folder_name.strip()
    if not clean_folder_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder name cannot be empty")

    if not images:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No images provided in folder upload")

    # Find or create folder
    folder = db.query(FolderModel).filter(FolderModel.name.ilike(clean_folder_name)).first()
    if not folder:
        folder_id = str(uuid.uuid4())
        folder = FolderModel(id=folder_id, name=clean_folder_name)
        db.add(folder)
        db.commit()
        db.refresh(folder)

    ensure_storage_dirs()
    valid_exts = (".jpg", ".jpeg", ".png", ".webp", ".jfif", ".bmp", ".gif", ".tiff", ".avif")

    # 1. Read and parse valid image files
    prepared_items = []
    for img_file in images:
        filename = img_file.filename or ""
        lower_fn = filename.lower()
        content_type = (img_file.content_type or "").lower()

        is_valid_ext = any(lower_fn.endswith(ext) for ext in valid_exts)
        is_valid_mime = content_type.startswith("image/")

        if not is_valid_ext and not is_valid_mime:
            continue

        try:
            content = await img_file.read()
            if not content:
                continue
            pil_img = Image.open(io.BytesIO(content)).convert("RGB")
            prepared_items.append({
                "filename": filename,
                "content": content,
                "pil_img": pil_img,
                "content_type": content_type or "image/jpeg"
            })
        except Exception as e:
            logger.warning(f"Skipping corrupted file {filename}: {e}")

    if not prepared_items:
        raise HTTPException(status_code=400, detail="No valid image files found in uploaded folder.")

    # 2. Batch process PyTorch CLIP embeddings in chunks of 16
    BATCH_SIZE = 16
    indexed_count = 0

    for i in range(0, len(prepared_items), BATCH_SIZE):
        chunk = prepared_items[i : i + BATCH_SIZE]
        chunk_imgs = [item["pil_img"] for item in chunk]

        # Parallel PyTorch GPU/CPU Batch Forward Pass
        chunk_vectors = generate_image_embeddings_batch(chunk_imgs)

        product_batch = []
        for idx, item in enumerate(chunk):
            product_id = str(uuid.uuid4())
            pil_img = item["pil_img"]
            content = item["content"]

            # Save original
            orig_filename = f"{product_id}.jpg"
            orig_path = os.path.join(STORAGE_DIR, "original", orig_filename)
            pil_img.save(orig_path, format="JPEG", quality=85)

            # Save thumbnail
            thumb_img = pil_img.copy()
            thumb_img.thumbnail((250, 250))
            thumb_filename = f"{product_id}_thumb.jpg"
            thumb_path = os.path.join(STORAGE_DIR, "thumbnails", thumb_filename)
            thumb_img.save(thumb_path, format="JPEG", quality=80)

            image_url = f"/uploads/original/{orig_filename}"
            thumbnail_url = f"/uploads/thumbnails/{thumb_filename}"

            prod_name = format_product_name_from_filename(item["filename"])
            sha256_val = compute_sha256(content)
            phash_val = compute_dhash(pil_img)

            product = ProductModel(
                id=product_id,
                folder_id=folder.id,
                name=prod_name,
                image_url=image_url,
                thumbnail_url=thumbnail_url,
                sha256_hash=sha256_val,
                phash=phash_val,
                width=pil_img.width,
                height=pil_img.height,
                file_size=len(content),
                mime_type=item["content_type"]
            )
            product.set_vector(chunk_vectors[idx])
            product_batch.append(product)
            indexed_count += 1

        db.add_all(product_batch)
        db.commit()

    total_prods = db.query(ProductModel).filter(ProductModel.folder_id == folder.id).count()
    logger.info(f"High-speed bulk upload completed for '{clean_folder_name}': {indexed_count} new images indexed.")

    total_prods = db.query(ProductModel).filter(ProductModel.folder_id == folder.id).count()
    logger.info(f"Bulk uploaded folder '{clean_folder_name}': {indexed_count} new images indexed (Total products: {total_prods})")

    return FolderResponse(
        id=folder.id,
        name=folder.name,
        product_count=total_prods,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )

@router.get("/{folder_id}", response_model=FolderDetailResponse)
def get_folder(folder_id: str, db: Session = Depends(get_db)):
    """Get single folder details along with its stored products"""
    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    products = db.query(ProductModel).filter(ProductModel.folder_id == folder_id).order_by(ProductModel.created_at.desc()).all()
    prod_responses = [
        ProductResponse(
            id=p.id,
            folder_id=p.folder_id,
            folder_name=folder.name,
            name=p.name,
            image_url=p.image_url,
            thumbnail_url=p.thumbnail_url or p.image_url,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in products
    ]

    return FolderDetailResponse(
        id=folder.id,
        name=folder.name,
        product_count=len(products),
        created_at=folder.created_at,
        updated_at=folder.updated_at,
        products=prod_responses
    )

@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(folder_id: str, payload: FolderUpdate, db: Session = Depends(get_db)):
    """Rename a folder"""
    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    folder.name = payload.name.strip()
    db.commit()
    db.refresh(folder)

    prod_count = db.query(ProductModel).filter(ProductModel.folder_id == folder_id).count()
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        product_count=prod_count,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(folder_id: str, db: Session = Depends(get_db)):
    """Delete a folder and all products contained within it"""
    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    db.delete(folder)
    db.commit()
    return None
