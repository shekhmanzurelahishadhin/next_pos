// Location Setup: the location list, its filters, the modal and the store dropdown
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { locationService, Location, LocationFormData } from "@/services/locationService";
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

export const useLocations = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  // store dropdown of the form, loaded when the form opens
  const [stores, setStores] = useState<IdOption[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await locationService.getLocations({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setLocations(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

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

  const loadStores = useCallback(async () => {
    setLoadingStores(true);
    try {
      const response = await api.get("/configure/stores", { params: { status: 1 } });
      setStores(idOptions(response.data.data.data));
    } catch (error) {
      console.error("Failed to fetch stores", error);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  const handleView = useCallback((location: Location) => {
    setSelectedLocation(location);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((location: Location) => {
    setSelectedLocation(location);
    setMode("edit");
    setBackendErrors({});
    loadStores();
    openModal();
  }, [openModal, loadStores]);

  const handleCreate = useCallback(() => {
    setSelectedLocation(null);
    setMode("create");
    setBackendErrors({});
    loadStores();
    openModal();
  }, [openModal, loadStores]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedLocation(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this Location to trash?",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await locationService.softDeleteLocation(id);
      toast.success("Location moved to trash!");
      await loadLocations();
    } catch {
      toast.error("Failed to delete Location");
    }
  }, [confirm, loadLocations]);

  // delete for ever (only a location in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Location?",
      text: "Are you sure you want to delete this Location permanently? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await locationService.forceDeleteLocation(id);
      toast.success("Location deleted successfully!");
      await loadLocations();
    } catch {
      toast.error("Failed to delete Location");
    }
  }, [confirm, loadLocations]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await locationService.restoreLocation(id);
      toast.success("Location restored successfully!");
      await loadLocations();
    } catch {
      toast.error("Failed to restore Location");
    }
  }, [loadLocations]);

  const handleSave = useCallback(async (locationData: LocationFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedLocation) {
        await locationService.updateLocation(selectedLocation.id, locationData);
        toast.success("Location updated successfully!");
      } else {
        await locationService.createLocation(locationData);
        toast.success("Location created successfully!");
        // a new location is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadLocations();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save Location"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedLocation, loadLocations, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all locations for the export, without paging
  async function exportAllLocations() {
    const response = await locationService.getLocations({});
    return response.data;
  }

  return {
    locations,
    stores,
    loadingStores,
    loading,
    saving,
    isOpen,
    selectedLocation,
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
    exportAllLocations,
    formatDate,
  };
};
