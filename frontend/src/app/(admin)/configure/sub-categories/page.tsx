"use client";
import { useAuth } from "@/context/AuthContext";
import { useSubCategories } from "./hooks/useSubCategories";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { SubCategoryModal } from "./components/SubCategoryModal";
import { useSubCategoryColumns } from "./components/SubCategoryColumns";
import { useEffect } from "react";

export default function SubCategories() {
  const { hasPermission } = useAuth();

  // Single hook for all subCategory operations
  const {
    subCategories,
    categories,
    loadingCategories,
    loading,
    saving,
    isOpen,
    selectedSubCategory,
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
    exportAllSubCategories,
    formatDate,
  } = useSubCategories();

  // Memoized columns
  const columns = useSubCategoryColumns({
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
    document.title = "Sub-Category | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["sub-category.view", "sub-category.create", "sub-category.update", "sub-category.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Configure" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Sub-Category Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Sub-Category Management"
            desc="Manage sub sub-category in the system"
            showAddButton={hasPermission("sub-category.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={subCategories}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="sub-categories"
              exportAllData={exportAllSubCategories}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <SubCategoryModal
            isOpen={isOpen}
            status={status}
            subCategory={selectedSubCategory}
            categories={categories}
            loadingCategories={loadingCategories}
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