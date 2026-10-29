"use client";
import { useAuth } from "@/context/AuthContext";
import { usePpSpSetups } from "./hooks/usePpSpSetups";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { PpSpSetupModal } from "./components/PpSpSetupModal";
import { usePpSpSetupColumns } from "./components/PpSpSetupColumns";
import { useEffect } from "react";

export default function PpSpSetups() {
  const { hasPermission } = useAuth();

  const {
    setups,
    loading,
    saving,
    isOpen,
    selectedSetup,
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
    exportAllSetups,
    formatDate,
  } = usePpSpSetups();

  const columns = usePpSpSetupColumns({
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
    document.title = "PP/SP Setup | Multibrand POS";
  }, []);

  return (
    <AccessRoute requiredPermissions={["pp-sp-setup.view", "pp-sp-setup.create", "pp-sp-setup.edit", "pp-sp-setup.delete"]}>
      <div>
        <PageBreadcrumb
          items={[
            { title: "Configure" },
            { title: "PP/SP Setup" }
          ]}
        />
        <div className="space-y-6">
          <ComponentCard
            title="PP/SP Setup"
            desc="Secret code for each digit, used to hide purchase and sale prices on labels and reports. Only one setup per type is active."
            showAddButton={hasPermission("pp-sp-setup.create")}
            buttonLabel="Add New"
            openModal={handleCreate}
          >
            <DataTable
              columns={columns}
              data={setups}
              searchKey="type"
              pagination={pagination}
              onPaginationChange={setPagination}
              onColumnFilterChange={handleFilterChange}
              total={total}
              loading={loading}
              exportFilename="pp-sp-setups"
              exportAllData={exportAllSetups}
              showExportAllOption={false}
            />
          </ComponentCard>

          <PpSpSetupModal
            isOpen={isOpen}
            status={status}
            setup={selectedSetup}
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
