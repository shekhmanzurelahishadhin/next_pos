import { api } from "@/lib/api";

export interface User {
  id: number;
  name: string;
  email: string;
  company_id: number;
  company: Record<string, CompanyDTO> | null;
  roles: number[];
  roles_name: string;
  created_at?: string;
  updated_at?: string;
}


export interface PaginatedResponse<T> {
  data: { 
    current_page: number;
    per_page: number;
    total?: number;
    items: T[]
   };
  total: number;
  current_page: number;
  per_page: number;
  total_pages?: number;
}

export interface UserFilters {
  search?: string;
  page?: number;
  per_page?: number;
  name?: string;
  email?: string;
  company?: string;
  roles_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoleDTO {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}



export interface companyDTO {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyDTO {
  id: number;
  name: string;
  slug: string | null;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo: string | null;
  default_currency: string | null;
  timezone: string | null;
  status: number;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}


class UserService {
  private getCacheKey(filters: UserFilters): string {
    return `users_${JSON.stringify(filters)}`;
  }


  async getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {

    const params = new URLSearchParams();
    
    // Common filter fields
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    // Specific filter fields
    if (filters.name) params.append('name', filters.name);
    if (filters.email) params.append('email', filters.email);
    if (filters.company) params.append('company', filters.company);
    if (filters.roles_name) params.append('roles_name', filters.roles_name);
    if (filters.created_at) params.append('created_at', filters.created_at);
    if (filters.updated_at) params.append('updated_at', filters.updated_at);
    
    const response = await api.get(`/users?${params}`);
    const result = response.data;

    return result;
  }

  async createUser(userData: { name: string }): Promise<User> {
    const response = await api.post('/users', userData);
    return response.data.data;
  }

  async updateUser(id: number, userData: { name: string }): Promise<User> {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.data;
  }

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  }


}

export const userService = new UserService();