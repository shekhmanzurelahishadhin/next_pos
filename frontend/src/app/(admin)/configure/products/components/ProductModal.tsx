"use client";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { ProductForm } from "./ProductForm";
import { ProductDetailView } from "./ProductDetailView";
import { Product, ProductFormData } from "@/services/productService";
import { ProductOptions } from "../hooks/useProducts";

interface ProductModalProps {
  isOpen: boolean;
  status: { value: number; label: string }[];
  product: Product | null;
  options: ProductOptions;
  loadingOptions: boolean;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData) => void;
  backendErrors?: Record<string, string>;
  formatDate: (dateString?: string) => string;
}

export function ProductModal({
  isOpen,
  status,
  product,
  options,
  loadingOptions,
  mode,
  saving,
  onClose,
  onSave,
  backendErrors,
  formatDate,
}: ProductModalProps) {
  let title = "Add New Product";
  if (mode === "view") {
    title = "Product Details";
  } else if (mode === "edit") {
    title = "Edit Product";
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
      className="max-w-3xl"
      title={title}
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
            <Button type="submit" form="product-form" size="sm" disabled={saving}>
              {submitText}
            </Button>
          </>
        )}
      </>
      }
    >
      <div>
        {mode === 'view' && product && (
          <ProductDetailView product={product} formatDate={formatDate} />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <ProductForm
            status={status}
            product={mode === 'edit' ? product : null}
            options={options}
            loadingOptions={loadingOptions}
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
