"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Store } from "@/services/storeService";
import { useEffect } from "react";
import Select from "@/components/form/Select";
import ReactSelect from "@/components/form/ReactSelect";
import TextArea from "@/components/form/input/TextArea";

interface StoreFormData {
  name: string;
  company_id?: number | null;
  address?: string;
  status?: number;
}

interface StoreFormProps {
  status: { value: number; label: string }[];
  store?: Store | null;
  companies?: { value: number; label: string }[];
  loadingCompanies: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (storeData: StoreFormData) => void;
  backendErrors?: Record<string, string>;
}

export function StoreForm({ status, store, companies, loadingCompanies, mode, saving, onSubmit, backendErrors }: StoreFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<StoreFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      company_id: null,
      address: "",
      status: 1,
    }
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof StoreFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && store) {
      reset({
        name: store?.name ?? '',
        company_id: store?.company_id ?? null,
        address: store?.address ?? "",
        status: store?.status ?? 1,
      });
    } else {
      reset({
        name: '',
        company_id: null,
        address: "",
        status: 1,
      });
    }
  }, [store, reset, mode]);

  const onFormSubmit = (data: StoreFormData) => {
    onSubmit(data);
  };


  return (
    <form id="store-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-3">
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
                options={companies || []}
                placeholder="Select company"
                isLoading={loadingCompanies}
                error={fieldState.error?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="name" required>Store Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter store name."
            register={register("name", {
              required: "Store name is required",
              minLength: {
                value: 2,
                message: "Store name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Store name must not exceed 50 characters"
              },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Controller
            name="address"
            control={control}
            rules={{
              maxLength: {
                value: 255,
                message: "Max length is 255 characters",
              },
            }}
            render={({ field }) => (
              <TextArea
                id="address"
                placeholder="Enter company address."
                value={field.value || ""}
                onChange={field.onChange}
                error={errors.address?.message}
                disabled={saving}
                rows={3}
              />
            )}
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