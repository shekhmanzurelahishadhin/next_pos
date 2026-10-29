"use client";
import { useAuth } from "@/context/AuthContext";
import { useCategories } from "./hooks/useCategories";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { CategoryModal } from "./components/CategoryModal";
import { useCategoryColumns } from "./components/CategoryColumns";
import { useEffect } from "react";

export default function Categories() {
  const { hasPermission } = useAuth();

  // Single hook for all category operations
  const {
    categories,
    loading,
    saving,
    isOpen,
    selectedCategory,
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
    exportAllCategories,
    formatDate,
  } = useCategories();

  // Memoized columns
  const columns = useCategoryColumns({
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
    document.title = "Category | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["category.view", "category.create", "category.update", "category.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Configure" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Category Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Category Management"
            desc="Manage category in the system"
            showAddButton={hasPermission("category.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={categories}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="categories"
              exportAllData={exportAllCategories}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <CategoryModal
            isOpen={isOpen}
            status={status}
            category={selectedCategory}
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