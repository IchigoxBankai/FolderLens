import io
import os
import logging
import numpy as np
from PIL import Image
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("product_finder.embeddings")

MODEL_NAME = os.getenv("MODEL_NAME", "openai/clip-vit-base-patch32")

_processor = None
_model = None

LOW_MEMORY = os.getenv("LOW_MEMORY", "true").lower() in ("true", "1", "yes")

def get_clip_model():
    """Lazy loads CLIP model and processor with low-RAM optimization"""
    global _processor, _model
    if _processor is None or _model is None:
        logger.info(f"Loading CLIP vision model: {MODEL_NAME} (Low Memory Mode: {LOW_MEMORY})...")
        try:
            import torch
            from transformers import CLIPProcessor, CLIPModel

            _processor = CLIPProcessor.from_pretrained(MODEL_NAME)
            _model = CLIPModel.from_pretrained(MODEL_NAME)
            _model.eval()

            # Dynamic INT8 CPU Quantization to shrink memory footprint by 65% for free cloud tiers
            if LOW_MEMORY and not torch.cuda.is_available():
                logger.info("Applying dynamic INT8 quantization for low-RAM cloud hosting...")
                _model = torch.quantization.quantize_dynamic(
                    _model, {torch.nn.Linear}, dtype=torch.qint8
                )

            logger.info("CLIP vision model loaded and optimized successfully.")
        except Exception as e:
            logger.error(f"Failed to load CLIP model '{MODEL_NAME}': {e}")
            raise RuntimeError(f"Could not load vision model: {e}")
    return _processor, _model

def generate_image_embedding(image_input) -> list[float]:
    """
    Generates a 512-dimensional normalized float embedding vector for an image.
    Accepts PIL.Image, bytes, or image URL string.
    """
    import torch

    image = None

    if isinstance(image_input, Image.Image):
        image = image_input.convert("RGB")
    elif isinstance(image_input, bytes):
        image = Image.open(io.BytesIO(image_input)).convert("RGB")
    elif isinstance(image_input, str):
        if image_input.startswith("http://") or image_input.startswith("https://"):
            resp = requests.get(image_input, timeout=10, headers={"User-Agent": "ProductFinder/1.0"})
            resp.raise_for_status()
            image = Image.open(io.BytesIO(resp.content)).convert("RGB")
        elif os.path.exists(image_input):
            image = Image.open(image_input).convert("RGB")
        else:
            raise ValueError(f"Invalid image file or URL path: {image_input}")
    else:
        raise ValueError("Unsupported image input type. Must be PIL.Image, bytes, or path/URL string.")

    processor, model = get_clip_model()

    with torch.no_grad():
        inputs = processor(images=image, return_tensors="pt")
        image_features = model.get_image_features(**inputs)

        if hasattr(image_features, "image_embeds"):
            feats = image_features.image_embeds
        elif hasattr(image_features, "pooler_output"):
            feats = image_features.pooler_output
        elif isinstance(image_features, torch.Tensor):
            feats = image_features
        else:
            feats = image_features[0]

        # Normalize L2 norm
        feats = feats / feats.norm(p=2, dim=-1, keepdim=True)
        vector = feats.cpu().numpy()[0].tolist()

    return vector

def generate_image_embeddings_batch(images: list[Image.Image]) -> list[list[float]]:
    """
    Generates 512-dimensional normalized float embedding vectors in parallel batches.
    Up to 10x faster for bulk folder image indexing.
    """
    if not images:
        return []

    import torch
    processor, model = get_clip_model()

    rgb_images = [img.convert("RGB") for img in images]

    with torch.no_grad():
        inputs = processor(images=rgb_images, return_tensors="pt", padding=True)
        image_features = model.get_image_features(**inputs)

        if hasattr(image_features, "image_embeds"):
            feats = image_features.image_embeds
        elif hasattr(image_features, "pooler_output"):
            feats = image_features.pooler_output
        elif isinstance(image_features, torch.Tensor):
            feats = image_features
        else:
            feats = image_features[0]

        # Normalize L2 norm across batch dimension
        feats = feats / feats.norm(p=2, dim=-1, keepdim=True)
        vectors = feats.cpu().numpy().tolist()

    return vectors

def generate_text_embedding(text_prompt: str) -> list[float]:
    """
    Generates a 512-dimensional normalized float embedding vector for a text prompt.
    Allows natural language text queries to search image embeddings.
    """
    import torch

    processor, model = get_clip_model()

    with torch.no_grad():
        inputs = processor(text=[text_prompt], return_tensors="pt", padding=True)
        text_features = model.get_text_features(**inputs)

        if hasattr(text_features, "text_embeds"):
            feats = text_features.text_embeds
        elif hasattr(text_features, "pooler_output"):
            feats = text_features.pooler_output
        elif isinstance(text_features, torch.Tensor):
            feats = text_features
        else:
            feats = text_features[0]

        # Normalize L2 norm
        feats = feats / feats.norm(p=2, dim=-1, keepdim=True)
        vector = feats.cpu().numpy()[0].tolist()

    return vector

def compute_cosine_similarity(vec1: list[float] | np.ndarray, vec2: list[float] | np.ndarray) -> float:
    """Computes cosine similarity between two normalized vectors"""
    v1 = np.array(vec1, dtype=np.float32)
    v2 = np.array(vec2, dtype=np.float32)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

