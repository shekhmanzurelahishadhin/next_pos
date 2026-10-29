// hooks/usePpSpSetups.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ppSpSetupService, PpSpSetup, PpSpSetupFormData, PpSpSetupFilters, PaginatedResponse } from '@/services/ppSpSetupService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';

export const usePpSpSetups = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [setups, setSetups] = useState<PpSpSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedSetup, setSelectedSetup] = useState<PpSpSetup | null>(null);
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

  // Load setups
  const loadSetups = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: PpSpSetupFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<PpSpSetup> = await ppSpSetupService.getSetups(apiFilters);
      setSetups(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load PP/SP setups');
      console.error('Error loading PP/SP setups:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadSetups();
  }, [loadSetups]);

  // for active status lookup
  useEffect(() => {
    lookupService.getLookupByType("active_status")
      .then(setStatus)
      .catch((error) => console.error("Failed to fetch lookups", error));
  }, []);

  // Modal operations
  const openWith = useCallback((setup: PpSpSetup | null, newMode: 'view' | 'edit' | 'create') => {
    setSelectedSetup(setup);
    setMode(newMode);
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleView = useCallback((setup: PpSpSetup) => openWith(setup, 'view'), [openWith]);
  const handleEdit = useCallback((setup: PpSpSetup) => openWith(setup, 'edit'), [openWith]);
  const handleCreate = useCallback(() => openWith(null, 'create'), [openWith]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedSetup(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this setup to trash?',
    });
    if (!result.isConfirmed) return;

    try {
      await ppSpSetupService.softDeleteSetup(id);
      toast.success('Setup moved to trash!');
      await loadSetups();
    } catch (err) {
      toast.error('Failed to delete setup');
    }
  }, [confirm, loadSetups]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Setup?',
      text: 'Are you sure you want to delete this setup permanently? This action cannot be undone.',
    });
    if (!result.isConfirmed) return;

    try {
      await ppSpSetupService.forceDeleteSetup(id);
      toast.success('Setup deleted successfully!');
      await loadSetups();
    } catch (err) {
      toast.error('Failed to delete setup');
    }
  }, [confirm, loadSetups]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await ppSpSetupService.restoreSetup(id);
      toast.success('Setup restored successfully!');
      await loadSetups();
    } catch (err) {
      toast.error('Failed to restore setup');
    }
  }, [loadSetups]);

  const handleSave = useCallback(async (data: PpSpSetupFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedSetup) {
        await ppSpSetupService.updateSetup(selectedSetup.id, data);
        toast.success('Setup updated successfully!');
      } else {
        await ppSpSetupService.createSetup(data);
        toast.success('Setup created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadSetups();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : (messages as string);
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save setup');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedSetup, loadSetups, handleCloseModal]);

  // Filter operations
  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Export all setups (no pagination)
  const exportAllSetups = async () => {
    const response = await ppSpSetupService.getSetups({});
    return response.data;
  };

  return {
    // State
    setups,
    loading,
    saving,
    isOpen,
    selectedSetup,
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
    exportAllSetups,
    formatDate,
  };
};
