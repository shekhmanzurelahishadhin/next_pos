// PP/SP Setup: the price code list, its filters and the modal
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { ppSpSetupService, PpSpSetup, PpSpSetupFormData } from "@/services/ppSpSetupService";
import { lookupService } from "@/services/lookupService";

export const usePpSpSetups = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [setups, setSetups] = useState<PpSpSetup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  const [selectedSetup, setSelectedSetup] = useState<PpSpSetup | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadSetups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ppSpSetupService.getSetups({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setSetups(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load PP/SP setups");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadSetups();
  }, [loadSetups]);

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

  const handleView = useCallback((setup: PpSpSetup) => {
    setSelectedSetup(setup);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((setup: PpSpSetup) => {
    setSelectedSetup(setup);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedSetup(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedSetup(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this setup to trash?",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await ppSpSetupService.softDeleteSetup(id);
      toast.success("Setup moved to trash!");
      await loadSetups();
    } catch {
      toast.error("Failed to delete setup");
    }
  }, [confirm, loadSetups]);

  // delete for ever (only a setup in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Setup?",
      text: "Are you sure you want to delete this setup permanently? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await ppSpSetupService.forceDeleteSetup(id);
      toast.success("Setup deleted successfully!");
      await loadSetups();
    } catch {
      toast.error("Failed to delete setup");
    }
  }, [confirm, loadSetups]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await ppSpSetupService.restoreSetup(id);
      toast.success("Setup restored successfully!");
      await loadSetups();
    } catch {
      toast.error("Failed to restore setup");
    }
  }, [loadSetups]);

  const handleSave = useCallback(async (setupData: PpSpSetupFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedSetup) {
        await ppSpSetupService.updateSetup(selectedSetup.id, setupData);
        toast.success("Setup updated successfully!");
      } else {
        await ppSpSetupService.createSetup(setupData);
        toast.success("Setup created successfully!");
        // a new setup is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadSetups();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save setup"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedSetup, loadSetups, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all PP/SP setups for the export, without paging
  async function exportAllSetups() {
    const response = await ppSpSetupService.getSetups({});
    return response.data;
  }

  return {
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
