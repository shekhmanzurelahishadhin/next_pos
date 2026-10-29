"use client";
import { useAuth } from "@/context/AuthContext";
import { useLookups } from "./hooks/useLookups";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { LookupModal } from "./components/LookupModal";
import { useLookupColumns } from "./components/LookupColumns";
import { useEffect } from "react";

export default function Lookups() {
  const { hasPermission } = useAuth();

  // Single hook for all lookup operations
  const {
    lookups,
    loading,
    saving,
    isOpen,
    selectedLookup,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    lookupTypes,
    lookupTypesLoading,

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
    exportAllLookups,
    formatDate,
  } = useLookups();

  // Memoized columns
  const columns = useLookupColumns({
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
    document.title = "Lookup | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["lookup.view", "lookup.create", "lookup.update", "lookup.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Configure" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Lookup Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Lookup Management"
            desc="Manage lookups in the system"
            showAddButton={hasPermission("lookup.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={lookups}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="lookups"
              exportAllData={exportAllLookups} // Provide exportAllLookups function
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <LookupModal
            isOpen={isOpen}
            status={status}
            lookupTypes={lookupTypes}
            lookupTypesLoading={lookupTypesLoading}
            lookup={selectedLookup}
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