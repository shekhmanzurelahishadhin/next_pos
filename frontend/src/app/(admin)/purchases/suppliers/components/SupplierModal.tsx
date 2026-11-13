"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { SupplierForm } from "./SupplierForm";
import { SupplierDetailView } from "./SupplierDetailView";
import { Supplier } from "@/services/supplierService";

interface SupplierModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  openingBalanceType: { value: number; label: string }[];
  supplier: Supplier | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (supplierData: { name: string }) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function SupplierModal({
  isOpen,
  status,
  openingBalanceType,
  supplier,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: SupplierModalProps) {
  let title = "Add New Supplier";
  let modalSize = "max-w-md";
  if (mode === "view") {
    title = "Supplier Details";
    modalSize = "max-w-2xl";
  } else if (mode === "edit") {
    title = "Edit Supplier";
  }

  let submitText = "Create";
  if (saving) {
    submitText = "Saving...";
  } else if (mode === "edit") {
    submitText = "Update";
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={modalSize}
      title={title}
      footer={
      <>
        {mode === 'view' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="supplier-form"
              size="sm"
              disabled={saving}
            >
              {submitText}
            </Button>
          </>
        )}
      </>
      }
    >
      <div>
        {mode === 'view' && supplier && (
          <SupplierDetailView supplier={supplier} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <SupplierForm
            status={status}
            openingBalanceType={openingBalanceType}
            supplier={mode === 'edit' ? supplier : null}
            mode={mode}
            saving={saving}
            onSubmit={onSave}
            backendErrors={backendErrors}
          />
        )}
      </div>
    </Modal>
  );
}