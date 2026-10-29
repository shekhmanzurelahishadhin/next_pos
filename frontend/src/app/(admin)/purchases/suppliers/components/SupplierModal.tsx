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
  backendErrors?: Record<string, string>; // Add this prop
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
  backendErrors, // Add this prop
  formatDate,
}: SupplierModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Supplier Details';
      case 'edit': return 'Edit Supplier';
      case 'create': return 'Add New Supplier';
      default: return 'Supplier';
    }
  };

  const getModalSize = () => {
    return mode === 'view' ? 'max-w-2xl' : 'max-w-md';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={getModalSize()}
      title={getTitle()}
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
              {saving ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Create')}
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
            backendErrors={backendErrors} // backend errors to form
          />
        )}
      </div>
    </Modal>
  );
}