// Module / menu / sub menu filters of the Role Permissions and User Permissions pages
import { Option } from "@/lib/options";

export interface PermissionItem {
  name: string;
  module_name?: string;
  menu_name?: string;
  sub_menu_name?: string;
}

// a permission without a module, menu or sub menu is shown under these names
export function moduleOf(permission: PermissionItem): string {
  return permission.module_name || "Other";
}

export function menuOf(permission: PermissionItem): string {
  return permission.menu_name || "General";
}

export function subMenuOf(permission: PermissionItem): string {
  return permission.sub_menu_name || "Default";
}

// every module name once, in the order they come
export function moduleNames(permissions: PermissionItem[]): string[] {
  const names: string[] = [];
  for (const permission of permissions) {
    const name = moduleOf(permission);
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

// every menu name of one module once
export function menuNames(permissions: PermissionItem[], module: string): string[] {
  const names: string[] = [];
  for (const permission of permissions) {
    const name = menuOf(permission);
    if (moduleOf(permission) === module && !names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

// every sub menu name of one menu once
export function subMenuNames(permissions: PermissionItem[], module: string, menu: string): string[] {
  const names: string[] = [];
  for (const permission of permissions) {
    const name = subMenuOf(permission);
    if (moduleOf(permission) === module && menuOf(permission) === menu && !names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

// the first name, or "" when there is none
export function firstName(names: string[]): string {
  if (names.length > 0) {
    return names[0];
  }
  return "";
}

// The permissions of the picked module, and of the menu / sub menu when one is picked
export function filterPermissions<T extends PermissionItem>(permissions: T[], module: string, menu: string, subMenu: string): T[] {
  const list: T[] = [];
  if (!module) {
    return list;
  }

  for (const permission of permissions) {
    if (moduleOf(permission) !== module) {
      continue;
    }
    if (menu && menuOf(permission) !== menu) {
      continue;
    }
    if (subMenu && subMenuOf(permission) !== subMenu) {
      continue;
    }
    list.push(permission);
  }
  return list;
}

// names as select options; the "Default" sub menu is shown as "General"
export function nameOptions(names: string[]): Option[] {
  const options: Option[] = [];
  for (const name of names) {
    if (name === "Default") {
      options.push({ value: name, label: "General" });
    } else {
      options.push({ value: name, label: name });
    }
  }
  return options;
}
