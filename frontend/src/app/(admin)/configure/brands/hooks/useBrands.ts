// Brand Setup: the brand list, its filters and the modal
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { brandService, Brand } from "@/services/brandService";
import { lookupService } from "@/services/lookupService";

export const useBrands = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      const response = await brandService.getBrands({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setBrands(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

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

  const handleView = useCallback((brand: Brand) => {
    setSelectedBrand(brand);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((brand: Brand) => {
    setSelectedBrand(brand);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedBrand(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedBrand(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this brand to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await brandService.softDeleteBrand(id);
      toast.success("Brand moved to trashed!");
      await loadBrands();
    } catch {
      toast.error("Failed to delete brand");
    }
  }, [confirm, loadBrands]);

  // delete for ever (only a brand in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Brand?",
      text: "Are you sure you want to delete this brand? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await brandService.forceDeleteBrand(id);
      toast.success("Brand deleted successfully!");
      await loadBrands();
    } catch {
      toast.error("Failed to delete brand");
    }
  }, [confirm, loadBrands]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await brandService.restoreBrand(id);
      toast.success("Brand restored successfully!");
      await loadBrands();
    } catch {
      toast.error("Failed to restore brand");
    }
  }, [loadBrands]);

  const handleSave = useCallback(async (brandData: { name: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedBrand) {
        await brandService.updateBrand(selectedBrand.id, brandData);
        toast.success("Brand updated successfully!");
      } else {
        await brandService.createBrand(brandData);
        toast.success("Brand created successfully!");
        // a new brand is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadBrands();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save brand"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedBrand, loadBrands, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all brands for the export, without paging
  async function exportAllBrands() {
    const response = await brandService.getBrands({});
    return response.data;
  }

  return {
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
    exportAllBrands,
    formatDate,
  };
};
