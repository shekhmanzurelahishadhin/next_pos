"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Unit } from "@/services/unitService";
import { useEffect } from "react";
import Select from "@/components/form/Select";

interface UnitFormData {
  name: string;
  code: string;
  status?: number;
}

interface UnitFormProps {
  status: { value: string; label: string }[];
  unit?: Unit | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (unitData: UnitFormData) => void;
  backendErrors?: Record<string, string>;
}

export function UnitForm({ status, unit, mode, saving, onSubmit, backendErrors }: UnitFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<UnitFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      code: "",
    }
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof UnitFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && unit) {
      reset({
        name: unit?.name ?? '',
        code: unit?.code ?? '',
        status: Number(unit?.status ?? 1),
      });
    } else {
      reset({
        name: '',
        code: '',
      });
    }
  }, [unit, reset, mode]);

  const onFormSubmit = (data: UnitFormData) => {
    onSubmit(data);
  };


  return (
    <form id="unit-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" required>Unit Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter unit name."
            register={register("name", {
              required: "Unit name is required",
              minLength: {
                value: 2,
                message: "Unit name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Unit name must not exceed 50 characters"
              },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>

        <div>
          <Label htmlFor="code" required>Code</Label>
          <Input
            id="code"
            type="text"
            placeholder="Enter code."
            register={register("code", {
              required: "Code is required",
              minLength: {
                value: 2,
                message: "Code must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Code must not exceed 50 characters"
              },
            })}
            error={errors.code?.message}
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