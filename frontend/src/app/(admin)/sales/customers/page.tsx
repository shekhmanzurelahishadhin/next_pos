"use client";
import { useAuth } from "@/context/AuthContext";
import { useCustomers } from "./hooks/useCustomers";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { CustomerModal } from "./components/CustomerModal";
import { useCustomerColumns } from "./components/CustomerColumns";
import { useEffect } from "react";

export default function Customers() {
  const { hasPermission } = useAuth();

  // Single hook for all customer operations
  const {
    customers,
    loading,
    saving,
    isOpen,
    selectedCustomer,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    openingBalanceType,
    customerTypes,
    stores,

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
    exportAllCustomers,
    formatDate,
  } = useCustomers();

  // Memoized columns
  const columns = useCustomerColumns({
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
    document.title = "Customer | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["customer.view", "customer.create", "customer.update", "customer.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Purchase" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Customer Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Customer Management"
            desc="Manage customer in the system"
            showAddButton={hasPermission("customer.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={customers}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="customers"
              exportAllData={exportAllCustomers}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <CustomerModal
            isOpen={isOpen}
            status={status}
            openingBalanceType={openingBalanceType}
            customerTypes={customerTypes}
            stores={stores}
            customer={selectedCustomer}
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