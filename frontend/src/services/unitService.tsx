import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

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
  async getUnits(filters: UnitFilters = {}): Promise<PaginatedResponse<Unit>> {
    // only these filters go to the API, and only when they have a value
    const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'slug', 'code', 'status', 'created_at', 'updated_at']);
    const response = await api.get('/configure/units', { params: params });
    return response.data.data;
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