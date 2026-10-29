"use client";

import { useForm, Controller } from "react-hook-form";
import { useEffect } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import ReactSelect from "@/components/form/ReactSelect";
import { User } from "@/services/userService";
import ReactMultiSelect from "@/components/form/ReactMultiselect";

interface UserFormData {
  name: string;
  email: string | null;
  password: string | null;
  password_confirmation: string | null;
  roles: number[] | null;
  company_id: number | null;
}

interface UserFormProps {
  user?: User | null;
  mode: "create" | "edit";
  saving: boolean;
  onSubmit: (userData: UserFormData) => void;
  backendErrors?: Record<string, string>;
  roles: { value: number; label: string }[];
  companies: { value: number; label: string }[];
  loadingRoles: boolean;
  loadingCompanies: boolean;
}

export function UserForm({
  user,
  mode,
  saving,
  onSubmit,
  backendErrors,
  companies,
  roles,
  loadingCompanies,
  loadingRoles,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    reset,
    setError,
    clearErrors,
  } = useForm<UserFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      roles: [],
      company_id: null,
    },
  });


  /* ----------------------------------------
   * Backend validation errors
   * ---------------------------------------- */
  useEffect(() => {
    if (!backendErrors) return;

    clearErrors();
    Object.entries(backendErrors).forEach(([field, message]) => {
      setError(field as keyof UserFormData, {
        type: "server",
        message: Array.isArray(message) ? message[0] : message,
      });
    });
  }, [backendErrors, clearErrors, setError]);

  /* ----------------------------------------
   * Edit mode: load user once
   * ---------------------------------------- */
  useEffect(() => {
    if (!user) return;

    reset({
      name: user.name ?? "",
      email: user.email ?? "",
      roles: user.roles ?? [],
      company_id: user.company_id ?? null,
    });
  }, [user, reset]);

  return (
    <form id="user-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

        {/* User Name */}
        <div>
          <Label htmlFor="name" required>
            User Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter user name"
            register={register("name", {
              required: "User name is required",
              minLength: { value: 2, message: "Must be at least 2 characters" },
              maxLength: { value: 50, message: "Cannot exceed 50 characters" },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter user email"
            register={register("email", {
              required: "Email is required",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Invalid email address",
              },
            })}
            error={errors.email?.message}
            disabled={saving}
          />
        </div>

        <div>
          <Label htmlFor="company_id" required>
            Company
          </Label>
          <Controller
            control={control}
            name="company_id"
            rules={{
              required: {
                value: true,
                message: "Please select a company"
              }
            }}
            render={({ field, fieldState }) => (
              <ReactSelect
                {...field}
                options={companies}
                placeholder="Select company"
                isLoading={loadingCompanies}
                error={fieldState.error?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>

        <div>
          <Label htmlFor="roles" required>
            Roles
          </Label>
          <Controller
            control={control}
            name="roles"
               rules={{
              required: {
                value: true,
                message: "Please select roles"
              }
            }}
            render={({ field, fieldState }) => (
              <ReactMultiSelect
                {...field}
                value={field.value ?? []}
                options={roles}
                placeholder="Select roles"
                isLoading={loadingRoles}
                isDisabled={saving}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        <div>
          <Label htmlFor="password" required={mode === "create"}>
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={mode === "create" ? "Enter password" : "Leave blank to keep current"}
            register={register("password", {
              required: mode === "create" ? "Password is required" : false,
              minLength: mode === "create" ? { value: 6, message: "Must be at least 6 characters" } : undefined,
            })}
            error={errors.password?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="password_confirmation" required={mode === "create"}>
            Confirm Password
          </Label>
          <Input
            id="password_confirmation"
            type="password"
            placeholder={mode === "create" ? "Confirm password" : "Leave blank to keep current"}
            register={register("password_confirmation", {
              validate: (value) => {
                const password = watch("password");
                if (mode === "create" && !value) {
                  return "Confirm Password is required";
                }
                if (value && value !== password) {
                  return "Passwords do not match";
                }
                return true;
              }
            })}
            error={errors.password_confirmation?.message}
            disabled={saving}
          />
        </div>

      </div>
    </form>
  );
}
