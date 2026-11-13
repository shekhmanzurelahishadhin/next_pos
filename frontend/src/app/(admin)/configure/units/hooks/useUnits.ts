// Unit Setup: the unit list, its filters and the modal
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { unitService, Unit } from "@/services/unitService";
import { lookupService } from "@/services/lookupService";

export const useUnits = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [units, setUnits] = useState<Unit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: string; label: string }[]>([]);

  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await unitService.getUnits({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setUnits(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

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

  const handleView = useCallback((unit: Unit) => {
    setSelectedUnit(unit);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((unit: Unit) => {
    setSelectedUnit(unit);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedUnit(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedUnit(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this unit to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await unitService.softDeleteUnit(id);
      toast.success("Unit moved to trashed!");
      await loadUnits();
    } catch {
      toast.error("Failed to delete unit");
    }
  }, [confirm, loadUnits]);

  // delete for ever (only a unit in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Unit?",
      text: "Are you sure you want to delete this unit? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await unitService.forceDeleteUnit(id);
      toast.success("Unit deleted successfully!");
      await loadUnits();
    } catch {
      toast.error("Failed to delete unit");
    }
  }, [confirm, loadUnits]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await unitService.restoreUnit(id);
      toast.success("Unit restored successfully!");
      await loadUnits();
    } catch {
      toast.error("Failed to restore unit");
    }
  }, [loadUnits]);

  const handleSave = useCallback(async (unitData: { name: string, code: string, status: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedUnit) {
        await unitService.updateUnit(selectedUnit.id, unitData);
        toast.success("Unit updated successfully!");
      } else {
        await unitService.createUnit(unitData);
        toast.success("Unit created successfully!");
        // a new unit is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadUnits();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save unit"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedUnit, loadUnits, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all units for the export, without paging
  async function exportAllUnits() {
    const response = await unitService.getUnits({});
    return response.data;
  }

  return {
    units,
    loading,
    saving,
    isOpen,
    selectedUnit,
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
    exportAllUnits,
    formatDate,
  };
};
