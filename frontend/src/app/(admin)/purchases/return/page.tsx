"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiCornerUpLeft } from "react-icons/fi";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { purchaseReturnService, ReturnableRow } from "@/services/purchaseReturnService";
import { ReturnChalanModal, ReturnFormModal } from "../components/PurchaseReturnModals";

// parts_bazar "Return" page: items of approved POs, "Return" opens the return form of that PO
export default function PurchaseReturnPage() {
  const [rows, setRows] = useState<ReturnableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [returnPurchaseId, setReturnPurchaseId] = useState<number | null>(null);
  const [chalanId, setChalanId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await purchaseReturnService.getReturnable({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Purchase Return | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const columns = useMemo((): ColumnDef<ReturnableRow>[] => {
    const byPo = (row: ReturnableRow) => row.purchase_id;
    return [
      {
        id: "po_no",
        accessorKey: "po_no",
        header: "PO No",
        meta: { filterVariant: "text", mergeBy: byPo, widthClass: "w-[110px]" },
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-gray-800 dark:text-white/90">{row.original.po_no}</div>
            <div className="text-xs text-gray-400">{formatDate(row.original.purchase_date)}</div>
          </div>
        ),
      },
      {
        id: "supplier_name",
        accessorKey: "supplier_name",
        header: "Supplier",
        meta: { filterVariant: "text", mergeBy: byPo, widthClass: "min-w-[150px]" },
        cell: ({ row }) => row.original.supplier_name,
      },
      {
        id: "store_id",
        accessorKey: "store_name",
        header: "Store",
        meta: { filterVariant: "searchSelect", filterOptions: stores, mergeBy: byPo, widthClass: "min-w-[160px]" },
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
        id: "qty",
        header: "Order Qty",
        meta: { filterVariant: "none", widthClass: "w-[70px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.qty)} {row.original.unit ?? ""}</span>,
      },
      {
        id: "returned_qty",
        header: "Returned Qty",
        meta: { filterVariant: "none", widthClass: "w-[80px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.returned_qty)}</span>,
      },
      {
        id: "actions",
        header: "Options",
        meta: { filterVariant: "none", mergeBy: byPo, widthClass: "w-[70px]" },
        cell: ({ row }) => (
          <ActionButtons
            row={row.original}
            buttons={[{
              icon: FiCornerUpLeft, variant: "warning", size: "sm", tooltip: "Return",
              onClick: () => setReturnPurchaseId(row.original.purchase_id),
            }]}
          />
        ),
      },
    ];
  }, [stores]);

  return (
    <AccessRoute requiredPermissions={["purchase-return.create"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Purchase Return" }]} />
        <ComponentCard title="Purchase Return" desc="Approved purchases. Click Return to send items of a PO back to the supplier.">
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="purchase-return"
          />
        </ComponentCard>
        <ReturnFormModal
          purchaseId={returnPurchaseId}
          onClose={() => setReturnPurchaseId(null)}
          onSaved={(returnId) => {
            setReturnPurchaseId(null);
            setChalanId(returnId);
            load();
          }}
        />
        <ReturnChalanModal returnId={chalanId} onClose={() => setChalanId(null)} />
      </div>
    </AccessRoute>
  );
}
