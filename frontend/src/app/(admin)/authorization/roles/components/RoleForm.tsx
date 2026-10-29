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
  backendErrors?: Record<string, string>; // Add backend errors prop
}

export function RoleForm({ role, mode, saving, onSubmit, backendErrors }: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError, // Add setError from react-hook-form
    clearErrors, // Add clearErrors
  } = useForm<RoleFormData>({
    mode: "onChange",
    defaultValues: {
      name: role?.name || '',
    }
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      // Clear existing errors first
      clearErrors();
      
      // Set backend errors on the form
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof RoleFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    reset({
      name: role?.name || '',
    });
  }, [role, reset]);

  const onFormSubmit = (data: RoleFormData) => {
    onSubmit(data);
  };

  return (
    <form id="role-form" onSubmit={handleSubmit(onFormSubmit)}>
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