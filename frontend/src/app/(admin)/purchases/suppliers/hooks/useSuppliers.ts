// hooks/useSuppliers.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supplierService, Supplier, SupplierFilters, PaginatedResponse } from '@/services/supplierService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
export const useSuppliers = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);
  const [openingBalanceType, setOpeningBalanceType] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
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


  // Load suppliers
  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: SupplierFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Supplier> = await supplierService.getSuppliers(apiFilters);
      setSuppliers(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load suppliers');
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  
  const fetchLookups = useCallback(async () => {
  try {
    const [status, openingBalanceType] = await Promise.all([
      lookupService.getLookupByType("active_status"),
      lookupService.getLookupByType("transaction_type"),
    ]);

    setStatus(status);
    setOpeningBalanceType(openingBalanceType);

  } catch (err) {
    console.error("Failed to fetch lookups", err);
    toast.error("Failed to load lookup data");
  }
}, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedSupplier(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedSupplier(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this supplier to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousSuppliers: Supplier[] = [];
    try {
      // Optimistic update
      previousSuppliers = [...suppliers];
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));

      await supplierService.softDeleteSupplier(id);
      toast.success('Supplier moved to trashed!');
      await loadSuppliers();
    } catch (err) {
      // Revert on error
      setSuppliers(previousSuppliers);
      toast.error('Failed to delete supplier');
    }
  }, [confirm, suppliers, loadSuppliers]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Supplier?',
      text: 'Are you sure you want to delete this supplier? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousSuppliers: Supplier[] = [];
    try {
      // Optimistic update
      previousSuppliers = [...suppliers];
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));

      await supplierService.forceDeleteSupplier(id);
      toast.success('Supplier deleted successfully!');
      await loadSuppliers();
    } catch (err) {
      // Revert on error
      setSuppliers(previousSuppliers);
      toast.error('Failed to delete supplier');
    }
  }, [confirm, suppliers, loadSuppliers]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await supplierService.restoreSupplier(id);
      toast.success('Supplier restored successfully!');
      await loadSuppliers();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore supplier');
    }
  }, [suppliers, loadSuppliers]);

  const handleSave = useCallback(async (supplierData: { 
    name: string, 
    code: string, 
    phone: string, 
    address: string, 
    opening_balance_type: number, 
    opening_balance: number, 
    timezone: string,
    email: string, 
    status: string 
  }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedSupplier) {
        await supplierService.updateSupplier(selectedSupplier.id, supplierData);
        toast.success('Supplier updated successfully!');
      } else {
        await supplierService.createSupplier(supplierData);
        toast.success('Supplier created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadSuppliers();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save supplier');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedSupplier, loadSuppliers, handleCloseModal]);

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

  // Function to export all suppliers
  const exportAllSuppliers = async () => {
    try {
      // Call API without pagination to get all data
      const response = await supplierService.getSuppliers({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all suppliers:', error);
      throw error;
    }
  };

  return {
    // State
    suppliers,
    loading,
    saving,
    isOpen,
    selectedSupplier,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    openingBalanceType,

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
    loadSuppliers,
    exportAllSuppliers,
    formatDate,
  };
};