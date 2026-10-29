"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { CategoryForm } from "./CategoryForm";
import { CategoryDetailView } from "./CategoryDetailView";
import { Category } from "@/services/categoryService";

interface CategoryModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  category: Category | null;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (categoryData: { name: string }) => void;
  backendErrors?: Record<string, string>; // Add this prop
  formatDate: (dateString?: string) => string;
}

export function CategoryModal({
  isOpen,
  status,
  category,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors, // Add this prop
  formatDate,
}: CategoryModalProps) {
  const getTitle = () => {
    switch (mode) {
      case 'view': return 'Category Details';
      case 'edit': return 'Edit Category';
      case 'create': return 'Add New Category';
      default: return 'Category';
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
              form="category-form"
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
        {mode === 'view' && category && (
          <CategoryDetailView category={category} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <CategoryForm
          status={status}
            category={mode === 'edit' ? category : null}
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