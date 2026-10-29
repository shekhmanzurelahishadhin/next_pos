import { api } from "@/lib/api";

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface Brand {
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

export interface BrandFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  slug?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class BrandService {
  private getCacheKey(filters: BrandFilters): string {
    return `brands_${JSON.stringify(filters)}`;
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

  async getBrands(filters: BrandFilters = {}): Promise<PaginatedResponse<Brand>> {

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

    const response = await api.get(`/configure/brands?${params}`);
    const result = response.data.data;

    return result;
  }

  async createBrand(brandData: { name: string}): Promise<Brand> {

    const response = await api.post('/configure/brands', brandData);
    return response.data.data;
  }

  async updateBrand(id: number, brandData: { name: string, status: string }): Promise<Brand> {

    const response = await api.put(`/configure/brands/${id}`, brandData);
    return response.data.data;
  }

  async softDeleteBrand(id: number): Promise<void> {
    await api.post(`/configure/brands/trash/${id}`);
  }

  async forceDeleteBrand(id: number): Promise<void> {
    await api.delete(`/configure/brands/${id}`);
  }

  async restoreBrand(id: number): Promise<void> {
    await api.post(`/configure/brands/restore/${id}`);
  }
}

export const brandService = new BrandService();