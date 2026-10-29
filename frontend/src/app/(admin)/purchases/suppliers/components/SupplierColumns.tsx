import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import ActionButtons from "@/components/ui/button/ActionButton";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { formatMoney } from "@/lib/format";
import { FiEye, FiEdit, FiTrash, FiRefreshCw } from "@/icons/index";
import { Supplier } from "@/services/supplierService";

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    filterVariant?: 'text' | 'select' | 'searchSelect' | 'none';
    filterOptions?: { value: string; label: string }[];
    exportable?: boolean;
    exportHeader?: string;
    placeholder?: string;
    exportValue?: (row: TData, index?: number) => string | number;
    widthClass?: string;
  }
}

interface UseSupplierColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  handleSoftDelete: (id: number) => void;
  handleForceDelete: (id: number) => void;
  handleRestore: (id: number) => void;
  pageIndex: number;
  pageSize: number;
  formatDate: (dateString?: string) => string;
  status: { value: number; label: string }[];
  openingBalanceType: { value: number; label: string }[];
}

export const useSupplierColumns = ({
  hasPermission,
  onView,
  onEdit,
  handleSoftDelete,
  handleForceDelete,
  handleRestore,
  pageIndex,
  pageSize,
  formatDate,
  status,
  openingBalanceType,
}: UseSupplierColumnsProps): ColumnDef<Supplier>[] => {
  return useMemo((): ColumnDef<Supplier>[] => [
    {
      id: "sl",
      header: "SL",
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: true,
        exportHeader: "SL",
        exportValue: (row, index) => (pageIndex * pageSize) + (index ?? 0) + 1,
        widthClass: "w-[60px] min-w-[50px] max-w-[70px]"
      },
      cell: ({ row }) => {
        const serialNumber = (pageIndex * pageSize) + row.index + 1;
        return (
          <div className="px-2 text-center">
            <span className="text-gray-600 dark:text-gray-400">
              {serialNumber}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Supplier Name",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search names",
        exportable: true,
        exportHeader: "Supplier Name",
        exportValue: (row) => row.name,
        widthClass: "min-w-[180px] max-w-[250px] flex-1"
      },
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="px-2">
            <span className="font-medium text-gray-800 dark:text-white/90 truncate block">
              {name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search emails",
        exportable: true,
        exportHeader: "Supplier Email",
        exportValue: (row) => row.email,
        widthClass: "min-w-[180px] max-w-[250px] flex-1"
      },
      cell: ({ row }) => {
        const email = row.getValue("email") as string;
        return (
          <div className="px-2">
            <span className="text-gray-700 dark:text-gray-300 truncate block">
              {email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search phones",
        exportable: true,
        exportHeader: "Supplier Phone",
        exportValue: (row) => row.phone,
        widthClass: "w-[140px] min-w-[130px] max-w-[160px]"
      },
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string;
        return (
          <div className="px-2">
            <span className="text-gray-700 dark:text-gray-300">
              {phone}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search addresses",
        exportable: true,
        exportHeader: "Supplier Address",
        exportValue: (row) => row.address,
        widthClass: "min-w-[100px] max-w-[200px] flex-2"
      },
      cell: ({ row }) => {
        const address = row.getValue("address") as string;
        return (
          <div className="px-2">
            <span className="text-gray-700 dark:text-gray-300 line-clamp-2">
              {address}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "opening_balance_type",
      header: "Balance Type",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterOptions: openingBalanceType.map((s) => ({ value: s.value.toString(), label: s.label })),
        exportable: true,
        exportHeader: "Opening Balance Type",
        exportValue: (row) => row.opening_balance_type,
        widthClass: "w-[120px] min-w-[100px] max-w-[130px]"
      },
      cell: ({ row }) => {
        const openingBalanceType = row.getValue("opening_balance_type") as number;
        const typeLabel = openingBalanceType === 1 ? "Debit" : openingBalanceType === 2 ? "Credit" : "N/A";
        return (
          <div className="px-2 text-center">
              {typeLabel}
          </div>
        );
      },
    },
    {
      accessorKey: "opening_balance",
      header: "Opening Balance",
      enableSorting: true,
      meta: {
        exportable: true,
        exportHeader: "Opening Balance",
        exportValue: (row) => row.opening_balance,
        widthClass: "w-[140px] min-w-[120px] max-w-[160px]",
        align: "right",
      },
      cell: ({ row }) => {
        return (
          <div className="px-2 text-right tabular-nums">
            <span className="text-gray-800 dark:text-white font-medium">
              {formatMoney(row.getValue("opening_balance") as number)}
            </span>
          </div>
        );
      },
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
        widthClass: "w-[100px] min-w-[90px] max-w-[110px]"
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as number;
        return (
          <div className="px-2 text-center">
            <StatusBadge status={status} trashed={!!row.original.deleted_at} />
          </div>
        );
      }
    },
    {
      accessorKey: "created_at",
      header: "Created",
      enableSorting: true,
      meta: {
        exportable: true,
        exportHeader: "Created At",
        placeholder: "Search created",
        exportValue: (row) => formatDate(row.created_at),
        widthClass: "w-[120px] min-w-[110px] max-w-[130px]"
      },
      cell: ({ row }) => {
        const value = row.getValue("created_at") as string | undefined;
        return (
          <div className="px-2 text-center">
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {formatDate(value)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      enableSorting: true,
      meta: {
        exportable: true,
        exportHeader: "Updated At",
        placeholder: "Search updated",
        exportValue: (row) => formatDate(row.updated_at),
        widthClass: "w-[120px] min-w-[110px] max-w-[130px]"
      },
      cell: ({ row }) => {
        const value = row.getValue("updated_at") as string | undefined;
        return (
          <div className="px-2 text-center">
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {formatDate(value)}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: false,
        widthClass: "w-[110px]"
      },
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div className="flex justify-center px-2">
            <ActionButtons
              row={supplier}
              buttons={[
                {
                  icon: FiEye,
                  onClick: (row) => onView(row as Supplier),
                  variant: "success",
                  size: "sm",
                  tooltip: "View",
                  show: () => hasPermission("supplier.view"),
                },
                {
                  icon: FiEdit,
                  onClick: (row) => onEdit(row as Supplier),
                  variant: "primary",
                  size: "sm",
                  tooltip: "Edit",
                  show: (row) => !row.deleted_at && hasPermission("supplier.edit"),
                },
                {
                  icon: FiTrash,
                  onClick: (row) => handleSoftDelete((row as Supplier).id),
                  variant: "danger",
                  size: "sm",
                  tooltip: "Move to Trash",
                  show: (row) => !row.deleted_at && hasPermission("supplier.delete"),
                },
                {
                  icon: FiRefreshCw,
                  onClick: (row) => handleRestore((row as Supplier).id),
                  variant: "success",
                  size: "sm",
                  tooltip: "Restore",
                  show: (row) => !!row.deleted_at && hasPermission("supplier.delete"),
                },
                {
                  icon: FiTrash,
                  onClick: (row) => handleForceDelete((row as Supplier).id),
                  variant: "danger",
                  size: "sm",
                  tooltip: "Delete Permanently",
                  show: (row) => !!row.deleted_at && hasPermission("supplier.delete"),
                },
              ]}
            />
          </div>
        );
      },
    },
  ], [hasPermission, onView, onEdit, handleSoftDelete, handleForceDelete, handleRestore, pageIndex, pageSize, status, openingBalanceType]);
};