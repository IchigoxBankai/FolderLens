import hashlib
import io
import numpy as np
from PIL import Image

def compute_sha256(image_bytes: bytes) -> str:
    """Computes SHA-256 hash string for exact file matching."""
    return hashlib.sha256(image_bytes).hexdigest()

def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """
    Computes Difference Hash (dHash) perceptual hash hex string for near-duplicate detection.
    Does not require external imagehash package - works directly with PIL.
    """
    # Convert image to grayscale and resize to (hash_size + 1, hash_size)
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.array(resized, dtype=np.int32)

    # Compare adjacent pixels horizontally
    diff = pixels[:, 1:] > pixels[:, :-1]

    # Convert binary array to hex string
    decimal_val = 0
    hash_bits = []
    for bit in diff.flatten():
        hash_bits.append("1" if bit else "0")

    binary_str = "".join(hash_bits)
    # Convert binary to hex
    hex_str = f"{int(binary_str, 2):0{hash_size * hash_size // 4}x}"
    return hex_str

def hamming_distance(hex_hash1: str, hex_hash2: str) -> int:
    """Calculates Hamming distance (number of differing bits) between two hex hash strings."""
    try:
        val1 = int(hex_hash1, 16)
        val2 = int(hex_hash2, 16)
        # Bitwise XOR shows bits that differ
        return bin(val1 ^ val2).count("1")
    except (ValueError, TypeError):
        return 64  # Max distance on error
