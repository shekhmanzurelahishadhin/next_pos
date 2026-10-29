// hooks/useCompanies.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { companyService, Company, CompanyFilters, PaginatedResponse } from '@/services/companyService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
export const useCompanies = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
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


  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: CompanyFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Company> = await companyService.getCompanies(apiFilters);
      setCompanies(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load companies');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  const fetchLookups = async () => {
    try {
      const type = "active_status";
      const res = await lookupService.getLookupByType(type);
      console.log("Lookups fetched:", res);
      setStatus(res);
    } catch (error) {
      console.error("Failed to fetch lookups", error);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((company: Company) => {
    setSelectedCompany(company);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((company: Company) => {
    setSelectedCompany(company);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedCompany(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedCompany(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this company to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousCompanies: Company[] = [];
    try {
      // Optimistic update
      previousCompanies = [...companies];
      setCompanies(prev => prev.filter(company => company.id !== id));

      await companyService.softDeleteCompany(id);
      toast.success('Company moved to trashed!');
      await loadCompanies();
    } catch (err) {
      // Revert on error
      setCompanies(previousCompanies);
      toast.error('Failed to delete company');
    }
  }, [confirm, companies, loadCompanies]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Company?',
      text: 'Are you sure you want to delete this company? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousCompanies: Company[] = [];
    try {
      // Optimistic update
      previousCompanies = [...companies];
      setCompanies(prev => prev.filter(company => company.id !== id));

      await companyService.forceDeleteCompany(id);
      toast.success('Company deleted successfully!');
      await loadCompanies();
    } catch (err) {
      // Revert on error
      setCompanies(previousCompanies);
      toast.error('Failed to delete company');
    }
  }, [confirm, companies, loadCompanies]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await companyService.restoreCompany(id);
      toast.success('Company restored successfully!');
      await loadCompanies();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore company');
    }
  }, [companies, loadCompanies]);

  const handleSave = useCallback(async (companyData: { 
    name: string, 
    code: string, 
    phone: string, 
    address: string, 
    logo: string,
    default_currency: string, 
    timezone: string,
    email: string, 
    status: string 
  }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedCompany) {
        await companyService.updateCompany(selectedCompany.id, companyData);
        toast.success('Company updated successfully!');
      } else {
        await companyService.createCompany(companyData);
        toast.success('Company created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadCompanies();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save company');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedCompany, loadCompanies, handleCloseModal]);

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

  // Function to export all companies
  const exportAllCompanies = async () => {
    try {
      // Call API without pagination to get all data
      const response = await companyService.getCompanies({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all companies:', error);
      throw error;
    }
  };

  return {
    // State
    companies,
    loading,
    saving,
    isOpen,
    selectedCompany,
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
    loadCompanies,
    exportAllCompanies,
    formatDate,
  };
};