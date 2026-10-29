"use client";
import { useAuth } from "@/context/AuthContext";
import { useBrands } from "./hooks/useBrands";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { BrandModal } from "./components/BrandModal";
import { useBrandColumns } from "./components/BrandColumns";
import { useEffect } from "react";

export default function Brands() {
  const { hasPermission } = useAuth();

  // Single hook for all brand operations
  const {
    brands,
    loading,
    saving,
    isOpen,
    selectedBrand,
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
    exportAllBrands,
    formatDate,
  } = useBrands();

  // Memoized columns
  const columns = useBrandColumns({
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
    document.title = "Brand | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["brand.view", "brand.create", "brand.update", "brand.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Configure" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Brand Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Brand Management"
            desc="Manage brand in the system"
            showAddButton={hasPermission("brand.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={brands}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="brands"
              exportAllData={exportAllBrands}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <BrandModal
            isOpen={isOpen}
            status={status}
            brand={selectedBrand}
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