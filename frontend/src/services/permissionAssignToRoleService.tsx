// Role Permissions page: the permissions of one role
import { api } from "@/lib/api";
import { ListResponse } from "@/services/roleService";

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  module_name?: string;
  menu_name?: string;
  sub_menu_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at?: string;
  updated_at?: string;
}

class PermissionAssignToRoleService {
  // the role and the names of its permissions
  async getRole(id: number): Promise<{ role: Role; permissions: string[] }> {
    const response = await api.get(`/roles/${id}/permissions`);
    return response.data;
  }

  async getAllPermissions(): Promise<ListResponse<Permission>> {
    const response = await api.get("/permissions", { params: { per_page: 1000 } });
    return response.data;
  }

  // the role gets exactly these permissions, the rest are taken away
  async assignPermissions(roleId: number, permissionNames: string[]): Promise<void> {
    await api.post(`/roles/${roleId}/permissions`, { permissions: permissionNames });
  }
}

export const permissionAssignToRoleService = new PermissionAssignToRoleService();
