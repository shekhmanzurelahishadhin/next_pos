// User Permissions page: the direct permissions of one user
import { api } from "@/lib/api";
import { ListResponse } from "@/services/roleService";
import { Permission } from "@/services/permissionAssignToRoleService";

export type { Permission };

export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

class PermissionAssignToUserService {
  // the user and the names of its direct permissions
  async getUser(id: number): Promise<{ user: User; permissions: string[] }> {
    const response = await api.get(`/users/${id}/permissions`);
    return response.data;
  }

  async getAllPermissions(): Promise<ListResponse<Permission>> {
    const response = await api.get("/permissions", { params: { per_page: 1000 } });
    return response.data;
  }

  // the user gets exactly these direct permissions, the rest are taken away
  async assignPermissions(userId: number, permissionNames: string[]): Promise<void> {
    await api.post(`/users/${userId}/permissions`, { permissions: permissionNames });
  }
}

export const permissionAssignToUserService = new PermissionAssignToUserService();
