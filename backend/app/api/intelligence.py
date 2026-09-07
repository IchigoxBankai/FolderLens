import json
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db import get_db, ProductModel, FolderModel, SearchHistoryModel
from app.models.schema import (
    DuplicateIntelligenceResponse, DuplicateGroup, ProductResponse,
    AnalyticsResponse, SearchHistoryResponse, AssistantQueryRequest,
    AssistantQueryResponse, SearchCandidate, FolderResponse
)
from app.embeddings.clip_engine import generate_text_embedding, compute_cosine_similarity
from app.embeddings.hash_engine import hamming_distance

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence"])
logger = logging.getLogger("product_finder.intelligence")

@router.get("/duplicates", response_model=DuplicateIntelligenceResponse)
def get_duplicate_intelligence(db: Session = Depends(get_db)):
    """
    Scans image library to detect exact SHA-256 binary duplicate files and near-duplicate dHash visual matches.
    Calculates total potential storage space savings.
    """
    products = db.query(ProductModel).all()
    folder_map = {f.id: f for f in db.query(FolderModel).all()}

    sha_groups: Dict[str, List[ProductModel]] = {}
    phash_list: List[ProductModel] = []

    for p in products:
        if p.sha256_hash:
            sha_groups.setdefault(p.sha256_hash, []).append(p)
        if p.phash:
            phash_list.append(p)

    duplicate_groups: List[DuplicateGroup] = []
    total_savings_bytes = 0
    total_duplicates_count = 0

    # 1. Exact SHA-256 Duplicates
    seen_ids = set()
    for sha, prods in sha_groups.items():
        if len(prods) > 1:
            group_prods = []
            group_savings = 0
            for i, p in enumerate(prods):
                folder = folder_map.get(p.folder_id)
                seen_ids.add(p.id)
                if i > 0:
                    group_savings += (p.file_size or 0)
                    total_duplicates_count += 1

                group_prods.append(
                    ProductResponse(
                        id=p.id,
                        folder_id=p.folder_id,
                        folder_name=folder.name if folder else "Unknown Folder",
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
            total_savings_bytes += group_savings
            duplicate_groups.append(
                DuplicateGroup(
                    match_type="exact",
                    hash_value=f"sha256:{sha[:12]}...",
                    potential_savings_bytes=group_savings,
                    products=group_prods
                )
            )

    # 2. Near-Duplicate dHash Matches (for files not already in exact SHA groups)
    remaining_prods = [p for p in phash_list if p.id not in seen_ids]
    visited = set()

    for i in range(len(remaining_prods)):
        p1 = remaining_prods[i]
        if p1.id in visited:
            continue

        near_cluster = [p1]
        for j in range(i + 1, len(remaining_prods)):
            p2 = remaining_prods[j]
            if p2.id in visited:
                continue
            if p1.phash and p2.phash:
                dist = hamming_distance(p1.phash, p2.phash)
                if dist <= 5:  # High visual similarity
                    near_cluster.append(p2)
                    visited.add(p2.id)

        if len(near_cluster) > 1:
            visited.add(p1.id)
            group_prods = []
            group_savings = 0
            for idx, p in enumerate(near_cluster):
                folder = folder_map.get(p.folder_id)
                if idx > 0:
                    group_savings += (p.file_size or 0)
                    total_duplicates_count += 1

                group_prods.append(
                    ProductResponse(
                        id=p.id,
                        folder_id=p.folder_id,
                        folder_name=folder.name if folder else "Unknown Folder",
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
            total_savings_bytes += group_savings
            duplicate_groups.append(
                DuplicateGroup(
                    match_type="near",
                    hash_value=f"dhash:{p1.phash[:12]}...",
                    potential_savings_bytes=group_savings,
                    products=group_prods
                )
            )

    savings_mb = round(total_savings_bytes / (1024 * 1024), 2)
    return DuplicateIntelligenceResponse(
        total_duplicates=total_duplicates_count,
        potential_savings_mb=savings_mb,
        groups=duplicate_groups
    )

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """Retrieves visual library stats, folder distributions, file format metrics, and usage analytics."""
    products = db.query(ProductModel).all()
    folders = db.query(FolderModel).all()
    history_count = db.query(SearchHistoryModel).count()

    total_files = len(products)
    total_folders = len(folders)
    total_indexed = total_files  # All uploaded products generate CLIP vectors

    total_bytes = sum(p.file_size or 150000 for p in products)
    storage_mb = round(total_bytes / (1024 * 1024), 2)

    # Folder distribution
    folder_counts: Dict[str, int] = {}
    for p in products:
        folder_counts[p.folder_id] = folder_counts.get(p.folder_id, 0) + 1

    folder_dist = []
    for f in folders:
        folder_dist.append({
            "folder_id": f.id,
            "folder_name": f.name,
            "count": folder_counts.get(f.id, 0)
        })

    # Format distribution
    format_counts: Dict[str, int] = {}
    for p in products:
        fmt = (p.mime_type or "image/jpeg").split("/")[-1].upper()
        format_counts[fmt] = format_counts.get(fmt, 0) + 1

    format_dist = [{"format": k, "count": v} for k, v in format_counts.items()]

    # Duplicate count
    dup_res = get_duplicate_intelligence(db)

    return AnalyticsResponse(
        total_files=total_files,
        total_folders=total_folders,
        total_indexed=total_indexed,
        total_duplicates=dup_res.total_duplicates,
        storage_used_mb=storage_mb,
        folder_distribution=folder_dist,
        format_distribution=format_dist,
        recent_searches_count=history_count
    )

@router.post("/assistant", response_model=AssistantQueryResponse)
def run_ai_assistant_query(req: AssistantQueryRequest, db: Session = Depends(get_db)):
    """
    Translates natural language user questions into real CLIP text-to-image vector similarity search.
    No hallucinated responses - matches against user's actual stored visual library.
    """
    query_str = req.query.strip()
    if not query_str:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    try:
        text_vector = generate_text_embedding(query_str)
    except Exception as e:
        logger.error(f"Text embedding generation error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Assistant CLIP error: {e}")

    products = db.query(ProductModel).all()
    if not products:
        return AssistantQueryResponse(
            query=query_str,
            found=False,
            message="Your visual library is currently empty. Please import images to use AI Assistant search.",
            matches=[]
        )

    folder_map = {f.id: f for f in db.query(FolderModel).all()}
    scored: List[SearchCandidate] = []

    for p in products:
        prod_vec = p.get_vector()
        similarity = compute_cosine_similarity(text_vector, prod_vec)
        confidence = int(round(max(0.0, similarity) * 100))

        if confidence >= 45:  # Minimum text match confidence
            folder = folder_map.get(p.folder_id)
            if not folder:
                continue

            candidate = SearchCandidate(
                product=ProductResponse(
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
                    updated_at=p.updated_at
                ),
                folder=FolderResponse(
                    id=folder.id,
                    name=folder.name,
                    product_count=0,
                    created_at=folder.created_at,
                    updated_at=folder.updated_at
                ),
                similarity=float(similarity),
                confidence=confidence,
                reasons=[f"✓ Semantic CLIP text match for '{query_str}' ({confidence}%)"]
            )
            scored.append(candidate)

    scored.sort(key=lambda c: c.confidence, reverse=True)

    if scored:
        return AssistantQueryResponse(
            query=query_str,
            found=True,
            message=f"Found {len(scored)} matching image(s) in your library for '{query_str}'.",
            matches=scored[:8]
        )
    else:
        return AssistantQueryResponse(
            query=query_str,
            found=False,
            message=f"I couldn't find any image matching '{query_str}' in your indexed library.",
            matches=[]
        )

@router.get("/history", response_model=List[SearchHistoryResponse])
def get_search_history(db: Session = Depends(get_db)):
    """Retrieves recent visual search history log."""
    entries = db.query(SearchHistoryModel).order_by(SearchHistoryModel.created_at.desc()).limit(20).all()
    res = []
    for e in entries:
        signals = []
        if e.signals_used:
            try:
                signals = json.loads(e.signals_used)
            except Exception:
                signals = []

        res.append(
            SearchHistoryResponse(
                id=e.id,
                query_image_url=e.query_image_url,
                best_product_name=e.best_product_name,
                best_folder_name=e.best_folder_name,
                confidence=e.confidence,
                signals_used=signals,
                created_at=e.created_at
            )
        )
    return res

@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_search_history(db: Session = Depends(get_db)):
    """Clears visual search history log."""
    db.query(SearchHistoryModel).delete()
    db.commit()
    return None
