// Store Setup: the store list, its filters, the modal and the company dropdown
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { storeService, Store } from "@/services/storeService";
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

export const useStores = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [stores, setStores] = useState<Store[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // company dropdown of the form, loaded when the form opens
  const [companies, setCompanies] = useState<IdOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadStores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await storeService.getStores({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setStores(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

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

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const response = await api.get("/configure/companies", { params: { status: 1, per_page: null, columns: ["id", "name"] } });
      setCompanies(idOptions(response.data.data.data));
    } catch (error) {
      console.error("Failed to fetch companies", error);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  const handleView = useCallback((store: Store) => {
    setSelectedStore(store);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((store: Store) => {
    setSelectedStore(store);
    setMode("edit");
    setBackendErrors({});
    loadCompanies();
    openModal();
  }, [openModal, loadCompanies]);

  const handleCreate = useCallback(() => {
    setSelectedStore(null);
    setMode("create");
    setBackendErrors({});
    loadCompanies();
    openModal();
  }, [openModal, loadCompanies]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedStore(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this Store to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await storeService.softDeleteStore(id);
      toast.success("Store moved to trashed!");
      await loadStores();
    } catch {
      toast.error("Failed to delete Store");
    }
  }, [confirm, loadStores]);

  // delete for ever (only a store in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Store?",
      text: "Are you sure you want to delete this Store? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await storeService.forceDeleteStore(id);
      toast.success("Store deleted successfully!");
      await loadStores();
    } catch {
      toast.error("Failed to delete Store");
    }
  }, [confirm, loadStores]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await storeService.restoreStore(id);
      toast.success("Store restored successfully!");
      await loadStores();
    } catch {
      toast.error("Failed to restore Store");
    }
  }, [loadStores]);

  const handleSave = useCallback(async (storeData: { name: string, company_id: number, code?: string, address?: string, status?: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedStore) {
        await storeService.updateStore(selectedStore.id, storeData);
        toast.success("Store updated successfully!");
      } else {
        await storeService.createStore(storeData);
        toast.success("Store created successfully!");
        // a new store is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadStores();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save Store"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedStore, loadStores, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all stores for the export, without paging
  async function exportAllStores() {
    const response = await storeService.getStores({});
    return response.data;
  }

  return {
    stores,
    companies,
    loadingCompanies,
    loading,
    saving,
    isOpen,
    selectedStore,
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
    exportAllStores,
    formatDate,
  };
};
