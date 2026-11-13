"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { PpSpSetupForm } from "./PpSpSetupForm";
import { PpSpSetupDetailView } from "./PpSpSetupDetailView";
import { PpSpSetup, PpSpSetupFormData } from "@/services/ppSpSetupService";

interface PpSpSetupModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  setup: PpSpSetup | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (data: PpSpSetupFormData) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function PpSpSetupModal({
  isOpen,
  status,
  setup,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: PpSpSetupModalProps) {
  let title = "Add New PP/SP Setup";
  let modalSize = "max-w-2xl";
  if (mode === "view") {
    title = "PP/SP Setup Details";
    modalSize = "max-w-lg";
  } else if (mode === "edit") {
    title = "Edit PP/SP Setup";
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
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="pp-sp-setup-form" size="sm" disabled={saving}>
              {submitText}
            </Button>
          </>
        )}
      </>
      }
    >
      <div>
        {mode === 'view' && setup && (
          <PpSpSetupDetailView setup={setup} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <PpSpSetupForm
            status={status}
            setup={mode === 'edit' ? setup : null}
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
