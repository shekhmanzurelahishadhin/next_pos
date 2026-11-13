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
  backendErrors?: Record<string, string>;
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
  backendErrors,
  formatDate,
}: CompanyModalProps) {
  let title = "Add New Company";
  let modalSize = "max-w-md";
  if (mode === "view") {
    title = "Company Details";
    modalSize = "max-w-2xl";
  } else if (mode === "edit") {
    title = "Edit Company";
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
              form="company-form"
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
            backendErrors={backendErrors}
          />
        )}
      </div>
    </Modal>
  );
}