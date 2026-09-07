from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    email: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Folder Pydantic Schemas
class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class FolderUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class FolderResponse(BaseModel):
    id: str
    name: str
    product_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Product Pydantic Schemas
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    folder_id: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    folder_id: str
    folder_name: Optional[str] = None
    name: str
    image_url: str
    thumbnail_url: Optional[str] = None
    sha256_hash: Optional[str] = None
    phash: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FolderDetailResponse(FolderResponse):
    products: List[ProductResponse] = []

# Search Response Schemas
class SearchCandidate(BaseModel):
    product: ProductResponse
    folder: FolderResponse
    similarity: float
    confidence: int
    reasons: List[str] = []

class SearchResponse(BaseModel):
    matched: bool
    message: str
    best_match: Optional[SearchCandidate] = None
    other_matches: List[SearchCandidate] = []

class SearchHistoryResponse(BaseModel):
    id: str
    query_image_url: Optional[str] = None
    best_product_name: Optional[str] = None
    best_folder_name: Optional[str] = None
    confidence: int
    signals_used: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True

# Intelligence & Analytics Schemas
class DuplicateGroup(BaseModel):
    match_type: str  # 'exact' or 'near'
    hash_value: str
    potential_savings_bytes: int
    products: List[ProductResponse]

class DuplicateIntelligenceResponse(BaseModel):
    total_duplicates: int
    potential_savings_mb: float
    groups: List[DuplicateGroup]

class AnalyticsResponse(BaseModel):
    total_files: int
    total_folders: int
    total_indexed: int
    total_duplicates: int
    storage_used_mb: float
    folder_distribution: List[Dict[str, Any]]
    format_distribution: List[Dict[str, Any]]
    recent_searches_count: int

class AssistantQueryRequest(BaseModel):
    query: str

class AssistantQueryResponse(BaseModel):
    query: str
    found: bool
    message: str
    matches: List[SearchCandidate] = []
