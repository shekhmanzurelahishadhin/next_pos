"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { CustomerForm } from "./CustomerForm";
import { CustomerDetailView } from "./CustomerDetailView";
import { Customer } from "@/services/customerService";

interface CustomerModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  openingBalanceType: { value: number; label: string }[];
  customerTypes: { value: number; label: string }[];
  stores: { value: number; label: string }[];
  customer: Customer | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (customerData: { name: string }) => void;
  backendErrors?: Record<string, string>; // Add this prop
  formatDate: (dateString?: string) => string;
}

export function CustomerModal({
  isOpen,
  status,
  openingBalanceType,
  customerTypes,
  stores,
  customer,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: CustomerModalProps) {
  let title = "Add New Customer";
  if (mode === "view") {
    title = "Customer Details";
  } else if (mode === "edit") {
    title = "Edit Customer";
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
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
              form="customer-form"
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
        {mode === 'view' && customer && (
          <CustomerDetailView customer={customer} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <CustomerForm
            status={status}
            openingBalanceType={openingBalanceType}
            customerTypes={customerTypes}
            stores={stores}
            customer={mode === 'edit' ? customer : null}
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