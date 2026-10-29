import { api } from "@/lib/api";

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface Unit {
  id: number;
  name: string;
  slug: string;
  code: string;
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

export interface UnitFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  slug?: string;
  code?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class UnitService {
  private getCacheKey(filters: UnitFilters): string {
    return `units_${JSON.stringify(filters)}`;
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

  async getUnits(filters: UnitFilters = {}): Promise<PaginatedResponse<Unit>> {
    const params = new URLSearchParams();

    // Common filter fields
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    // Specific filter fields
    if (filters.name) params.append('name', filters.name);
    if (filters.slug) params.append('slug', filters.slug);
    if (filters.code) params.append('code', filters.code);
    if (filters.status) params.append('status', filters.status);
    if (filters.created_at) params.append('created_at', filters.created_at);
    if (filters.updated_at) params.append('updated_at', filters.updated_at);

    const response = await api.get(`/configure/units?${params}`);
    const result = response.data.data;

    return result;
  }

  async createUnit(unitData: { name: string, code: string }): Promise<Unit> {

    const response = await api.post('/configure/units', unitData);
    return response.data.data;
  }

  async updateUnit(id: number, unitData: { name: string, code: string, status: string }): Promise<Unit> {

    const response = await api.put(`/configure/units/${id}`, unitData);
    return response.data.data;
  }

  async softDeleteUnit(id: number): Promise<void> {
    await api.post(`/configure/units/trash/${id}`);
  }

  async forceDeleteUnit(id: number): Promise<void> {
    await api.delete(`/configure/units/${id}`);
  }

  async restoreUnit(id: number): Promise<void> {
    await api.post(`/configure/units/restore/${id}`);
  }
}

export const unitService = new UnitService();