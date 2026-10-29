import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import ActionButtons from "@/components/ui/button/ActionButton";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { FiEye, FiEdit, FiTrash, FiRefreshCw } from "@/icons/index";
import { PpSpSetup, PP_SP_TYPES } from "@/services/ppSpSetupService";
import { CodeChips } from "./CodeChips";

interface UsePpSpSetupColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (setup: PpSpSetup) => void;
  onEdit: (setup: PpSpSetup) => void;
  handleSoftDelete: (id: number) => void;
  handleForceDelete: (id: number) => void;
  handleRestore: (id: number) => void;
  pageIndex: number;
  pageSize: number;
  formatDate: (dateString?: string) => string;
  status: { value: number; label: string }[];
}

export const usePpSpSetupColumns = ({
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
}: UsePpSpSetupColumnsProps): ColumnDef<PpSpSetup>[] => {
  return useMemo((): ColumnDef<PpSpSetup>[] => [
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
      id: "type",
      accessorKey: "type_name",
      header: "Type",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterOptions: PP_SP_TYPES.map((t) => ({ value: t.value.toString(), label: t.label })),
        exportable: true,
        exportHeader: "Type",
        exportValue: (row) => row.type_name,
        widthClass: "w-[130px]"
      },
      cell: ({ row }) => (
        <span className="font-medium text-gray-800 dark:text-white/90">{row.original.type_name}</span>
      ),
    },
    {
      accessorKey: "codes",
      header: "Codes (digit : code)",
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: true,
        exportHeader: "Codes",
        exportValue: (row) => row.codes.map((code, digit) => `${digit}=${code}`).join(" "),
        widthClass: "w-[440px]"
      },
      cell: ({ row }) => <CodeChips codes={row.original.codes} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
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
      accessorKey: "created_by",
      header: "Created By",
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: true,
        exportHeader: "Created By",
        exportValue: (row) => row.created_by || "",
        widthClass: "w-[120px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400">{row.original.created_by || "—"}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created at",
      enableSorting: false,
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
              onClick: (row) => onView(row as PpSpSetup),
              variant: "success",
              size: "sm",
              tooltip: "View",
              show: () => hasPermission("pp-sp-setup.view"),
            },
            {
              icon: FiEdit,
              onClick: (row) => onEdit(row as PpSpSetup),
              variant: "primary",
              size: "sm",
              tooltip: "Edit",
              show: (row) => !row.deleted_at && hasPermission("pp-sp-setup.edit"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleSoftDelete((row as PpSpSetup).id),
              variant: "danger",
              size: "sm",
              tooltip: "Move to Trash",
              show: (row) => !row.deleted_at && hasPermission("pp-sp-setup.delete"),
            },
            {
              icon: FiRefreshCw,
              onClick: (row) => handleRestore((row as PpSpSetup).id),
              variant: "success",
              size: "sm",
              tooltip: "Restore",
              show: (row) => !!row.deleted_at && hasPermission("pp-sp-setup.delete"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleForceDelete((row as PpSpSetup).id),
              variant: "danger",
              size: "sm",
              tooltip: "Delete Permanently",
              show: (row) => !!row.deleted_at && hasPermission("pp-sp-setup.delete"),
            },
          ]}
        />
      ),
    },
  ], [hasPermission, onView, onEdit, handleForceDelete, handleSoftDelete, handleRestore, pageIndex, pageSize, formatDate, status]);
};
