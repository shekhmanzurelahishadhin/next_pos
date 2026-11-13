// Company Setup: the company list, its filters and the modal
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { companyService, Company } from "@/services/companyService";
import { lookupService } from "@/services/lookupService";

export const useCompanies = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await companyService.getCompanies({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setCompanies(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

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

  const handleView = useCallback((company: Company) => {
    setSelectedCompany(company);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((company: Company) => {
    setSelectedCompany(company);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedCompany(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedCompany(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this company to trash? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await companyService.softDeleteCompany(id);
      toast.success("Company moved to trashed!");
      await loadCompanies();
    } catch {
      toast.error("Failed to delete company");
    }
  }, [confirm, loadCompanies]);

  // delete for ever (only a company in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Company?",
      text: "Are you sure you want to delete this company? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await companyService.forceDeleteCompany(id);
      toast.success("Company deleted successfully!");
      await loadCompanies();
    } catch {
      toast.error("Failed to delete company");
    }
  }, [confirm, loadCompanies]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await companyService.restoreCompany(id);
      toast.success("Company restored successfully!");
      await loadCompanies();
    } catch {
      toast.error("Failed to restore company");
    }
  }, [loadCompanies]);

  const handleSave = useCallback(async (companyData: {
    name: string,
    code: string,
    phone: string,
    address: string,
    logo: string,
    default_currency: string,
    timezone: string,
    email: string,
    status: string
  }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedCompany) {
        await companyService.updateCompany(selectedCompany.id, companyData);
        toast.success("Company updated successfully!");
      } else {
        await companyService.createCompany(companyData);
        toast.success("Company created successfully!");
        // a new company is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadCompanies();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save company"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedCompany, loadCompanies, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all companies for the export, without paging
  async function exportAllCompanies() {
    const response = await companyService.getCompanies({});
    return response.data;
  }

  return {
    companies,
    loading,
    saving,
    isOpen,
    selectedCompany,
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
    exportAllCompanies,
    formatDate,
  };
};
