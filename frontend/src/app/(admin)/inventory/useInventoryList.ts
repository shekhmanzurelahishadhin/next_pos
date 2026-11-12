// Shared by the Inventory Stock and Inventory Barcode pages: rows, filters, paging and the store list
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { loadOptions, Option } from "@/lib/options";
import { useDebounce } from "@/hooks/useDebounce";

type Loader<T> = (filters: Record<string, string | number>) => Promise<{ data: T[]; total: number }>;

export const useInventoryList = <T,>(loader: Loader<T>) => {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Option[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await loader({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [loader, debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadOptions("/configure/stores")
      .then(setStores)
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  return { rows, total, loading, stores, pagination, setPagination, handleFilterChange };
};
