"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { UnitForm } from "./UnitForm";
import { UnitDetailView } from "./UnitDetailView";
import { Unit } from "@/services/unitService";

interface UnitModalProps {
  isOpen: boolean;
  status: { value: string; label: string }[];
  unit: Unit | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (unitData: { name: string }) => void;
  backendErrors?: Record<string, string>; // Add this prop
  formatDate: (dateString?: string) => string;
}

export function UnitModal({
  isOpen,
  status,
  unit,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors, // Add this prop
  formatDate,
}: UnitModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Unit Details';
      case 'edit': return 'Edit Unit';
      case 'create': return 'Add New Unit';
      default: return 'Unit';
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
              form="unit-form"
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
        {mode === 'view' && unit && (
          <UnitDetailView unit={unit} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <UnitForm
          status={status}
            unit={mode === 'edit' ? unit : null}
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