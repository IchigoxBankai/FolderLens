import axios from 'axios';
import {
  Folder, FolderDetail, Product, SearchResponse,
  DuplicateIntelligenceResponse, AnalyticsResponse, SearchHistoryEntry,
  AssistantResponse, User
} from '../types/api';
import {
  imageEmbeddingService,
  computeSHA256,
  computeDHash,
  generateThumbnailBase64,
  ModelProgressCallback
} from './imageEmbedding';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes timeout for bulk folder uploads
});

export const getImageUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Auth Services
export const demoLogin = async (): Promise<{ user: User; access_token: string }> => {
  const response = await api.get('/api/auth/demo');
  return response.data;
};

export const fetchCurrentUser = async (): Promise<User> => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// Folder Services
export const fetchFolders = async (): Promise<Folder[]> => {
  const response = await api.get('/api/folders');
  return response.data;
};

export const createFolder = async (name: string): Promise<Folder> => {
  const response = await api.post('/api/folders', { name });
  return response.data;
};

export const uploadFolderFromPC = async (
  folderName: string,
  files: File[],
  onProgress?: (progressText: string) => void
): Promise<Folder> => {
  const total = files.length;
  if (onProgress) onProgress(`Preparing ${total} images for local AI indexing...`);

  const indexedItems = [];

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const percent = Math.round(((i + 1) / total) * 100);
    if (onProgress) {
      onProgress(`Extracting visual signature ${i + 1}/${total} (${percent}%)...`);
    }

    try {
      const [sha256Hash, phash, thumbBase64, embedding] = await Promise.all([
        computeSHA256(file),
        computeDHash(file).catch(() => undefined),
        generateThumbnailBase64(file).catch(() => undefined),
        imageEmbeddingService.generateEmbedding(file)
      ]);

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      indexedItems.push({
        name: nameWithoutExt || `Product Image ${i + 1}`,
        embedding,
        sha256_hash: sha256Hash,
        phash,
        file_size: file.size,
        mime_type: file.type || 'image/jpeg',
        thumbnail_base64: thumbBase64
      });
    } catch (err) {
      console.warn(`Failed to generate client embedding for ${file.name}:`, err);
    }
  }

  if (onProgress) onProgress('Saving indexed folder to library database...');

  const response = await api.post('/api/folders/upload-indexed', {
    folder_name: folderName,
    items: indexedItems
  });

  return response.data;
};

export const fetchFolderDetail = async (folderId: string): Promise<FolderDetail> => {
  const response = await api.get(`/api/folders/${folderId}`);
  return response.data;
};

export const renameFolder = async (folderId: string, name: string): Promise<Folder> => {
  const response = await api.put(`/api/folders/${folderId}`, { name });
  return response.data;
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  await api.delete(`/api/folders/${folderId}`);
};

// Product Services
export const fetchAllProducts = async (limit = 100): Promise<Product[]> => {
  const response = await api.get('/api/products', { params: { limit } });
  return response.data;
};

export const createProduct = async (
  folderId: string,
  name: string,
  imageFile: File,
  onProgress?: (step: string) => void
): Promise<Product> => {
  if (onProgress) onProgress('Generating visual AI embedding in browser...');

  const [sha256Hash, phash, embedding] = await Promise.all([
    computeSHA256(imageFile),
    computeDHash(imageFile).catch(() => undefined),
    imageEmbeddingService.generateEmbedding(imageFile, (info) => {
      if (onProgress) onProgress(info.message);
    })
  ]);

  if (onProgress) onProgress('Uploading image to FolderLens database...');

  const formData = new FormData();
  formData.append('folder_id', folderId);
  formData.append('name', name);
  formData.append('image', imageFile);
  formData.append('embedding', JSON.stringify(embedding));
  if (sha256Hash) formData.append('sha256_hash', sha256Hash);
  if (phash) formData.append('phash', phash);

  const response = await api.post('/api/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await api.delete(`/api/products/${productId}`);
};

// Search Services
export const searchByImageFile = async (
  file: File,
  onStepProgress?: ModelProgressCallback
): Promise<SearchResponse> => {
  if (onStepProgress) {
    onStepProgress({
      status: 'preparing_image',
      message: 'Generating image hashes & visual signature locally...'
    });
  }

  const [sha256Hash, phash] = await Promise.all([
    computeSHA256(file),
    computeDHash(file).catch(() => undefined)
  ]);

  let embedding: number[] | undefined = undefined;
  try {
    embedding = await imageEmbeddingService.generateEmbedding(file, onStepProgress);
  } catch (embErr) {
    console.warn('[FolderLens] Embedding engine offline/fallback to perceptual fingerprint:', embErr);
  }

  if (onStepProgress) {
    onStepProgress({
      status: 'generating_embedding',
      message: 'Searching multi-signal library database...'
    });
  }

  const response = await api.post('/api/search/visual', {
    embedding,
    sha256_hash: sha256Hash,
    phash: phash,
    limit: 10
  });

  return response.data;
};

export const searchByImageUrl = async (
  imageUrl: string,
  onStepProgress?: ModelProgressCallback
): Promise<SearchResponse> => {
  if (onStepProgress) {
    onStepProgress({
      status: 'preparing_image',
      message: 'Processing image URL...'
    });
  }

  const embedding = await imageEmbeddingService.generateEmbedding(imageUrl, onStepProgress);

  if (onStepProgress) {
    onStepProgress({
      status: 'generating_embedding',
      message: 'Searching vector database...'
    });
  }

  const response = await api.post('/api/search/visual', {
    embedding,
    limit: 10
  });

  return response.data;
};

// Intelligence Services
export const fetchDuplicates = async (): Promise<DuplicateIntelligenceResponse> => {
  const response = await api.get('/api/intelligence/duplicates');
  return response.data;
};

export const fetchAnalytics = async (): Promise<AnalyticsResponse> => {
  const response = await api.get('/api/intelligence/analytics');
  return response.data;
};

export const fetchSearchHistory = async (): Promise<SearchHistoryEntry[]> => {
  const response = await api.get('/api/intelligence/history');
  return response.data;
};

export const clearSearchHistory = async (): Promise<void> => {
  await api.delete('/api/intelligence/history');
};

export const queryAiAssistant = async (query: string): Promise<AssistantResponse> => {
  const response = await api.post('/api/intelligence/assistant', { query });
  return response.data;
};
