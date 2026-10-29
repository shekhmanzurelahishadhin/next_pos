"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { RoleForm } from "./RoleForm";
import { RoleDetailView } from "./RoleDetailView";
import { Role } from "@/services/roleService";

interface RoleModalProps {
  isOpen: boolean;
  role: Role | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (roleData: { name: string }) => void;
  backendErrors?: Record<string, string>; // Add this prop
}

export function RoleModal({
  isOpen,
  role,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors, // Add this prop
}: RoleModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Role Details';
      case 'edit': return 'Edit Role';
      case 'create': return 'Add New Role';
      default: return 'Role';
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
              form="role-form"
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
        {mode === 'view' && role && (
          <RoleDetailView role={role} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <RoleForm
            role={mode === 'edit' ? role : null}
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