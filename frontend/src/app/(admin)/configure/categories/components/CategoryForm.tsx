"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Category } from "@/services/categoryService";
import { useEffect } from "react";
import Select from "@/components/form/Select";

interface CategoryFormData {
  name: string;
  status?: number;
}

interface CategoryFormProps {
  status: { value: number; label: string }[];
  category?: Category | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (categoryData: CategoryFormData) => void;
  backendErrors?: Record<string, string>;
}

export function CategoryForm({ status, category, mode, saving, onSubmit, backendErrors }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<CategoryFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
    }
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof CategoryFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && category) {
      reset({
        name: category?.name ?? '',
        status: Number(category?.status ?? 1),
      });
    } else {
      reset({
        name: '',
      });
    }
  }, [category, reset, mode]);

  const onFormSubmit = (data: CategoryFormData) => {
    onSubmit(data);
  };


  return (
    <form id="category-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" required>Category Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter category name."
            register={register("name", {
              required: "Category name is required",
              minLength: {
                value: 2,
                message: "Category name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Category name must not exceed 50 characters"
              },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>

        {/* Show status field only in edit mode */}
        {mode === "edit" && (
          <div>
            <Label htmlFor="status">Status</Label>

            <Controller
              name="status"
              control={control}
              rules={{ required: "Status is required" }}
              render={({ field }) => (
                <div className="relative">
                  <Select
                    options={status}
                    value={field.value?.toString() ?? ""}
                    placeholder="Select Status"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    disabled={saving}
                  />
                </div>
              )}
            />
            {errors.status?.message && (
              <p className="mt-1.5 text-xs text-error-500">
                {errors.status.message}
              </p>
            )}
          </div>
        )}

      </div>
    </form>
  );
}