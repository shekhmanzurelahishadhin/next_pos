import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import ActionButtons from "@/components/ui/button/ActionButton";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { FiEye, FiEdit, FiTrash, FiRefreshCw } from "@/icons/index";
import { Location } from "@/services/locationService";

interface UseLocationColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (location: Location) => void;
  onEdit: (location: Location) => void;
  handleSoftDelete: (id: number) => void;
  handleForceDelete: (id: number) => void;
  handleRestore: (id: number) => void;
  pageIndex: number;
  pageSize: number;
  formatDate: (dateString?: string) => string;
  status: { value: number; label: string }[];
}

export const useLocationColumns = ({
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
}: UseLocationColumnsProps): ColumnDef<Location>[] => {
  return useMemo((): ColumnDef<Location>[] => [
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
      accessorKey: "code",
      header: "Code",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search code",
        exportable: true,
        exportHeader: "Code",
        exportValue: (row) => row.code,
        widthClass: "w-[100px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Location Name",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search names",
        exportable: true,
        exportHeader: "Location Name",
        exportValue: (row) => row.name,
        widthClass: "w-[180px]"
      },
      cell: ({ row }) => (
        <span className="font-medium text-gray-800 dark:text-white/90">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "store_name",
      header: "Store",
      enableSorting: false,
      meta: {
        filterVariant: "text",
        placeholder: "Search store",
        exportable: true,
        exportHeader: "Store",
        exportValue: (row) => row.store_name || "—",
        widthClass: "w-[160px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">{row.original.store_name || "—"}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: true,
        exportHeader: "Description",
        exportValue: (row) => row.description || "",
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400">{row.original.description || "—"}</span>
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
      accessorKey: "created_at",
      header: "Created at",
      enableSorting: true,
      meta: {
        filterVariant: "none",
        exportable: true,
        exportHeader: "Created At",
        exportValue: (row) => formatDate(row.created_at),
        widthClass: "w-[110px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400">{formatDate(row.original.created_at)}</span>
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
              onClick: (row) => onView(row as Location),
              variant: "success",
              size: "sm",
              tooltip: "View",
              show: () => hasPermission("location.view"),
            },
            {
              icon: FiEdit,
              onClick: (row) => onEdit(row as Location),
              variant: "primary",
              size: "sm",
              tooltip: "Edit",
              show: (row) => !row.deleted_at && hasPermission("location.edit"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleSoftDelete((row as Location).id),
              variant: "danger",
              size: "sm",
              tooltip: "Move to Trash",
              show: (row) => !row.deleted_at && hasPermission("location.delete"),
            },
            {
              icon: FiRefreshCw,
              onClick: (row) => handleRestore((row as Location).id),
              variant: "success",
              size: "sm",
              tooltip: "Restore",
              show: (row) => !!row.deleted_at && hasPermission("location.delete"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleForceDelete((row as Location).id),
              variant: "danger",
              size: "sm",
              tooltip: "Delete Permanently",
              show: (row) => !!row.deleted_at && hasPermission("location.delete"),
            },
          ]}
        />
      ),
    },
  ], [hasPermission, onView, onEdit, handleForceDelete, handleSoftDelete, handleRestore, pageIndex, pageSize, formatDate, status]);
};
