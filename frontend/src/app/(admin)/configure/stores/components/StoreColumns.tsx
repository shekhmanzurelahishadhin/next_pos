import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import ActionButtons from "@/components/ui/button/ActionButton";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { FiEye, FiEdit, FiTrash, FiRefreshCw } from "@/icons/index";
import { Store } from "@/services/storeService";

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

interface UseStoreColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (store: Store) => void;
  onEdit: (store: Store) => void;
  handleSoftDelete: (id: number) => void;
  handleForceDelete: (id: number) => void;
  handleRestore: (id: number) => void;
  pageIndex: number;
  pageSize: number;
  formatDate: (dateString?: string) => string;
  status: { value: number; label: string }[];
}

export const useStoreColumns = ({
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
}: UseStoreColumnsProps): ColumnDef<Store>[] => {
  return useMemo((): ColumnDef<Store>[] => [
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
      cell: ({ row }) => {
        const serialNumber = (pageIndex * pageSize) + row.index + 1;
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {serialNumber}
          </span>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Store Name",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search names",
        exportable: true,
        exportHeader: "Store Name",
        exportValue: (row) => row.name,
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 dark:text-white/90 truncate">
              {name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "code",
      header: "Code",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search codes",
        exportable: true,
        exportHeader: "Code",
        exportValue: (row) => row.code,
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => {
        const code = row.getValue("code") as string;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 dark:text-white/90 truncate">
              {code}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "company_name",
      header: "Company",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search Company",
        exportable: true,
        exportHeader: "Company",
        exportValue: (row) => row.company_name || "—",
        widthClass: "w-[160px] min-w-[140px] max-w-[200px]",
        minWidth: "140px",
        maxWidth: "200px"
      },
      cell: ({ row }) => {
        const company = row.getValue("company_name") as string;
        return (
          <div className="px-2">
            <span className="font-medium text-gray-800 dark:text-white/90 truncate block">
              {company || "—"}
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
        exportHeader: "Address",
        exportValue: (row) => row.address || "—",
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => {
        const address = row.getValue("address") as string;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 dark:text-white/90 truncate">
              {address}
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
        widthClass: "w-[100px] min-w-[90px] max-w-[110px]",
        minWidth: "90px",
        maxWidth: "110px"
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as number;
        return (
          <div className="px-2">
            <StatusBadge status={status} trashed={!!row.original.deleted_at} />
          </div>
        );
      }
    },
    {
      accessorKey: "created_at",
      header: "Created at",
      enableSorting: true,
      meta: {
        exportable: true,
        exportHeader: "Created At",
        placeholder: "Search created",
        exportValue: (row) => formatDate(row.created_at),
        widthClass: "w-[120px] min-w-[110px] max-w-[130px]",
        minWidth: "110px",
        maxWidth: "130px"
      },
      cell: ({ row }) => {
        const value = row.getValue("created_at") as string | undefined;
        return (
          <div className="px-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {formatDate(value)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated at",
      enableSorting: true,
      meta: {
        exportable: true,
        exportHeader: "Updated At",
        placeholder: "Search updated",
        exportValue: (row) => formatDate(row.updated_at),
        widthClass: "w-[120px] min-w-[110px] max-w-[130px]",
        minWidth: "110px",
        maxWidth: "130px"
      },
      cell: ({ row }) => {
        const value = row.getValue("updated_at") as string | undefined;
        return (
          <div className="px-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {formatDate(value)}
            </span>
          </div>
        );
      },
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
      cell: ({ row }) => {
        const store = row.original;
        return (
          <ActionButtons
            row={store}
            buttons={[
              {
                icon: FiEye,
                onClick: (row) => onView(row as Store),
                variant: "success",
                size: "sm",
                tooltip: "View",
                show: () => hasPermission("store.view"),
              },
              {
                icon: FiEdit,
                onClick: (row) => onEdit(row as Store),
                variant: "primary",
                size: "sm",
                tooltip: "Edit",
                show: (row) => !row.deleted_at && hasPermission("store.edit"),
              },
              {
                icon: FiTrash,
                onClick: (row) => handleSoftDelete((row as Store).id),
                variant: "danger",
                size: "sm",
                tooltip: "Move to Trash",
                show: (row) => !row.deleted_at && hasPermission("store.delete"),
              },
              {
                icon: FiRefreshCw,
                onClick: (row) => handleRestore((row as Store).id),
                variant: "success",
                size: "sm",
                tooltip: "Restore",
                show: (row) => !!row.deleted_at && hasPermission("store.delete"),
              },
              {
                icon: FiTrash,
                onClick: (row) => handleForceDelete((row as Store).id),
                variant: "danger",
                size: "sm",
                tooltip: "Delete Permanently",
                show: (row) => !!row.deleted_at && hasPermission("store.delete"),
              },
            ]}
          />
        );
      },
    },
  ], [hasPermission, onView, onEdit, handleForceDelete, handleSoftDelete, handleRestore, pageIndex, pageSize]);
};