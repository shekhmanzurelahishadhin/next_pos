// hooks/useLocations.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { locationService, Location, LocationFormData, LocationFilters, PaginatedResponse } from '@/services/locationService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';

export const useLocations = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);
  const [stores, setStores] = useState<{ value: number; label: string }[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  // Modal state
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
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

  // Load locations
  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: LocationFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Location> = await locationService.getLocations(apiFilters);
      setLocations(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load locations');
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  const fetchLookups = async () => {
    try {
      const res = await lookupService.getLookupByType("active_status");
      setStatus(res);
    } catch (error) {
      console.error("Failed to fetch lookups", error);
    }
  };

  // Active stores for the form dropdown
  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const res = await api.get("/configure/stores", { params: { status: 1 } });
      setStores(res.data.data.data.map((store: any) => ({ value: Number(store.id), label: store.name })));
    } catch (error) {
      console.error("Failed to fetch stores", error);
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);

  // Modal operations
  const handleView = useCallback((location: Location) => {
    setSelectedLocation(location);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((location: Location) => {
    setSelectedLocation(location);
    setMode('edit');
    setBackendErrors({});
    fetchStores();
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedLocation(null);
    setMode('create');
    setBackendErrors({});
    fetchStores();
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedLocation(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this Location to trash?',
    });
    if (!result.isConfirmed) return;

    try {
      await locationService.softDeleteLocation(id);
      toast.success('Location moved to trash!');
      await loadLocations();
    } catch (err) {
      toast.error('Failed to delete Location');
    }
  }, [confirm, loadLocations]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Location?',
      text: 'Are you sure you want to delete this Location permanently? This action cannot be undone.',
    });
    if (!result.isConfirmed) return;

    try {
      await locationService.forceDeleteLocation(id);
      toast.success('Location deleted successfully!');
      await loadLocations();
    } catch (err) {
      toast.error('Failed to delete Location');
    }
  }, [confirm, loadLocations]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await locationService.restoreLocation(id);
      toast.success('Location restored successfully!');
      await loadLocations();
    } catch (err) {
      toast.error('Failed to restore Location');
    }
  }, [loadLocations]);

  const handleSave = useCallback(async (locationData: LocationFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedLocation) {
        await locationService.updateLocation(selectedLocation.id, locationData);
        toast.success('Location updated successfully!');
      } else {
        await locationService.createLocation(locationData);
        toast.success('Location created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadLocations();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : (messages as string);
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save Location');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedLocation, loadLocations, handleCloseModal]);

  // Filter and search operations
  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Export all locations (no pagination)
  const exportAllLocations = async () => {
    const response = await locationService.getLocations({});
    return response.data;
  };

  return {
    // State
    locations,
    loading,
    saving,
    isOpen,
    selectedLocation,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    stores,
    loadingStores,

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
    exportAllLocations,
    formatDate,
  };
};
