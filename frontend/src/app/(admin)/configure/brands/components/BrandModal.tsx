"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { BrandForm } from "./BrandForm";
import { BrandDetailView } from "./BrandDetailView";
import { Brand } from "@/services/brandService";

interface BrandModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  brand: Brand | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (brandData: { name: string }) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function BrandModal({
  isOpen,
  status,
  brand,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: BrandModalProps) {
  let title = "Add New Brand";
  let modalSize = "max-w-md";
  if (mode === "view") {
    title = "Brand Details";
    modalSize = "max-w-2xl";
  } else if (mode === "edit") {
    title = "Edit Brand";
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
              form="brand-form"
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
        {mode === 'view' && brand && (
          <BrandDetailView brand={brand} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <BrandForm
          status={status}
            brand={mode === 'edit' ? brand : null}
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