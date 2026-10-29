// hooks/useCategories.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { categoryService, Category, CategoryFilters, PaginatedResponse } from '@/services/categoryService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
export const useCategories = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // Modal state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
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


  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: CategoryFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Category> = await categoryService.getCategories(apiFilters);
      setCategories(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load categories');
      console.error('Error loading categories:', err);
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
    loadCategories();
  }, [loadCategories]);

  // for active status lookup
  useEffect(() => {
    fetchLookups();
  }, []);


  // Modal operations
  const handleView = useCallback((category: Category) => {
    setSelectedCategory(category);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((category: Category) => {
    setSelectedCategory(category);
    setMode('edit');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedCategory(null);
    setMode('create');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedCategory(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this category to trash? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;
    let previousCategories: Category[] = [];
    try {
      // Optimistic update
      previousCategories = [...categories];
      setCategories(prev => prev.filter(category => category.id !== id));

      await categoryService.softDeleteCategory(id);
      toast.success('Category moved to trashed!');
      await loadCategories();
    } catch (err) {
      // Revert on error
      setCategories(previousCategories);
      toast.error('Failed to delete category');
    }
  }, [confirm, categories, loadCategories]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Category?',
      text: 'Are you sure you want to delete this category? This action cannot be undone.',
    });

    if (!result.isConfirmed) return;

    let previousCategories: Category[] = [];
    try {
      // Optimistic update
      previousCategories = [...categories];
      setCategories(prev => prev.filter(category => category.id !== id));

      await categoryService.forceDeleteCategory(id);
      toast.success('Category deleted successfully!');
      await loadCategories();
    } catch (err) {
      // Revert on error
      setCategories(previousCategories);
      toast.error('Failed to delete category');
    }
  }, [confirm, categories, loadCategories]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await categoryService.restoreCategory(id);
      toast.success('Category restored successfully!');
      await loadCategories();
    } catch (err) {
      // Revert on error
      toast.error('Failed to restore category');
    }
  }, [categories, loadCategories]);

  const handleSave = useCallback(async (categoryData: { name: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedCategory) {
        await categoryService.updateCategory(selectedCategory.id, categoryData);
        toast.success('Category updated successfully!');
      } else {
        await categoryService.createCategory(categoryData);
        toast.success('Category created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadCategories();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save category');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedCategory, loadCategories, handleCloseModal]);

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

  // Function to export all categories
  const exportAllCategories = async () => {
    try {
      // Call API without pagination to get all data
      const response = await categoryService.getCategories({});
      return response.data;
    } catch (error) {
      console.error('Error exporting all roles:', error);
      throw error;
    }
  };

  return {
    // State
    categories,
    loading,
    saving,
    isOpen,
    selectedCategory,
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
    loadCategories,
    exportAllCategories,
    formatDate,
  };
};