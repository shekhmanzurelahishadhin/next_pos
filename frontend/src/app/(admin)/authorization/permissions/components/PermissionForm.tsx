"use client";

import { useForm, Controller } from "react-hook-form";
import { useEffect } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import ReactSelect from "@/components/form/ReactSelect";
import { Permission } from "@/services/permissionService";

interface PermissionFormData {
  name: string;
  module_id: number | null;
  menu_id: number | null;
  sub_menu_id: number | null;
}

interface PermissionFormProps {
  permission?: Permission | null;
  mode: "create" | "edit";
  saving: boolean;
  onSubmit: (permissionData: PermissionFormData) => void;
  backendErrors?: Record<string, string>;
  modules: { value: number; label: string }[];
  menus: { value: number; label: string }[];
  submenus: { value: number; label: string }[];
  loadingModules: boolean;
  loadingMenus: boolean;
  loadingSubmenus: boolean;
  fetchMenus: (moduleId: number | null) => void;
  fetchSubmenus: (menuId: number | null) => void;
}

export function PermissionForm({
  permission,
  mode,
  saving,
  onSubmit,
  backendErrors,
  modules,
  menus,
  submenus,
  loadingModules,
  loadingMenus,
  loadingSubmenus,
  fetchMenus,
  fetchSubmenus,
}: PermissionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
  } = useForm<PermissionFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      module_id: null,
      menu_id: null,
      sub_menu_id: null,
    },
  });

  const watchedModuleId = watch("module_id");
  const watchedMenuId = watch("menu_id");

  /* ----------------------------------------
   * Handle module change
   * ---------------------------------------- */
  useEffect(() => {
    if (!watchedModuleId) {
      setValue("menu_id", null);
      setValue("sub_menu_id", null);
      return;
    }


    fetchMenus(watchedModuleId);
    if (mode === "create") {
      setValue("menu_id", null);
      setValue("sub_menu_id", null);
    }
  }, [watchedModuleId, setValue]);

  /* ----------------------------------------
   * Handle menu change
   * ---------------------------------------- */
  useEffect(() => {
    if (!watchedMenuId) {
      setValue("sub_menu_id", null);
      return;
    }


    fetchSubmenus(watchedMenuId);
    if (mode === "create") {
      setValue("sub_menu_id", null);
    }
  }, [watchedMenuId, setValue]);

  /* ----------------------------------------
   * Backend validation errors
   * ---------------------------------------- */
  useEffect(() => {
    if (!backendErrors) return;

    clearErrors();
    Object.entries(backendErrors).forEach(([field, message]) => {
      setError(field as keyof PermissionFormData, {
        type: "server",
        message: Array.isArray(message) ? message[0] : message,
      });
    });
  }, [backendErrors, clearErrors, setError]);

  /* ----------------------------------------
   * Edit mode: load permission once
   * ---------------------------------------- */
  useEffect(() => {
    if (!permission) return;

    reset({
      name: permission.name ?? "",
      module_id: permission.module_id ?? null,
      menu_id: permission.menu_id ?? null,
      sub_menu_id: permission.sub_menu_id ?? null,
    });
  }, [permission, reset]);

  return (
    <form id="permission-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-3">

        {/* Permission Name */}
        <div>
          <Label htmlFor="name" required>
            Permission Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="unit.create, unit.edit, etc."
            register={register("name", {
              required: "Permission name is required",
              minLength: { value: 2, message: "Must be at least 2 characters" },
              maxLength: { value: 50, message: "Cannot exceed 50 characters" },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>

        {/* Module */}
        <div>
          <Label htmlFor="module_id" required>
            Module
          </Label>
          <Controller
            name="module_id"
            control={control}
            rules={{ required: "Module is required" }}
            render={({ field, fieldState }) => (
              <ReactSelect
                options={modules}
                value={field.value}
                onChange={field.onChange}
                isDisabled={saving}
                isLoading={loadingModules}
                error={fieldState.error?.message}
                placeholder="Select a module"
              />
            )}
          />
        </div>

        {/* Menu */}
        <div>
          <Label htmlFor="menu_id" required>
            Menu
          </Label>
          <Controller
            name="menu_id"
            control={control}
            rules={{ required: "Menu is required" }}
            render={({ field, fieldState }) => (
              <ReactSelect
                options={menus}
                value={field.value}
                onChange={field.onChange}
                isDisabled={saving || !watchedModuleId}
                isLoading={loadingMenus}
                error={fieldState.error?.message}
                placeholder={
                  watchedModuleId ? "Select menu" : "Select a module first"
                }
              />
            )}
          />
        </div>

        {/* Submenu */}
        <div>
          <Label htmlFor="sub_menu_id">Submenu</Label>
          <Controller
            name="sub_menu_id"
            control={control}
            render={({ field, fieldState }) => (
              <ReactSelect
                options={submenus}
                value={field.value}
                onChange={field.onChange}
                isDisabled={saving || !watchedMenuId}
                isLoading={loadingSubmenus}
                error={fieldState.error?.message}
                placeholder={
                  watchedMenuId
                    ? "Select submenu (optional)"
                    : "Select a menu first"
                }
                isClearable
              />
            )}
          />
        </div>

      </div>
    </form>
  );
}
