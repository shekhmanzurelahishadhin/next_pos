"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { LookupForm } from "./LookupForm";
import { LookupDetailView } from "./LookupDetailView";
import { Lookup } from "@/services/lookupService";

interface LookupModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  lookupTypes: { value: string; label: string }[];
  lookup: Lookup | null;
  lookupTypesLoading?: boolean;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (categoryData: { name: string }) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function LookupModal({
  isOpen,
  status,
  lookupTypes,
  lookupTypesLoading,
  lookup,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: LookupModalProps) {
  let title = "Add New Lookup";
  let modalSize = "max-w-md";
  if (mode === "view") {
    title = "Lookup Details";
    modalSize = "max-w-2xl";
  } else if (mode === "edit") {
    title = "Edit Lookup";
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
              form="sub-category-form"
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
        {mode === 'view' && lookup && (
          <LookupDetailView lookup={lookup} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <LookupForm
            status={status}
            lookupTypes={lookupTypes}
            lookupTypesLoading={lookupTypesLoading}
            lookup={mode === 'edit' ? lookup : null}
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