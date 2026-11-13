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
  backendErrors?: Record<string, string>;
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
  backendErrors,
  formatDate,
}: CategoryModalProps) {
  let title = "Add New Category";
  let modalSize = "max-w-md";
  if (mode === "view") {
    title = "Category Details";
    modalSize = "max-w-2xl";
  } else if (mode === "edit") {
    title = "Edit Category";
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
              form="category-form"
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
            backendErrors={backendErrors}
          />
        )}
      </div>
    </Modal>
  );
}