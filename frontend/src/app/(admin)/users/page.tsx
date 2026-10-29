"use client";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "./hooks/useUsers";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { UserModal } from "./components/UserModal";
import { useUserColumns } from "./components/UserColumns";
import { useEffect } from "react";

export default function Users() {
  const { hasPermission } = useAuth();

  // Single hook for all user operations
  const {
    users,
    loading,
    saving,
    isOpen,
    selectedUser,
    mode,
    backendErrors,
    pagination,
    total,
    companies,
    roles,
    loadingCompanies,
    loadingRoles,
    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleDelete,
    handleSave,
    handleFilterChange,
    exportAllUsers,
    formatDate,
  } = useUsers();

  // Memoized columns
  const columns = useUserColumns({
    hasPermission,
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    formatDate,
  });

  useEffect(() => {
    document.title = "User Management | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["user.view", "user.create", "user.update", "user.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "User Role" }, // add href if needed links like href: "/admin/authorization/users"
            { title: "User Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="User Management"
            desc="Manage user in the system"
            showAddButton={hasPermission("user.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={users}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="user"
              exportAllData={exportAllUsers} // Provide exportAllUsers function
              showExportAllOption={true} // Disable "Export All" option
            />
          </ComponentCard>

          <UserModal
            isOpen={isOpen}
            user={selectedUser}
            mode={mode}
            saving={saving}
            onClose={handleCloseModal}
            onSave={handleSave}
            backendErrors={backendErrors}
            companies={companies}
            roles={roles}
            loadingCompanies={loadingCompanies}
            loadingRoles={loadingRoles}
            formatDate={formatDate}
          />
        </div>
      </div>
    </AccessRoute>
  );
}