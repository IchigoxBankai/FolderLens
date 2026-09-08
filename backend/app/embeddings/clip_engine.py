import logging
import numpy as np
from typing import List, Union

logger = logging.getLogger("product_finder.embeddings")

def compute_cosine_similarity(vec1: Union[List[float], np.ndarray], vec2: Union[List[float], np.ndarray]) -> float:
    """Computes cosine similarity between two normalized vectors using NumPy."""
    v1 = np.asarray(vec1, dtype=np.float32)
    v2 = np.asarray(vec2, dtype=np.float32)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def compute_batch_cosine_similarities(query_vec: Union[List[float], np.ndarray], matrix: np.ndarray) -> np.ndarray:
    """
    Computes cosine similarity of query_vec against a 2D matrix of shape (N, D).
    Returns array of N similarity floats in a single vectorized BLAS operation.
    """
    if matrix.size == 0:
        return np.array([], dtype=np.float32)
    
    q = np.asarray(query_vec, dtype=np.float32)
    q_norm = np.linalg.norm(q)
    if q_norm == 0:
        return np.zeros(matrix.shape[0], dtype=np.float32)
    q_normed = q / q_norm

    matrix_norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    matrix_norms[matrix_norms == 0] = 1e-10
    matrix_normed = matrix / matrix_norms

    return np.dot(matrix_normed, q_normed)

def normalize_vector(vec: Union[List[float], np.ndarray]) -> List[float]:
    """Normalizes a float vector to unit length (L2 norm = 1.0)."""
    v = np.asarray(vec, dtype=np.float32)
    norm = np.linalg.norm(v)
    if norm > 0:
        v = v / norm
    return v.tolist()
