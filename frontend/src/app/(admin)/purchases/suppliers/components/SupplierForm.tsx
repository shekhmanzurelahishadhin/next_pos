"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Supplier } from "@/services/supplierService";
import { useEffect } from "react";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";

interface SupplierFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  opening_balance_type?: number;
  opening_balance?: number;
  status?: number;
}

interface SupplierFormProps {
  status: { value: number; label: string }[];
  openingBalanceType: { value: number; label: string }[];
  supplier?: Supplier | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (supplierData: SupplierFormData | FormData) => void;
  backendErrors?: Record<string, string>;
}

export function SupplierForm({ status, openingBalanceType, supplier, mode, saving, onSubmit, backendErrors }: SupplierFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<SupplierFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      status: 1,
      opening_balance_type: 1,
      opening_balance: 0,
    }
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof SupplierFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && supplier) {
      reset({
        name: supplier?.name ?? '',
        email: supplier?.email ?? '',
        phone: supplier?.phone ?? '',
        address: supplier?.address ?? '',
        status: Number(supplier?.status ?? 1),
        opening_balance_type: supplier?.opening_balance_type ?? 1,
        opening_balance: supplier?.opening_balance ?? 0,
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        status: 1,
        opening_balance_type: 1,
        opening_balance: 0,
      });
    }
  }, [supplier, reset, mode]);

  const onFormSubmit = (data: SupplierFormData) => {
    onSubmit(data);
  };
  return (
    <form id="supplier-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" required>Supplier Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter supplier name."
            register={register("name", {
              required: "Supplier name is required",
              minLength: {
                value: 2,
                message: "Supplier name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Supplier name must not exceed 50 characters"
              },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter supplier email."
            register={register("email", {
              minLength: {
                value: 2,
                message: "Supplier email must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Supplier email must not exceed 50 characters"
              },
            })}
            error={errors.email?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter supplier phone."
            register={register("phone", {
              minLength: {
                value: 2,
                message: "Supplier phone must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Supplier phone must not exceed 50 characters"
              },
            })}
            error={errors.phone?.message}
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
                placeholder="Enter supplier address."
                value={field.value || ""}
                onChange={field.onChange}
                error={errors.address?.message}
                disabled={saving}
                rows={3}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="opening_balance_type" required>Opening Balance Type</Label>
          <Controller
            name="opening_balance_type"
            control={control}
            rules={{ required: "Opening Balance Type is required" }}
            render={({ field }) => (
              <div className="relative">
                <Select
                  options={openingBalanceType}
                  value={field.value?.toString() ?? ""}
                  placeholder="Select Opening Balance Type"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={saving}
                />
              </div>
            )}
          />
          {errors.opening_balance_type?.message && (
            <p className="mt-1.5 text-xs text-error-500">
              {errors.opening_balance_type.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="opening_balance" required>Opening Balance</Label>
          <Input
            id="opening_balance"
            type="number"
            placeholder="Enter supplier opening balance."
            register={register("opening_balance", {
              valueAsNumber: true,
              min: {
                value: 0,
                message: "Opening balance cannot be negative"
              },
              max: {
                value: 999999999.99,
                message: "Opening balance is too large"
              },
              validate: (value) => {
                // Handle null/undefined case
                if (value === null || value === undefined) return true;

                // Ensure it's a valid number
                if (isNaN(value)) return "Please enter a valid number";

                // Check decimal places
                const stringValue = value.toString();
                const decimalPart = stringValue.split('.')[1];
                if (decimalPart && decimalPart.length > 2) {
                  return "Maximum 2 decimal places allowed";
                }

                return true;
              }
            })}
            error={errors.opening_balance?.message}
            disabled={saving}
            step={0.01}
            min={"0"}
            max={"999999999.99"}
            onWheel={(e) => e.currentTarget.blur()}
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