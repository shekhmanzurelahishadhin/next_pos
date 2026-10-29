// hooks/useUnits.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { unitService, Unit, UnitFilters, PaginatedResponse } from '@/services/unitService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
export const useUnits = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: string; label: string }[]>([]);

  // Modal state
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
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


  // Load units
  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: UnitFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Unit> = await unitService.getUnits(apiFilters);
      setUnits(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load units');
      console.error('Error loading units:', err);
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
    loadUnits();
  }, [loadUnits]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((unit: Unit) => {
    setSelectedUnit(unit);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((unit: Unit) => {
    setSelectedUnit(unit);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedUnit(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedUnit(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this unit to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousUnits: Unit[] = [];
    try {
      // Optimistic update
      previousUnits = [...units];
      setUnits(prev => prev.filter(unit => unit.id !== id));

      await unitService.softDeleteUnit(id);
      toast.success('Unit moved to trashed!');
      await loadUnits();
    } catch (err) {
      // Revert on error
      setUnits(previousUnits);
      toast.error('Failed to delete unit');
    }
  }, [confirm, units, loadUnits]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Unit?',
      text: 'Are you sure you want to delete this unit? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousUnits: Unit[] = [];
    try {
      // Optimistic update
      previousUnits = [...units];
      setUnits(prev => prev.filter(unit => unit.id !== id));

      await unitService.forceDeleteUnit(id);
      toast.success('Unit deleted successfully!');
      await loadUnits();
    } catch (err) {
      // Revert on error
      setUnits(previousUnits);
      toast.error('Failed to delete unit');
    }
  }, [confirm, units, loadUnits]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await unitService.restoreUnit(id);
      toast.success('Unit restored successfully!');
      await loadUnits();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore unit');
    }
  }, [units, loadUnits]);

  const handleSave = useCallback(async (unitData: { name: string, code: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedUnit) {
        await unitService.updateUnit(selectedUnit.id, unitData);
        toast.success('Unit updated successfully!');
      } else {
        await unitService.createUnit(unitData);
        toast.success('Unit created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadUnits();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save unit');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedUnit, loadUnits, handleCloseModal]);

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

  // Function to export all units
  const exportAllUnits = async () => {
    try {
      // Call API without pagination to get all data
      const response = await unitService.getUnits({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all units:', error);
      throw error;
    }
  };

  return {
    // State
    units,
    loading,
    saving,
    isOpen,
    selectedUnit,
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
    loadUnits,
    exportAllUnits,
    formatDate,
  };
};