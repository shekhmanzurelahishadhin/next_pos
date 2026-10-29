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
  backendErrors?: Record<string, string>; // Add this prop
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
  backendErrors, // Add this prop
  formatDate,
}: BrandModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Brand Details';
      case 'edit': return 'Edit Brand';
      case 'create': return 'Add New Brand';
      default: return 'Brand';
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
              form="brand-form"
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
            backendErrors={backendErrors} // backend errors to form
          />
        )}
      </div>
    </Modal>
  );
}