import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";
import { ListResponse } from "@/services/roleService";

export interface Permission {
  id: number;
  module_id: number;
  menu_id: number;
  sub_menu_id: number;
  name: string;
  module_name: string;
  menu_name: string;
  sub_menu_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionFilters {
  page?: number;
  per_page?: number;
  name?: string;
  module_name?: string;
  menu_name?: string;
  sub_menu_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionPayload {
  name: string;
  module_id: number | null;
  menu_id: number | null;
  sub_menu_id: number | null;
}

class PermissionService {
  async getPermissions(filters: PermissionFilters = {}): Promise<ListResponse<Permission>> {
    const response = await api.get("/permissions", { params: removeEmpty({ ...filters }) });
    return response.data;
  }

  async createPermission(permissionData: PermissionPayload): Promise<Permission> {
    const response = await api.post("/permissions", permissionData);
    return response.data.data;
  }

  async updatePermission(id: number, permissionData: PermissionPayload): Promise<Permission> {
    const response = await api.put(`/permissions/${id}`, permissionData);
    return response.data.data;
  }

  async deletePermission(id: number): Promise<void> {
    await api.delete(`/permissions/${id}`);
  }
}

export const permissionService = new PermissionService();
