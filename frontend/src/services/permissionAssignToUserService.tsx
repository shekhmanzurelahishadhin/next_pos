// services/permissionAssignToRoleService.ts
import { api } from "@/lib/api";

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  module_name?: string;
  menu_name?: string;
  sub_menu_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: {
    current_page: number;
    per_page: number;
    total?: number;
    items: T[];
  };
  total: number;
  current_page: number;
  per_page: number;
  total_pages?: number;
}

export interface PermissionFilters {
  search?: string;
  page?: number;
  per_page?: number;
  module_name?: string;
  menu_name?: string;
  sub_menu_name?: string;
}

export interface AssignPermissionsDTO {
  permissions: string[];
}

class PermissionAssignToRoleService {
  async getUser(id: number): Promise<{ user: User; permissions: string[] }> {
    const response = await api.get(`/users/${id}/permissions`);
    return response.data;
  }

  async getAllPermissions(filters: PermissionFilters = {}): Promise<PaginatedResponse<Permission>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.module_name) params.append('module_name', filters.module_name);
    if (filters.menu_name) params.append('menu_name', filters.menu_name);
    if (filters.sub_menu_name) params.append('sub_menu_name', filters.sub_menu_name);
    
    const response = await api.get(`/permissions?${params}`);
    return response.data;
  }

  async assignPermissions(userId: number, data: AssignPermissionsDTO): Promise<void> {
    await api.post(`/users/${userId}/permissions`, data);
  }
}

export const permissionAssignToRoleService = new PermissionAssignToRoleService();