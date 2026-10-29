"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { SubCategory } from "@/services/subCategoryService";
import { useEffect } from "react";
import Select from "@/components/form/Select";
import ReactSelect from "@/components/form/ReactSelect";

interface SubCategoryFormData {
  name: string;
  category_id?: number | null;
  status?: number ;
}

interface SubCategoryFormProps {
  status: { value: number; label: string }[];
  subCategory?: SubCategory | null;
  categories?: { value: number; label: string }[];
  loadingCategories: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (subCategoryData: SubCategoryFormData) => void;
  backendErrors?: Record<string, string>;
}

export function SubCategoryForm({ status, subCategory, categories, loadingCategories, mode, saving, onSubmit, backendErrors }: SubCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<SubCategoryFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      category_id: null,
    }
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof SubCategoryFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && subCategory) {
      reset({
        name: subCategory?.name ?? '',
        category_id: subCategory?.category_id ?? null,
        status: subCategory?.status ?? 1,
      });
    } else {
      reset({
        name: '',
        category_id: undefined,
      });
    }
  }, [subCategory, reset, mode]);

  const onFormSubmit = (data: SubCategoryFormData) => {
    onSubmit(data);
  };


  return (
    <form id="sub-category-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-3">
           <div>
          <Label htmlFor="category_id" required>
            Category
          </Label>
          <Controller
            control={control}
            name="category_id"
            rules={{
              required: {
                value: true,
                message: "Please select a category"
              }
            }}
            render={({ field, fieldState }) => (
              <ReactSelect
                {...field}
                options={categories || []}
                placeholder="Select category"
                isLoading={loadingCategories}
                error={fieldState.error?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="name" required>Sub-Category Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter sub-category name."
            register={register("name", {
              required: "Sub-Category name is required",
              minLength: {
                value: 2,
                message: "Sub-Category name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Sub-Category name must not exceed 50 characters"
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