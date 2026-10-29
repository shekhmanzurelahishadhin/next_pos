"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { LocationForm } from "./LocationForm";
import { LocationDetailView } from "./LocationDetailView";
import { Location, LocationFormData } from "@/services/locationService";

interface LocationModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  location: Location | null;
  stores: { value: number; label: string }[];
  loadingStores: boolean;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (locationData: LocationFormData) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function LocationModal({
  isOpen,
  status,
  location,
  stores,
  loadingStores,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: LocationModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Location Details';
      case 'edit': return 'Edit Location';
      case 'create': return 'Add New Location';
      default: return 'Location';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md"
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
            <Button type="submit" form="location-form" size="sm" disabled={saving}>
              {saving ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Create')}
            </Button>
          </>
        )}
      </>
      }
    >
      <div>
        {mode === 'view' && location && (
          <LocationDetailView location={location} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <LocationForm
            status={status}
            location={mode === 'edit' ? location : null}
            stores={stores}
            loadingStores={loadingStores}
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
