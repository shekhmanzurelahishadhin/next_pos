import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

export interface Location {
  id: number;
  name: string;
  code: string;
  store_id: number;
  store_name?: string;
  company_id?: number;
  company_name?: string;
  description?: string;
  status: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface LocationFormData {
  name: string;
  store_id: number | null;
  description?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

export interface LocationFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  code?: string;
  store_name?: string;
  status?: string;
}

class LocationService {
  async getLocations(filters: LocationFilters = {}): Promise<PaginatedResponse<Location>> {
    // only these filters go to the API, and only when they have a value
    const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'code', 'store_name', 'status']);
    const response = await api.get('/configure/locations', { params: params });
    return response.data.data;
  }

  async createLocation(data: LocationFormData): Promise<Location> {
    const response = await api.post('/configure/locations', data);
    return response.data.data;
  }

  async updateLocation(id: number, data: LocationFormData): Promise<Location> {
    const response = await api.put(`/configure/locations/${id}`, data);
    return response.data.data;
  }

  async softDeleteLocation(id: number): Promise<void> {
    await api.post(`/configure/locations/trash/${id}`);
  }

  async forceDeleteLocation(id: number): Promise<void> {
    await api.delete(`/configure/locations/${id}`);
  }

  async restoreLocation(id: number): Promise<void> {
    await api.post(`/configure/locations/restore/${id}`);
  }
}

export const locationService = new LocationService();
