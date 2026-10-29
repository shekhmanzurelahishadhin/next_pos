"use client";
import { useAuth } from "@/context/AuthContext";
import { useStores } from "./hooks/useStores";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { StoreModal } from "./components/StoreModal";
import { useStoreColumns } from "./components/StoreColumns";
import { useEffect } from "react";

export default function Stores() {
  const { hasPermission } = useAuth();

  // Single hook for all store operations
  const {
    stores,
    companies,
    loadingCompanies,
    loading,
    saving,
    isOpen,
    selectedStore,
    mode,
    backendErrors,
    pagination,
    total,
    status,

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
    exportAllStores,
    formatDate,
  } = useStores();

  // Memoized columns
  const columns = useStoreColumns({
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
  });

  useEffect(() => {
    document.title = "Store | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["store.view", "store.create", "store.update", "store.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Configure" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Store Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Store Management"
            desc="Manage sub store in the system"
            showAddButton={hasPermission("store.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={stores}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="stores"
              exportAllData={exportAllStores}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <StoreModal
            isOpen={isOpen}
            status={status}
            store={selectedStore}
            companies={companies}
            loadingCompanies={loadingCompanies}
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