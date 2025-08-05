import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../lib/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Reset environment variable
    import.meta.env.VITE_API_URL = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProject', () => {
    it('sends correct request to create project', async () => {
      const mockProject = { id: '123', name: 'Test Project' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      });

      const result = await api.createProject('Test Project');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test Project' }),
        }
      );
      expect(result).toEqual(mockProject);
    });

    it('throws error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(api.createProject('Test')).rejects.toThrow('API call failed: Bad Request');
    });
  });

  describe('listProjects', () => {
    it('fetches projects list', async () => {
      const mockProjects = [{ id: '1', name: 'Project 1' }, { id: '2', name: 'Project 2' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await api.listProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects',
        { headers: {} }
      );
      expect(result).toEqual(mockProjects);
    });
  });

  describe('getProject', () => {
    it('fetches specific project', async () => {
      const mockProject = { id: '123', name: 'Test Project' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      });

      const result = await api.getProject('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/123',
        { headers: {} }
      );
      expect(result).toEqual(mockProject);
    });
  });

  describe('uploadFile', () => {
    it('uploads file with FormData', async () => {
      const mockResponse = { file_id: 'file123', filename: 'test.csv' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const result = await api.uploadFile('project123', file);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/project123/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );

      // Verify FormData contents
      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as FormData;
      expect(formData.get('file')).toBe(file);

      expect(result).toEqual(mockResponse);
    });

    it('throws error on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      await expect(api.uploadFile('project123', file)).rejects.toThrow('Upload failed');
    });
  });

  describe('saveContext', () => {
    it('saves project context', async () => {
      const mockResponse = { status: 'saved', context: 'Test context' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.saveContext('project123', 'Test context');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/project123/context',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Test context' }),
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getContext', () => {
    it('fetches project context', async () => {
      const mockResponse = { context: 'Existing context' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getContext('project123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/project123/context',
        { headers: {} }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('sendMessage', () => {
    it('sends chat message', async () => {
      const mockResponse = { response: 'AI response', timestamp: '2024-01-01T00:00:00' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.sendMessage('project123', 'Test question');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects/project123/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Test question' }),
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('previewFile', () => {
    it('fetches file preview', async () => {
      const mockResponse = {
        rows: 100,
        columns: ['col1', 'col2'],
        data: [{ col1: 'val1', col2: 'val2' }],
        dtypes: { col1: 'string', col2: 'string' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.previewFile('file123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/files/file123/preview',
        { headers: {} }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('API URL configuration', () => {
    it('uses environment variable when set', async () => {
      import.meta.env.VITE_API_URL = 'https://api.example.com';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await api.listProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/projects',
        expect.any(Object)
      );
    });

    it('defaults to localhost when env not set', async () => {
      import.meta.env.VITE_API_URL = '';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await api.listProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/projects',
        expect.any(Object)
      );
    });
  });
});