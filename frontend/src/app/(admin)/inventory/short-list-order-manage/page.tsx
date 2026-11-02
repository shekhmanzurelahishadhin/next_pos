"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEye, FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { shortListOrderService, ShortListRow } from "@/services/shortListOrderService";
import { ShortListReportModal } from "../components/ShortListReport";

// parts_bazar shortListOrder/admin: one row per product line, merged by max_sl_no
export default function ShortListOrderManage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<ShortListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [reportSlNo, setReportSlNo] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await shortListOrderService.getRows({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load short list orders");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Manage Short List Order | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const remove = useCallback(async (row: ShortListRow) => {
    const result = await confirm({ title: "Delete Short List?", text: `Are you sure you want to delete all products under SL No: ${row.max_sl_no}?` });
    if (!result.isConfirmed) return;
    try {
      await shortListOrderService.deleteList(row.max_sl_no);
      toast.success(`Short list ${row.max_sl_no} deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete short list");
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<ShortListRow>[] => {
    const byList = (row: ShortListRow) => row.max_sl_no;
    return [
      {
        id: "max_sl_no",
        accessorKey: "max_sl_no",
        header: "Max Sl No",
        meta: { filterVariant: "text", mergeBy: byList, widthClass: "w-[100px]" },
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-gray-800 dark:text-white/90">{row.original.max_sl_no}</div>
            <div className="text-xs text-gray-400">{formatDate(row.original.created_at)}</div>
          </div>
        ),
      },
      {
        id: "store_id",
        accessorKey: "store_name",
        header: "Store",
        meta: { filterVariant: "searchSelect", filterOptions: stores, widthClass: "min-w-[140px]" },
        cell: ({ row }) => row.original.store_name,
      },
      {
        id: "product_name",
        accessorKey: "product_name",
        header: "Product Name",
        meta: { filterVariant: "text", widthClass: "min-w-[160px]" },
        cell: ({ row }) => row.original.product_name,
      },
      {
        id: "code",
        accessorKey: "code",
        header: "Part Number",
        meta: { filterVariant: "text", widthClass: "w-[130px]" },
        cell: ({ row }) => <span className="font-medium text-gray-800 dark:text-white/90">{row.original.code}</span>,
      },
      {
        id: "stock_qty",
        header: "Stock Qty",
        meta: { filterVariant: "none", widthClass: "w-[90px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.stock_qty)}</span>,
      },
      {
        id: "purchase_price",
        header: "Price",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => <span className="block text-right">{formatMoney(row.original.purchase_price)}</span>,
      },
      {
        id: "order_qty",
        header: "Purchase Qty",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.order_qty)}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        meta: { filterVariant: "none", mergeBy: byList, widthClass: "w-[80px]" },
        cell: ({ row }) => (
          <ActionButtons
            row={row.original}
            buttons={[
              { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print", onClick: () => setReportSlNo(row.original.max_sl_no) },
              {
                icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
                show: () => hasPermission("short-list-order.delete"),
                onClick: () => remove(row.original),
              },
            ]}
          />
        ),
      },
    ];
  }, [stores, hasPermission, remove]);

  return (
    <AccessRoute requiredPermissions={["short-list-order.view", "short-list-order.create", "short-list-order.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Manage Short List Order" }]} />
        <ComponentCard
          title="Manage Product Short List Order"
          desc="Products we plan to buy. Deleting removes the whole list of that SL No."
          showAddButton={hasPermission("short-list-order.create")}
          buttonLabel="New Short List"
          openModal={() => router.push("/inventory/short-list-order")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="short-list-orders"
          />
        </ComponentCard>
        <ShortListReportModal maxSlNo={reportSlNo} onClose={() => setReportSlNo(null)} />
      </div>
    </AccessRoute>
  );
}
