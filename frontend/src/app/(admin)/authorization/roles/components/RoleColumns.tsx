import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import ActionButtons from "@/components/ui/button/ActionButton";
import { FiEye, FiEdit, FiTrash, FiShield, FiKey } from "@/icons/index";
import { Role } from "@/services/roleService";

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

interface UseRoleColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (role: Role) => void;
  onEdit: (role: Role) => void;
  onDelete: (id: number) => void;
  pageIndex: number;
  pageSize: number;
}

export const useRoleColumns = ({
  hasPermission,
  onView,
  onEdit,
  onDelete,
  pageIndex,
  pageSize,
}: UseRoleColumnsProps): ColumnDef<Role>[] => {
  const router = useRouter();
  return useMemo((): ColumnDef<Role>[] => [
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
      header: "Role Name",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search names",
        exportable: true,
        exportHeader: "Role Name",
        exportValue: (row) => row.name,
        widthClass: "w-[200px]"
      },
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="flex items-center gap-2">
            <FiShield className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-medium text-gray-800 dark:text-white/90 truncate">
              {name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "guard_name",
      header: "Guard Name",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterOptions: [
          { value: "web", label: "Web" },
          { value: "api", label: "API" },
          { value: "sanctum", label: "Sanctum" },
        ],
        exportable: true,
        exportHeader: "Guard Name",
        exportValue: (row) => row.guard_name,
        widthClass: "w-[150px]"
      },
      cell: ({ row }) => {
        const guardName = row.getValue("guard_name") as string;
        return (
          <Badge
            size="sm"
            color={
              guardName === "web"
                ? "primary"
                : guardName === "api"
                  ? "success"
                  : "warning"
            }
            variant="light"
          >
            {guardName}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created at",
      enableSorting: true,
      meta: {
        exportable: true,
        exportHeader: "Created At",
        placeholder: "Search created at",
        exportValue: (row) => {
          if (!row.created_at) return "-";
          const [datePart] = row.created_at.split(" ");
          const [y, m, d] = datePart.split("-");
          return `${d}-${m}-${y}`;
        },
        widthClass: "w-[120px]"
      },
      cell: ({ row }) => {
        const value = row.getValue("created_at");
        if (!value) {
          return <span className="text-gray-400 dark:text-gray-500">-</span>;
        }
        const [datePart] = (value as string).split(" ");
        const [y, m, d] = datePart.split("-");
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {`${d}-${m}-${y}`}
          </span>
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
        placeholder: "Search updated at",
        exportValue: (row) => {
          if (!row.updated_at) return "-";
          const [datePart] = row.updated_at.split(" ");
          const [y, m, d] = datePart.split("-");
          return `${d}-${m}-${y}`;
        },
        widthClass: "w-[120px]"
      },
      cell: ({ row }) => {
        const value = row.getValue("updated_at");
        if (!value) {
          return <span className="text-gray-400 dark:text-gray-500">-</span>;
        }
        const [datePart] = (value as string).split(" ");
        const [y, m, d] = datePart.split("-");
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {`${d}-${m}-${y}`}
          </span>
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
        widthClass: "w-[140px]"
      },
      cell: ({ row }) => {
        const role = row.original;
        return (
          <ActionButtons
            row={role}
            buttons={[
              {
                icon: FiEye,
                onClick: (row) => onView(row as Role),
                variant: "success",
                size: "sm",
                tooltip: "View",
                show: () => hasPermission("role.view"),
              },
              {
                icon: FiKey,
                 onClick: (r) => router.push(`/authorization/roles/role-permissions/${r.id}`),
                variant: "primary",
                size: "sm",
                tooltip: "Assign Permissions",
                show: (r) => !r.name?.includes("Super Admin") && hasPermission("role.assign-permissions"),
              },
              {
                icon: FiEdit,
                onClick: (row) => onEdit(row as Role),
                variant: "primary",
                size: "sm",
                tooltip: "Edit",
                show: (r) => !r.name?.includes("Super Admin") && hasPermission("role.edit"),
              },
              {
                icon: FiTrash,
                onClick: (row) => onDelete((row as Role).id),
                variant: "danger",
                size: "sm",
                tooltip: "Delete",
                show: (r) => !r.name?.includes("Super Admin") && hasPermission("role.delete"),
              },
            ]}
          />
        );
      },
    },
  ], [hasPermission, onView, onEdit, onDelete, pageIndex, pageSize]);
};