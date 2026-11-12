// Role Setup: the role list, its filters and the add / edit / view modal
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { roleService, Role } from "@/services/roleService";

export const useRoles = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await roleService.getRoles({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRoles(response.data.items);
      setTotal(response.data.total);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleView = useCallback((role: Role) => {
    setSelectedRole(role);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((role: Role) => {
    setSelectedRole(role);
    setMode("edit");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedRole(null);
    setMode("create");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedRole(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  const handleDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Role?",
      text: "Are you sure you want to delete this role? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await roleService.deleteRole(id);
      toast.success("Role deleted successfully!");
      await loadRoles();
    } catch {
      toast.error("Failed to delete role");
    }
  }, [confirm, loadRoles]);

  const handleSave = useCallback(async (roleData: { name: string }) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedRole) {
        await roleService.updateRole(selectedRole.id, roleData);
        toast.success("Role updated successfully!");
      } else {
        await roleService.createRole(roleData);
        toast.success("Role created successfully!");
        // a new role is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadRoles();
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save role"));
      }
    } finally {
      setSaving(false);
    }
  }, [mode, selectedRole, loadRoles, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all roles for the export, without paging
  async function exportAllRoles() {
    const response = await roleService.getRoles({});
    return response.data.items;
  }

  return {
    roles,
    loading,
    saving,
    isOpen,
    selectedRole,
    mode,
    backendErrors,
    pagination,
    total,

    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleDelete,
    handleSave,
    handleFilterChange,
    exportAllRoles,
  };
};
