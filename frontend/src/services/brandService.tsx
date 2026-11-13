import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

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
  async getBrands(filters: BrandFilters = {}): Promise<PaginatedResponse<Brand>> {
    // only these filters go to the API, and only when they have a value
    const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'slug', 'status', 'created_at', 'updated_at']);
    const response = await api.get('/configure/brands', { params: params });
    return response.data.data;
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