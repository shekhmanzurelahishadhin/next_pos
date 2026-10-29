"use client";
import { useAuth } from "@/context/AuthContext";
import { useLocations } from "./hooks/useLocations";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { LocationModal } from "./components/LocationModal";
import { useLocationColumns } from "./components/LocationColumns";
import { useEffect } from "react";

export default function Locations() {
  const { hasPermission } = useAuth();

  const {
    locations,
    loading,
    saving,
    isOpen,
    selectedLocation,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    stores,
    loadingStores,

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
    exportAllLocations,
    formatDate,
  } = useLocations();

  const columns = useLocationColumns({
    hasPermission,
    onView: handleView,
    onEdit: handleEdit,
    handleSoftDelete,
    handleForceDelete,
    handleRestore,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    formatDate,
    status,
  });

  useEffect(() => {
    document.title = "Store Location | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["location.view", "location.create", "location.edit", "location.delete"]}>
      <div>
        <PageBreadcrumb
          items={[
            { title: "Configure" },
            { title: "Store Location Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Store Location Management"
            desc="Racks, shelves and other places inside a store"
            showAddButton={hasPermission("location.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={locations}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="store-locations"
              exportAllData={exportAllLocations}
              showExportAllOption={false}
            />
          </ComponentCard>

          <LocationModal
            isOpen={isOpen}
            status={status}
            location={selectedLocation}
            stores={stores}
            loadingStores={loadingStores}
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
