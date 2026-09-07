import os
import io
import json
import base64
import uuid
import logging
from typing import Optional, List
from datetime import datetime
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.db import get_db, FolderModel, ProductModel, SearchHistoryModel
from app.models.schema import SearchResponse, SearchCandidate, ProductResponse, FolderResponse
from app.embeddings.clip_engine import generate_image_embedding, compute_cosine_similarity
from app.embeddings.hash_engine import compute_sha256, compute_dhash, hamming_distance

router = APIRouter(prefix="/api/search", tags=["Search"])
logger = logging.getLogger("product_finder.search")

MATCH_STRONG_THRESHOLD = float(os.getenv("MATCH_STRONG_THRESHOLD", "0.75"))
MATCH_WEAK_THRESHOLD = float(os.getenv("MATCH_WEAK_THRESHOLD", "0.60"))

@router.post("/image", response_model=SearchResponse)
async def search_product_by_image(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    image_base64: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Performs multi-signal AI visual search combining exact SHA-256 hash matching,
    dHash perceptual hash Hamming distance, and CLIP visual cosine similarity.
    """
    pil_img = None
    image_bytes = None

    if image:
        image_bytes = await image.read()
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid image file upload: {e}")
    elif image_base64:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_bytes = base64.b64decode(image_base64)
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 image data: {e}")
    elif image_url:
        try:
            pil_img = image_url  # generate_image_embedding handles HTTP download
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not load image URL: {e}")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No image provided. Please upload an image file, image URL, or base64 string.")

    # 1. Calculate query signals
    query_sha256 = compute_sha256(image_bytes) if image_bytes else None
    query_dhash = compute_dhash(pil_img) if isinstance(pil_img, Image.Image) else None

    # 2. Generate query CLIP vector
    try:
        query_vector = generate_image_embedding(pil_img)
    except Exception as e:
        logger.error(f"Search embedding generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Visual search engine error: {e}"
        )

    products = db.query(ProductModel).all()
    if not products:
        return SearchResponse(
            matched=False,
            message="No stored images exist in your library. Please create a folder and import images first.",
            best_match=None,
            other_matches=[]
        )

    folder_map = {f.id: f for f in db.query(FolderModel).all()}
    scored_candidates: List[SearchCandidate] = []

    for prod in products:
        reasons = []
        prod_vec = prod.get_vector()
        vector_sim = compute_cosine_similarity(query_vector, prod_vec)
        
        confidence = int(round(max(0.0, vector_sim) * 100))

        # Check Exact SHA-256
        is_sha_match = False
        if query_sha256 and prod.sha256_hash and query_sha256 == prod.sha256_hash:
            is_sha_match = True
            confidence = 100
            reasons.append("✓ Exact SHA-256 binary file hash match")

        # Check Perceptual dHash
        if query_dhash and prod.phash:
            h_dist = hamming_distance(query_dhash, prod.phash)
            if h_dist == 0:
                reasons.append("✓ Identical 64-bit dHash perceptual fingerprint")
                if confidence < 98:
                    confidence = 98
            elif h_dist <= 6:
                reasons.append(f"✓ Visually near-identical dHash fingerprint (distance: {h_dist} bits)")
                if confidence < 90:
                    confidence = 90

        if vector_sim >= 0.75:
            reasons.append(f"✓ Strong CLIP visual feature similarity ({int(vector_sim*100)}%)")
        elif vector_sim >= 0.60:
            reasons.append(f"✓ Moderate visual feature similarity ({int(vector_sim*100)}%)")

        if prod.width and prod.height and isinstance(pil_img, Image.Image):
            if prod.width == pil_img.width and prod.height == pil_img.height:
                reasons.append(f"✓ Matching image dimensions ({prod.width}x{prod.height}px)")

        folder = folder_map.get(prod.folder_id)
        if not folder:
            continue

        prod_resp = ProductResponse(
            id=prod.id,
            folder_id=prod.folder_id,
            folder_name=folder.name,
            name=prod.name,
            image_url=prod.image_url,
            thumbnail_url=prod.thumbnail_url or prod.image_url,
            sha256_hash=prod.sha256_hash,
            phash=prod.phash,
            width=prod.width,
            height=prod.height,
            file_size=prod.file_size,
            mime_type=prod.mime_type,
            created_at=prod.created_at,
            updated_at=prod.updated_at
        )

        folder_resp = FolderResponse(
            id=folder.id,
            name=folder.name,
            product_count=0,
            created_at=folder.created_at,
            updated_at=folder.updated_at
        )

        candidate = SearchCandidate(
            product=prod_resp,
            folder=folder_resp,
            similarity=float(vector_sim),
            confidence=confidence,
            reasons=reasons
        )
        scored_candidates.append(candidate)

    # Sort descending by confidence then similarity
    scored_candidates.sort(key=lambda c: (c.confidence, c.similarity), reverse=True)

    if not scored_candidates:
        return SearchResponse(
            matched=False,
            message="No products found in database.",
            best_match=None,
            other_matches=[]
        )

    best = scored_candidates[0]

    # Save to Search History
    try:
        history_entry = SearchHistoryModel(
            id=str(uuid.uuid4()),
            query_image_url=best.product.thumbnail_url if best else None,
            best_product_id=best.product.id if best and best.confidence >= 60 else None,
            best_product_name=best.product.name if best and best.confidence >= 60 else None,
            best_folder_name=best.folder.name if best and best.confidence >= 60 else None,
            confidence=best.confidence if best else 0,
            signals_used=json.dumps(best.reasons) if best else "[]",
            created_at=datetime.utcnow()
        )
        db.add(history_entry)
        db.commit()
    except Exception as ex:
        logger.warning(f"Failed to record search history: {ex}")

    # Evaluate threshold
    if best.confidence >= 75 or best.similarity >= MATCH_STRONG_THRESHOLD:
        other_top = [c for c in scored_candidates[1:4] if c.confidence >= 55]
        return SearchResponse(
            matched=True,
            message="Exact Match Found" if best.confidence >= 95 else "Match Found",
            best_match=best,
            other_matches=other_top
        )
    elif best.confidence >= 55 or best.similarity >= MATCH_WEAK_THRESHOLD:
        other_top = [c for c in scored_candidates[1:4] if c.confidence >= 45]
        return SearchResponse(
            matched=True,
            message="Possible Match Found",
            best_match=best,
            other_matches=other_top
        )
    else:
        return SearchResponse(
            matched=False,
            message="No sufficiently similar image found in your indexed library.",
            best_match=best if best.similarity > 0.4 else None,
            other_matches=[c for c in scored_candidates[1:4] if c.similarity > 0.35]
        )
