import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

export interface Store {
  id: number;
  name: string;
  company_id: number;
  code: string;
  slug: string;
  status: number;
  address: string;
  company_name?: string;
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

export interface StoreFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  code?: string;
  category_name?: string;
  address?: string;
  slug?: string;
  company_name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class StoreService {
  async getStores(filters: StoreFilters = {}): Promise<PaginatedResponse<Store>> {
    // only these filters go to the API, and only when they have a value
    const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'slug', 'company_name', 'code', 'address', 'status', 'created_at', 'updated_at']);
    const response = await api.get('/configure/stores', { params: params });
    return response.data.data;
  }

  async createStore(storeData: { name: string, company_id: number, code?: string, address?: string }): Promise<Store> {
    const response = await api.post('/configure/stores', storeData);
    return response.data.data;
  }

  async updateStore(id: number, storeData: { name: string, company_id: number, code?: string, address?: string, status?: string }): Promise<Store> {
    const response = await api.put(`/configure/stores/${id}`, storeData);
    return response.data.data;
  }

  async softDeleteStore(id: number): Promise<void> {
    await api.post(`/configure/stores/trash/${id}`);
  }

  async forceDeleteStore(id: number): Promise<void> {
    await api.delete(`/configure/stores/${id}`);
  }

  async restoreStore(id: number): Promise<void> {
    await api.post(`/configure/stores/restore/${id}`);
  }
}

export const storeService = new StoreService();