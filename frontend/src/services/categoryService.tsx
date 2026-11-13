import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

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
  async getCategories(filters: CategoryFilters = {}): Promise<PaginatedResponse<Category>> {
    // only these filters go to the API, and only when they have a value
    const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'slug', 'status', 'created_at', 'updated_at']);
    const response = await api.get('/configure/categories', { params: params });
    return response.data.data;
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