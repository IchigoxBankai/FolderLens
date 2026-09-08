import os
import uuid
import io
import json
import logging
from typing import List, Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from app.database.db import get_db, FolderModel, ProductModel
from app.models.schema import ProductResponse, ProductUpdate
from app.embeddings.hash_engine import compute_sha256, compute_dhash

router = APIRouter(prefix="/api/products", tags=["Products"])
logger = logging.getLogger("product_finder.products")

STORAGE_DIR = os.getenv("STORAGE_DIR", "./uploads")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

def ensure_storage_dirs():
    os.makedirs(os.path.join(STORAGE_DIR, "original"), exist_ok=True)
    os.makedirs(os.path.join(STORAGE_DIR, "thumbnails"), exist_ok=True)

@router.get("", response_model=List[ProductResponse])
def list_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """List products across all folders with pagination"""
    products = db.query(ProductModel).order_by(ProductModel.created_at.desc()).offset(skip).limit(limit).all()
    folder_map = {f.id: f.name for f in db.query(FolderModel).all()}
    res = []
    for p in products:
        res.append(
            ProductResponse(
                id=p.id,
                folder_id=p.folder_id,
                folder_name=folder_map.get(p.folder_id, "Unknown Folder"),
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
                updated_at=p.updated_at
            )
        )
    return res

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    name: str = Form(...),
    folder_id: str = Form(...),
    image: UploadFile = File(...),
    embedding: Optional[str] = Form(None),
    sha256_hash: Optional[str] = Form(None),
    phash: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Creates a product record.
    Accepts client-side generated 512-dim embedding vector, saving images and hashes with zero server AI overhead.
    """
    folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified folder does not exist")

    content_type = image.content_type.lower() if image.content_type else "image/jpeg"
    filename = image.filename.lower() if image.filename else ""
    valid_exts = (".jpg", ".jpeg", ".png", ".webp", ".jfif", ".bmp", ".gif", ".tiff", ".avif")
    if not any(filename.endswith(ext) for ext in valid_exts) and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Allowed formats: JPG, JPEG, PNG, WEBP"
        )

    ensure_storage_dirs()

    image_bytes = await image.read()

    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid or corrupted image file: {e}")

    product_id = str(uuid.uuid4())

    # Save original image
    orig_filename = f"{product_id}.jpg"
    orig_path = os.path.join(STORAGE_DIR, "original", orig_filename)
    pil_img.save(orig_path, format="JPEG", quality=90)

    # Save thumbnail (max 300x300)
    thumb_img = pil_img.copy()
    thumb_img.thumbnail((300, 300))
    thumb_filename = f"{product_id}_thumb.jpg"
    thumb_path = os.path.join(STORAGE_DIR, "thumbnails", thumb_filename)
    thumb_img.save(thumb_path, format="JPEG", quality=85)

    # Base64 thumbnail data URL for permanent cloud display
    import base64
    thumb_buffer = io.BytesIO()
    thumb_img.save(thumb_buffer, format="JPEG", quality=80)
    thumb_b64 = base64.b64encode(thumb_buffer.getvalue()).decode('utf-8')
    thumbnail_data_url = f"data:image/jpeg;base64,{thumb_b64}"

    image_url = f"/uploads/original/{orig_filename}"
    thumbnail_url = thumbnail_data_url

    # Calculate or use provided hashes
    final_sha = sha256_hash or compute_sha256(image_bytes)
    final_phash = phash or compute_dhash(pil_img)

    # Parse embedding vector
    parsed_vector = [0.0] * 512
    if embedding:
        try:
            parsed_vector = json.loads(embedding) if isinstance(embedding, str) else embedding
            if not isinstance(parsed_vector, list) or len(parsed_vector) != 512:
                parsed_vector = [0.0] * 512
        except Exception as ex:
            logger.warning(f"Could not parse embedding json: {ex}")

    product = ProductModel(
        id=product_id,
        folder_id=folder_id,
        name=name.strip(),
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        sha256_hash=final_sha,
        phash=final_phash,
        width=pil_img.width,
        height=pil_img.height,
        file_size=len(image_bytes),
        mime_type=content_type
    )
    product.set_vector(parsed_vector)

    db.add(product)
    db.commit()
    db.refresh(product)

    return ProductResponse(
        id=product.id,
        folder_id=product.folder_id,
        folder_name=folder.name,
        name=product.name,
        image_url=product.image_url,
        thumbnail_url=product.thumbnail_url,
        sha256_hash=product.sha256_hash,
        phash=product.phash,
        width=product.width,
        height=product.height,
        file_size=product.file_size,
        mime_type=product.mime_type,
        created_at=product.created_at,
        updated_at=product.updated_at
    )

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get product details by ID"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    folder = db.query(FolderModel).filter(FolderModel.id == product.folder_id).first()

    return ProductResponse(
        id=product.id,
        folder_id=product.folder_id,
        folder_name=folder.name if folder else "Unknown Folder",
        name=product.name,
        image_url=product.image_url,
        thumbnail_url=product.thumbnail_url or product.image_url,
        sha256_hash=product.sha256_hash,
        phash=product.phash,
        width=product.width,
        height=product.height,
        file_size=product.file_size,
        mime_type=product.mime_type,
        created_at=product.created_at,
        updated_at=product.updated_at
    )

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    name: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    embedding: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Update product details and embedding vector"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if folder_id:
        folder = db.query(FolderModel).filter(FolderModel.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target folder not found")
        product.folder_id = folder_id

    if name:
        product.name = name.strip()

    if embedding:
        try:
            parsed = json.loads(embedding) if isinstance(embedding, str) else embedding
            if isinstance(parsed, list) and len(parsed) == 512:
                product.set_vector(parsed)
        except Exception:
            pass

    if image:
        image_bytes = await image.read()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        orig_filename = f"{product.id}.jpg"
        orig_path = os.path.join(STORAGE_DIR, "original", orig_filename)
        pil_img.save(orig_path, format="JPEG", quality=90)

        thumb_img = pil_img.copy()
        thumb_img.thumbnail((300, 300))
        thumb_filename = f"{product.id}_thumb.jpg"
        thumb_path = os.path.join(STORAGE_DIR, "thumbnails", thumb_filename)
        thumb_img.save(thumb_path, format="JPEG", quality=85)

        product.sha256_hash = compute_sha256(image_bytes)
        product.phash = compute_dhash(pil_img)
        product.width = pil_img.width
        product.height = pil_img.height
        product.file_size = len(image_bytes)

    db.commit()
    db.refresh(product)

    folder = db.query(FolderModel).filter(FolderModel.id == product.folder_id).first()

    return ProductResponse(
        id=product.id,
        folder_id=product.folder_id,
        folder_name=folder.name if folder else "Unknown Folder",
        name=product.name,
        image_url=product.image_url,
        thumbnail_url=product.thumbnail_url or product.image_url,
        sha256_hash=product.sha256_hash,
        phash=product.phash,
        width=product.width,
        height=product.height,
        file_size=product.file_size,
        mime_type=product.mime_type,
        created_at=product.created_at,
        updated_at=product.updated_at
    )

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    """Delete product, image files, and vector embedding"""
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Attempt file cleanup
    orig_filename = f"{product.id}.jpg"
    thumb_filename = f"{product.id}_thumb.jpg"
    orig_path = os.path.join(STORAGE_DIR, "original", orig_filename)
    thumb_path = os.path.join(STORAGE_DIR, "thumbnails", thumb_filename)

    if os.path.exists(orig_path):
        try:
            os.remove(orig_path)
        except Exception:
            pass
    if os.path.exists(thumb_path):
        try:
            os.remove(thumb_path)
        except Exception:
            pass

    db.delete(product)
    db.commit()
    return None
