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
  backendErrors?: Record<string, string>; // Add this prop
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
  backendErrors, // Add this prop
  formatDate,
}: LookupModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Lookup Details';
      case 'edit': return 'Edit Lookup';
      case 'create': return 'Add New Lookup';
      default: return 'Lookup';
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
              form="sub-category-form"
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
            backendErrors={backendErrors} // backend errors to form
          />
        )}
      </div>
    </Modal>
  );
}