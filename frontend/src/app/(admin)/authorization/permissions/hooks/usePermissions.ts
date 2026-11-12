// Permission Setup: the permission list, its filters, the modal and the module / menu / sub menu dropdowns
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { permissionService, Permission, PermissionPayload } from "@/services/permissionService";

type IdOption = { value: number; label: string };

// an id / name list from the API as select options
function idOptions(list: { id: number; name: string }[]): IdOption[] {
  const options: IdOption[] = [];
  for (const item of list) {
    options.push({ value: item.id, label: item.name });
  }
  return options;
}

export const usePermissions = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [modules, setModules] = useState<IdOption[]>([]);
  const [menus, setMenus] = useState<IdOption[]>([]);
  const [submenus, setSubmenus] = useState<IdOption[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [loadingSubmenus, setLoadingSubmenus] = useState(false);

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 30 });

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await permissionService.getPermissions({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setPermissions(response.data.items);
      setTotal(response.data.total);
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // the modules are loaded once, for the form
  useEffect(() => {
    async function loadModules() {
      try {
        setLoadingModules(true);
        const res = await api.get("/modules");
        setModules(idOptions(res.data));
      } catch {
        toast.error("Failed to load modules");
      } finally {
        setLoadingModules(false);
      }
    }
    loadModules();
  }, []);

  // the menus of one module; no module, no menus
  const fetchMenus = useCallback(async (moduleId: number | null) => {
    setSubmenus([]);
    if (!moduleId) {
      setMenus([]);
      return;
    }

    try {
      setLoadingMenus(true);
      const res = await api.get("/menus", { params: { module_id: moduleId } });
      setMenus(idOptions(res.data));
    } catch {
      toast.error("Failed to load menus");
    } finally {
      setLoadingMenus(false);
    }
  }, []);

  // the sub menus of one menu; no menu, no sub menus
  const fetchSubmenus = useCallback(async (menuId: number | null) => {
    if (!menuId) {
      setSubmenus([]);
      return;
    }

    try {
      setLoadingSubmenus(true);
      const res = await api.get("/sub-menus", { params: { menu_id: menuId } });
      setSubmenus(idOptions(res.data));
    } catch {
      toast.error("Failed to load submenus");
    } finally {
      setLoadingSubmenus(false);
    }
  }, []);

  const handleView = useCallback((permission: Permission) => {
    setSelectedPermission(permission);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((permission: Permission) => {
    setSelectedPermission(permission);
    setMode("edit");
    setBackendErrors({});
    setMenus([]);
    setSubmenus([]);
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedPermission(null);
    setMode("create");
    setBackendErrors({});
    setMenus([]);
    setSubmenus([]);
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedPermission(null);
    setMode("create");
    setBackendErrors({});
    setMenus([]);
    setSubmenus([]);
  }, [closeModal]);

  const handleDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Permission?",
      text: "Are you sure you want to delete this permission? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await permissionService.deletePermission(id);
      toast.success("Permission deleted successfully!");
      await loadPermissions();
    } catch {
      toast.error("Failed to delete permission");
    }
  }, [confirm, loadPermissions]);

  const handleSave = useCallback(async (permissionData: PermissionPayload) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedPermission) {
        await permissionService.updatePermission(selectedPermission.id, permissionData);
        toast.success("Permission updated successfully!");
      } else {
        await permissionService.createPermission(permissionData);
        toast.success("Permission created successfully!");
        // a new permission is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadPermissions();
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save permission"));
      }
    } finally {
      setSaving(false);
    }
  }, [mode, selectedPermission, loadPermissions, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all permissions for the export
  async function exportAllPermissions() {
    const response = await permissionService.getPermissions({ per_page: 100000 });
    return response.data.items;
  }

  return {
    permissions,
    loading,
    saving,
    isOpen,
    selectedPermission,
    mode,
    backendErrors,
    pagination,
    total,

    modules,
    menus,
    submenus,
    loadingModules,
    loadingMenus,
    loadingSubmenus,
    fetchMenus,
    fetchSubmenus,

    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleDelete,
    handleSave,
    handleFilterChange,
    exportAllPermissions,
  };
};
