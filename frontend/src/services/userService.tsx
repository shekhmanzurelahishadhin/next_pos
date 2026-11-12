import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";
import { ListResponse } from "@/services/roleService";

export interface User {
  id: number;
  name: string;
  email: string;
  company_id: number;
  // the company name
  company: string | null;
  // the role ids, and the role names joined with ", "
  roles: number[];
  roles_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserFilters {
  page?: number;
  per_page?: number;
  name?: string;
  email?: string;
  company?: string;
  roles_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPayload {
  name: string;
  email: string | null;
  password: string | null;
  password_confirmation: string | null;
  roles: number[] | null;
  company_id: number | null;
}

class UserService {
  async getUsers(filters: UserFilters = {}): Promise<ListResponse<User>> {
    const response = await api.get("/users", { params: removeEmpty({ ...filters }) });
    return response.data;
  }

  async createUser(userData: UserPayload): Promise<User> {
    const response = await api.post("/users", userData);
    return response.data.data;
  }

  async updateUser(id: number, userData: UserPayload): Promise<User> {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.data;
  }

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  }
}

export const userService = new UserService();
