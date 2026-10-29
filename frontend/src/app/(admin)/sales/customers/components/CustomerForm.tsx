"use client";
import { Controller, useForm } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Customer } from "@/services/customerService";
import { useEffect } from "react";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import ReactSelect from "@/components/form/ReactSelect";

interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  opening_balance_type?: number;
  opening_balance?: number;
  customer_type_id?: number | null;
  store_id?: number | null;
  credit_limit?: number | null;
  car_name?: string;
  fax?: string;
  website?: string;
  status?: number;
}

interface CustomerFormProps {
  status: { value: number; label: string }[];
  openingBalanceType: { value: number; label: string }[];
  customerTypes: { value: number; label: string }[];
  stores: { value: number; label: string }[];
  customer?: Customer | null;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (customerData: CustomerFormData | FormData) => void;
  backendErrors?: Record<string, string>;
}

export function CustomerForm({ status, openingBalanceType, customerTypes, stores, customer, mode, saving, onSubmit, backendErrors }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<CustomerFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      status: 1,
      opening_balance_type: 1,
      opening_balance: 0,
      customer_type_id: null,
      store_id: null,
      credit_limit: 0,
      car_name: "",
      fax: "",
      website: "",
    }
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof CustomerFormData, {
          type: 'server',
          message: Array.isArray(message) ? message[0] : message
        });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && customer) {
      reset({
        name: customer?.name ?? '',
        email: customer?.email ?? '',
        phone: customer?.phone ?? '',
        address: customer?.address ?? '',
        status: Number(customer?.status ?? 1),
        opening_balance_type: customer?.opening_balance_type ?? 1,
        opening_balance: customer?.opening_balance ?? 0,
        customer_type_id: customer?.customer_type_id ?? null,
        store_id: customer?.store_id ?? null,
        credit_limit: Number(customer?.credit_limit ?? 0),
        car_name: customer?.car_name ?? '',
        fax: customer?.fax ?? '',
        website: customer?.website ?? '',
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
        customer_type_id: null,
        store_id: null,
        credit_limit: 0,
        car_name: '',
        fax: '',
        website: '',
      });
    }
  }, [customer, reset, mode]);

  const onFormSubmit = (data: CustomerFormData) => {
    onSubmit(data);
  };
  return (
    <form id="customer-form" onSubmit={handleSubmit(onFormSubmit)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="name" required>Customer Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter customer name."
            register={register("name", {
              required: "Customer name is required",
              minLength: {
                value: 2,
                message: "Customer name must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Customer name must not exceed 50 characters"
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
            placeholder="Enter customer email."
            register={register("email", {
              minLength: {
                value: 2,
                message: "Customer email must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Customer email must not exceed 50 characters"
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
            placeholder="Enter customer phone."
            register={register("phone", {
              minLength: {
                value: 2,
                message: "Customer phone must be at least 2 characters"
              },
              maxLength: {
                value: 50,
                message: "Customer phone must not exceed 50 characters"
              },
            })}
            error={errors.phone?.message}
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="fax">Fax</Label>
          <Input id="fax" type="text" placeholder="Enter fax number." register={register("fax")} error={errors.fax?.message} disabled={saving} />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" type="text" placeholder="e.g. www.example.com" register={register("website")} error={errors.website?.message} disabled={saving} />
        </div>
        <div>
          <Label htmlFor="customer_type_id">Customer Type</Label>
          <Controller
            control={control}
            name="customer_type_id"
            render={({ field }) => (
              <ReactSelect
                value={field.value ?? null}
                onChange={field.onChange}
                options={customerTypes}
                placeholder="Select customer type"
                error={errors.customer_type_id?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="store_id">Store / Depot</Label>
          <Controller
            control={control}
            name="store_id"
            render={({ field }) => (
              <ReactSelect
                value={field.value ?? null}
                onChange={field.onChange}
                options={stores}
                placeholder="Select store"
                error={errors.store_id?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>
        <div>
          <Label htmlFor="car_name">Car Name</Label>
          <Input id="car_name" type="text" placeholder="e.g. Toyota Axio" register={register("car_name")} error={errors.car_name?.message} disabled={saving} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-3">
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
              placeholder="Enter customer opening balance."
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
          <div>
            <Label htmlFor="credit_limit">Credit Limit (Max Due)</Label>
            <Input
              id="credit_limit"
              type="number"
              placeholder="0 = no limit"
              register={register("credit_limit", {
                setValueAs: (v) => (v === "" || v === null ? 0 : Number(v)),
                min: { value: 0, message: "Credit limit cannot be negative" },
              })}
              error={errors.credit_limit?.message}
              disabled={saving}
              step={0.01}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>
        <div className="md:col-span-2">
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
                placeholder="Enter customer address."
                value={field.value || ""}
                onChange={field.onChange}
                error={errors.address?.message}
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