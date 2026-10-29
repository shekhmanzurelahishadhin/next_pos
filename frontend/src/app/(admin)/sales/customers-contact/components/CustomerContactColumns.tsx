import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import ActionButtons from "@/components/ui/button/ActionButton";
import StatusBadge from "@/components/ui/badge/StatusBadge";
import { FiEye, FiEdit, FiTrash, FiRefreshCw } from "@/icons/index";
import { CustomerContact } from "@/services/customerContactService";

interface UseCustomerContactColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (contact: CustomerContact) => void;
  onEdit: (contact: CustomerContact) => void;
  handleSoftDelete: (id: number) => void;
  handleForceDelete: (id: number) => void;
  handleRestore: (id: number) => void;
  pageIndex: number;
  pageSize: number;
}

// All numbers of a contact in one line
const allNumbers = (c: CustomerContact) =>
  [c.contact_one, c.contact_two, c.contact_three].filter(Boolean).join(", ");

export const useCustomerContactColumns = ({
  hasPermission,
  onView,
  onEdit,
  handleSoftDelete,
  handleForceDelete,
  handleRestore,
  pageIndex,
  pageSize,
}: UseCustomerContactColumnsProps): ColumnDef<CustomerContact>[] => {
  return useMemo((): ColumnDef<CustomerContact>[] => [
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
      accessorKey: "customer_name",
      header: "Name",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search names",
        exportable: true,
        exportHeader: "Name",
        exportValue: (row) => row.customer_name,
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => (
        <span className="font-medium text-gray-800 dark:text-white/90">{row.original.customer_name}</span>
      ),
    },
    {
      accessorKey: "district",
      header: "District",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search district",
        exportable: true,
        exportHeader: "District",
        exportValue: (row) => row.district,
        widthClass: "w-[130px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">{row.original.district}</span>
      ),
    },
    {
      // id is the backend filter name, it searches all three numbers
      id: "contact",
      accessorKey: "contact_one",
      header: "Contact Numbers",
      enableSorting: false,
      meta: {
        filterVariant: "text",
        placeholder: "Search number",
        exportable: true,
        exportHeader: "Contact Numbers",
        exportValue: (row) => allNumbers(row),
        widthClass: "w-[260px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">{allNumbers(row.original)}</span>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      enableSorting: false,
      meta: {
        filterVariant: "text",
        placeholder: "Search remarks",
        exportable: true,
        exportHeader: "Remarks",
        exportValue: (row) => row.remarks || "",
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => (
        <span className="text-gray-600 dark:text-gray-400">{row.original.remarks || "—"}</span>
      ),
    },
    {
      // contacts have no active/inactive, this only switches to trashed rows
      id: "status",
      accessorKey: "deleted_at",
      header: "Status",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterOptions: [{ value: "trash", label: "Trashed" }],
        exportable: false,
        widthClass: "w-[100px]"
      },
      cell: ({ row }) => (
        <StatusBadge status={1} trashed={!!row.original.deleted_at} />
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
              onClick: (row) => onView(row as CustomerContact),
              variant: "success",
              size: "sm",
              tooltip: "View",
              show: () => hasPermission("customer-contact.view"),
            },
            {
              icon: FiEdit,
              onClick: (row) => onEdit(row as CustomerContact),
              variant: "primary",
              size: "sm",
              tooltip: "Edit",
              show: (row) => !row.deleted_at && hasPermission("customer-contact.edit"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleSoftDelete((row as CustomerContact).id),
              variant: "danger",
              size: "sm",
              tooltip: "Move to Trash",
              show: (row) => !row.deleted_at && hasPermission("customer-contact.delete"),
            },
            {
              icon: FiRefreshCw,
              onClick: (row) => handleRestore((row as CustomerContact).id),
              variant: "success",
              size: "sm",
              tooltip: "Restore",
              show: (row) => !!row.deleted_at && hasPermission("customer-contact.delete"),
            },
            {
              icon: FiTrash,
              onClick: (row) => handleForceDelete((row as CustomerContact).id),
              variant: "danger",
              size: "sm",
              tooltip: "Delete Permanently",
              show: (row) => !!row.deleted_at && hasPermission("customer-contact.delete"),
            },
          ]}
        />
      ),
    },
  ], [hasPermission, onView, onEdit, handleForceDelete, handleSoftDelete, handleRestore, pageIndex, pageSize]);
};
