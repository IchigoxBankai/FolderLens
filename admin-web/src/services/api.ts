import axios from 'axios';
import {
  Folder, FolderDetail, Product, SearchResponse,
  DuplicateIntelligenceResponse, AnalyticsResponse, SearchHistoryEntry,
  AssistantResponse, User
} from '../types/api';

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
  const formData = new FormData();
  formData.append('folder_name', folderName);

  files.forEach((file) => {
    formData.append('images', file, file.name);
  });

  if (onProgress) onProgress(`Uploading ${files.length} product images...`);

  const response = await api.post('/api/folders/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.progress && evt.progress >= 0.95) {
        if (onProgress) onProgress('Generating visual fingerprints & indexing database...');
      } else {
        const percent = evt.progress ? Math.round(evt.progress * 100) : 0;
        if (onProgress) onProgress(`Uploading folder contents (${percent}%)...`);
      }
    }
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
  const formData = new FormData();
  formData.append('folder_id', folderId);
  formData.append('name', name);
  formData.append('image', imageFile);

  if (onProgress) onProgress('Uploading image...');

  const response = await api.post('/api/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.progress && evt.progress >= 0.99) {
        if (onProgress) onProgress('Generating visual fingerprint & hashes...');
      } else {
        if (onProgress) onProgress('Uploading image...');
      }
    }
  });

  return response.data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await api.delete(`/api/products/${productId}`);
};

// Search Services
export const searchByImageFile = async (file: File): Promise<SearchResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/api/search/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const searchByImageUrl = async (imageUrl: string): Promise<SearchResponse> => {
  const formData = new FormData();
  formData.append('image_url', imageUrl);

  const response = await api.post('/api/search/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
