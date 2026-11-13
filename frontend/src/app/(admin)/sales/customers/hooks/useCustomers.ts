// Customer Setup: the customer list, its filters, the modal and the dropdowns of the form
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { customerService, Customer } from "@/services/customerService";
import { lookupService } from "@/services/lookupService";

type IdOption = { value: number; label: string };

// an id / name list from the API as select options
function idOptions(list: { id: number | string; name: string }[]): IdOption[] {
  const options: IdOption[] = [];
  for (const item of list) {
    options.push({ value: Number(item.id), label: item.name });
  }
  return options;
}

export const useCustomers = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // dropdown lists of the customer form
  const [status, setStatus] = useState<IdOption[]>([]);
  const [openingBalanceType, setOpeningBalanceType] = useState<IdOption[]>([]);
  const [customerTypes, setCustomerTypes] = useState<IdOption[]>([]);
  const [stores, setStores] = useState<IdOption[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerService.getCustomers({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setCustomers(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // the dropdown lists are loaded once
  useEffect(() => {
    async function loadLookups() {
      try {
        setStatus(await lookupService.getLookupByType("active_status"));
        setOpeningBalanceType(await lookupService.getLookupByType("transaction_type"));

        const typeResponse = await api.get("/configure/lookups", { params: { status: 1, type: "customer_type" } });
        setCustomerTypes(idOptions(typeResponse.data.data.data));

        const storeResponse = await api.get("/configure/stores", { params: { status: 1 } });
        setStores(idOptions(storeResponse.data.data.data));
      } catch {
        toast.error("Failed to load lookup data");
      }
    }
    loadLookups();
  }, []);

  const handleView = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedCustomer(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedCustomer(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this customer to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await customerService.softDeleteCustomer(id);
      toast.success("Customer moved to trashed!");
      await loadCustomers();
    } catch {
      toast.error("Failed to delete customer");
    }
  }, [confirm, loadCustomers]);

  // delete for ever (only a customer in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Customer?",
      text: "Are you sure you want to delete this customer? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await customerService.forceDeleteCustomer(id);
      toast.success("Customer deleted successfully!");
      await loadCustomers();
    } catch {
      toast.error("Failed to delete customer");
    }
  }, [confirm, loadCustomers]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await customerService.restoreCustomer(id);
      toast.success("Customer restored successfully!");
      await loadCustomers();
    } catch {
      toast.error("Failed to restore customer");
    }
  }, [loadCustomers]);

  const handleSave = useCallback(async (customerData: {
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

      if (mode === "edit" && selectedCustomer) {
        await customerService.updateCustomer(selectedCustomer.id, customerData);
        toast.success("Customer updated successfully!");
      } else {
        await customerService.createCustomer(customerData);
        toast.success("Customer created successfully!");
        // a new customer is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadCustomers();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save customer"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedCustomer, loadCustomers, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all customers for the export, without paging
  async function exportAllCustomers() {
    const response = await customerService.getCustomers({});
    return response.data;
  }

  return {
    customers,
    loading,
    saving,
    isOpen,
    selectedCustomer,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    openingBalanceType,
    customerTypes,
    stores,

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
    exportAllCustomers,
    formatDate,
  };
};
