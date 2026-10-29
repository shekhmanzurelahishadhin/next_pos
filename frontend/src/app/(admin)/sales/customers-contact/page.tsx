"use client";
import { useAuth } from "@/context/AuthContext";
import { useCustomerContacts } from "./hooks/useCustomerContacts";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { CustomerContactModal } from "./components/CustomerContactModal";
import { useCustomerContactColumns } from "./components/CustomerContactColumns";
import { useEffect } from "react";

export default function CustomersContact() {
  const { hasPermission } = useAuth();

  const {
    contacts,
    loading,
    saving,
    isOpen,
    selectedContact,
    mode,
    backendErrors,
    pagination,
    total,

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
    exportAllContacts,
    formatDate,
  } = useCustomerContacts();

  const columns = useCustomerContactColumns({
    hasPermission,
    onView: handleView,
    onEdit: handleEdit,
    handleSoftDelete,
    handleForceDelete,
    handleRestore,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  useEffect(() => {
    document.title = "Customers Contact | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["customer-contact.view", "customer-contact.create", "customer-contact.edit", "customer-contact.delete"]}>
      <div>
        <PageBreadcrumb
          items={[
            { title: "Sales" },
            { title: "Customers Contact" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Customers Contact"
            desc="Phone book of customers and shops"
            showAddButton={hasPermission("customer-contact.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={contacts}
              searchKey="customer_name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="customers-contact"
              exportAllData={exportAllContacts}
              showExportAllOption={false}
            />
          </ComponentCard>

          <CustomerContactModal
            isOpen={isOpen}
            contact={selectedContact}
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
