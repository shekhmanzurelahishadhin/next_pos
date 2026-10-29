// hooks/useCustomers.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { customerService, Customer, CustomerFilters, PaginatedResponse } from '@/services/customerService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
export const useCustomers = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);
  const [openingBalanceType, setOpeningBalanceType] = useState<{ value: number; label: string }[]>([]);
  const [customerTypes, setCustomerTypes] = useState<{ value: number; label: string }[]>([]);
  const [stores, setStores] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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


  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: CustomerFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Customer> = await customerService.getCustomers(apiFilters);
      setCustomers(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  
  const fetchLookups = useCallback(async () => {
  try {
    const [status, openingBalanceType, typeRes, storeRes] = await Promise.all([
      lookupService.getLookupByType("active_status"),
      lookupService.getLookupByType("transaction_type"),
      api.get("/configure/lookups", { params: { status: 1, type: "customer_type" } }),
      api.get("/configure/stores", { params: { status: 1 } }),
    ]);

    const toOptions = (rows: any[]) => rows.map((row) => ({ value: Number(row.id), label: row.name }));
    setCustomerTypes(toOptions(typeRes.data.data.data));
    setStores(toOptions(storeRes.data.data.data));

    setStatus(status);
    setOpeningBalanceType(openingBalanceType);

  } catch (err) {
    console.error("Failed to fetch lookups", err);
    toast.error("Failed to load lookup data");
  }
}, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedCustomer(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedCustomer(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this customer to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousCustomers: Customer[] = [];
    try {
      // Optimistic update
      previousCustomers = [...customers];
      setCustomers(prev => prev.filter(customer => customer.id !== id));

      await customerService.softDeleteCustomer(id);
      toast.success('Customer moved to trashed!');
      await loadCustomers();
    } catch (err) {
      // Revert on error
      setCustomers(previousCustomers);
      toast.error('Failed to delete customer');
    }
  }, [confirm, customers, loadCustomers]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Customer?',
      text: 'Are you sure you want to delete this customer? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousCustomers: Customer[] = [];
    try {
      // Optimistic update
      previousCustomers = [...customers];
      setCustomers(prev => prev.filter(customer => customer.id !== id));

      await customerService.forceDeleteCustomer(id);
      toast.success('Customer deleted successfully!');
      await loadCustomers();
    } catch (err) {
      // Revert on error
      setCustomers(previousCustomers);
      toast.error('Failed to delete customer');
    }
  }, [confirm, customers, loadCustomers]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await customerService.restoreCustomer(id);
      toast.success('Customer restored successfully!');
      await loadCustomers();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore customer');
    }
  }, [customers, loadCustomers]);

  const handleSave = useCallback(async (customerData: { 
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

      if (mode === 'edit' && selectedCustomer) {
        await customerService.updateCustomer(selectedCustomer.id, customerData);
        toast.success('Customer updated successfully!');
      } else {
        await customerService.createCustomer(customerData);
        toast.success('Customer created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadCustomers();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save customer');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedCustomer, loadCustomers, handleCloseModal]);

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

  // Function to export all customers
  const exportAllCustomers = async () => {
    try {
      // Call API without pagination to get all data
      const response = await customerService.getCustomers({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all customers:', error);
      throw error;
    }
  };

  return {
    // State
    customers,
    loading,
    saving,
    isOpen,
    selectedCustomer,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    openingBalanceType,
    customerTypes,
    stores,

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
    loadCustomers,
    exportAllCustomers,
    formatDate,
  };
};