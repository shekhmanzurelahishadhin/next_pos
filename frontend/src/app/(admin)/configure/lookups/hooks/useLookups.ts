// hooks/useLookups.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { lookupService, Lookup, LookupFilters, PaginatedResponse } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
export const useLookups = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [lookups, setLookups] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedLookup, setSelectedLookup] = useState<Lookup | null>(null);
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

  const [lookupTypes, setLookupTypes] = useState<{ value: string; label: string }[]>([]);
  const [lookupTypesLoading, setLookupTypesLoading] = useState(false);


  // Load lookups
  const loadLookups = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: LookupFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Lookup> = await lookupService.getLookups(apiFilters);
      setLookups(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load lookups');
      console.error('Error loading lookups:', err);
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
  const fetchLookupsTypes = async () => {
    try {
      setLookupTypesLoading(true);
      const res = await api.get("/configure/get-lookup-type/lists");

      setLookupTypes(
        res.data.map((m: any) => ({ value: m.value, label: m.label }))
      );
    } catch (error) {
      console.error("Failed to fetch lookupTypes", error);
    } finally {
      setLookupTypesLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((lookup: Lookup) => {
    setSelectedLookup(lookup);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((lookup: Lookup) => {
    setSelectedLookup(lookup);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedLookup(null);
    setMode('create');
    setBackendErrors({});
    openModal();
    fetchLookupsTypes();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedLookup(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this lookup to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousLookups: Lookup[] = [];
    try {
      // Optimistic update
      previousLookups = [...lookups];
      setLookups(prev => prev.filter(lookup => lookup.id !== id));

      await lookupService.softDeleteLookup(id);
      toast.success('Lookup moved to trashed!');
      await loadLookups();
    } catch (err) {
      // Revert on error
      setLookups(previousLookups);
      toast.error('Failed to delete lookup');
    }
  }, [confirm, lookups, loadLookups]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Lookup?',
      text: 'Are you sure you want to delete this lookup? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousLookups: Lookup[] = [];
    try {
      // Optimistic update
      previousLookups = [...lookups];
      setLookups(prev => prev.filter(lookup => lookup.id !== id));

      await lookupService.forceDeleteLookup(id);
      toast.success('Lookup deleted successfully!');
      await loadLookups();
    } catch (err) {
      // Revert on error
      setLookups(previousLookups);
      toast.error('Failed to delete lookup');
    }
  }, [confirm, lookups, loadLookups]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await lookupService.restoreLookup(id);
      toast.success('Lookup restored successfully!');
      await loadLookups();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore lookup');
    }
  }, [lookups, loadLookups]);

  const handleSave = useCallback(async (lookupData: { name: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedLookup) {
        await lookupService.updateLookup(selectedLookup.id, lookupData);
        toast.success('Lookup updated successfully!');
      } else {
        await lookupService.createLookup(lookupData);
        toast.success('Lookup created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadLookups();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save lookup');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedLookup, loadLookups, handleCloseModal]);

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

  // Function to export all lookups
  const exportAllLookups = async () => {
    try {
      // Call API without pagination to get all data
      const response = await lookupService.getLookups({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all lookups:', error);
      throw error;
    }
  };

  return {
    // State
    lookups,
    loading,
    saving,
    isOpen,
    selectedLookup,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    lookupTypes,
    lookupTypesLoading,

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
    loadLookups,
    exportAllLookups,
    formatDate,
  };
};