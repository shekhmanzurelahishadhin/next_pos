"use client";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "./hooks/usePermissions";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { PermissionModal } from "./components/PermissionModal";
import { usePermissionColumns } from "./components/PermissionColumns";
import { useEffect } from "react";

export default function Permissions() {
  const { hasPermission } = useAuth();

  // Single hook for all permission operations
  const {
    permissions,
    loading,
    saving,
    isOpen,
    selectedPermission,
    mode,
    backendErrors,
    pagination,
    total,
    modules,
    menus,
    submenus,
    loadingModules,
    loadingMenus,
    loadingSubmenus,
    fetchMenus,
    fetchSubmenus,
    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleDelete,
    handleSave,
    handleFilterChange,
    exportAllPermissions,
  } = usePermissions();

  // Memoized columns
  const columns = usePermissionColumns({
    hasPermission,
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  useEffect(() => {
    document.title = "Permission Management | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["permission.view", "permission.create", "permission.update", "permission.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "User Role" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Permission Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Permission Management"
            desc="Manage user permission in the system"
            showAddButton={hasPermission("permission.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={permissions}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="permission"
              exportAllData={exportAllPermissions} // Provide exportAllPermissions function
              showExportAllOption={true} // Disable "Export All" option
            />
          </ComponentCard>

          <PermissionModal
            isOpen={isOpen}
            permission={selectedPermission}
            mode={mode}
            saving={saving}
            onClose={handleCloseModal}
            onSave={handleSave}
            backendErrors={backendErrors}
            modules={modules}
            menus={menus}
            submenus={submenus}
            loadingModules={loadingModules}
            loadingMenus={loadingMenus}
            loadingSubmenus={loadingSubmenus}
            fetchMenus={fetchMenus}
            fetchSubmenus={fetchSubmenus}
          />
        </div>
      </div>
    </AccessRoute>
  );
}