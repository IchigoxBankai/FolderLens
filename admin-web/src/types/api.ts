export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  folder_id: string;
  folder_name?: string;
  name: string;
  image_url: string;
  thumbnail_url?: string;
  sha256_hash?: string;
  phash?: string;
  width?: number;
  height?: number;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
}

export interface FolderDetail extends Folder {
  products: Product[];
}

export interface SearchCandidate {
  product: Product;
  folder: Folder;
  similarity: number;
  confidence: number;
  reasons?: string[];
}

export interface SearchResponse {
  matched: boolean;
  message: string;
  best_match?: SearchCandidate;
  other_matches?: SearchCandidate[];
}

export interface DuplicateGroup {
  match_type: 'exact' | 'near';
  hash_value: string;
  potential_savings_bytes: number;
  products: Product[];
}

export interface DuplicateIntelligenceResponse {
  total_duplicates: number;
  potential_savings_mb: number;
  groups: DuplicateGroup[];
}

export interface AnalyticsResponse {
  total_files: number;
  total_folders: number;
  total_indexed: number;
  total_duplicates: number;
  storage_used_mb: number;
  folder_distribution: { folder_id: string; folder_name: string; count: number }[];
  format_distribution: { format: string; count: number }[];
  recent_searches_count: number;
}

export interface SearchHistoryEntry {
  id: string;
  query_image_url?: string;
  best_product_name?: string;
  best_folder_name?: string;
  confidence: number;
  signals_used: string[];
  created_at: string;
}

export interface AssistantResponse {
  query: string;
  found: boolean;
  message: string;
  matches: SearchCandidate[];
}
