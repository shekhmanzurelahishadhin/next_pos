"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { CustomerContactForm } from "./CustomerContactForm";
import { CustomerContactDetailView } from "./CustomerContactDetailView";
import { CustomerContact, CustomerContactFormData } from "@/services/customerContactService";

interface CustomerContactModalProps {
  isOpen: boolean;
  contact: CustomerContact | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (contactData: CustomerContactFormData) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function CustomerContactModal({
  isOpen,
  contact,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: CustomerContactModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Contact Details';
      case 'edit': return 'Edit Contact';
      case 'create': return 'Add New Contact';
      default: return 'Contact';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={mode === 'view' ? 'max-w-md' : 'max-w-2xl'}
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
            <Button type="submit" form="customer-contact-form" size="sm" disabled={saving}>
              {saving ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Create')}
            </Button>
          </>
        )}
      </>
      }
    >
      <div>
        {mode === 'view' && contact && (
          <CustomerContactDetailView contact={contact} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <CustomerContactForm
            contact={mode === 'edit' ? contact : null}
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
