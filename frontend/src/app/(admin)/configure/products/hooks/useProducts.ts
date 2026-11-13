// Product Setup: the product list, its filters, the modal and the dropdown lists of the form
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAlert } from "@/hooks/useAlert";
import { useModal } from "@/hooks/useModal";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, apiFieldErrors } from "@/lib/options";
import { productService, Product, ProductFormData } from "@/services/productService";
import { lookupService } from "@/services/lookupService";

export interface Option {
  value: number;
  label: string;
  category_id?: number;
}

// Dropdown lists used by the product form
export interface ProductOptions {
  categories: Option[];
  subCategories: Option[];
  brands: Option[];
  units: Option[];
  vehicleBrands: Option[];
  countries: Option[];
  manufacturers: Option[];
  colors: Option[];
  sizes: Option[];
}

const emptyOptions: ProductOptions = {
  categories: [],
  subCategories: [],
  brands: [],
  units: [],
  vehicleBrands: [],
  countries: [],
  manufacturers: [],
  colors: [],
  sizes: [],
};

// API rows as { value, label } for the selects (category_id is used to filter the sub categories)
function toOptions(rows: { id: number | string; name: string; category_id?: number | string }[]): Option[] {
  const options: Option[] = [];
  for (const row of rows) {
    options.push({ value: Number(row.id), label: row.name, category_id: Number(row.category_id) });
  }
  return options;
}

export const useProducts = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);
  const [options, setOptions] = useState<ProductOptions>(emptyOptions);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [models, setModels] = useState<string[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setProducts(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  // all dropdown lists of the form (active rows only), loaded at the same time
  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const params = { status: 1 };
      const [categories, subCategories, brands, units, vehicleBrands, countries, manufacturers, colors, sizes] = await Promise.all([
        api.get("/configure/categories", { params: params }),
        api.get("/configure/sub-categories", { params: params }),
        api.get("/configure/brands", { params: params }),
        api.get("/configure/units", { params: params }),
        api.get("/configure/lookups", { params: { status: 1, type: "vehicle_brand" } }),
        api.get("/configure/lookups", { params: { status: 1, type: "country" } }),
        api.get("/configure/lookups", { params: { status: 1, type: "manufacturer" } }),
        api.get("/configure/lookups", { params: { status: 1, type: "color" } }),
        api.get("/configure/lookups", { params: { status: 1, type: "size" } }),
      ]);

      setOptions({
        categories: toOptions(categories.data.data.data),
        subCategories: toOptions(subCategories.data.data.data),
        brands: toOptions(brands.data.data.data),
        units: toOptions(units.data.data.data),
        vehicleBrands: toOptions(vehicleBrands.data.data.data),
        countries: toOptions(countries.data.data.data),
        manufacturers: toOptions(manufacturers.data.data.data),
        colors: toOptions(colors.data.data.data),
        sizes: toOptions(sizes.data.data.data),
      });
    } catch (error) {
      console.error("Failed to fetch product options", error);
      toast.error("Failed to load form options");
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // the status, the form lists (also used by the table filters) and the model names, loaded once
  useEffect(() => {
    async function loadStatus() {
      try {
        setStatus(await lookupService.getLookupByType("active_status"));
      } catch (error) {
        console.error("Failed to fetch lookups", error);
      }
    }

    async function loadModels() {
      try {
        const response = await api.get("/configure/products/model-list");
        setModels(response.data.data);
      } catch (error) {
        console.error("Failed to fetch model list", error);
      }
    }

    loadStatus();
    loadOptions();
    loadModels();
  }, [loadOptions]);

  const handleView = useCallback((product: Product) => {
    setSelectedProduct(product);
    setMode("view");
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((product: Product) => {
    setSelectedProduct(product);
    setMode("edit");
    setBackendErrors({});
    loadOptions();
    openModal();
  }, [openModal, loadOptions]);

  const handleCreate = useCallback(() => {
    setSelectedProduct(null);
    setMode("create");
    setBackendErrors({});
    loadOptions();
    openModal();
  }, [openModal, loadOptions]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedProduct(null);
    setMode("create");
    setBackendErrors({});
  }, [closeModal]);

  // move to trash
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Move to Trash?",
      text: "Are you sure you want to move this Product to trash?",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await productService.softDeleteProduct(id);
      toast.success("Product moved to trash!");
      await loadProducts();
    } catch {
      toast.error("Failed to delete Product");
    }
  }, [confirm, loadProducts]);

  // delete for ever (only a product in the trash)
  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: "Delete Product?",
      text: "Are you sure you want to delete this Product permanently? This action cannot be undone.",
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await productService.forceDeleteProduct(id);
      toast.success("Product deleted successfully!");
      await loadProducts();
    } catch {
      toast.error("Failed to delete Product");
    }
  }, [confirm, loadProducts]);

  // take back from trash
  const handleRestore = useCallback(async (id: number) => {
    try {
      await productService.restoreProduct(id);
      toast.success("Product restored successfully!");
      await loadProducts();
    } catch {
      toast.error("Failed to restore Product");
    }
  }, [loadProducts]);

  const handleSave = useCallback(async (productData: ProductFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === "edit" && selectedProduct) {
        await productService.updateProduct(selectedProduct.id, productData);
        toast.success("Product updated successfully!");
      } else {
        await productService.createProduct(productData);
        toast.success("Product created successfully!");
        // a new product is on the first page
        setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadProducts();
      return true;
    } catch (err) {
      // validation errors are shown under the fields, any other error as a message
      const fieldErrors = apiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setBackendErrors(fieldErrors);
      } else {
        toast.error(apiErrorMessage(err, "Failed to save Product"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedProduct, loadProducts, handleCloseModal]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  // all products for the export, without paging
  async function exportAllProducts() {
    const response = await productService.getProducts({});
    return response.data;
  }

  return {
    products,
    loading,
    saving,
    isOpen,
    selectedProduct,
    mode,
    backendErrors,
    pagination,
    total,
    status,
    options,
    loadingOptions,
    models,

    setPagination,
    handleView,
    handleEdit,
    handleCreate,
    handleCloseModal,
    handleSoftDelete,
    handleForceDelete,
    handleRestore,
    handleSave,
    handleFilterChange,
    exportAllProducts,
    formatDate,
  };
};
