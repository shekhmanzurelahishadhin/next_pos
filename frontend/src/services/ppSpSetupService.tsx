import { api } from "@/lib/api";

export const PP_SP_TYPES = [
  { value: 1, label: "Purchase Price" },
  { value: 2, label: "Sale Price" },
];

export interface PpSpSetup {
  id: number;
  type: number;
  type_name: string;
  codes: string[]; // index = digit 0-9
  status: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface PpSpSetupFormData {
  type: number | "";
  codes: string[];
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

export interface PpSpSetupFilters {
  page?: number;
  per_page?: number;
  type?: string;
  status?: string;
}

// Turn a price like 1250 into its code, e.g. ABEZ
export const convertPrice = (amount: string, codes: string[]) =>
  amount.split("").map((ch) => (/\d/.test(ch) && codes[Number(ch)] ? codes[Number(ch)] : ch)).join("");

class PpSpSetupService {
  async getSetups(filters: PpSpSetupFilters = {}): Promise<PaginatedResponse<PpSpSetup>> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);

    const response = await api.get(`/configure/pp-sp-setups?${params}`);
    return response.data.data;
  }

  async createSetup(data: PpSpSetupFormData): Promise<PpSpSetup> {
    const response = await api.post('/configure/pp-sp-setups', data);
    return response.data.data;
  }

  async updateSetup(id: number, data: PpSpSetupFormData): Promise<PpSpSetup> {
    const response = await api.put(`/configure/pp-sp-setups/${id}`, data);
    return response.data.data;
  }

  async softDeleteSetup(id: number): Promise<void> {
    await api.post(`/configure/pp-sp-setups/trash/${id}`);
  }

  async forceDeleteSetup(id: number): Promise<void> {
    await api.delete(`/configure/pp-sp-setups/${id}`);
  }

  async restoreSetup(id: number): Promise<void> {
    await api.post(`/configure/pp-sp-setups/restore/${id}`);
  }
}

export const ppSpSetupService = new PpSpSetupService();
