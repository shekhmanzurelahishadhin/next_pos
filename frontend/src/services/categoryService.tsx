import { api } from "@/lib/api";

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface Category {
  id: number;
  name: string;
  slug: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
  total_pages?: number;
}

export interface CategoryFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  slug?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class CategoryService {
  private getCacheKey(filters: CategoryFilters): string {
    return `categories_${JSON.stringify(filters)}`;
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

  async getCategories(filters: CategoryFilters = {}): Promise<PaginatedResponse<Category>> {
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
    if (filters.slug) params.append('slug', filters.slug);
    if (filters.status) params.append('status', filters.status);
    if (filters.created_at) params.append('created_at', filters.created_at);
    if (filters.updated_at) params.append('updated_at', filters.updated_at);

    const response = await api.get(`/configure/categories?${params}`);
    const result = response.data.data;

    return result;
  }

  async createCategory(categoryData: { name: string}): Promise<Category> {

    const response = await api.post('/configure/categories', categoryData);
    return response.data.data;
  }

  async updateCategory(id: number, categoryData: { name: string, status: string }): Promise<Category> {

    const response = await api.put(`/configure/categories/${id}`, categoryData);
    return response.data.data;
  }

  async softDeleteCategory(id: number): Promise<void> {
    await api.post(`/configure/categories/trash/${id}`);
  }

  async forceDeleteCategory(id: number): Promise<void> {
    await api.delete(`/configure/categories/${id}`);
  }

  async restoreCategory(id: number): Promise<void> {
    await api.post(`/configure/categories/restore/${id}`);
  }
}

export const categoryService = new CategoryService();