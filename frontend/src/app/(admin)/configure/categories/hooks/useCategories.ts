// Category Setup: the category list, its filters and the modal
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { categoryService, Category } from "@/services/categoryService";
import { lookupService } from "@/services/lookupService";

export const useCategories = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.getCategories({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setCategories(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // the status dropdown is loaded once
  useEffect(() => {
    async function loadStatus() {
      try {
        setStatus(await lookupService.getLookupByType("active_status"));
      } catch (error) {
        console.error("Failed to fetch lookups", error);
      }
    }
    loadStatus();
  }, []);

  const handleView = useCallback((category: Category) => {
    setSelectedCategory(category);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((category: Category) => {
    setSelectedCategory(category);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedCategory(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedCategory(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this category to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await categoryService.softDeleteCategory(id);
      toast.success("Category moved to trashed!");
      await loadCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  }, [confirm, loadCategories]);

  // delete for ever (only a category in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Category?",
      text: "Are you sure you want to delete this category? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await categoryService.forceDeleteCategory(id);
      toast.success("Category deleted successfully!");
      await loadCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  }, [confirm, loadCategories]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await categoryService.restoreCategory(id);
      toast.success("Category restored successfully!");
      await loadCategories();
    } catch {
      toast.error("Failed to restore category");
    }
  }, [loadCategories]);

  const handleSave = useCallback(async (categoryData: { name: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedCategory) {
        await categoryService.updateCategory(selectedCategory.id, categoryData);
        toast.success("Category updated successfully!");
      } else {
        await categoryService.createCategory(categoryData);
        toast.success("Category created successfully!");
        // a new category is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadCategories();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save category"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedCategory, loadCategories, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all categories for the export, without paging
  async function exportAllCategories() {
    const response = await categoryService.getCategories({});
    return response.data;
  }

  return {
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
    exportAllCategories,
    formatDate,
  };
};
