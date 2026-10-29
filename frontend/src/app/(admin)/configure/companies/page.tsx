"use client";
import { useAuth } from "@/context/AuthContext";
import { useCompanies } from "./hooks/useCompanies";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { CompanyModal } from "./components/CompanyModal";
import { useCompanyColumns } from "./components/CompanyColumns";
import { useEffect } from "react";

export default function Companies() {
  const { hasPermission } = useAuth();

  // Single hook for all company operations
  const {
    companies,
    loading,
    saving,
    isOpen,
    selectedCompany,
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
    exportAllCompanies,
    formatDate,
  } = useCompanies();

  // Memoized columns
  const columns = useCompanyColumns({
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
    document.title = "Company | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["company.view", "company.create", "company.update", "company.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Configure" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Company Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Company Management"
            desc="Manage company in the system"
            showAddButton={hasPermission("company.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={companies}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="companies"
              exportAllData={exportAllCompanies}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <CompanyModal
            isOpen={isOpen}
            status={status}
            company={selectedCompany}
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