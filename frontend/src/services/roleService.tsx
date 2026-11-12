import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at?: string;
  updated_at?: string;
}

// what the list APIs of roles, permissions and users send back
export interface ListResponse<T> {
  data: {
    items: T[];
    total: number;
    current_page: number;
    per_page: number;
  };
}

export interface RoleFilters {
  page?: number;
  per_page?: number;
  name?: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

class RoleService {
  // without per_page the API sends all roles
  async getRoles(filters: RoleFilters = {}): Promise<ListResponse<Role>> {
    const response = await api.get("/roles", { params: removeEmpty({ ...filters }) });
    return response.data;
  }

  async createRole(roleData: { name: string }): Promise<Role> {
    const response = await api.post("/roles", roleData);
    return response.data.data;
  }

  async updateRole(id: number, roleData: { name: string }): Promise<Role> {
    const response = await api.put(`/roles/${id}`, roleData);
    return response.data.data;
  }

  async deleteRole(id: number): Promise<void> {
    await api.delete(`/roles/${id}`);
  }
}

export const roleService = new RoleService();
