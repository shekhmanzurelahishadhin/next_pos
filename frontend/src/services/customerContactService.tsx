import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export interface CustomerContact {
  id: number;
  district: string;
  customer_name: string;
  contact_one: string;
  contact_two?: string | null;
  contact_three?: string | null;
  remarks?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CustomerContactFormData {
  district: string;
  customer_name: string;
  contact_one: string;
  contact_two?: string;
  contact_three?: string;
  remarks?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

export interface CustomerContactFilters {
  page?: number;
  per_page?: number;
  district?: string;
  customer_name?: string;
  contact?: string;
  remarks?: string;
  status?: string;
}

class CustomerContactService {
  async getContacts(filters: CustomerContactFilters = {}): Promise<PaginatedResponse<CustomerContact>> {
    // only the filled filters go to the API
    const response = await api.get('/sales/customers-contacts', { params: removeEmpty({ ...filters }) });
    return response.data.data;
  }

  async createContact(data: CustomerContactFormData): Promise<CustomerContact> {
    const response = await api.post('/sales/customers-contacts', data);
    return response.data.data;
  }

  async updateContact(id: number, data: CustomerContactFormData): Promise<CustomerContact> {
    const response = await api.put(`/sales/customers-contacts/${id}`, data);
    return response.data.data;
  }

  async softDeleteContact(id: number): Promise<void> {
    await api.post(`/sales/customers-contacts/trash/${id}`);
  }

  async forceDeleteContact(id: number): Promise<void> {
    await api.delete(`/sales/customers-contacts/${id}`);
  }

  async restoreContact(id: number): Promise<void> {
    await api.post(`/sales/customers-contacts/restore/${id}`);
  }
}

export const customerContactService = new CustomerContactService();
