import os
import re
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

def normalize_text(text: str) -> str:
    """Lowercase, strip, and normalize hyphens/underscores to spaces."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'[\-_]+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text

def extract_search_tokens(query: str) -> List[str]:
    """
    Extracts candidate target keywords from user natural language query.
    Handles phrases like:
    - find 'gojo'
    - find "gojo"
    - where is gojo
    - which folder is gojo in
    - locate gojo.png
    - gojo
    """
    q = query.strip().strip('"\'')
    
    # Remove common conversational command prefixes
    patterns = [
        r'^(?:please\s+)?(?:can\s+you\s+)?(?:find|search(?:\s+for)?|locate|where\s+is|which\s+folder\s+(?:is|has|contains)|show\s+me|tell\s+me\s+where\s+is|in\s+which\s+folder\s+is|lookup|get)\s+(?:the\s+)?(?:image\s+|file\s+|pic\s+|photo\s+|picture\s+)?(?:named\s+|called\s+)?',
        r'^(?:image|file|pic|photo|picture)\s+(?:named|called)\s+'
    ]
    
    cleaned = q
    for pat in patterns:
        cleaned = re.sub(pat, '', cleaned, flags=re.IGNORECASE).strip()
    
    # Strip any enclosing quotes
    cleaned = cleaned.strip(' "\'')
    
    # Strip image extensions (.png, .jpg, .jpeg, .webp, .gif, .svg, .bmp, .tiff, .avif, .ico)
    cleaned_no_ext = re.sub(r'\.(png|jpe?g|webp|gif|svg|bmp|tiff|avif|ico)$', '', cleaned, flags=re.IGNORECASE).strip()
    
    tokens = []
    if cleaned_no_ext:
        tokens.append(cleaned_no_ext)
    if cleaned and cleaned.lower() != cleaned_no_ext.lower():
        tokens.append(cleaned)
    if q.lower() not in [t.lower() for t in tokens]:
        tokens.append(q)
        
    return tokens

@router.post("/assistant", response_model=AssistantQueryResponse)
def run_ai_assistant_query(req: AssistantQueryRequest, db: Session = Depends(get_db)):
    """
    Translates natural language user questions into intelligent folder location answers.
    Combines:
    1. Case-insensitive exact & substring filename matching (extension-agnostic, e.g. find "gojo" -> "gojo.png" in folder X).
    2. Folder name matching.
    3. CLIP semantic text-to-image vector similarity search.
    """
    query_str = req.query.strip()
    if not query_str:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    products = db.query(ProductModel).all()
    if not products:
        return AssistantQueryResponse(
            query=query_str,
            found=False,
            message="Your visual library is currently empty. Please import images to use AI Assistant search.",
            matches=[]
        )

    folder_map = {f.id: f for f in db.query(FolderModel).all()}
    tokens = extract_search_tokens(query_str)
    
    # Try computing CLIP text embedding
    text_vector = None
    try:
        # Use primary extracted target keyword or full query for CLIP
        clip_query = tokens[0] if tokens else query_str
        text_vector = generate_text_embedding(clip_query)
    except Exception as e:
        logger.warning(f"CLIP embedding failed, falling back to name/folder indexing: {e}")

    scored_map: Dict[str, SearchCandidate] = {}

    for p in products:
        folder = folder_map.get(p.folder_id)
        if not folder:
            continue

        raw_name = p.name or ""
        name_no_ext, ext = os.path.splitext(raw_name)
        norm_raw = normalize_text(raw_name)
        norm_base = normalize_text(name_no_ext)
        norm_folder = normalize_text(folder.name)

        best_score = 0
        reasons = []

        # 1. Exact & Substring Filename / Product Name Checks
        for token in tokens:
            norm_token = normalize_text(token)
            if not norm_token:
                continue

            # Exact match without extension (e.g. query "gojo" matches "gojo.png" or "Gojo.jpg")
            if norm_token == norm_base or norm_token == norm_raw:
                score = 100
                if score > best_score:
                    best_score = score
                    reasons = [f"🎯 Exact filename match for '{raw_name}' in folder '{folder.name}'"]
                break

            # Word boundary / substring match
            # e.g., token "gojo" in "gojo satoru.png" or "wallpaper_gojo.jpg"
            if norm_token in norm_base or norm_token in norm_raw:
                score = 95
                if score > best_score:
                    best_score = score
                    reasons = [f"✓ Filename '{raw_name}' contains '{token}' (Folder: '{folder.name}')"]
            elif norm_base in norm_token and len(norm_base) >= 3:
                score = 90
                if score > best_score:
                    best_score = score
                    reasons = [f"✓ Query contains product name '{name_no_ext}' (Folder: '{folder.name}')"]
            
            # Word token overlap
            token_words = set(norm_token.split())
            base_words = set(norm_base.split())
            if token_words and base_words and (token_words & base_words):
                overlap_ratio = len(token_words & base_words) / max(len(token_words), len(base_words))
                score = int(75 + overlap_ratio * 15)
                if score > best_score:
                    best_score = score
                    reasons = [f"✓ Word match in '{raw_name}' (Folder: '{folder.name}')"]

            # Folder name match
            if norm_token in norm_folder or norm_folder in norm_token:
                score = 80
                if score > best_score:
                    best_score = score
                    reasons = [f"📁 Image belongs to matching folder '{folder.name}'"]

        # 2. CLIP Semantic Similarity Check
        if text_vector is not None:
            try:
                prod_vec = p.get_vector()
                sim = compute_cosine_similarity(text_vector, prod_vec)
                clip_conf = int(round(max(0.0, sim) * 100))
                if clip_conf >= 38:
                    if clip_conf > best_score:
                        best_score = clip_conf
                        reasons = [f"🧠 Visual CLIP match ({clip_conf}%) in folder '{folder.name}'"]
                    elif best_score >= 80:
                        reasons.append(f"🧠 Visual relevance confirmed ({clip_conf}%)")
            except Exception as e:
                logger.debug(f"CLIP similarity calculation error for {p.id}: {e}")

        if best_score >= 40:
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
                similarity=float(best_score / 100.0),
                confidence=best_score,
                reasons=reasons
            )
            scored_map[p.id] = candidate

    scored = list(scored_map.values())
    scored.sort(key=lambda c: c.confidence, reverse=True)

    if scored:
        top = scored[0]
        # Direct, crystal-clear message pointing out the folder
        if top.confidence >= 90:
            if len(scored) == 1:
                msg = f"📍 '{top.product.name}' is located in folder '{top.folder.name}'."
            else:
                msg = f"📍 Found {len(scored)} matching image(s). Top match '{top.product.name}' is in folder '{top.folder.name}'."
        else:
            msg = f"🔍 Found {len(scored)} relevant image(s). Best match is '{top.product.name}' in folder '{top.folder.name}'."

        return AssistantQueryResponse(
            query=query_str,
            found=True,
            message=msg,
            matches=scored[:8]
        )
    else:
        return AssistantQueryResponse(
            query=query_str,
            found=False,
            message=f"I couldn't find any image matching '{query_str}' in your folders.",
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
