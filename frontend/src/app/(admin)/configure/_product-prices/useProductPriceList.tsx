// Shared by the Purchase Price and Sale Price pages (folder starts with "_", so it is not a route):
// the product list with filters, and the columns both pages show.
import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { productPriceService, ProductPriceRow } from "@/services/productPriceService";

type Option = { value: string; label: string };

export const useProductPriceList = () => {
  const [rows, setRows] = useState<ProductPriceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productPriceService.getRows({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(response.data);
      setTotal(response.total);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // filter lists; the same sub category name is under many categories, so show "Engine (G)"
  useEffect(() => {
    async function loadFilterLists() {
      try {
        const categoryResponse = await api.get("/configure/categories", { params: { status: 1 } });
        const subCategoryResponse = await api.get("/configure/sub-categories", { params: { status: 1 } });

        const categoryList: Option[] = [];
        const categoryNames: Record<string, string> = {};
        for (const category of categoryResponse.data.data.data) {
          categoryList.push({ value: String(category.id), label: category.name });
          categoryNames[String(category.id)] = category.name;
        }

        const subCategoryList: Option[] = [];
        for (const subCategory of subCategoryResponse.data.data.data) {
          const categoryName = categoryNames[String(subCategory.category_id)] ?? "-";
          subCategoryList.push({ value: String(subCategory.id), label: subCategory.name + " (" + categoryName + ")" });
        }

        setCategories(categoryList);
        setSubCategories(subCategoryList);
      } catch {
        // the filters just stay empty
      }
    }
    loadFilterLists();
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((oldFilters) => ({ ...oldFilters, [name]: value }));
    setPagination((oldPagination) => ({ ...oldPagination, pageIndex: 0 }));
  }, []);

  return { rows, total, loading, pagination, setPagination, handleFilterChange, reload: load, categories, subCategories };
};

// Category, Sub Category (merged like parts_bazar), Product Name, Part Number
export const productColumns = (categories: Option[], subCategories: Option[]): ColumnDef<ProductPriceRow>[] => [
  {
    id: "category_id",
    accessorKey: "category_id",
    header: "Category",
    meta: { filterVariant: "searchSelect", filterOptions: categories, mergeBy: (row) => row.category_id, widthClass: "w-[120px]" },
    cell: ({ row }) => row.original.category_name ?? "—",
  },
  {
    id: "sub_category_id",
    accessorKey: "sub_category_id",
    header: "Sub Category",
    meta: {
      filterVariant: "searchSelect",
      filterOptions: subCategories,
      mergeBy: (row) => `${row.category_id}-${row.sub_category_id}`,
      widthClass: "w-[140px]",
    },
    cell: ({ row }) => row.original.sub_category_name ?? "—",
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Product Name",
    meta: { filterVariant: "text", widthClass: "min-w-[180px]" },
    cell: ({ row }) => row.original.name,
  },
  {
    id: "part_number",
    accessorKey: "part_number",
    header: "Part Number",
    meta: { filterVariant: "text", widthClass: "w-[140px]" },
    cell: ({ row }) => <span className="font-medium text-gray-800 dark:text-white/90">{row.original.part_number}</span>,
  },
];
