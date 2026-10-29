"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Lookup } from "@/services/lookupService";
import { useEffect } from "react";
import Select from "@/components/form/Select";
import ReactSelect from "@/components/form/ReactSelect";

interface LookupFormData {
  name: string;
  type: string;
  code: string;
  status?: number;
  is_new?: string;
  type_write?: string;
  type_select?: string;
}

interface LookupFormProps {
  status: { value: number; label: string }[];
  lookupTypes?: { value: string; label: string }[];
  lookupTypesLoading?: boolean;
  lookup?: Lookup | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (lookupData: LookupFormData) => void;
  backendErrors?: Record<string, string>;
}

export function LookupForm({
  status,
  lookup,
  lookupTypes,
  lookupTypesLoading,
  mode,
  saving,
  onSubmit,
  backendErrors
}: LookupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
    watch,
    setValue,
  } = useForm<LookupFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      type: "",
      code: "",
      status: 1,
      is_new: '1',
      type_write: '',
      type_select: '',
    }
  });
  const isNewType = watch("is_new");

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof LookupFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && lookup) {
      reset({
        name: lookup?.name ?? '',
        type: lookup?.type ?? '',
        code: lookup?.code ?? '',
        status: lookup?.status ?? 1,
        is_new: lookup?.is_new ?? '1',
        type_write: lookup?.type_write ?? '',
        type_select: lookup?.type_select ?? '',
      });
    } else {
      reset({
        name: '',
        type: '',
        code: '',
        status: 1,
        is_new: '1',
        type_write: '',
        type_select: '',
      });
    }
  }, [lookup, reset, mode]);

  const onFormSubmit = (data: LookupFormData) => {
    onSubmit(data);
  };

  useEffect(() => {
    if (isNewType === '1') {
      setValue("type_select", "");
      clearErrors("type_select");
    } else if (isNewType === '0') {
      setValue("type_write", "");
      clearErrors("type_write");
    }
  }, [isNewType, setValue, clearErrors]);

  return (
    <form id="sub-category-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" required>Lookup Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter lookup name."
            register={register("name", {
              required: "Lookup name is required",
              minLength: {
                value: 2,
                message: "Lookup name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Lookup name must not exceed 50 characters"
              },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>
        {mode === "create" && (
          <div>
            <div>
              <Label htmlFor="is_new" required>Is New Type</Label>

              <Controller
                name="is_new"
                control={control}
                rules={{ required: "Type is required" }}
                render={({ field }) => (
                  <div className="relative">
                    <Select
                      id="is_new"
                      options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]}
                      value={field.value?.toString() ?? ""}
                      placeholder="Select Type"
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                )}
              />
              {errors.is_new?.message && (
                <p className="mt-1.5 text-xs text-error-500">
                  {errors.is_new.message}
                </p>
              )}
            </div>
            {isNewType === '1' && (
              <div>
                <Label htmlFor="type_write" required>
                  Lookup Type
                </Label>
                <Input
                  id="type_write"
                  type="text"
                  placeholder="Enter lookup type."
                  register={register("type_write", {
                    required: "Lookup type is required",
                    minLength: {
                      value: 2,
                      message: "Lookup type must be at least 2 characters",
                    },
                    maxLength: {
                      value: 50,
                      message: "Lookup type must not exceed 50 characters",
                    },
                  })}
                  error={errors.type_write?.message}
                  disabled={saving}
                />
              </div>
            )}


            {isNewType === '0' && (
              <div>
                <Label htmlFor="type_select" required>
                  Lookup Type
                </Label>
                <Controller
                  control={control}
                  name="type_select"
                  rules={{
                    required: {
                      value: true,
                      message: "Please select Lookup Type",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <ReactSelect
                      {...field}
                      options={lookupTypes || []}
                      placeholder="Select lookup type"
                      error={fieldState.error?.message}
                      isDisabled={saving}
                      isLoading={lookupTypesLoading}
                    />
                  )}
                />
              </div>
            )}
          </div>
        )}

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