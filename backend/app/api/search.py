import os
import io
import time
import json
import base64
import uuid
import logging
from typing import Optional, List
from datetime import datetime
import numpy as np
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.db import get_db, FolderModel, ProductModel, SearchHistoryModel
from app.models.schema import (
    SearchResponse, SearchCandidate, ProductResponse, FolderResponse,
    VisualSearchRequest
)
from app.embeddings.clip_engine import compute_cosine_similarity
from app.embeddings.hash_engine import compute_sha256, compute_dhash, hamming_distance

router = APIRouter(prefix="/api/search", tags=["Search"])
logger = logging.getLogger("product_finder.search")

MATCH_STRONG_THRESHOLD = float(os.getenv("MATCH_STRONG_THRESHOLD", "0.65"))
MATCH_WEAK_THRESHOLD = float(os.getenv("MATCH_WEAK_THRESHOLD", "0.45"))

@router.post("/visual", response_model=SearchResponse)
async def search_by_visual_embedding(
    req: VisualSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Lightweight visual search endpoint.
    Performs multi-signal matching (SHA-256 exact match + dHash Hamming distance + CLIP vector cosine similarity)
    using pre-computed client-side embedding vectors. Uses ZERO heavy ML memory on Render!
    """
    start_time = time.time()
    query_vector = req.embedding
    query_sha256 = req.sha256_hash
    query_dhash = req.phash
    limit = req.limit
    folder_id = req.folder_id

    has_vector = bool(query_vector and len(query_vector) == 512)
    has_hash = bool(query_sha256 or query_dhash)

    if not has_vector and not has_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one visual search signal (embedding vector, SHA-256 hash, or perceptual dHash) must be provided."
        )

    # Base query
    query = db.query(ProductModel)
    if folder_id:
        query = query.filter(ProductModel.folder_id == folder_id)

    products = query.all()
    if not products:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return SearchResponse(
            matched=False,
            message="No stored images exist in your library. Please create a folder and import images first.",
            best_match=None,
            other_matches=[],
            search_duration_ms=duration_ms
        )

    folder_map = {f.id: f for f in db.query(FolderModel).all()}
    scored_candidates: List[SearchCandidate] = []

    # Vectorized / fast loop
    q_vec_arr = np.asarray(query_vector, dtype=np.float32) if has_vector else None

    for prod in products:
        reasons = []
        vector_sim = 0.0
        
        if has_vector and q_vec_arr is not None:
            prod_vec = prod.get_vector()
            vector_sim = float(compute_cosine_similarity(q_vec_arr, prod_vec))
            confidence = int(round(max(0.0, vector_sim) * 100))
        else:
            confidence = 0

        # Check Exact SHA-256
        if query_sha256 and prod.sha256_hash and query_sha256.lower() == prod.sha256_hash.lower():
            confidence = 100
            reasons.append("✓ Exact SHA-256 binary file hash match (100% Identity)")

        # Check Perceptual dHash
        if query_dhash and prod.phash:
            h_dist = hamming_distance(query_dhash, prod.phash)
            if h_dist == 0:
                reasons.append("✓ Identical 64-bit perceptual fingerprint")
                if confidence < 98:
                    confidence = 98
            elif h_dist <= 6:
                reasons.append(f"✓ Visually near-identical fingerprint (distance: {h_dist} bits)")
                if confidence < 90:
                    confidence = 90

        if vector_sim >= 0.85:
            reasons.append(f"✓ Very strong visual feature similarity ({int(vector_sim*100)}%)")
        elif vector_sim >= 0.75:
            reasons.append(f"✓ Strong visual feature similarity ({int(vector_sim*100)}%)")
        elif vector_sim >= 0.60:
            reasons.append(f"✓ Moderate visual feature similarity ({int(vector_sim*100)}%)")

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

    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(f"[FolderLens] Visual search completed in {duration_ms}ms across {len(products)} products. Top confidence: {scored_candidates[0].confidence if scored_candidates else 0}%")

    if not scored_candidates:
        return SearchResponse(
            matched=False,
            message="No products found in library.",
            best_match=None,
            other_matches=[],
            search_duration_ms=duration_ms
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

    # Threshold evaluation
    if best.confidence >= 70 or best.similarity >= MATCH_STRONG_THRESHOLD:
        other_top = [c for c in scored_candidates[1:limit] if c.confidence >= 40]
        return SearchResponse(
            matched=True,
            message="Exact Match Found" if best.confidence >= 95 else "Strong Match Found",
            best_match=best,
            other_matches=other_top,
            search_duration_ms=duration_ms
        )
    elif best.confidence >= 40 or best.similarity >= MATCH_WEAK_THRESHOLD:
        other_top = [c for c in scored_candidates[1:limit] if c.confidence >= 35]
        return SearchResponse(
            matched=True,
            message="Visual Match Found",
            best_match=best,
            other_matches=other_top,
            search_duration_ms=duration_ms
        )
    else:
        is_possible = best.confidence >= 30 or best.similarity >= 0.30
        return SearchResponse(
            matched=is_possible,
            message="Possible Visual Match Found" if is_possible else "No sufficiently similar image found in your indexed library.",
            best_match=best if is_possible else None,
            other_matches=[c for c in scored_candidates[1:limit] if c.similarity > 0.25],
            search_duration_ms=duration_ms
        )

@router.post("/image", response_model=SearchResponse)
async def search_product_by_image_legacy(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    image_base64: Optional[str] = Form(None),
    embedding: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Backward-compatible image search endpoint.
    If client provides embedding string, runs vector search directly.
    If raw image is provided without embedding, computes exact/perceptual hashes.
    """
    parsed_embedding = None
    if embedding:
        try:
            parsed_embedding = json.loads(embedding) if isinstance(embedding, str) else embedding
        except Exception:
            pass

    if parsed_embedding:
        sha256_val = None
        phash_val = None
        if image:
            content = await image.read()
            sha256_val = compute_sha256(content)
            try:
                pil_img = Image.open(io.BytesIO(content)).convert("RGB")
                phash_val = compute_dhash(pil_img)
            except Exception:
                pass
        return await search_by_visual_embedding(
            VisualSearchRequest(
                embedding=parsed_embedding,
                sha256_hash=sha256_val,
                phash=phash_val
            ),
            db=db
        )

    # If no client embedding was provided, match via SHA256 / dHash
    image_bytes = None
    pil_img = None
    if image:
        image_bytes = await image.read()
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            pass
    elif image_base64:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_bytes = base64.b64decode(image_base64)
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            pass

    sha256_val = compute_sha256(image_bytes) if image_bytes else None
    phash_val = compute_dhash(pil_img) if pil_img else None

    # Search by hashes
    products = db.query(ProductModel).all()
    folder_map = {f.id: f for f in db.query(FolderModel).all()}
    scored_candidates = []

    for prod in products:
        confidence = 0
        reasons = []
        if sha256_val and prod.sha256_hash and sha256_val == prod.sha256_hash:
            confidence = 100
            reasons.append("✓ Exact SHA-256 binary file hash match")
        elif phash_val and prod.phash:
            dist = hamming_distance(phash_val, prod.phash)
            if dist == 0:
                confidence = 98
                reasons.append("✓ Identical perceptual hash fingerprint")
            elif dist <= 6:
                confidence = 88
                reasons.append(f"✓ Near-identical perceptual hash (distance: {dist})")

        if confidence > 0:
            folder = folder_map.get(prod.folder_id)
            if folder:
                candidate = SearchCandidate(
                    product=ProductResponse(
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
                    ),
                    folder=FolderResponse(
                        id=folder.id,
                        name=folder.name,
                        product_count=0,
                        created_at=folder.created_at,
                        updated_at=folder.updated_at
                    ),
                    similarity=float(confidence / 100.0),
                    confidence=confidence,
                    reasons=reasons
                )
                scored_candidates.append(candidate)

    scored_candidates.sort(key=lambda c: c.confidence, reverse=True)
    if scored_candidates:
        best = scored_candidates[0]
        return SearchResponse(
            matched=True,
            message="Match Found",
            best_match=best,
            other_matches=scored_candidates[1:5]
        )

    return SearchResponse(
        matched=False,
        message="Please use client-side visual embedding search for complete visual feature matching.",
        best_match=None,
        other_matches=[]
    )
