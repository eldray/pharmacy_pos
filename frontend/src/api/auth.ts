// src/api/auth.ts
import api from './api';
import { User } from '../types';

export const login = async (email: string, password: string): Promise<{ user: User; token: string } | null> => {
  try {
    const response = await api.post('/auth/login', { email, password }, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
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

// Demo users for quick-login — roles MUST match backend User model enum:
//   'admin' | 'manager' | 'pharmacist_sales' | 'cashier' | 'lab_tech'
export const getDemoUsers = () => [
  { email: 'admin@pharmacy.com', password: 'admin123', role: 'admin', name: 'Admin User' },
  { email: 'manager@pharmacy.com', password: 'manager123', role: 'manager', name: 'Manager User' },
  { email: 'pharmacist@pharmacy.com', password: 'pharmacist123', role: 'pharmacist_sales', name: 'Pharmacist (Sales)' },
  { email: 'cashier@pharmacy.com', password: 'cashier123', role: 'cashier', name: 'Cashier User' },
  { email: 'lab@pharmacy.com', password: 'lab123', role: 'lab_tech', name: 'Lab Technician' },
];