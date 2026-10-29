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
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'PP/SP Setup Details';
      case 'edit': return 'Edit PP/SP Setup';
      case 'create': return 'Add New PP/SP Setup';
      default: return 'PP/SP Setup';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={mode === 'view' ? 'max-w-lg' : 'max-w-2xl'}
      title={getTitle()}
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
              {saving ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Create')}
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
