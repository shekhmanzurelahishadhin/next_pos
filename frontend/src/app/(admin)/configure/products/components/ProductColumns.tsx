import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import ActionButtons from "@/components/ui/button/ActionButton";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { FiEye, FiEdit, FiTrash, FiRefreshCw } from "@/icons/index";
import { Product } from "@/services/productService";
import { ProductOptions } from "../hooks/useProducts";

interface UseProductColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  handleSoftDelete: (id: number) => void;
  handleForceDelete: (id: number) => void;
  handleRestore: (id: number) => void;
  pageIndex: number;
  pageSize: number;
  status: { value: number; label: string }[];
  options: ProductOptions; // lists for the dropdown filters
  models: string[];
}

// { value, label } list for a dropdown filter
const toFilter = (list: { value: number; label: string }[]) =>
  list.map((item) => ({ value: String(item.value), label: item.label }));

export const useProductColumns = ({
  hasPermission,
  onView,
  onEdit,
  handleSoftDelete,
  handleForceDelete,
  handleRestore,
  pageIndex,
  pageSize,
  status,
  options,
  models,
}: UseProductColumnsProps): ColumnDef<Product>[] => {
  // same sub-category name can be under many categories, so show "Engine (G)"
  const subCategoryFilter = options.subCategories.map((sub) => ({
    value: String(sub.value),
    label: `${sub.label} (${options.categories.find((c) => c.value === sub.category_id)?.label ?? "-"})`,
  }));

  return useMemo((): ColumnDef<Product>[] => [
    {
      id: "sl",
      header: "SL",
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: true,
        exportHeader: "SL",
        exportValue: (row, index) => (pageIndex * pageSize) + (index ?? 0) + 1,
        widthClass: "w-[30px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400">
          {(pageIndex * pageSize) + row.index + 1}
        </span>
      ),
    },
    {
      accessorKey: "part_number",
      header: "Part Number",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search part no",
        exportable: true,
        exportHeader: "Part Number",
        exportValue: (row) => row.part_number,
        widthClass: "w-[140px]"
      },
      cell: ({ row }) => (
        <span className="font-medium text-gray-800 dark:text-white/90">
          {row.original.part_number}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Product Name",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search names",
        exportable: true,
        exportHeader: "Product Name",
        exportValue: (row) => row.name,
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-800 dark:text-white/90">{row.original.name}</span>
      ),
    },
    {
      // id is the backend filter name
      id: "category_id",
      accessorKey: "product_category_name",
      header: "Category",
      enableSorting: false,
      meta: {
        filterVariant: "searchSelect",
        filterOptions: toFilter(options.categories),
        mergeBy: (row) => row.product_category_id,
        exportable: true,
        exportHeader: "Category",
        exportValue: (row) => row.product_category_name || "—",
        widthClass: "w-[110px]"
      },
      cell: ({ row }) => (
        <span className="font-medium text-gray-700 dark:text-gray-300">{row.original.product_category_name || "—"}</span>
      ),
    },
    {
      id: "sub_category_id",
      accessorKey: "sub_category_name",
      header: "Sub-Category",
      enableSorting: false,
      meta: {
        filterVariant: "searchSelect",
        filterOptions: subCategoryFilter,
        mergeBy: (row) => `${row.product_category_id}-${row.sub_category_id ?? ""}`,
        exportable: true,
        exportHeader: "Sub-Category",
        exportValue: (row) => row.sub_category_name || "—",
        widthClass: "w-[130px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">{row.original.sub_category_name || "—"}</span>
      ),
    },
    {
      id: "brand_id",
      accessorKey: "brand_name",
      header: "Brand",
      enableSorting: false,
      meta: {
        filterVariant: "searchSelect",
        filterOptions: toFilter(options.brands),
        exportable: true,
        exportHeader: "Brand",
        exportValue: (row) => row.brand_name || "—",
        widthClass: "w-[120px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">{row.original.brand_name || "—"}</span>
      ),
    },
    {
      accessorKey: "model",
      header: "Vehicle / Model",
      enableSorting: false,
      meta: {
        filterVariant: "searchSelect",
        filterOptions: models.map((model) => ({ value: model, label: model })),
        exportable: true,
        exportHeader: "Vehicle / Model",
        exportValue: (row) => [row.vehicle_brand_name, row.model || row.supported_models, row.model_year].filter(Boolean).join(" ") || "—",
        widthClass: "w-[180px]"
      },
      cell: ({ row }) => {
        const p = row.original;
        const text = [p.vehicle_brand_name, p.model || p.supported_models].filter(Boolean).join(" ");
        return (
          <span className="line-clamp-2 text-gray-700 dark:text-gray-300" title={text}>
            {text || "—"}
            {p.model_year && <span className="text-gray-400"> ({p.model_year})</span>}
          </span>
        );
      },
    },
    {
      id: "unit_id",
      accessorKey: "unit_name",
      header: "Unit",
      enableSorting: false,
      meta: {
        filterVariant: "searchSelect",
        filterOptions: toFilter(options.units),
        exportable: true,
        exportHeader: "Unit",
        exportValue: (row) => row.unit_name || "—",
        widthClass: "w-[90px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">{row.original.unit_name || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterOptions: [
          ...status.map((s) => ({ value: s.value.toString(), label: s.label })),
          { value: "trash", label: "Trashed" },
        ],
        exportable: true,
        exportHeader: "Status",
        exportValue: (row) => (Number(row.status) === 1 ? "Active" : "Inactive"),
        widthClass: "w-[100px]"
      },
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} trashed={!!row.original.deleted_at} />
      ),
    },
    {
      id: "Actions",
      header: () => <div className="">Actions</div>,
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: false,
        widthClass: "w-[110px]"
      },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            {
              icon: FiEye,
              onClick: (row) => onView(row as Product),
              variant: "success",
              size: "sm",
              tooltip: "View",
              show: () => hasPermission("product.view"),
            },
            {
              icon: FiEdit,
              onClick: (row) => onEdit(row as Product),
              variant: "primary",
              size: "sm",
              tooltip: "Edit",
              show: (row) => !row.deleted_at && hasPermission("product.edit"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleSoftDelete((row as Product).id),
              variant: "danger",
              size: "sm",
              tooltip: "Move to Trash",
              show: (row) => !row.deleted_at && hasPermission("product.delete"),
            },
            {
              icon: FiRefreshCw,
              onClick: (row) => handleRestore((row as Product).id),
              variant: "success",
              size: "sm",
              tooltip: "Restore",
              show: (row) => !!row.deleted_at && hasPermission("product.delete"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleForceDelete((row as Product).id),
              variant: "danger",
              size: "sm",
              tooltip: "Delete Permanently",
              show: (row) => !!row.deleted_at && hasPermission("product.delete"),
            },
          ]}
        />
      ),
    },
  ], [hasPermission, onView, onEdit, handleForceDelete, handleSoftDelete, handleRestore, pageIndex, pageSize, status, options, models, subCategoryFilter]);
};
