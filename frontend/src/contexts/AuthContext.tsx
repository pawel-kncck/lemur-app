import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Set the token in the API client
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Try to get user info
        const response = await api.get('/api/auth/me');
        setUser(response.data);
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete api.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    // Use FormData for OAuth2 password flow
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const { access_token, refresh_token } = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    
    // Set authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    // Get user info
    const userResponse = await api.get('/api/auth/me');
    setUser(userResponse.data);
  };

  const register = async (email: string, password: string) => {
    const response = await api.post('/api/auth/register', {
      email,
      password,
    });

    const { access_token, refresh_token } = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    
    // Set authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    // Get user info
    const userResponse = await api.get('/api/auth/me');
    setUser(userResponse.data);
  };

  const logout = () => {
    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Clear authorization header
    delete api.defaults.headers.common['Authorization'];
    
    // Clear user state
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}