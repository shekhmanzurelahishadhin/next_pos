"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Brand } from "@/services/brandService";
import { useEffect } from "react";
import Select from "@/components/form/Select";

interface BrandFormData {
  name: string;
  status?: number;
}

interface BrandFormProps {
  status: { value: number; label: string }[];
  brand?: Brand | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (brandData: BrandFormData) => void;
  backendErrors?: Record<string, string>;
}

export function BrandForm({ status, brand, mode, saving, onSubmit, backendErrors }: BrandFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<BrandFormData>({
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
        setError(field as keyof BrandFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && brand) {
      reset({
        name: brand?.name ?? '',
        status: Number(brand?.status ?? 1),
      });
    } else {
      reset({
        name: '',
      });
    }
  }, [brand, reset, mode]);

  const onFormSubmit = (data: BrandFormData) => {
    onSubmit(data);
  };


  return (
    <form id="brand-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" required>Brand Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter brand name."
            register={register("name", {
              required: "Brand name is required",
              minLength: {
                value: 2,
                message: "Brand name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Brand name must not exceed 50 characters"
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