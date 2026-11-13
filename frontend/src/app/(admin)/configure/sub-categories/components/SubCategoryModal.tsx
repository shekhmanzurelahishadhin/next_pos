"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { SubCategoryForm } from "./SubCategoryForm";
import { SubCategoryDetailView } from "./SubCategoryDetailView";
import { SubCategory } from "@/services/subCategoryService";

interface SubCategoryModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  subCategory: SubCategory | null;
  categories: { value: number; label: string }[];
  loadingCategories: boolean;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (categoryData: { name: string }) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function SubCategoryModal({
  isOpen,
  status,
  subCategory,
  categories,
  loadingCategories,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: SubCategoryModalProps) {
  let title = "Add New Sub-Category";
  let modalSize = "max-w-md";
  if (mode === "view") {
    title = "Sub-Category Details";
    modalSize = "max-w-2xl";
  } else if (mode === "edit") {
    title = "Edit Sub-Category";
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
              form="sub-category-form"
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
        {mode === 'view' && subCategory && (
          <SubCategoryDetailView subCategory={subCategory} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <SubCategoryForm
          status={status}
            subCategory={mode === 'edit' ? subCategory : null}
            categories={categories}
            loadingCategories={loadingCategories}
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