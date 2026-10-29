"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface AuthContextType {
  user: User | null;
  roles: string[];
  permissions: string[];
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await api.get('/user');
      setUser(response?.data?.user || null);
      setRoles(response?.data?.roles || []);
      setPermissions(response?.data?.permissions || []);
    } catch (error) {
      // Token invalid/expired → clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      const { user: userData, token, roles: userRoles, permissions: userPermissions } = response.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));

      setUser(userData);
      setRoles(userRoles || []);
      setPermissions(userPermissions || []);

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await api.post('/register', userData);
      const { user: newUser, token, roles: userRoles, permissions: userPermissions } = response.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(newUser));

      setUser(newUser);
      setRoles(userRoles || []);
      setPermissions(userPermissions || []);

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setRoles([]);
      setPermissions([]);
    }
  };

  // --- 🔥 Helpers (Super Admin bypass like Laravel) ---
  const hasRole = (role: string) => roles.includes(role);
  const hasPermission = (permission: string) => {
    if (roles.includes("Super Admin")) return true;
    return permissions.includes(permission);
  };

  const refreshUser = async () => {
  try {
    const response = await api.get("/user"); // should return user + roles + permissions
    setUser(response?.data?.user || null);
    setRoles(response?.data?.roles || []);
    setPermissions(response?.data?.permissions || []);
  } catch (error) {
    console.error("Failed to refresh user:", error);
  }
};

  const value: AuthContextType = {
    user,
    roles,
    permissions,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    hasRole,
    hasPermission,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
