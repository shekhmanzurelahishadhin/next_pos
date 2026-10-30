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
import { purchaseReturnService, ReturnRow } from "@/services/purchaseReturnService";
import { ReturnChalanModal } from "../components/PurchaseReturnModals";

// parts_bazar "Purchase Return Manage": one row per returned item, return columns merged
export default function PurchaseReturnManage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<ReturnRow[]>([]);
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
      const res = await purchaseReturnService.getReturns({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load purchase returns");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Purchase Return Manage | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const remove = useCallback(async (row: ReturnRow) => {
    const result = await confirm({ title: "Delete Return?", text: `Delete ${row.return_no}? The returned qty goes back into stock.` });
    if (!result.isConfirmed) return;
    try {
      await purchaseReturnService.deleteReturn(row.purchase_return_id);
      toast.success(`${row.return_no} deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete return");
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<ReturnRow>[] => {
    const byReturn = (row: ReturnRow) => row.purchase_return_id;
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
        id: "po_no",
        accessorKey: "po_no",
        header: "PO No",
        meta: { filterVariant: "text", mergeBy: byReturn, widthClass: "w-[100px]" },
        cell: ({ row }) => (
          <div>
            <div>{row.original.po_no}</div>
            {row.original.supplier_bill_no && <div className="text-xs text-gray-400">Bill: {row.original.supplier_bill_no}</div>}
          </div>
        ),
      },
      {
        id: "supplier_name",
        accessorKey: "supplier_name",
        header: "Supplier",
        meta: { filterVariant: "text", mergeBy: byReturn, widthClass: "min-w-[140px]" },
        cell: ({ row }) => row.original.supplier_name,
      },
      {
        id: "store_id",
        accessorKey: "store_id",
        header: "Store",
        meta: { filterVariant: "searchSelect", filterOptions: stores, mergeBy: byReturn, widthClass: "min-w-[160px]" },
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
        meta: { filterVariant: "text", widthClass: "w-[120px]" },
        cell: ({ row }) => <span className="font-medium text-gray-800 dark:text-white/90">{row.original.part_number}</span>,
      },
      {
        id: "return_qty",
        header: "Return Qty",
        meta: { filterVariant: "none", widthClass: "w-[70px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.return_qty)}</span>,
      },
      {
        id: "unit_price",
        header: "Return Line Amount",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => money(row.original.unit_price),
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
              { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print Chalan", onClick: () => setChalanId(row.original.purchase_return_id) },
              {
                icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
                show: () => hasPermission("purchase-return.delete"),
                onClick: () => remove(row.original),
              },
            ]}
          />
        ),
      },
    ];
  }, [stores, hasPermission, remove]);

  return (
    <AccessRoute requiredPermissions={["purchase-return.view", "purchase-return.create", "purchase-return.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Purchase Return Manage" }]} />
        <ComponentCard
          title="Purchase Return Manage"
          desc="Returned items. Deleting a return puts the qty back into stock."
          showAddButton={hasPermission("purchase-return.create")}
          buttonLabel="New Return"
          openModal={() => router.push("/purchases/return")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="purchase-returns"
          />
        </ComponentCard>
        <ReturnChalanModal returnId={chalanId} onClose={() => setChalanId(null)} />
      </div>
    </AccessRoute>
  );
}
