// hooks/useBrands.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { brandService, Brand, BrandFilters, PaginatedResponse } from '@/services/brandService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
export const useBrands = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
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


  // Load brands
  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: BrandFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Brand> = await brandService.getBrands(apiFilters);
      setBrands(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load brands');
      console.error('Error loading brands:', err);
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
    loadBrands();
  }, [loadBrands]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((brand: Brand) => {
    setSelectedBrand(brand);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((brand: Brand) => {
    setSelectedBrand(brand);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedBrand(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedBrand(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this brand to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousBrands: Brand[] = [];
    try {
      // Optimistic update
      previousBrands = [...brands];
      setBrands(prev => prev.filter(brand => brand.id !== id));

      await brandService.softDeleteBrand(id);
      toast.success('Brand moved to trashed!');
      await loadBrands();
    } catch (err) {
      // Revert on error
      setBrands(previousBrands);
      toast.error('Failed to delete brand');
    }
  }, [confirm, brands, loadBrands]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Brand?',
      text: 'Are you sure you want to delete this brand? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousBrands: Brand[] = [];
    try {
      // Optimistic update
      previousBrands = [...brands];
      setBrands(prev => prev.filter(brand => brand.id !== id));

      await brandService.forceDeleteBrand(id);
      toast.success('Brand deleted successfully!');
      await loadBrands();
    } catch (err) {
      // Revert on error
      setBrands(previousBrands);
      toast.error('Failed to delete brand');
    }
  }, [confirm, brands, loadBrands]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await brandService.restoreBrand(id);
      toast.success('Brand restored successfully!');
      await loadBrands();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore brand');
    }
  }, [brands, loadBrands]);

  const handleSave = useCallback(async (brandData: { name: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedBrand) {
        await brandService.updateBrand(selectedBrand.id, brandData);
        toast.success('Brand updated successfully!');
      } else {
        await brandService.createBrand(brandData);
        toast.success('Brand created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadBrands();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save brand');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedBrand, loadBrands, handleCloseModal]);

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

  // Function to export all brands
  const exportAllBrands = async () => {
    try {
      // Call API without pagination to get all data
      const response = await brandService.getBrands({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all brands:', error);
      throw error;
    }
  };

  return {
    // State
    brands,
    loading,
    saving,
    isOpen,
    selectedBrand,
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
    loadBrands,
    exportAllBrands,
    formatDate,
  };
};