"use client";
import { useAuth } from "@/context/AuthContext";
import { useUnits } from "./hooks/useUnits";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { UnitModal } from "./components/UnitModal";
import { useUnitColumns } from "./components/UnitColumns";
import { useEffect } from "react";

export default function Units() {
  const { hasPermission } = useAuth();

  // Single hook for all unit operations
  const {
    units,
    loading,
    saving,
    isOpen,
    selectedUnit,
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
    exportAllUnits,
    formatDate,
  } = useUnits();

  // Memoized columns
  const columns = useUnitColumns({
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
    document.title = "Unit | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["unit.view", "unit.create", "unit.update", "unit.delete"]}>
      <div>
         <PageBreadcrumb
          items={[
            { title: "Configure" }, // add href if needed links like href: "/admin/authorization/permissions"
            { title: "Unit Management" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="Unit Management"
            desc="Manage unit in the system"
            showAddButton={hasPermission("unit.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={units}
              searchKey="name"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="units"
              exportAllData={exportAllUnits}
              showExportAllOption={false} // Disable "Export All" option
            />
          </ComponentCard>

          <UnitModal
            isOpen={isOpen}
            status={status}
            unit={selectedUnit}
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