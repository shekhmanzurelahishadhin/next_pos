"use client";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import ReactSelect from "@/components/form/ReactSelect";
import { Product, ProductFormData } from "@/services/productService";
import { ProductOptions } from "../hooks/useProducts";

interface ProductFormProps {
  status: { value: number; label: string }[];
  product?: Product | null;
  options: ProductOptions;
  loadingOptions: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  onSubmit: (productData: ProductFormData) => void;
  backendErrors?: Record<string, string>;
}

const emptyForm: ProductFormData = {
  name: "",
  part_number: "",
  product_category_id: null,
  sub_category_id: null,
  brand_id: null,
  unit_id: null,
  vehicle_brand_id: null,
  country_id: null,
  manufacturer_id: null,
  color_id: null,
  size_id: null,
  min_order_qty: null,
  warranty: "",
  features: "",
  supported_models: "",
  year_models: "",
  model: "",
  model_year: "",
  engine: "",
  chassis: "",
  unit_weight: "",
  alert_qty: null,
  short_list_qty: null,
};

// Empty number box -> null instead of NaN
const toNumberOrNull = (v: string) => (v === "" || v === null ? null : Number(v));

export function ProductForm({ status, product, options, loadingOptions, mode, saving, onSubmit, backendErrors }: ProductFormProps) {
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
  } = useForm<ProductFormData>({
    mode: "onChange",
    defaultValues: emptyForm,
  });

  // Handle backend errors
  useEffect(() => {
    if (backendErrors) {
      clearErrors();
      Object.entries(backendErrors).forEach(([field, message]) => {
        setError(field as keyof ProductFormData, { type: 'server', message });
      });
    }
  }, [backendErrors, setError, clearErrors]);

  useEffect(() => {
    if (mode === 'edit' && product) {
      reset({
        name: product.name ?? "",
        part_number: product.part_number ?? "",
        product_category_id: product.product_category_id ?? null,
        sub_category_id: product.sub_category_id ?? null,
        brand_id: product.brand_id ?? null,
        unit_id: product.unit_id ?? null,
        vehicle_brand_id: product.vehicle_brand_id ?? null,
        country_id: product.country_id ?? null,
        manufacturer_id: product.manufacturer_id ?? null,
        color_id: product.color_id ?? null,
        size_id: product.size_id ?? null,
        min_order_qty: product.min_order_qty ?? null,
        warranty: product.warranty ?? "",
        features: product.features ?? "",
        supported_models: product.supported_models ?? "",
        year_models: product.year_models ?? "",
        model: product.model ?? "",
        model_year: product.model_year ?? "",
        engine: product.engine ?? "",
        chassis: product.chassis ?? "",
        unit_weight: product.unit_weight ?? "",
        alert_qty: product.alert_qty ?? null,
        short_list_qty: product.short_list_qty ?? null,
        status: product.status ?? 1,
      });
    } else {
      reset(emptyForm);
    }
  }, [product, reset, mode]);

  // Show only sub-categories of the selected category
  const categoryId = watch("product_category_id");
  const subCategoryOptions = options.subCategories.filter((s) => s.category_id === categoryId);

  // Small helper for the optional dropdowns (no validation rules)
  const selectField = (name: keyof ProductFormData, label: string, list: { value: number; label: string }[], placeholder: string) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <ReactSelect
            value={field.value as number | null}
            onChange={field.onChange}
            options={list}
            placeholder={placeholder}
            isLoading={loadingOptions}
            error={fieldState.error?.message}
            isDisabled={saving}
          />
        )}
      />
    </div>
  );

  return (
    <form id="product-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="part_number" required>Part Number</Label>
          <Input
            id="part_number"
            type="text"
            placeholder="e.g. 90915-YZZE1"
            register={register("part_number", { required: "Part number is required" })}
            error={errors.part_number?.message}
            disabled={saving}
          />
        </div>

        <div>
          <Label htmlFor="name" required>Product Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="e.g. Oil Filter"
            register={register("name", {
              required: "Product name is required",
              maxLength: { value: 255, message: "Product name must not exceed 255 characters" },
            })}
            error={errors.name?.message}
            disabled={saving}
          />
        </div>

        <div>
          <Label htmlFor="product_category_id" required>Category</Label>
          <Controller
            control={control}
            name="product_category_id"
            rules={{ required: "Please select a category" }}
            render={({ field, fieldState }) => (
              <ReactSelect
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  setValue("sub_category_id", null); // sub-category belongs to the old category
                }}
                options={options.categories}
                placeholder="Select category"
                isLoading={loadingOptions}
                error={fieldState.error?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>

        {selectField("sub_category_id", "Sub-Category", subCategoryOptions, categoryId ? "Select sub-category" : "Select category first")}

        <div>
          <Label htmlFor="brand_id" required>Brand</Label>
          <Controller
            control={control}
            name="brand_id"
            rules={{ required: "Please select a brand" }}
            render={({ field, fieldState }) => (
              <ReactSelect
                value={field.value}
                onChange={field.onChange}
                options={options.brands}
                placeholder="Select brand"
                isLoading={loadingOptions}
                error={fieldState.error?.message}
                isDisabled={saving}
              />
            )}
          />
        </div>

        {selectField("unit_id", "Unit", options.units, "Select unit")}
        {selectField("vehicle_brand_id", "Vehicle Brand", options.vehicleBrands, "Select vehicle brand")}

        <div>
          <Label htmlFor="model">Vehicle Model</Label>
          <Input id="model" type="text" placeholder="e.g. Corolla, Axio" register={register("model")} error={errors.model?.message} disabled={saving} />
        </div>

        <div>
          <Label htmlFor="model_year">Model Year</Label>
          <Input id="model_year" type="text" placeholder="e.g. 2015-2020" register={register("model_year")} error={errors.model_year?.message} disabled={saving} />
        </div>

        <div>
          <Label htmlFor="supported_models">Supported Models</Label>
          <Input id="supported_models" type="text" placeholder="e.g. Fielder, Premio, Allion" register={register("supported_models")} error={errors.supported_models?.message} disabled={saving} />
        </div>

        <div>
          <Label htmlFor="year_models">Supported Years</Label>
          <Input id="year_models" type="text" placeholder="e.g. 2008, 2010, 2012-2015" register={register("year_models")} error={errors.year_models?.message} disabled={saving} />
        </div>

        {selectField("country_id", "Country of Origin", options.countries, "Select country")}
        {selectField("manufacturer_id", "Manufacturer", options.manufacturers, "Select manufacturer")}

        <div>
          <Label htmlFor="engine">Engine</Label>
          <Input id="engine" type="text" placeholder="e.g. 1NZ-FE" register={register("engine")} error={errors.engine?.message} disabled={saving} />
        </div>

        <div>
          <Label htmlFor="chassis">Chassis</Label>
          <Input id="chassis" type="text" placeholder="e.g. NZE141" register={register("chassis")} error={errors.chassis?.message} disabled={saving} />
        </div>

        <div>
          <Label htmlFor="unit_weight">Unit Weight</Label>
          <Input id="unit_weight" type="text" placeholder="e.g. 250 g" register={register("unit_weight")} error={errors.unit_weight?.message} disabled={saving} />
        </div>

        {selectField("color_id", "Color", options.colors, "Select color")}
        {selectField("size_id", "Size", options.sizes, "Select size")}

        <div>
          <Label htmlFor="warranty">Warranty</Label>
          <Input id="warranty" type="text" placeholder="e.g. 6 months" register={register("warranty")} error={errors.warranty?.message} disabled={saving} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="min_order_qty">Min Order</Label>
            <Input
              id="min_order_qty"
              type="number"
              placeholder="0"
              register={register("min_order_qty", { setValueAs: toNumberOrNull })}
              error={errors.min_order_qty?.message}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="alert_qty">Alert Qty</Label>
            <Input
              id="alert_qty"
              type="number"
              placeholder="0"
              register={register("alert_qty", { setValueAs: toNumberOrNull })}
              error={errors.alert_qty?.message}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="short_list_qty">Short List</Label>
            <Input
              id="short_list_qty"
              type="number"
              placeholder="0"
              register={register("short_list_qty", { setValueAs: toNumberOrNull })}
              error={errors.short_list_qty?.message}
              disabled={saving}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="features">Features</Label>
          <Controller
            name="features"
            control={control}
            render={({ field }) => (
              <TextArea
                id="features"
                placeholder="Any extra details about this part"
                value={field.value || ""}
                onChange={field.onChange}
                error={errors.features?.message}
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
