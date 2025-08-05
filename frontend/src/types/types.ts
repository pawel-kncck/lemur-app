// Project types
export interface Project {
  id: string;
  name: string;
  created_at: string;
  context?: string | null;
  file_id?: string | null;
  file_name?: string | null;
  file_columns?: string[] | null;
}

// File types
export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: Date;
  status: 'success' | 'error';
  preview?: any[];
}

// Chat types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// API Response types
export interface FileUploadResponse {
  file_id: string;
  filename: string;
  rows: number;
  columns: string[];
  preview: any[];
}

export interface FilePreviewResponse {
  rows: number;
  columns: string[];
  data: any[];
  dtypes: Record<string, string>;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

