import { api } from "@/lib/api";

export interface Permission {
  id: number;
  module_id: number;
  menu_id: number;
  sub_menu_id: number;
  name: string;
  module_name: string;
  menu_name: string;
  sub_menu_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
  total_pages?: number;
}

export interface PermissionFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  module_name?: string;
  menu_name?: string;
  sub_menu_name?: string;
  created_at?: string;
  updated_at?: string;
}

class PermissionService {
  private getCacheKey(filters: PermissionFilters): string {
    return `permissions_${JSON.stringify(filters)}`;
  }


  async getPermissions(filters: PermissionFilters = {}): Promise<PaginatedResponse<Permission>> {

    const params = new URLSearchParams();
    
    // Common filter fields
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    // Specific filter fields
    if (filters.name) params.append('name', filters.name);
    if (filters.module_name) params.append('module_name', filters.module_name);
    if (filters.menu_name) params.append('menu_name', filters.menu_name);
    if (filters.sub_menu_name) params.append('sub_menu_name', filters.sub_menu_name);
    if (filters.created_at) params.append('created_at', filters.created_at);
    if (filters.updated_at) params.append('updated_at', filters.updated_at);
    
    const response = await api.get(`/permissions?${params}`);
    const result = response.data;

    return result;
  }

  async createPermission(permissionData: { name: string }): Promise<Permission> {
    const response = await api.post('/permissions', permissionData);
    return response.data.data;
  }

  async updatePermission(id: number, permissionData: { name: string }): Promise<Permission> {
    const response = await api.put(`/permissions/${id}`, permissionData);
    return response.data.data;
  }

  async deletePermission(id: number): Promise<void> {
    await api.delete(`/permissions/${id}`);
  }


}

export const permissionService = new PermissionService();