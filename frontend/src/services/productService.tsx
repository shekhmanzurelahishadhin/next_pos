import { api } from "@/lib/api";

export interface Product {
  id: number;
  name: string;
  part_number: string;
  product_category_id: number;
  product_category_name?: string;
  sub_category_id?: number | null;
  sub_category_name?: string;
  brand_id: number;
  brand_name?: string;
  unit_id?: number | null;
  unit_name?: string;
  vehicle_brand_id?: number | null;
  vehicle_brand_name?: string;
  country_id?: number | null;
  country_name?: string;
  manufacturer_id?: number | null;
  manufacturer_name?: string;
  color_id?: number | null;
  color_name?: string;
  size_id?: number | null;
  size_name?: string;
  min_order_qty?: number | null;
  warranty?: string;
  features?: string;
  supported_models?: string;
  year_models?: string;
  model?: string;
  model_year?: string;
  engine?: string;
  chassis?: string;
  unit_weight?: string;
  alert_qty?: number | null;
  short_list_qty?: number | null;
  status: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface ProductFormData {
  name: string;
  part_number: string;
  product_category_id: number | null;
  sub_category_id?: number | null;
  brand_id: number | null;
  unit_id?: number | null;
  vehicle_brand_id?: number | null;
  country_id?: number | null;
  manufacturer_id?: number | null;
  color_id?: number | null;
  size_id?: number | null;
  min_order_qty?: number | null;
  warranty?: string;
  features?: string;
  supported_models?: string;
  year_models?: string;
  model?: string;
  model_year?: string;
  engine?: string;
  chassis?: string;
  unit_weight?: string;
  alert_qty?: number | null;
  short_list_qty?: number | null;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

export interface ProductFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  part_number?: string;
  model?: string;
  category_id?: string;
  sub_category_id?: string;
  brand_id?: string;
  unit_id?: string;
  status?: string;
}

class ProductService {
  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();

    // send every filter that has a value (column filters use the column id as the name)
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });

    const response = await api.get(`/configure/products?${params}`);
    return response.data.data;
  }

  async createProduct(data: ProductFormData): Promise<Product> {
    const response = await api.post('/configure/products', data);
    return response.data.data;
  }

  async updateProduct(id: number, data: ProductFormData): Promise<Product> {
    const response = await api.put(`/configure/products/${id}`, data);
    return response.data.data;
  }

  async softDeleteProduct(id: number): Promise<void> {
    await api.post(`/configure/products/trash/${id}`);
  }

  async forceDeleteProduct(id: number): Promise<void> {
    await api.delete(`/configure/products/${id}`);
  }

  async restoreProduct(id: number): Promise<void> {
    await api.post(`/configure/products/restore/${id}`);
  }
}

export const productService = new ProductService();
