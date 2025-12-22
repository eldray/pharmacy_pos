// src/api/auth.ts (Updated with better error handling)
import api from './api';
import { User } from '../types';

export const login = async (email: string, password: string): Promise<{ user: User; token: string } | null> => {
  try {
    console.log('Sending login request:', { email, password }); // Debug log
    
    const response = await api.post('/auth/login', { 
      email, 
      password 
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Login response:', response.data); // Debug log
    
    // Store token if successful
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    
    return null;
  }
};

export const verifyToken = async (token: string): Promise<User | null> => {
  try {
    const response = await api.get('/auth/me');
    return { ...response.data, token };
  } catch {
    return null;
  }
};

export const getDemoUsers = () => [
  { email: 'admin@pharmacy.com', password: 'admin123', role: 'admin' as const },
  { email: 'cashier@pharmacy.com', password: 'cashier123', role: 'cashier' as const },
  { email: 'officer@pharmacy.com', password: 'officer123', role: 'officer' as const },
];
