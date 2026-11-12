// Role Permissions page: pick the permissions of one role, filtered by module / menu / sub menu
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage, Option } from "@/lib/options";
import { filterPermissions, firstName, menuNames, moduleNames, nameOptions, subMenuNames } from "@/lib/permissionFilters";
import { permissionAssignToRoleService, Permission, Role } from "@/services/permissionAssignToRoleService";

export const useRolePermissions = (roleId: string) => {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedModule, setSelectedModule] = useState("");
  const [selectedMenu, setSelectedMenu] = useState("");
  const [selectedSubMenu, setSelectedSubMenu] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const roleResponse = await permissionAssignToRoleService.getRole(Number(roleId));
        const permissionResponse = await permissionAssignToRoleService.getAllPermissions();
        const allPermissions = permissionResponse.data.items;

        setRole(roleResponse.role);
        setSelectedPermissions(roleResponse.permissions);
        setPermissions(allPermissions);

        // start on the first module, its first menu and that menu's first sub menu
        const firstModule = firstName(moduleNames(allPermissions));
        const firstMenu = firstName(menuNames(allPermissions, firstModule));
        setSelectedModule(firstModule);
        setSelectedMenu(firstMenu);
        setSelectedSubMenu(firstName(subMenuNames(allPermissions, firstModule, firstMenu)));
      } catch {
        toast.error("Failed to load role or permissions");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roleId]);

  // a new module starts on its first menu and that menu's first sub menu
  function changeModule(module: string) {
    const menu = firstName(menuNames(permissions, module));
    setSelectedModule(module);
    setSelectedMenu(menu);
    setSelectedSubMenu(firstName(subMenuNames(permissions, module, menu)));
  }

  // a new menu starts on its first sub menu
  function changeMenu(menu: string) {
    setSelectedMenu(menu);
    setSelectedSubMenu(firstName(subMenuNames(permissions, selectedModule, menu)));
  }

  function changeSubMenu(subMenu: string) {
    setSelectedSubMenu(subMenu);
  }

  // options of the three filter dropdowns
  const moduleOptions: Option[] = nameOptions(moduleNames(permissions));
  let menuOptions: Option[] = [];
  if (selectedModule) {
    menuOptions = nameOptions(menuNames(permissions, selectedModule));
  }
  let subMenuOptions: Option[] = [];
  if (selectedModule && selectedMenu) {
    subMenuOptions = [{ value: "", label: "All Submenus" }];
    for (const option of nameOptions(subMenuNames(permissions, selectedModule, selectedMenu))) {
      subMenuOptions.push(option);
    }
  }

  const filteredPermissions = filterPermissions(permissions, selectedModule, selectedMenu, selectedSubMenu);

  let allFilteredSelected = filteredPermissions.length > 0;
  for (const permission of filteredPermissions) {
    if (!selectedPermissions.includes(permission.name)) {
      allFilteredSelected = false;
    }
  }

  function togglePermission(permissionName: string) {
    if (selectedPermissions.includes(permissionName)) {
      setSelectedPermissions(selectedPermissions.filter((name) => name !== permissionName));
    } else {
      setSelectedPermissions([...selectedPermissions, permissionName]);
    }
  }

  function selectAllFiltered() {
    const names = [...selectedPermissions];
    for (const permission of filteredPermissions) {
      if (!names.includes(permission.name)) {
        names.push(permission.name);
      }
    }
    setSelectedPermissions(names);
  }

  function deselectAllFiltered() {
    const names: string[] = [];
    for (const name of selectedPermissions) {
      let isFiltered = false;
      for (const permission of filteredPermissions) {
        if (permission.name === name) {
          isFiltered = true;
        }
      }
      if (!isFiltered) {
        names.push(name);
      }
    }
    setSelectedPermissions(names);
  }

  function selectAllPermissions() {
    const names: string[] = [];
    for (const permission of permissions) {
      names.push(permission.name);
    }
    setSelectedPermissions(names);
  }

  function deselectAllPermissions() {
    setSelectedPermissions([]);
  }

  async function handleSave() {
    try {
      setSaving(true);
      await permissionAssignToRoleService.assignPermissions(Number(roleId), selectedPermissions);
      toast.success("Permissions updated successfully");

      // the logged in user may have this role, so its menus and buttons are loaded again
      await refreshUser();

      router.push("/authorization/roles");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update permissions"));
    } finally {
      setSaving(false);
    }
  }

  return {
    role,
    loading,
    saving,
    selectedPermissions,
    filteredPermissions,
    allFilteredSelected,

    selectedModule,
    selectedMenu,
    selectedSubMenu,
    moduleOptions,
    menuOptions,
    subMenuOptions,

    changeModule,
    changeMenu,
    changeSubMenu,
    togglePermission,
    selectAllFiltered,
    deselectAllFiltered,
    selectAllPermissions,
    deselectAllPermissions,
    handleSave,
    router,
  };
};
