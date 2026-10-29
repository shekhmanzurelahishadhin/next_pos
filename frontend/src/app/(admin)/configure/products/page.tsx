"use client";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "./hooks/useProducts";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { ProductModal } from "./components/ProductModal";
import { useProductColumns } from "./components/ProductColumns";
import { useEffect } from "react";

export default function Products() {
  const { hasPermission } = useAuth();

  const {
    products,
    loading,
    saving,
    isOpen,
    selectedProduct,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    options,
    loadingOptions,
    models,

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
    exportAllProducts,
    formatDate,
  } = useProducts();

  const columns = useProductColumns({
    hasPermission,
    onView: handleView,
    onEdit: handleEdit,
    handleSoftDelete,
    handleForceDelete,
    handleRestore,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    status,
    options,
    models,
  });

  useEffect(() => {
    document.title = "Products | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["product.view", "product.create", "product.edit", "product.delete"]}>
      <div>
        <PageBreadcrumb
          items={[
            { title: "Configure" },
            { title: "Product Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Product Management"
            desc="Manage parts and products in the system"
            showAddButton={hasPermission("product.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={products}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="products"
              exportAllData={exportAllProducts}
              showExportAllOption={false}
            />
          </ComponentCard>

          <ProductModal
            isOpen={isOpen}
            status={status}
            product={selectedProduct}
            options={options}
            loadingOptions={loadingOptions}
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
