"use client";
import { useAuth } from "@/context/AuthContext";
import { useRoles } from "./hooks/useRoles";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { RoleModal } from "./components/RoleModal";
import { useRoleColumns } from "./components/RoleColumns";
import { useEffect } from "react";

export default function Roles() {
  const { hasPermission } = useAuth();

  // Single hook for all role operations
  const {
    roles,
    loading,
    saving,
    isOpen,
    selectedRole,
    mode,
    backendErrors,
    pagination,
    total,
    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleDelete,
    handleSave,
    handleFilterChange,
    exportAllRoles,
  } = useRoles();

  // Memoized columns
  const columns = useRoleColumns({
    hasPermission,
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  useEffect(() => {
    document.title = "Roles Management | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["role.view", "role.create", "role.update", "role.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "User Role" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Role Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Roles Management"
            desc="Manage user roles in the system"
            showAddButton={hasPermission("role.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={roles}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="roles"
              exportAllData={exportAllRoles} // Provide exportAllRoles function
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <RoleModal
            isOpen={isOpen}
            role={selectedRole}
            mode={mode}
            saving={saving}
            onClose={handleCloseModal}
            onSave={handleSave}
            backendErrors={backendErrors}
          />
        </div>
      </div>
    </AccessRoute>
  );
}