// User Setup: the user list, its filters, the modal and the company / role dropdowns
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { userService, User, UserPayload } from "@/services/userService";

type IdOption = { value: number; label: string };

// an id / name list from the API as select options
function idOptions(list: { id: number; name: string }[]): IdOption[] {
  const options: IdOption[] = [];
  for (const item of list) {
    options.push({ value: item.id, label: item.name });
  }
  return options;
}

export const useUsers = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [companies, setCompanies] = useState<IdOption[]>([]);
  const [roles, setRoles] = useState<IdOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 30 });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setUsers(response.data.items);
      setTotal(response.data.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // the active companies and all roles, for the form
  const loadCompaniesAndRoles = useCallback(async () => {
    try {
      setLoadingCompanies(true);
      setLoadingRoles(true);

      const companiesResponse = await api.get("/configure/companies", { params: { status: 1, columns: ["id", "name"] } });
      setCompanies(idOptions(companiesResponse.data.data.data));

      const rolesResponse = await api.get("/roles", { params: { columns: ["id", "name"] } });
      setRoles(idOptions(rolesResponse.data.data.items));
    } catch {
      toast.error("Failed to load companies or roles");
    } finally {
      setLoadingCompanies(false);
      setLoadingRoles(false);
    }
  }, []);

  const handleView = useCallback((user: User) => {
    setSelectedUser(user);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((user: User) => {
    loadCompaniesAndRoles();
    setSelectedUser(user);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal, loadCompaniesAndRoles]);

  const handleCreate = useCallback(() => {
    loadCompaniesAndRoles();
    setSelectedUser(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal, loadCompaniesAndRoles]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedUser(null);
    setCompanies([]);
    setRoles([]);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  const handleDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete User?",
      text: "Are you sure you want to delete this user? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await userService.deleteUser(id);
      toast.success("User deleted successfully!");
      await loadUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  }, [confirm, loadUsers]);

  const handleSave = useCallback(async (userData: UserPayload) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedUser) {
        await userService.updateUser(selectedUser.id, userData);
        toast.success("User updated successfully!");
      } else {
        await userService.createUser(userData);
        toast.success("User created successfully!");
        // a new user is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadUsers();
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save user"));
      }
    } finally {
      setSaving(false);
    }
  }, [mode, selectedUser, loadUsers, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all users for the export
  async function exportAllUsers() {
    const response = await userService.getUsers({ per_page: 100000 });
    return response.data.items;
  }

  return {
    users,
    loading,
    saving,
    isOpen,
    selectedUser,
    mode,
    backendErrors,
    pagination,
    total,

    companies,
    roles,
    loadingCompanies,
    loadingRoles,

    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleDelete,
    handleSave,
    handleFilterChange,
    exportAllUsers,
    formatDate,
  };
};
