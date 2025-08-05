import { vi } from 'vitest';
import { Project, FileUploadResponse, ChatResponse } from '../../types/index';

export const mockProject: Project = {
  id: 'test-project-123',
  name: 'Test Project',
  created_at: '2024-01-01T00:00:00',
  context: 'Test context',
  file_id: 'test-file-123',
  file_name: 'test.csv',
  file_columns: ['col1', 'col2', 'col3'],
};

export const mockFileUploadResponse: FileUploadResponse = {
  file_id: 'test-file-123',
  filename: 'test.csv',
  rows: 100,
  columns: ['col1', 'col2', 'col3'],
  preview: [
    { col1: 'value1', col2: 'value2', col3: 'value3' },
    { col1: 'value4', col2: 'value5', col3: 'value6' },
  ],
};

export const mockChatResponse: ChatResponse = {
  response: 'This is a mock AI response about your data.',
  timestamp: '2024-01-01T00:00:00',
};

export const mockApi = {
  createProject: vi.fn().mockResolvedValue(mockProject),
  listProjects: vi.fn().mockResolvedValue([mockProject]),
  getProject: vi.fn().mockResolvedValue(mockProject),
  uploadFile: vi.fn().mockResolvedValue(mockFileUploadResponse),
  previewFile: vi.fn().mockResolvedValue({
    rows: 100,
    columns: ['col1', 'col2', 'col3'],
    data: mockFileUploadResponse.preview,
    dtypes: { col1: 'string', col2: 'string', col3: 'string' },
  }),
  saveContext: vi.fn().mockResolvedValue({ status: 'saved', context: 'Test context' }),
  getContext: vi.fn().mockResolvedValue({ context: 'Test context' }),
  sendMessage: vi.fn().mockResolvedValue(mockChatResponse),
};

// Mock the api module
vi.mock('../../lib/api', () => ({
  api: mockApi,
}));