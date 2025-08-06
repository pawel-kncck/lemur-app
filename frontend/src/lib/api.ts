// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function for API calls
async function apiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// API functions
export const api = {
  // Projects
  createProject: async (name: string) => {
    return apiCall('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  listProjects: async () => {
    return apiCall('/api/projects');
  },

  getProject: async (projectId: string) => {
    return apiCall(`/api/projects/${projectId}`);
  },

  // Files
  uploadFile: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  },

  previewFile: async (fileId: string) => {
    return apiCall(`/api/files/${fileId}/preview`);
  },

  // Context
  saveContext: async (projectId: string, content: string) => {
    return apiCall(`/api/projects/${projectId}/context`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  },

  getContext: async (projectId: string) => {
    return apiCall(`/api/projects/${projectId}/context`);
  },

  // Chat
  sendMessage: async (projectId: string, message: string) => {
    return apiCall(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  },

  // Query Suggestions
  getSuggestions: async (projectId: string) => {
    return apiCall(`/api/projects/${projectId}/suggestions`);
  },

  // Code History
  getCodeHistory: async (projectId: string) => {
    return apiCall(`/api/projects/${projectId}/code-history`);
  },
};