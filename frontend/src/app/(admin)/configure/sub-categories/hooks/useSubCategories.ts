// Sub Category Setup: the sub category list, its filters, the modal and the category dropdown
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { subCategoryService, SubCategory } from "@/services/subCategoryService";
import { lookupService } from "@/services/lookupService";

type IdOption = { value: number; label: string };

// an id / name list from the API as select options
function idOptions(list: { id: number | string; name: string }[]): IdOption[] {
  const result: IdOption[] = [];
  for (const item of list) {
    result.push({ value: Number(item.id), label: item.name });
  }
  return result;
}

export const useSubCategories = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // category dropdown of the form, loaded when the form opens
  const [categories, setCategories] = useState<IdOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadSubCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await subCategoryService.getSubCategories({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setSubCategories(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load sub categories");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadSubCategories();
  }, [loadSubCategories]);

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

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const response = await api.get("/configure/categories", { params: { status: 1, per_page: null, columns: ["id", "name"] } });
      setCategories(idOptions(response.data.data.data));
    } catch (error) {
      console.error("Failed to fetch categories", error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const handleView = useCallback((subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setMode("edit");
    setBackendErrors({});
    loadCategories();
    openModal();
  }, [openModal, loadCategories]);

  const handleCreate = useCallback(() => {
    setSelectedSubCategory(null);
    setMode("create");
    setBackendErrors({});
    loadCategories();
    openModal();
  }, [openModal, loadCategories]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedSubCategory(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this Sub-Category to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await subCategoryService.softDeleteSubCategory(id);
      toast.success("Sub-Category moved to trashed!");
      await loadSubCategories();
    } catch {
      toast.error("Failed to delete Sub-Category");
    }
  }, [confirm, loadSubCategories]);

  // delete for ever (only a sub-category in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Sub-Category?",
      text: "Are you sure you want to delete this Sub-Category? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await subCategoryService.forceDeleteSubCategory(id);
      toast.success("Sub-Category deleted successfully!");
      await loadSubCategories();
    } catch {
      toast.error("Failed to delete Sub-Category");
    }
  }, [confirm, loadSubCategories]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await subCategoryService.restoreSubCategory(id);
      toast.success("Sub-Category restored successfully!");
      await loadSubCategories();
    } catch {
      toast.error("Failed to restore Sub-Category");
    }
  }, [loadSubCategories]);

  const handleSave = useCallback(async (subCategoryData: { name: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedSubCategory) {
        await subCategoryService.updateSubCategory(selectedSubCategory.id, subCategoryData);
        toast.success("Sub-Category updated successfully!");
      } else {
        await subCategoryService.createSubCategory(subCategoryData);
        toast.success("Sub-Category created successfully!");
        // a new sub-category is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadSubCategories();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save Sub-Category"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedSubCategory, loadSubCategories, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all sub categories for the export, without paging
  async function exportAllSubCategories() {
    const response = await subCategoryService.getSubCategories({});
    return response.data;
  }

  return {
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
    exportAllSubCategories,
    formatDate,
  };
};
