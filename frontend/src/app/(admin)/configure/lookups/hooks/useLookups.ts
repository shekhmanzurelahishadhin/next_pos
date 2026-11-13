// Lookup Setup: the lookup list, its filters, the modal and the lookup type dropdown
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { lookupService, Lookup } from "@/services/lookupService";

export const useLookups = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [lookups, setLookups] = useState<Lookup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // lookup type dropdown of the "new lookup" form, loaded when that form opens
  const [lookupTypes, setLookupTypes] = useState<{ value: string; label: string }[]>([]);
  const [lookupTypesLoading, setLookupTypesLoading] = useState(false);

  const [selectedLookup, setSelectedLookup] = useState<Lookup | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadLookups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await lookupService.getLookups({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setLookups(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load lookups");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

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

  const loadLookupTypes = useCallback(async () => {
    setLookupTypesLoading(true);
    try {
      const response = await api.get("/configure/get-lookup-type/lists");
      const types: { value: string; label: string }[] = [];
      for (const type of response.data) {
        types.push({ value: type.value, label: type.label });
      }
      setLookupTypes(types);
    } catch (error) {
      console.error("Failed to fetch lookupTypes", error);
    } finally {
      setLookupTypesLoading(false);
    }
  }, []);

  const handleView = useCallback((lookup: Lookup) => {
    setSelectedLookup(lookup);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((lookup: Lookup) => {
    setSelectedLookup(lookup);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedLookup(null);
    setMode("create");
    setBackendErrors({});
    openModal();
    loadLookupTypes();
  }, [openModal, loadLookupTypes]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedLookup(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this lookup to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await lookupService.softDeleteLookup(id);
      toast.success("Lookup moved to trashed!");
      await loadLookups();
    } catch {
      toast.error("Failed to delete lookup");
    }
  }, [confirm, loadLookups]);

  // delete for ever (only a lookup in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Lookup?",
      text: "Are you sure you want to delete this lookup? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await lookupService.forceDeleteLookup(id);
      toast.success("Lookup deleted successfully!");
      await loadLookups();
    } catch {
      toast.error("Failed to delete lookup");
    }
  }, [confirm, loadLookups]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await lookupService.restoreLookup(id);
      toast.success("Lookup restored successfully!");
      await loadLookups();
    } catch {
      toast.error("Failed to restore lookup");
    }
  }, [loadLookups]);

  const handleSave = useCallback(async (lookupData: { name: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedLookup) {
        await lookupService.updateLookup(selectedLookup.id, lookupData);
        toast.success("Lookup updated successfully!");
      } else {
        await lookupService.createLookup(lookupData);
        toast.success("Lookup created successfully!");
        // a new lookup is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadLookups();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save lookup"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedLookup, loadLookups, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all lookups for the export, without paging
  async function exportAllLookups() {
    const response = await lookupService.getLookups({});
    return response.data;
  }

  return {
    lookups,
    loading,
    saving,
    isOpen,
    selectedLookup,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    lookupTypes,
    lookupTypesLoading,

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
    exportAllLookups,
    formatDate,
  };
};
