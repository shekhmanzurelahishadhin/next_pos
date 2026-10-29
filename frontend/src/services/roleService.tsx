import { api } from "@/lib/api";

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface Role {
  id: number;
  name: string;
  guard_name: string;
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

export interface RoleFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

class RoleService {
  private getCacheKey(filters: RoleFilters): string {
    return `roles_${JSON.stringify(filters)}`;
  }

  private setCache(key: string, data: any): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private getCache(key: string): any {
    const cached = cache.get(key);
    // check expiration
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    cache.delete(key); // expired → delete it
    return null;
  }

  async getRoles(filters: RoleFilters = {}): Promise<PaginatedResponse<Role>> {
    // Don't cache searches
    // if (!filters.search) {
    //   const cacheKey = this.getCacheKey(filters);
    //   const cached = this.getCache(cacheKey);
    //   console.log('RoleService.getRoles - cacheKey:', cacheKey, 'cached:', cached);
    //   if (cached) return cached;
    // }

    const params = new URLSearchParams();
    
    // Common filter fields
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    // Specific filter fields
    if (filters.name) params.append('name', filters.name);
    if (filters.guard_name) params.append('guard_name', filters.guard_name);
    if (filters.created_at) params.append('created_at', filters.created_at);
    if (filters.updated_at) params.append('updated_at', filters.updated_at);
    
    const response = await api.get(`/roles?${params}`);
    const result = response.data;

    // Cache non-search results
    // if (!filters.search) {
    //   const cacheKey = this.getCacheKey(filters);
    //   this.setCache(cacheKey, result);
    // }

    return result;
  }

  async createRole(roleData: { name: string }): Promise<Role> {
    // Clear cache on create
    // cache.clear();
    const response = await api.post('/roles', roleData);
    return response.data.data;
  }

  async updateRole(id: number, roleData: { name: string }): Promise<Role> {
    // Clear cache on update
    // cache.clear();
    const response = await api.put(`/roles/${id}`, roleData);
    return response.data.data;
  }

  async deleteRole(id: number): Promise<void> {
    // Clear cache on delete
    // cache.clear();
    await api.delete(`/roles/${id}`);
  }

  async getPermissions(roleId: number): Promise<{ role: Role; permissions: string[] }> {
    const response = await api.get(`/roles/${roleId}/permissions`);
    return response.data;
  }

  async assignPermissions(roleId: number, permissions: string[]): Promise<void> {
    await api.post(`/roles/${roleId}/assign-permissions`, { permissions });
  }
}

export const roleService = new RoleService();