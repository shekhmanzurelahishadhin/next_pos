// hooks/useSubCategories.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { subCategoryService, SubCategory, SubCategoryFilters, PaginatedResponse } from '@/services/subCategoryService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
export const useSubCategories = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [categories, setCategories] = useState<{ value: number; label: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
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


  // Load sub-categories
  const loadSubCategories = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: SubCategoryFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<SubCategory> = await subCategoryService.getSubCategories(apiFilters);
      setSubCategories(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load sub categories');
      console.error('Error loading sub categories:', err);
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

  const fetchCategories = async () => {
   
    setLoadingCategories(true);
    try {
      const res = await api.get("/configure/categories", { params: { status: 1, per_page: null, columns: ['id','name'] } });
      setCategories(res.data.data.data.map((cat) => ({ value: Number(cat.id), label: cat.name })));
      setLoadingCategories(false);
    } catch (error) {
      console.error("Failed to fetch categories", error);
      setLoadingCategories(false);
    }   
  };

  useEffect(() => {
    loadSubCategories();
  }, [loadSubCategories]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setMode('edit');
    setBackendErrors({});
    fetchCategories();
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedSubCategory(null);
    setMode('create');
    setBackendErrors({});
    fetchCategories();
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedSubCategory(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this Sub-Category to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousSubCategories: SubCategory[] = [];
    try {
      // Optimistic update
      previousSubCategories = [...subCategories];
      setSubCategories(prev => prev.filter(subCategory => subCategory.id !== id));
      await subCategoryService.softDeleteSubCategory(id);
      toast.success('Sub-Category moved to trashed!');
      await loadSubCategories();
    } catch (err) {
      // Revert on error
      setSubCategories(previousSubCategories);
      toast.error('Failed to delete Sub-Category');
    }
  }, [confirm, subCategories, loadSubCategories]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Sub-Category?',
      text: 'Are you sure you want to delete this Sub-Category? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousSubCategories: SubCategory[] = [];
    try {
      // Optimistic update
      previousSubCategories = [...subCategories];
      setSubCategories(prev => prev.filter(subCategory => subCategory.id !== id));
      await subCategoryService.forceDeleteSubCategory(id);
      toast.success('Sub-Category deleted successfully!');
      await loadSubCategories();
    } catch (err) {
      // Revert on error
      setSubCategories(previousSubCategories);
      toast.error('Failed to delete Sub-Category');
    }
  }, [confirm, subCategories, loadSubCategories]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await subCategoryService.restoreSubCategory(id);
      toast.success('Sub-Category restored successfully!');
      await loadSubCategories();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore Sub-Category');
    }
  }, [subCategories, loadSubCategories]);

  const handleSave = useCallback(async (subCategoryData: { name: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedSubCategory) {
        await subCategoryService.updateSubCategory(selectedSubCategory.id, subCategoryData);
        toast.success('Sub-Category updated successfully!');
      } else {
        await subCategoryService.createSubCategory(subCategoryData);
        toast.success('Sub-Category created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadSubCategories();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save Sub-Category');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedSubCategory, loadSubCategories, handleCloseModal]);

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

  // Export all sub-categories (no pagination)
  const exportAllSubCategories = async () => {
    try {
      // Call API without pagination to get all data
      const response = await subCategoryService.getSubCategories({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all sub categories:', error);
      throw error;
    }
  };

  return {
    // State
    subCategories,
    categories,
    loadingCategories,
    loading,
    saving,
    isOpen,
    selectedSubCategory,
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
    loadSubCategories,
    exportAllSubCategories,
    formatDate,
  };
};