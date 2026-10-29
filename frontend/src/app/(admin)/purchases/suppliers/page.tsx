"use client";
import { useAuth } from "@/context/AuthContext";
import { useSuppliers } from "./hooks/useSuppliers";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { SupplierModal } from "./components/SupplierModal";
import { useSupplierColumns } from "./components/SupplierColumns";
import { useEffect } from "react";

export default function Suppliers() {
  const { hasPermission } = useAuth();

  // Single hook for all supplier operations
  const {
    suppliers,
    loading,
    saving,
    isOpen,
    selectedSupplier,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    openingBalanceType,

    // Actions
    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleSoftDelete,
    handleForceDelete,
    handleRestore,
    handleSave,
    handleFilterChange,
    exportAllSuppliers,
    formatDate,
  } = useSuppliers();

  // Memoized columns
  const columns = useSupplierColumns({
    hasPermission,
    onView: handleView,
    onEdit: handleEdit,
    handleSoftDelete: handleSoftDelete,
    handleForceDelete: handleForceDelete,
    handleRestore: handleRestore,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    formatDate,
    status,
    openingBalanceType,
  });

  useEffect(() => {
    document.title = "Supplier | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["supplier.view", "supplier.create", "supplier.update", "supplier.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Purchase" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Supplier Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Supplier Management"
            desc="Manage supplier in the system"
            showAddButton={hasPermission("supplier.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={suppliers}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="suppliers"
              exportAllData={exportAllSuppliers}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <SupplierModal
            isOpen={isOpen}
            status={status}
            openingBalanceType={openingBalanceType}
            supplier={selectedSupplier}
            mode={mode}
            saving={saving}
            onClose={handleCloseModal}
            onSave={handleSave}
            backendErrors={backendErrors}
            formatDate={formatDate}
          />
        </div>
      </div>
    </AccessRoute>
  );
}