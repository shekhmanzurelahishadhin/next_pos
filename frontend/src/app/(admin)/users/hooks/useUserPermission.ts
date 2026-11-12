// User Permissions page: pick the direct permissions of one user, filtered by module / menu / sub menu
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage, Option } from "@/lib/options";
import { filterPermissions, firstName, menuNames, moduleNames, nameOptions, subMenuNames } from "@/lib/permissionFilters";
import { permissionAssignToUserService, Permission, User } from "@/services/permissionAssignToUserService";

export const useUserPermissions = (userId: string) => {
  const router = useRouter();
  const { refreshUser, user: currentUser } = useAuth();

  const [user, setUser] = useState<User | null>(null);
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
        const userResponse = await permissionAssignToUserService.getUser(Number(userId));
        const permissionResponse = await permissionAssignToUserService.getAllPermissions();
        const allPermissions = permissionResponse.data.items;

        setUser(userResponse.user);
        setSelectedPermissions(userResponse.permissions);
        setPermissions(allPermissions);

        // start on the first module, its first menu and that menu's first sub menu
        const firstModule = firstName(moduleNames(allPermissions));
        const firstMenu = firstName(menuNames(allPermissions, firstModule));
        setSelectedModule(firstModule);
        setSelectedMenu(firstMenu);
        setSelectedSubMenu(firstName(subMenuNames(allPermissions, firstModule, firstMenu)));
      } catch {
        toast.error("Failed to load user or permissions");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

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
      await permissionAssignToUserService.assignPermissions(Number(userId), selectedPermissions);
      toast.success("Permissions updated successfully");

      // when the logged in user changed its own permissions, its menus and buttons are loaded again
      if (currentUser && currentUser.id === Number(userId)) {
        await refreshUser();
      }

      router.push("/users");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update permissions"));
    } finally {
      setSaving(false);
    }
  }

  return {
    user,
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
