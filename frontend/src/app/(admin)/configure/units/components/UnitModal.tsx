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
  backendErrors?: Record<string, string>;
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
  backendErrors,
  formatDate,
}: UnitModalProps) {
  let title = "Add New Unit";
  let modalSize = "max-w-md";
  if (mode === "view") {
    title = "Unit Details";
    modalSize = "max-w-2xl";
  } else if (mode === "edit") {
    title = "Edit Unit";
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
              form="unit-form"
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
            backendErrors={backendErrors}
          />
        )}
      </div>
    </Modal>
  );
}