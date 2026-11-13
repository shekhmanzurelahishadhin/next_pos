import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

export interface SubCategory {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  slug: string;
  status: number;
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

export interface SubCategoryFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  slug?: string;
  category_name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class SubCategoryService {
  async getSubCategories(filters: SubCategoryFilters = {}): Promise<PaginatedResponse<SubCategory>> {
    // only these filters go to the API, and only when they have a value
    const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'slug', 'category_name', 'status', 'created_at', 'updated_at']);
    const response = await api.get('/configure/sub-categories', { params: params });
    return response.data.data;
  }

  async createSubCategory(categoryData: { name: string, category_id: number }): Promise<SubCategory> {
    const response = await api.post('/configure/sub-categories', categoryData);
    return response.data.data;
  }

  async updateSubCategory(id: number, categoryData: { name: string, category_id: number, status: string }): Promise<SubCategory> {
    const response = await api.put(`/configure/sub-categories/${id}`, categoryData);
    return response.data.data;
  }

  async softDeleteSubCategory(id: number): Promise<void> {
    await api.post(`/configure/sub-categories/trash/${id}`);
  }

  async forceDeleteSubCategory(id: number): Promise<void> {
    await api.delete(`/configure/sub-categories/${id}`);
  }

  async restoreSubCategory(id: number): Promise<void> {
    await api.post(`/configure/sub-categories/restore/${id}`);
  }
}

export const subCategoryService = new SubCategoryService();