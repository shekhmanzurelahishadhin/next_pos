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
import { saleReturnService, SaleReturnableRow } from "@/services/saleReturnService";
import { SaleReturnChalanModal, SaleReturnFormModal } from "../components/SaleReturnModals";

// parts_bazar sellDelivery/adminReturned: sold barcodes of approved SOs, "Return" opens the return form of that SO
export default function SalesReturnPage() {
  const [rows, setRows] = useState<SaleReturnableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [returnSaleId, setReturnSaleId] = useState<number | null>(null);
  const [chalanId, setChalanId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await saleReturnService.getReturnable({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Sales Return | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const columns = useMemo((): ColumnDef<SaleReturnableRow>[] => {
    const bySo = (row: SaleReturnableRow) => row.sale_id;
    return [
      {
        id: "so_no",
        accessorKey: "so_no",
        header: "SO No",
        meta: { filterVariant: "text", mergeBy: bySo, widthClass: "w-[110px]" },
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-gray-800 dark:text-white/90">{row.original.so_no}</div>
            <div className="text-xs text-gray-400">{formatDate(row.original.order_date)}</div>
          </div>
        ),
      },
      {
        id: "customer_name",
        accessorKey: "customer_name",
        header: "Customer",
        meta: { filterVariant: "text", mergeBy: bySo, widthClass: "min-w-[150px]" },
        cell: ({ row }) => row.original.customer_name,
      },
      {
        id: "memo_no",
        accessorKey: "memo_no",
        header: "Memo No",
        meta: { filterVariant: "text", mergeBy: bySo, widthClass: "w-[90px]" },
        cell: ({ row }) => row.original.memo_no,
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
        id: "qty",
        header: "Sales Qty",
        meta: { filterVariant: "none", widthClass: "w-[70px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.qty)} {row.original.unit ?? ""}</span>,
      },
      {
        id: "returned_qty",
        header: "Return Qty",
        meta: { filterVariant: "none", widthClass: "w-[70px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.returned_qty)}</span>,
      },
      {
        id: "actions",
        header: "Options",
        meta: { filterVariant: "none", mergeBy: bySo, widthClass: "w-[70px]" },
        cell: ({ row }) => (
          <ActionButtons
            row={row.original}
            buttons={[{
              icon: FiCornerUpLeft, variant: "warning", size: "sm", tooltip: "Return",
              onClick: () => setReturnSaleId(row.original.sale_id),
            }]}
          />
        ),
      },
    ];
  }, [stores]);

  return (
    <AccessRoute requiredPermissions={["sale-return.create"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Sales Return" }]} />
        <ComponentCard title="Sales Return" desc="Approved sales. Click Return to take items of an SO back from the customer.">
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="sales-return"
          />
        </ComponentCard>
        <SaleReturnFormModal
          saleId={returnSaleId}
          onClose={() => setReturnSaleId(null)}
          onSaved={(returnId) => {
            setReturnSaleId(null);
            setChalanId(returnId);
            load();
          }}
        />
        <SaleReturnChalanModal returnId={chalanId} onClose={() => setChalanId(null)} />
      </div>
    </AccessRoute>
  );
}
