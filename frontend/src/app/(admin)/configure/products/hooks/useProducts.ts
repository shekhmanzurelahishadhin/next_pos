// hooks/useProducts.ts
import { formatDate } from '@/lib/format';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { productService, Product, ProductFormData, ProductFilters, PaginatedResponse } from '@/services/productService';
import { lookupService } from '@/services/lookupService';
import { useAlert } from '@/hooks/useAlert';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';

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

// Turn API rows into { value, label } for selects
const toOptions = (rows: any[]): Option[] =>
  rows.map((row) => ({ value: Number(row.id), label: row.name, category_id: Number(row.category_id) }));

export const useProducts = () => {
  const { confirm } = useAlert();
  const { isOpen, openModal, closeModal } = useModal();

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string }[]>([]);
  const [options, setOptions] = useState<ProductOptions>(emptyOptions);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [models, setModels] = useState<string[]>([]);

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('create');
  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  // Filter and pagination state
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [total, setTotal] = useState(0);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const apiFilters: ProductFilters = {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        ...debouncedFilters,
      };

      const response: PaginatedResponse<Product> = await productService.getProducts(apiFilters);
      setProducts(response.data);
      setTotal(response.total);
    } catch (err) {
      toast.error('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedFilters]);

  const fetchLookups = async () => {
    try {
      const res = await lookupService.getLookupByType("active_status");
      setStatus(res);
    } catch (error) {
      console.error("Failed to fetch lookups", error);
    }
  };

  // Load all dropdown lists for the form (active rows only)
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const params = { status: 1 };
      const lookup = (type: string) => api.get("/configure/lookups", { params: { ...params, type } });
      const [categories, subCategories, brands, units, vehicleBrands, countries, manufacturers, colors, sizes] = await Promise.all([
        api.get("/configure/categories", { params }),
        api.get("/configure/sub-categories", { params }),
        api.get("/configure/brands", { params }),
        api.get("/configure/units", { params }),
        lookup("vehicle_brand"),
        lookup("country"),
        lookup("manufacturer"),
        lookup("color"),
        lookup("size"),
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
      toast.error('Failed to load form options');
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // for active status lookup, and the lists used by the table filters
  useEffect(() => {
    fetchLookups();
    fetchOptions();
    api.get("/configure/products/model-list")
      .then((res) => setModels(res.data.data))
      .catch((error) => console.error("Failed to fetch model list", error));
  }, []);

  // Modal operations
  const handleView = useCallback((product: Product) => {
    setSelectedProduct(product);
    setMode('view');
    setBackendErrors({});
    openModal();
  }, [openModal]);

  const handleEdit = useCallback((product: Product) => {
    setSelectedProduct(product);
    setMode('edit');
    setBackendErrors({});
    fetchOptions();
    openModal();
  }, [openModal]);

  const handleCreate = useCallback(() => {
    setSelectedProduct(null);
    setMode('create');
    setBackendErrors({});
    fetchOptions();
    openModal();
  }, [openModal]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    setSelectedProduct(null);
    setMode('create');
    setBackendErrors({});
  }, [closeModal]);

  // CRUD operations
  const handleSoftDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Move to Trash?',
      text: 'Are you sure you want to move this Product to trash?',
    });
    if (!result.isConfirmed) return;

    try {
      await productService.softDeleteProduct(id);
      toast.success('Product moved to trash!');
      await loadProducts();
    } catch (err) {
      toast.error('Failed to delete Product');
    }
  }, [confirm, loadProducts]);

  const handleForceDelete = useCallback(async (id: number) => {
    const result = await confirm({
      title: 'Delete Product?',
      text: 'Are you sure you want to delete this Product permanently? This action cannot be undone.',
    });
    if (!result.isConfirmed) return;

    try {
      await productService.forceDeleteProduct(id);
      toast.success('Product deleted successfully!');
      await loadProducts();
    } catch (err) {
      toast.error('Failed to delete Product');
    }
  }, [confirm, loadProducts]);

  const handleRestore = useCallback(async (id: number) => {
    try {
      await productService.restoreProduct(id);
      toast.success('Product restored successfully!');
      await loadProducts();
    } catch (err) {
      toast.error('Failed to restore Product');
    }
  }, [loadProducts]);

  const handleSave = useCallback(async (productData: ProductFormData) => {
    try {
      setSaving(true);
      setBackendErrors({});

      if (mode === 'edit' && selectedProduct) {
        await productService.updateProduct(selectedProduct.id, productData);
        toast.success('Product updated successfully!');
      } else {
        await productService.createProduct(productData);
        toast.success('Product created successfully!');
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }

      handleCloseModal();
      await loadProducts();
      return true;
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : (messages as string);
        });
        setBackendErrors(errors);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save Product');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [mode, selectedProduct, loadProducts, handleCloseModal]);

  // Filter and search operations
  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Export all products (no pagination)
  const exportAllProducts = async () => {
    const response = await productService.getProducts({});
    return response.data;
  };

  return {
    // State
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

    // Actions
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
