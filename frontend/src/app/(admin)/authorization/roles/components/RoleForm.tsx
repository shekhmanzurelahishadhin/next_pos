"use client";
import { useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Role } from "@/services/roleService";
import { useEffect } from "react";

interface RoleFormData {
  name: string;
}

interface RoleFormProps {
  role?: Role | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (roleData: { name: string }) => void;
  backendErrors?: Record<string, string>;
}

export function RoleForm({ role, saving, onSubmit, backendErrors }: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
  } = useForm<RoleFormData>({
    mode: "onChange",
    defaultValues: {
      name: role?.name || '',
    }
  });

  // the API validation errors are shown under their fields
  useEffect(() => {
    if (!backendErrors) {
      return;
    }

    clearErrors();
    for (const field in backendErrors) {
      setError(field as keyof RoleFormData, { type: "server", message: backendErrors[field] });
    }
  }, [backendErrors, clearErrors, setError]);

  // edit: the form starts with the role's name
  useEffect(() => {
    reset({ name: role ? role.name : "" });
  }, [role, reset]);

  return (
    <form id="role-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" required>Role Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="admin, user, manager, etc."
            register={register("name", {
              required: "Role name is required",
              minLength: {
                value: 2,
                message: "Role name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Role name must not exceed 50 characters"
              },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>
      </div>
    </form>
  );
}