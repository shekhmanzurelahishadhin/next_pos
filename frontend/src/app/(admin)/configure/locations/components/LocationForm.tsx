"use client";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import ReactSelect from "@/components/form/ReactSelect";
import { Location, LocationFormData } from "@/services/locationService";

interface LocationFormProps {
  status: { value: number; label: string }[];
  location?: Location | null;
  stores: { value: number; label: string }[];
  loadingStores: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (locationData: LocationFormData) => void;
  backendErrors?: Record<string, string>;
}

export function LocationForm({ status, location, stores, loadingStores, mode, saving, onSubmit, backendErrors }: LocationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<LocationFormData>({
    mode: "onChange",
    defaultValues: { name: "", store_id: null, description: "" },
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof LocationFormData, { type: 'server', message });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && location) {
      reset({
        name: location.name ?? "",
        store_id: location.store_id ?? null,
        description: location.description ?? "",
        status: Number(location.status ?? 1),
      });
    } else {
      reset({ name: "", store_id: null, description: "" });
    }
  }, [location, reset, mode]);

  return (
    <form id="location-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="store_id" required>Store</Label>
          <Controller
            control={control}
            name="store_id"
            rules={{ required: "Please select a store" }}
            render={({ field, fieldState }) => (
              <ReactSelect
                value={field.value}
                onChange={field.onChange}
                options={stores}
                placeholder="Select store"
                isLoading={loadingStores}
                error={fieldState.error?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>

        <div>
          <Label htmlFor="name" required>Location Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="e.g. Rack A-1, Shelf 3"
            register={register("name", {
              required: "Location name is required",
              maxLength: { value: 255, message: "Location name must not exceed 255 characters" },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextArea
                id="description"
                placeholder="Where is this location inside the store?"
                value={field.value || ""}
                onChange={field.onChange}
                error={errors.description?.message}
                disabled={saving}
                rows={2}
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
              render={({ field }) => (
                <Select
                  options={status}
                  value={field.value?.toString() ?? ""}
                  placeholder="Select Status"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={saving}
                />
              )}
            />
          </div>
        )}
      </div>
    </form>
  );
}
