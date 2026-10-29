// hooks/useUserPermissions.ts
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { permissionAssignToRoleService, Permission, User } from '@/services/permissionAssignToUserService';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export const useUserPermissions = (userId: string) => {
  const router = useRouter();
  const { refreshUser, user: currentUser } = useAuth();

  // Data state
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [selectedMenu, setSelectedMenu] = useState<string>("");
  const [selectedSubMenu, setSelectedSubMenu] = useState<string>("");

  // Options for dropdowns
  const [moduleOptions, setModuleOptions] = useState<string[]>([]);
  const [menuOptions, setMenuOptions] = useState<string[]>([]);
  const [subMenuOptions, setSubMenuOptions] = useState<string[]>([]);

  // Filtered permissions
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);

  // Load user and permissions
  const loadUserPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, permissionsRes] = await Promise.all([
        permissionAssignToRoleService.getUser(parseInt(userId)),
        permissionAssignToRoleService.getAllPermissions({ per_page: 1000 })
      ]);

      setUser(userRes.user);
      setSelectedPermissions(userRes.permissions || []);
      processPermissions(permissionsRes.data.items || []);
    } catch (err) {
      toast.error('Failed to load user or permissions');
      console.error('Error loading user permissions:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Process permissions and extract options
  const processPermissions = (perms: Permission[]) => {
    setPermissions(perms);

    // Extract unique modules
    const modules = [...new Set(perms.map(p => p.module_name || "Other"))];
    setModuleOptions(modules);

    // Set default module selection if available
    if (modules.length > 0 && !selectedModule) {
      setSelectedModule(modules[0]);
    }
  };

  // Update menu options when module changes
  useEffect(() => {
    if (!selectedModule) return;

    const menus = [
      ...new Set(
        permissions
          .filter(p => (p.module_name || "Other") === selectedModule)
          .map(p => p.menu_name || "General")
      )
    ];
    setMenuOptions(menus);

    // Reset menu and submenu selections
    setSelectedMenu(menus.length > 0 ? menus[0] : "");
    setSelectedSubMenu("");
  }, [selectedModule, permissions]);

  // Update submenu options when menu changes
  useEffect(() => {
    if (!selectedModule || !selectedMenu) return;

    const submenus = [
      ...new Set(
        permissions
          .filter(p =>
            (p.module_name || "Other") === selectedModule &&
            (p.menu_name || "General") === selectedMenu
          )
          .map(p => p.sub_menu_name || "Default")
      )
    ];
    setSubMenuOptions(submenus);

    // Reset submenu selection
    setSelectedSubMenu(submenus.length > 0 ? submenus[0] : "");
  }, [selectedModule, selectedMenu, permissions]);

  // Update filtered permissions when any selection changes
  useEffect(() => {
    if (!selectedModule) {
      setFilteredPermissions([]);
      return;
    }

    let filtered = permissions.filter(p =>
      (p.module_name || "Other") === selectedModule
    );

    if (selectedMenu) {
      filtered = filtered.filter(p =>
        (p.menu_name || "General") === selectedMenu
      );
    }

    if (selectedSubMenu) {
      filtered = filtered.filter(p =>
        (p.sub_menu_name || "Default") === selectedSubMenu
      );
    }

    setFilteredPermissions(filtered);
  }, [selectedModule, selectedMenu, selectedSubMenu, permissions]);

  // Permission selection methods
  const togglePermission = (permissionName: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionName)
        ? prev.filter(p => p !== permissionName)
        : [...prev, permissionName]
    );
  };

  const selectAllFiltered = () => {
    const newPermissions = [...selectedPermissions];
    filteredPermissions.forEach(perm => {
      if (!newPermissions.includes(perm.name)) {
        newPermissions.push(perm.name);
      }
    });
    setSelectedPermissions(newPermissions);
  };

  const deselectAllFiltered = () => {
    const filteredPermNames = filteredPermissions.map(p => p.name);
    setSelectedPermissions(prev =>
      prev.filter(perm => !filteredPermNames.includes(perm))
    );
  };

  const selectAllPermissions = () => {
    const allPerms = permissions.map(p => p.name);
    setSelectedPermissions(allPerms);
  };

  const deselectAllPermissions = () => {
    setSelectedPermissions([]);
  };

  // Check if all filtered permissions are selected
  const areAllFilteredSelected = () => {
    if (filteredPermissions.length === 0) return false;
    return filteredPermissions.every(perm =>
      selectedPermissions.includes(perm.name)
    );
  };

  // Save permissions
  const handleSave = async () => {
    try {
      setSaving(true);
      await permissionAssignToRoleService.assignPermissions(parseInt(userId), {
        permissions: selectedPermissions
      });
      
      toast.success("Permissions updated successfully");

      // Refresh current user if they updated their own permissions
      if (currentUser && currentUser.id === parseInt(userId)) {
        await refreshUser();
      }
      
      router.push("/users");
      return true;
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to update permissions"
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Initialize
  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  return {
    // State
    user,
    permissions,
    selectedPermissions,
    loading,
    saving,
    filteredPermissions,
    
    // Filter state
    selectedModule,
    selectedMenu,
    selectedSubMenu,
    moduleOptions,
    menuOptions,
    subMenuOptions,
    
    // Actions
    setSelectedModule,
    setSelectedMenu,
    setSelectedSubMenu,
    togglePermission,
    selectAllFiltered,
    deselectAllFiltered,
    selectAllPermissions,
    deselectAllPermissions,
    areAllFilteredSelected,
    handleSave,
    
    // Navigation
    router,
  };
};