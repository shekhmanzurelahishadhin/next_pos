// hooks/usePermissions.ts
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { permissionService, Permission, PermissionFilters, PaginatedResponse } from '@/services/permissionService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';

export const usePermissions = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  // Data for dropdowns
  const [modules, setModules] = useState<{ value: number; label: string }[]>([]);
  const [menus, setMenus] = useState<{ value: number; label: string }[]>([]);
  const [submenus, setSubmenus] = useState<{ value: number; label: string }[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [loadingSubmenus, setLoadingSubmenus] = useState(false);

  // Filter and pagination state
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 30,
  });
  const [total, setTotal] = useState(0);

  // Load permissions
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: PermissionFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Permission> = await permissionService.getPermissions(apiFilters);
      setPermissions(response.data?.items);
      setTotal(response.data?.total);
    } catch (err) {
      toast.error('Failed to load permissions');
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  // Fetch modules
  const fetchModules = useCallback(async () => {
    if (modules.length > 0) return; // Prevent re-fetching if already loaded

    try {
      setLoadingModules(true);
      const res = await api.get("/modules");
      setModules(res.data.map((m: any) => ({ value: m.id, label: m.name })));
    } catch (err) {
      console.error("Failed to fetch modules", err);
      toast.error("Failed to load modules");
    } finally {
      setLoadingModules(false);
    }
  }, [modules.length]);

  // Fetch menus based on module ID
  const fetchMenus = useCallback(async (moduleId: number | null) => {
    if (!moduleId) {
      setMenus([]);
      setSubmenus([]);
      return;
    }

    try {
      setLoadingMenus(true);
      const res = await api.get(`/menus?module_id=${moduleId}`);
      setMenus(res.data.map((m: any) => ({ value: m.id, label: m.name })));
      setSubmenus([]); // Clear submenus when module changes
    } catch (err) {
      console.error("Failed to fetch menus", err);
      toast.error("Failed to load menus");
      setLoadingMenus(false);
    } finally {
      setLoadingMenus(false);
    }
  },[]);

  // Fetch submenus based on menu ID
  const fetchSubmenus = useCallback(async (menuId: number | null) => {
    if (!menuId) {
      setSubmenus([]);
      return;
    }

    try {
      setLoadingSubmenus(true);
      const res = await api.get(`/sub-menus?menu_id=${menuId}`);
      setSubmenus(res.data.map((s: any) => ({ value: s.id, label: s.name })));
    } catch (err) {
      console.error("Failed to fetch submenus", err);
      toast.error("Failed to load submenus");
      setLoadingSubmenus(false);
    } finally {
      setLoadingSubmenus(false);
    }
  },[]);

  // Load all initial data
  useEffect(() => {
    fetchModules();
    loadPermissions();
  }, [loadPermissions]);

  // Modal operations
  const handleView = useCallback(async (permission: Permission) => {
    setSelectedPermission(permission);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  // hooks/usePermissions.ts

  const handleEdit = useCallback(async (permission: Permission) => {
    console.log("Editing permission:", permission);
    setSelectedPermission(permission);
    setMode('edit');
    setBackendErrors({});

    setMenus([]);
    setSubmenus([]);

    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedPermission(null);
    setMode('create');
    setBackendErrors({});
    setMenus([]);
    setSubmenus([]);
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedPermission(null);
    setMode('create');
    setBackendErrors({});
    setMenus([]);
    setSubmenus([]);
  }, [closeModal]);

  // CRUD operations
  const handleDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Permission?',
      text: 'Are you sure you want to delete this permission? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousPermissions: Permission[] = [];
    try {
      // Optimistic update
      previousPermissions = [...permissions];
      setPermissions(prev => prev.filter(permission => permission.id !== id));

      await permissionService.deletePermission(id);
      toast.success('Permission deleted successfully!');
      await loadPermissions();
    } catch (err) {
      // Revert on error
      setPermissions(previousPermissions);
      toast.error('Failed to delete permission');
    }
  }, [confirm, permissions, loadPermissions]);

  const handleSave = useCallback(async (permissionData: {
    name: string;
    module_id: number | null;
    menu_id: number | null;
    sub_menu_id: number | null;
  }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedPermission) {
        await permissionService.updatePermission(selectedPermission.id, permissionData);
        toast.success('Permission updated successfully!');
      } else {
        await permissionService.createPermission(permissionData);
        toast.success('Permission created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadPermissions();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save permission');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedPermission, loadPermissions, handleCloseModal]);

  // Filter and search operations
  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Utility functions
  const clearBackendErrors = useCallback(() => {
    setBackendErrors({});
  }, []);

  const resetToFirstPage = useCallback(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Function to export all permissions
  const exportAllPermissions = async () => {
    return permissionService.getPermissions({
      per_page: 100000,
    }).then(res => res.data?.items);
  };

  return {
    // State
    permissions,
    loading,
    saving,
    isOpen,
    selectedPermission,
    mode,
    backendErrors,
    pagination,
    total,

    // Dropdown data
    modules,
    menus,
    submenus,
    loadingModules,
    loadingMenus,
    loadingSubmenus,

    // Data fetching functions
    fetchMenus,
    fetchSubmenus,

    // Actions
    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleDelete,
    handleSave,
    handleFilterChange,
    clearBackendErrors,
    resetToFirstPage,
    loadPermissions,
    exportAllPermissions,
  };
};