"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiCheckCircle, FiEdit, FiEye, FiTrash, FiX } from "react-icons/fi";
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
import { saleService, SaleRow, SALE_STATUS } from "@/services/saleService";
import { SaleInvoice } from "../components/SaleInvoice";

const SALES_TYPE = [
  { value: "1", label: "Cash" },
  { value: "2", label: "Due" },
];

const STATUS_OPTIONS = [
  { value: String(SALE_STATUS.PENDING), label: "Pending" },
  { value: String(SALE_STATUS.APPROVED), label: "Approved" },
];

// parts_bazar "Manage Sales Orders": one row per sold barcode, SO columns merged
export default function SalesManage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [invoiceId, setInvoiceId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await saleService.getSales({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
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
    document.title = "Sales Manage | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => {});
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Ask, run, show the message from the server, reload
  const act = useCallback(async (title: string, text: string, action: () => Promise<void>, done: string) => {
    const result = await confirm({ title, text });
    if (!result.isConfirmed) return;
    try {
      await action();
      toast.success(done);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<SaleRow>[] => {
    const bySo = (row: SaleRow) => row.sale_id;
    const money = (value: string | number) => <span className="block text-right">{formatMoney(value)}</span>;

    return [
      {
        id: "cash_due",
        accessorKey: "cash_due",
        header: "Sales Type",
        meta: { filterVariant: "select", filterOptions: SALES_TYPE, mergeBy: bySo, widthClass: "w-[80px]" },
        cell: ({ row }) => SALES_TYPE.find((t) => t.value === String(row.original.cash_due))?.label ?? "N/A",
      },
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
        cell: ({ row }) => (
          <div>
            <div className="text-gray-800 dark:text-white/90">{row.original.customer_name}</div>
            {row.original.customer_phone && <div className="text-xs text-gray-400">{row.original.customer_phone}</div>}
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
        id: "location_name",
        accessorKey: "location_name",
        header: "Location",
        meta: { filterVariant: "text", widthClass: "w-[100px]" },
        cell: ({ row }) => row.original.location_name,
      },
      {
        id: "product_name",
        accessorKey: "product_name",
        header: "Product Name",
        meta: { filterVariant: "text", widthClass: "w-[150px]" },
        cell: ({ row }) => (
          <div>
            <div>{row.original.product_name}</div>
            {row.original.brand_name && <div className="text-xs text-gray-400">{row.original.brand_name}</div>}
          </div>
        ),
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
        header: "Qty",
        meta: { filterVariant: "none", widthClass: "w-[50px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.qty)}</span>,
      },
      {
        id: "sell_price",
        header: "Sell Price",
        meta: { filterVariant: "none", widthClass: "w-[90px]" },
        cell: ({ row }) => money(row.original.sell_price),
      },
      {
        id: "total_amount",
        header: "Line Total",
        meta: { filterVariant: "none", widthClass: "w-[90px]" },
        cell: ({ row }) => money(row.original.total_amount),
      },
      {
        id: "closing_stock",
        header: "Closing Stock",
        meta: { filterVariant: "none", widthClass: "w-[70px]" },
        cell: ({ row }) => <span className="block text-right">{Number(row.original.closing_stock)}</span>,
      },
      {
        id: "item_delete",
        header: "",
        meta: { filterVariant: "none", widthClass: "w-[36px]" },
        cell: ({ row }) => {
          const r = row.original;
          if (r.status !== SALE_STATUS.PENDING || !hasPermission("sale.delete")) return null;
          return (
            <button
              type="button"
              title="Delete this item"
              onClick={() => act("Delete Item?", `Remove ${r.part_number} (${r.barcode}) from ${r.so_no}?`, () => saleService.deleteSaleItem(r.id), "Item deleted")}
              className="rounded p-1 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
            >
              <FiX size={14} />
            </button>
          );
        },
      },
      {
        id: "grand_total",
        header: "Grand Total",
        meta: { filterVariant: "none", mergeBy: bySo, widthClass: "w-[110px]" },
        cell: ({ row }) => (
          <div className="text-right">
            <div className="font-semibold text-gray-800 dark:text-white/90">{formatMoney(row.original.grand_total)}</div>
            <div className="text-xs text-gray-400">Received {formatMoney(row.original.received_amount)}</div>
            <div className="text-xs text-gray-400">Due {formatMoney(row.original.due_amount)}</div>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        meta: { filterVariant: "select", filterOptions: STATUS_OPTIONS, mergeBy: bySo, widthClass: "w-[90px]" },
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.original.status === SALE_STATUS.APPROVED
            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
            : "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400"}`}>
            {row.original.status_name}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        meta: { filterVariant: "none", mergeBy: bySo, widthClass: "w-[110px]" },
        cell: ({ row }) => {
          const r = row.original;
          const pending = r.status === SALE_STATUS.PENDING;
          return (
            <ActionButtons
              row={r}
              buttons={[
                { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print Invoice", onClick: () => setInvoiceId(r.sale_id) },
                {
                  icon: FiCheckCircle, variant: "success", size: "sm", tooltip: "Approve (stock out)",
                  show: () => pending && r.can_approve && hasPermission("sale.approve"),
                  onClick: () => act("Approve Sale?", `Are you want to approve ${r.so_no}? Stock goes out and the SO is locked.`,
                    () => saleService.approveSale(r.sale_id), `${r.so_no} approved`),
                },
                {
                  icon: FiEdit, variant: "primary", size: "sm", tooltip: "Edit",
                  show: () => pending && hasPermission("sale.edit"),
                  onClick: () => router.push(`/sales/sale?id=${r.sale_id}`),
                },
                {
                  icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete SO",
                  show: () => pending && hasPermission("sale.delete"),
                  onClick: () => act("Delete SO?", `Are you sure to delete ${r.so_no}?`, () => saleService.deleteSale(r.sale_id), "Deleted Successfully!"),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [stores, hasPermission, act, router]);

  return (
    <AccessRoute requiredPermissions={["sale.view", "sale.create", "sale.edit", "sale.delete", "sale.approve"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Sales Manage" }]} />
        <ComponentCard
          title="Manage Sales Orders"
          desc="Approve a sale to take the stock out. After approve the SO is locked."
          showAddButton={hasPermission("sale.create")}
          buttonLabel="New Sale"
          openModal={() => router.push("/sales/sale")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="sales"
            showExportAllOption={false}
          />
        </ComponentCard>
        <SaleInvoice saleId={invoiceId} onClose={() => setInvoiceId(null)} />
      </div>
    </AccessRoute>
  );
}
