import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import ActionButtons from "@/components/ui/button/ActionButton";
import { FiEye, FiEdit, FiTrash, FaUserTag } from "@/icons/index";
import { User } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    filterVariant?: 'text' | 'select' | 'searchSelect' | 'none';
    filterOptions?: { value: string; label: string }[];
    exportable?: boolean;
    exportHeader?: string;
    placeholder?: string;
    exportValue?: (row: TData, index?: number) => string | number;
    widthClass?: string;
    minWidth?: string;
    maxWidth?: string;
  }
}

interface UseUserColumnsProps {
  hasPermission: (permission: string) => boolean;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  pageIndex: number;
  pageSize: number;
  formatDate: (dateString?: string) => string;
}

export const useUserColumns = ({
  hasPermission,
  onView,
  onEdit,
  onDelete,
  pageIndex,
  pageSize,
  formatDate,
}: UseUserColumnsProps): ColumnDef<User>[] => {
  const { user: currentLoginUser } = useAuth();
  const router = useRouter();

  return useMemo((): ColumnDef<User>[] => [
    {
      id: "sl",
      header: "SL",
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: true,
        exportHeader: "SL",
        exportValue: (row, index) => (pageIndex * pageSize) + (index ?? 0) + 1,
        widthClass: "w-[30px] min-w-[30px] max-w-[40px]",
        minWidth: "30px",
        maxWidth: "40px"
      },
      cell: ({ row }) => {
        const serialNumber = (pageIndex * pageSize) + row.index + 1;
        return (
          <div className="px-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {serialNumber}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "User Name",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search names",
        exportable: true,
        exportHeader: "User Name",
        exportValue: (row) => row.name,
        widthClass: "w-[180px] min-w-[150px] max-w-[220px]",
        minWidth: "150px",
        maxWidth: "220px"
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
        exportHeader: "Email",
        exportValue: (row) => row.email,
        widthClass: "w-[220px] min-w-[180px] max-w-[280px]",
        minWidth: "180px",
        maxWidth: "280px"
      },
      cell: ({ row }) => {
        const email = row.getValue("email") as string;
        return (
          <div className="px-2">
            <span className="font-medium text-gray-800 dark:text-white/90 truncate block">
              {email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "roles_name",
      header: "Roles",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search Roles",
        exportable: true,
        exportHeader: "Roles",
        exportValue: (row) => row.roles_name,
        widthClass: "w-[160px] min-w-[140px] max-w-[200px]",
        minWidth: "140px",
        maxWidth: "200px"
      },
      cell: ({ row }) => {
        const roles_name = row.getValue("roles_name") as string;
        return (
          <div className="px-2">
            <span className="font-medium text-gray-800 dark:text-white/90 truncate block">
              {roles_name || "—"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "company",
      header: "Company",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        placeholder: "Search Company",
        exportable: true,
        exportHeader: "Company",
        exportValue: (row) => row.company || "—",
        widthClass: "w-[160px] min-w-[140px] max-w-[200px]",
        minWidth: "140px",
        maxWidth: "200px"
      },
      cell: ({ row }) => {
        const company = row.getValue("company") as string;
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
      id: "actions",
      header: () => <div className="">Actions</div>,
      enableSorting: false,
      meta: {
        filterVariant: "none",
        exportable: false,
        widthClass: "w-[110px]",
        minWidth: "160px",
        maxWidth: "200px"
      },
      cell: ({ row }) => {
        const user = row.original;
        return (
            <ActionButtons
              row={user}
              buttons={[
                {
                  icon: FiEye,
                  onClick: (row) => onView(row as User),
                  variant: "success",
                  size: "sm",
                  tooltip: "View",
                  show: () => hasPermission("user.view"),
                },
                {
                  icon: FiEdit,
                  onClick: (row) => onEdit(row as User),
                  variant: "primary",
                  size: "sm",
                  tooltip: "Edit",
                  show: (user) =>
                    !user.roles_name?.includes("Super Admin") &&
                    hasPermission("user.edit"),
                },
                {
                  icon: FaUserTag,
                  onClick: (user) =>
                    router.push(`/users/user-permissions/${user.id}`),
                  variant: "info",
                  size: "sm",
                  tooltip: "Assign Permissions",
                  show: (user) =>
                    !user.roles_name?.includes("Super Admin") &&
                    hasPermission("user.assign-permissions"),
                },
                {
                  icon: FiTrash,
                  onClick: (row) => onDelete((row as User).id),
                  variant: "danger",
                  size: "sm",
                  tooltip: "Delete",
                  show: (user) =>
                    !user.roles_name?.includes("Super Admin") &&
                    hasPermission("user.delete") && user.id !== currentLoginUser?.id,
                },
              ]}
            />
        );
      },
    },
  ], [hasPermission, onView, onEdit, onDelete, pageIndex, pageSize, currentLoginUser, router, formatDate]);
};