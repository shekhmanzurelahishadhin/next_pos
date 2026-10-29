// hooks/useRoles.ts
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { roleService, Role, RoleFilters, PaginatedResponse } from '@/services/roleService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';

export const useRoles = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();
  
  // Data state
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});
  
  // Filter and pagination state
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [total, setTotal] = useState(0);
  

  // Load roles
  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: RoleFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Role> = await roleService.getRoles(apiFilters);
      setRoles(response.data?.items);
      setTotal(response.data?.total);
    } catch (err) {
      toast.error('Failed to load roles');
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Modal operations
  const handleView = useCallback((role: Role) => {
    setSelectedRole(role);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((role: Role) => {
    setSelectedRole(role);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedRole(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedRole(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Role?',
      text: 'Are you sure you want to delete this role? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousRoles: Role[] = [];
    try {
      // Optimistic update
      previousRoles = [...roles];
      setRoles(prev => prev.filter(role => role.id !== id));
      
      await roleService.deleteRole(id);
      toast.success('Role deleted successfully!');
      await loadRoles();
    } catch (err) {
      // Revert on error
      setRoles(previousRoles);
      toast.error('Failed to delete role');
    }
  }, [confirm, roles, loadRoles]);

  const handleSave = useCallback(async (roleData: { name: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedRole) {
        await roleService.updateRole(selectedRole.id, roleData);
        toast.success('Role updated successfully!');
      } else {
        await roleService.createRole(roleData);
        toast.success('Role created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadRoles();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save role');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedRole, loadRoles, handleCloseModal]);

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

    // Function to export all roles
    const exportAllRoles = async () => {
      try {
        // Call API without pagination to get all data
        const response = await roleService.getRoles({});
        return response.data?.items;
      } catch (error) {
        console.error('Error exporting all roles:', error);
        throw error;
      }
    };

  return {
    // State
    roles,
    loading,
    saving,
    isOpen,
    selectedRole,
    mode,
    backendErrors,
    pagination,
    total,
    
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
    loadRoles,
    exportAllRoles,
  };
};