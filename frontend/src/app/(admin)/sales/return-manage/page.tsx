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
import { saleReturnService, SaleReturnRow } from "@/services/saleReturnService";
import { SaleReturnChalanModal } from "../components/SaleReturnModals";

// parts_bazar sellReturn/admin: one row per returned barcode, return columns merged
export default function SalesReturnManage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<SaleReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [chalanId, setChalanId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await saleReturnService.getReturns({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load sales returns");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Sales Return Manage | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const remove = useCallback(async (row: SaleReturnRow) => {
    const result = await confirm({ title: "Delete Return?", text: `Are you sure you want to delete all returns under Return No: ${row.return_no}? The returned qty goes out of stock again.` });
    if (!result.isConfirmed) return;
    try {
      await saleReturnService.deleteReturn(row.sale_return_id);
      toast.success(`${row.return_no} deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete return");
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<SaleReturnRow>[] => {
    const byReturn = (row: SaleReturnRow) => row.sale_return_id;
    const money = (value: string | number) => <span className="block text-right">{formatMoney(value)}</span>;
    return [
      {
        id: "return_no",
        accessorKey: "return_no",
        header: "Return No",
        meta: { filterVariant: "text", mergeBy: byReturn, widthClass: "w-[110px]" },
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-gray-800 dark:text-white/90">{row.original.return_no}</div>
            <div className="text-xs text-gray-400">{formatDate(row.original.return_date)}</div>
          </div>
        ),
      },
      {
        id: "so_no",
        accessorKey: "so_no",
        header: "SO No",
        meta: { filterVariant: "text", mergeBy: byReturn, widthClass: "w-[100px]" },
        cell: ({ row }) => row.original.so_no,
      },
      {
        id: "customer_name",
        accessorKey: "customer_name",
        header: "Customer Name",
        meta: { filterVariant: "text", mergeBy: byReturn, widthClass: "min-w-[140px]" },
        cell: ({ row }) => row.original.customer_name,
      },
      {
        id: "store_id",
        accessorKey: "store_name",
        header: "Store",
        meta: { filterVariant: "searchSelect", filterOptions: stores, widthClass: "min-w-[140px]" },
        cell: ({ row }) => row.original.store_name,
      },
      {
        id: "location_name",
        accessorKey: "location_name",
        header: "Location",
        meta: { filterVariant: "text", widthClass: "w-[110px]" },
        cell: ({ row }) => row.original.location_name,
      },
      {
        id: "product_name",
        accessorKey: "product_name",
        header: "Product Name",
        meta: { filterVariant: "text", widthClass: "w-[150px]" },
        cell: ({ row }) => row.original.product_name,
      },
      {
        id: "part_number",
        accessorKey: "part_number",
        header: "Part Number",
        meta: { filterVariant: "text", widthClass: "w-[110px]" },
        cell: ({ row }) => <span className="font-medium text-gray-800 dark:text-white/90">{row.original.part_number}</span>,
      },
      {
        id: "barcode",
        accessorKey: "barcode",
        header: "Barcode",
        meta: { filterVariant: "text", widthClass: "w-[110px]" },
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.barcode}</span>,
      },
      {
        id: "return_qty",
        header: "Return Qty",
        meta: { filterVariant: "none", widthClass: "w-[70px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.return_qty)}</span>,
      },
      {
        id: "return_price",
        header: "Return Price",
        meta: { filterVariant: "none", widthClass: "w-[90px]" },
        cell: ({ row }) => money(row.original.return_price),
      },
      {
        id: "total_price",
        header: "Total Return Amount",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => money(row.original.total_price),
      },
      {
        id: "refund_amount",
        header: "Refund Amount",
        meta: { filterVariant: "none", mergeBy: byReturn, widthClass: "w-[100px]" },
        cell: ({ row }) => money(row.original.refund_amount),
      },
      {
        id: "actions",
        header: "Actions",
        meta: { filterVariant: "none", mergeBy: byReturn, widthClass: "w-[80px]" },
        cell: ({ row }) => (
          <ActionButtons
            row={row.original}
            buttons={[
              { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print Chalan", onClick: () => setChalanId(row.original.sale_return_id) },
              {
                icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
                show: () => hasPermission("sale-return.delete"),
                onClick: () => remove(row.original),
              },
            ]}
          />
        ),
      },
    ];
  }, [stores, hasPermission, remove]);

  return (
    <AccessRoute requiredPermissions={["sale-return.view", "sale-return.create", "sale-return.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Sales Return Manage" }]} />
        <ComponentCard
          title="Sales Return Manage"
          desc="Returned items. Deleting a return takes the qty out of stock again."
          showAddButton={hasPermission("sale-return.create")}
          buttonLabel="New Return"
          openModal={() => router.push("/sales/return")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="sales-returns"
          />
        </ComponentCard>
        <SaleReturnChalanModal returnId={chalanId} onClose={() => setChalanId(null)} />
      </div>
    </AccessRoute>
  );
}
