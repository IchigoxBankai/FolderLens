import os
import json
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, Text, Float, Integer
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    # Default to local SQLite database in uploads folder
    os.makedirs("./uploads", exist_ok=True)
    DATABASE_URL = "sqlite:///./uploads/product_finder.db"

is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FolderModel(Base):
    __tablename__ = "folders"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    products = relationship("ProductModel", back_populates="folder", cascade="all, delete-orphan")

class ProductModel(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    folder_id = Column(String, ForeignKey("folders.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    image_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    
    # Metadata & Hash signals
    sha256_hash = Column(String, nullable=True, index=True)
    phash = Column(String, nullable=True, index=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    ocr_text = Column(Text, nullable=True)

    # Stored as JSON string in SQLite or Vector in pgvector
    if not is_sqlite and HAS_PGVECTOR:
        embedding = Column(Vector(512))
    else:
        embedding = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    folder = relationship("FolderModel", back_populates="products")

    def set_vector(self, vec_list: list[float]):
        """Sets embedding vector list"""
        if is_sqlite or not HAS_PGVECTOR:
            self.embedding = json.dumps(vec_list)
        else:
            self.embedding = vec_list

    def get_vector(self) -> np.ndarray:
        """Retrieves embedding vector as NumPy array"""
        if isinstance(self.embedding, str):
            return np.array(json.loads(self.embedding), dtype=np.float32)
        elif isinstance(self.embedding, list):
            return np.array(self.embedding, dtype=np.float32)
        else:
            return np.array(list(self.embedding), dtype=np.float32)

class SearchHistoryModel(Base):
    __tablename__ = "search_history"

    id = Column(String, primary_key=True, index=True)
    query_image_url = Column(String, nullable=True)
    best_product_id = Column(String, nullable=True)
    best_product_name = Column(String, nullable=True)
    best_folder_name = Column(String, nullable=True)
    confidence = Column(Integer, nullable=False, default=0)
    signals_used = Column(Text, nullable=True)  # JSON string of signal bullet points
    created_at = Column(DateTime, default=datetime.utcnow)

from sqlalchemy import text

def init_db():
    """Initializes tables in database and applies automatic schema migrations for SQLite"""
    Base.metadata.create_all(bind=engine)
    if is_sqlite:
        with engine.connect() as conn:
            # Migration for folders.user_id
            try:
                conn.execute(text("ALTER TABLE folders ADD COLUMN user_id VARCHAR"))
                conn.commit()
            except Exception:
                pass
            
            # Migrations for products metadata columns
            prod_cols = [
                ("sha256_hash", "VARCHAR"),
                ("phash", "VARCHAR"),
                ("width", "INTEGER"),
                ("height", "INTEGER"),
                ("file_size", "INTEGER"),
                ("mime_type", "VARCHAR"),
                ("ocr_text", "TEXT"),
            ]
            for col_name, col_type in prod_cols:
                try:
                    conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                except Exception:
                    pass

def get_db():
    """Dependency generator for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
