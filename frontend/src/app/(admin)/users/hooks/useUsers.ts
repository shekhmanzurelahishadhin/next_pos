// hooks/useUsers.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { userService, User, UserFilters, PaginatedResponse, RoleDTO, CompanyDTO } from '@/services/userService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';

export const useUsers = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  // Data for dropdowns
  const [companies, setCompanies] = useState<{ value: number; label: string }[]>([]);
  const [roles, setRoles] = useState<{ value: number; label: string }[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);


  // Filter and pagination state
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 30,
  });
  const [total, setTotal] = useState(0);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: UserFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<User> = await userService.getUsers(apiFilters);
      setUsers(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (err) {
      toast.error('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);


 const fetchCompaniesAndRoles = useCallback(async () => {
  try {
    setLoadingCompanies(true);
    setLoadingRoles(true);

    const [companiesRes, rolesRes] = await Promise.all([
      api.get("/configure/companies", { params: { status: 1, per_page: null, columns: ['id','name'] } }),
      api.get("/roles", { params: { per_page: null, columns: ['id','name'] } }),
    ]);

    setCompanies(companiesRes.data.data.data.map((c: CompanyDTO) => ({ value: c.id, label: c.name })));
    setRoles(rolesRes.data.data.items.map((r: RoleDTO) => ({ value: r.id, label: r.name })));

  } catch (err) {
    console.error("Failed to fetch companies or roles", err);
    toast.error("Failed to load companies or roles");
  } finally {
    setLoadingCompanies(false);
    setLoadingRoles(false);
  }
}, []);



  useEffect(() => {
    loadUsers();
  }, [loadUsers]);


  // Modal operations
  const handleView = useCallback(async (user: User) => {
    setSelectedUser(user);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  // hooks/useUsers.ts

  const handleEdit = useCallback(async (user: User) => {
    fetchCompaniesAndRoles();
    setSelectedUser(user);
    setMode('edit');
    setBackendErrors({});

    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedUser(null);
    setMode('create');
    setBackendErrors({});
    fetchCompaniesAndRoles();
    
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedUser(null);
    setCompanies([]);
    setRoles([]);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete User?',
      text: 'Are you sure you want to delete this user? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousUsers: User[] = [];
    try {
      // Optimistic update
      previousUsers = [...users];
      setUsers(prev => prev.filter(user => user.id !== id));

      await userService.deleteUser(id);
      toast.success('User deleted successfully!');
      await loadUsers();
    } catch (err) {
      // Revert on error
      setUsers(previousUsers);
      toast.error('Failed to delete user');
    }
  }, [confirm, users, loadUsers]);

  const handleSave = useCallback(async (userData: {
    name: string;
    email: string | null;
    password: string | null;
    password_confirmation: string | null;
    roles: number[] | null;
    company_id: number | null;
  }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedUser) {
        await userService.updateUser(selectedUser.id, userData);
        toast.success('User updated successfully!');
      } else {
        await userService.createUser(userData);
        toast.success('User created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadUsers();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save user');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedUser, loadUsers, handleCloseModal]);

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

  // Function to export all users
  const exportAllUsers = async () => {
    return userService.getUsers({
      per_page: 100000,
    }).then(res => res.data?.items);
  };


  return {
    // State
    users,
    loading,
    saving,
    isOpen,
    selectedUser,
    mode,
    backendErrors,
    pagination,
    total,
    // Data for dropdowns
    companies,
    roles,
    loadingCompanies,
    loadingRoles,

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
    loadUsers,
    exportAllUsers,
    formatDate,
  };
};