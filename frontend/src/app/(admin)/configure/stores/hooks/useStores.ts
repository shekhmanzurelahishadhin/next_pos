// hooks/useStores.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { storeService, Store, StoreFilters, PaginatedResponse } from '@/services/storeService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
export const useStores = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [companies, setCompanies] = useState<{ value: number; label: string }[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
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


  // Load stores
  const loadStores = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: StoreFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Store> = await storeService.getStores(apiFilters);
      setStores(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load stores');
      console.error('Error loading stores:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  const fetchLookups = async () => {
    try {
      const type = "active_status";
      const res = await lookupService.getLookupByType(type);
      setStatus(res);
    } catch (error) {
      console.error("Failed to fetch lookups", error);
    }
  };

  const fetchCompanies = async () => {
   
    setLoadingCompanies(true);
    try {
      const res = await api.get("/configure/companies", { params: { status: 1, per_page: null, columns: ['id','name'] } });
      setCompanies(res.data.data.data.map((com) => ({ value: Number(com.id), label: com.name })));
      setLoadingCompanies(false);
    } catch (error) {
      console.error("Failed to fetch companies", error);
      setLoadingCompanies(false);
    }   
  };

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((store: Store) => {
    setSelectedStore(store);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((store: Store) => {
    setSelectedStore(store);
    setMode('edit');
    setBackendErrors({});
    fetchCompanies();
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedStore(null);
    setMode('create');
    setBackendErrors({});
    fetchCompanies();
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedStore(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this Store to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousStores: Store[] = [];
    try {
      // Optimistic update
      previousStores = [...stores];
      setStores(prev => prev.filter(store => store.id !== id));
      await storeService.softDeleteStore(id);
      toast.success('Store moved to trashed!');
      await loadStores();
    } catch (err) {
      // Revert on error
      setStores(previousStores);
      toast.error('Failed to delete Store');
    }
  }, [confirm, stores, loadStores]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Store?',
      text: 'Are you sure you want to delete this Store? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousStores: Store[] = [];
    try {
      // Optimistic update
      previousStores = [...stores];
      setStores(prev => prev.filter(store => store.id !== id));
      await storeService.forceDeleteStore(id);
      toast.success('Store deleted successfully!');
      await loadStores();
    } catch (err) {
      // Revert on error
      setStores(previousStores);
      toast.error('Failed to delete Store');
    }
  }, [confirm, stores, loadStores]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await storeService.restoreStore(id);
      toast.success('Store restored successfully!');
      await loadStores();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore Store');
    }
  }, [stores, loadStores]);

  const handleSave = useCallback(async (storeData: { name: string, company_id: number, code?: string, address?: string, status?: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});
      if (mode === 'edit' && selectedStore) {
        await storeService.updateStore(selectedStore.id, storeData);
        toast.success('Store updated successfully!');
      } else {
        await storeService.createStore(storeData);
        toast.success('Store created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }
      handleCloseModal();
      await loadStores();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save Store');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedStore, loadStores, handleCloseModal]);


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

  // Export all stores (no pagination)
  const exportAllStores = async () => {
    try {
      // Call API without pagination to get all data
      const response = await storeService.getStores({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all stores:', error);
      throw error;
    }
  };

  return {
    // State
    stores,
    companies,
    loadingCompanies,
    loading,
    saving,
    isOpen,
    selectedStore,
    mode,
    backendErrors,
    pagination,
    total,
    status,

    // Actions
    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleSoftDelete,
    handleForceDelete,
    handleRestore,
    handleSave,
    handleFilterChange,
    clearBackendErrors,
    resetToFirstPage,
    loadStores,
    exportAllStores,
    formatDate,
  };
};