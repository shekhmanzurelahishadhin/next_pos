// Supplier Setup: the supplier list, its filters, the modal and the dropdowns of the form
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { supplierService, Supplier } from "@/services/supplierService";
import { lookupService } from "@/services/lookupService";

type IdOption = { value: number; label: string };

export const useSuppliers = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // dropdown lists of the supplier form
  const [status, setStatus] = useState<IdOption[]>([]);
  const [openingBalanceType, setOpeningBalanceType] = useState<IdOption[]>([]);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await supplierService.getSuppliers({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setSuppliers(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // the dropdown lists are loaded once
  useEffect(() => {
    async function loadLookups() {
      try {
        setStatus(await lookupService.getLookupByType("active_status"));
        setOpeningBalanceType(await lookupService.getLookupByType("transaction_type"));
      } catch {
        toast.error("Failed to load lookup data");
      }
    }
    loadLookups();
  }, []);

  const handleView = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedSupplier(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedSupplier(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this supplier to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await supplierService.softDeleteSupplier(id);
      toast.success("Supplier moved to trashed!");
      await loadSuppliers();
    } catch {
      toast.error("Failed to delete supplier");
    }
  }, [confirm, loadSuppliers]);

  // delete for ever (only a supplier in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Supplier?",
      text: "Are you sure you want to delete this supplier? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await supplierService.forceDeleteSupplier(id);
      toast.success("Supplier deleted successfully!");
      await loadSuppliers();
    } catch {
      toast.error("Failed to delete supplier");
    }
  }, [confirm, loadSuppliers]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await supplierService.restoreSupplier(id);
      toast.success("Supplier restored successfully!");
      await loadSuppliers();
    } catch {
      toast.error("Failed to restore supplier");
    }
  }, [loadSuppliers]);

  const handleSave = useCallback(async (supplierData: {
    name: string,
    code: string,
    phone: string,
    address: string,
    opening_balance_type: number,
    opening_balance: number,
    timezone: string,
    email: string,
    status: string
  }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedSupplier) {
        await supplierService.updateSupplier(selectedSupplier.id, supplierData);
        toast.success("Supplier updated successfully!");
      } else {
        await supplierService.createSupplier(supplierData);
        toast.success("Supplier created successfully!");
        // a new supplier is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadSuppliers();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save supplier"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedSupplier, loadSuppliers, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all suppliers for the export, without paging
  async function exportAllSuppliers() {
    const response = await supplierService.getSuppliers({});
    return response.data;
  }

  return {
    suppliers,
    loading,
    saving,
    isOpen,
    selectedSupplier,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    openingBalanceType,

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
    exportAllSuppliers,
    formatDate,
  };
};
