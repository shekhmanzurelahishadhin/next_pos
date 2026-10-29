"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { StoreForm } from "./StoreForm";
import { StoreDetailView } from "./StoreDetailView";
import { Store } from "@/services/storeService";

interface StoreModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  store: Store | null;
  companies: { value: number; label: string }[];
  loadingCompanies: boolean;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (storeData: { name: string, company_id?: number | null, address?: string, status?: number }) => void;
  backendErrors?: Record<string, string>; // Add this prop
  formatDate: (dateString?: string) => string;
}

export function StoreModal({
  isOpen,
  status,
  store,
  companies,
  loadingCompanies,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors, // Add this prop
  formatDate,
}: StoreModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Store Details';
      case 'edit': return 'Edit Store';
      case 'create': return 'Add New Store';
      default: return 'Store';
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
              form="store-form"
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
        {mode === 'view' && store && (
          <StoreDetailView store={store} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <StoreForm
          status={status}
            store={mode === 'edit' ? store : null}
            companies={companies}
            loadingCompanies={loadingCompanies}
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