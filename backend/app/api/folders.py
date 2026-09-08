import os
import uuid
import io
import re
import json
import base64
import logging
from typing import List, Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Body
from sqlalchemy.orm import Session
from app.database.db import get_db, FolderModel, ProductModel
from app.models.schema import (
    FolderCreate, FolderUpdate, FolderResponse, FolderDetailResponse,
    ProductResponse, ClientIndexedProduct
)
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
    clean_name = payload.name.strip()
    existing = db.query(FolderModel).filter(FolderModel.name.ilike(clean_name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Folder with name '{payload.name}' already exists."
        )

    folder_id = str(uuid.uuid4())
    folder = FolderModel(
        id=folder_id,
        name=clean_name
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

@router.post("/upload-indexed", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def upload_preindexed_folder(
    folder_name: str = Body(..., embed=True),
    items: List[ClientIndexedProduct] = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    High-speed pre-indexed folder uploader.
    Receives client-side generated CLIP embeddings and lightweight base64/data thumbnails directly.
    Zero PyTorch inference on Render!
    """
    clean_folder_name = folder_name.strip()
    if not clean_folder_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder name cannot be empty")

    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No items provided in folder upload")

    # Find or create folder
    folder = db.query(FolderModel).filter(FolderModel.id == clean_folder_name).first()
    if not folder:
        folder = db.query(FolderModel).filter(FolderModel.name.ilike(clean_folder_name)).first()
    if not folder:
        folder_id = str(uuid.uuid4())
        folder = FolderModel(id=folder_id, name=clean_folder_name)
        db.add(folder)
        db.commit()
        db.refresh(folder)

    ensure_storage_dirs()

    product_batch = []
    for item in items:
        product_id = str(uuid.uuid4())
        image_url = ""
        thumbnail_url = ""

        if item.thumbnail_base64:
            if item.thumbnail_base64.startswith("data:"):
                thumbnail_url = item.thumbnail_base64
            else:
                thumbnail_url = f"data:{item.mime_type or 'image/jpeg'};base64,{item.thumbnail_base64}"

            try:
                raw_b64 = item.thumbnail_base64
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",")[1]
                img_data = base64.b64decode(raw_b64)
                
                thumb_filename = f"{product_id}_thumb.jpg"
                thumb_path = os.path.join(STORAGE_DIR, "thumbnails", thumb_filename)
                with open(thumb_path, "wb") as f:
                    f.write(img_data)
                
                orig_filename = f"{product_id}.jpg"
                orig_path = os.path.join(STORAGE_DIR, "original", orig_filename)
                with open(orig_path, "wb") as f:
                    f.write(img_data)

                image_url = f"/uploads/original/{orig_filename}"
            except Exception as ex:
                logger.warning(f"Failed to decode thumbnail for {item.name}: {ex}")

        product = ProductModel(
            id=product_id,
            folder_id=folder.id,
            name=item.name,
            image_url=image_url or "/uploads/placeholder.jpg",
            thumbnail_url=thumbnail_url or image_url,
            sha256_hash=item.sha256_hash,
            phash=item.phash,
            width=item.width,
            height=item.height,
            file_size=item.file_size,
            mime_type=item.mime_type or "image/jpeg"
        )
        product.set_vector(item.embedding)
        product_batch.append(product)

    db.add_all(product_batch)
    db.commit()

    total_prods = db.query(ProductModel).filter(ProductModel.folder_id == folder.id).count()
    logger.info(f"[FolderLens] Uploaded pre-indexed folder '{folder.name}': {len(items)} items saved. Total in folder: {total_prods}")

    return FolderResponse(
        id=folder.id,
        name=folder.name,
        product_count=total_prods,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )

@router.post("/upload", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def upload_folder_from_pc(
    folder_name: str = Form(...),
    images: List[UploadFile] = File(...),
    embeddings: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Bulk folder uploader with client embeddings or server hashing.
    Saves images and thumbnails without loading PyTorch or Transformers in Render memory.
    """
    clean_folder_name = folder_name.strip()
    if not clean_folder_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder name cannot be empty")

    if not images:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No images provided in folder upload")

    folder = db.query(FolderModel).filter(FolderModel.name.ilike(clean_folder_name)).first()
    if not folder:
        folder_id = str(uuid.uuid4())
        folder = FolderModel(id=folder_id, name=clean_folder_name)
        db.add(folder)
        db.commit()
        db.refresh(folder)

    ensure_storage_dirs()

    # Parse embeddings if sent as JSON map: { [filename]: [512 floats] }
    embeddings_map = {}
    if embeddings:
        try:
            embeddings_map = json.loads(embeddings)
        except Exception:
            pass

    product_batch = []
    for img_file in images:
        filename = img_file.filename or "image.jpg"
        content = await img_file.read()
        if not content:
            continue

        try:
            pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        except Exception:
            continue

        product_id = str(uuid.uuid4())

        orig_filename = f"{product_id}.jpg"
        orig_path = os.path.join(STORAGE_DIR, "original", orig_filename)
        pil_img.save(orig_path, format="JPEG", quality=85)

        thumb_img = pil_img.copy()
        thumb_img.thumbnail((250, 250))
        thumb_filename = f"{product_id}_thumb.jpg"
        thumb_path = os.path.join(STORAGE_DIR, "thumbnails", thumb_filename)
        thumb_img.save(thumb_path, format="JPEG", quality=80)

        image_url = f"/uploads/original/{orig_filename}"
        thumbnail_url = f"/uploads/thumbnails/{thumb_filename}"

        prod_name = format_product_name_from_filename(filename)
        sha256_val = compute_sha256(content)
        phash_val = compute_dhash(pil_img)

        vec = embeddings_map.get(filename) or [0.0] * 512

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
            mime_type=img_file.content_type or "image/jpeg"
        )
        product.set_vector(vec)
        product_batch.append(product)

    if product_batch:
        db.add_all(product_batch)
        db.commit()

    total_prods = db.query(ProductModel).filter(ProductModel.folder_id == folder.id).count()
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
            sha256_hash=p.sha256_hash,
            phash=p.phash,
            width=p.width,
            height=p.height,
            file_size=p.file_size,
            mime_type=p.mime_type,
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
