"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { CompanyForm } from "./CompanyForm";
import { CompanyDetailView } from "./CompanyDetailView";
import { Company } from "@/services/companyService";

interface CompanyModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  company: Company | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (companyData: { name: string }) => void;
  backendErrors?: Record<string, string>; // Add this prop
  formatDate: (dateString?: string) => string;
}

export function CompanyModal({
  isOpen,
  status,
  company,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors, // Add this prop
  formatDate,
}: CompanyModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Company Details';
      case 'edit': return 'Edit Company';
      case 'create': return 'Add New Company';
      default: return 'Company';
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
              form="company-form"
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
        {mode === 'view' && company && (
          <CompanyDetailView company={company} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <CompanyForm
          status={status}
            company={mode === 'edit' ? company : null}
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