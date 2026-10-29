"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiCheckCircle, FiEdit, FiEye, FiRotateCcw, FiTrash, FiXCircle } from "react-icons/fi";
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
import { purchaseService, PurchaseFormOptions, PurchaseRow, PURCHASE_STATUS, Option } from "@/services/purchaseService";
import { PurchaseVoucher } from "../components/PurchaseVoucher";

const STATUS_OPTIONS = [
  { value: String(PURCHASE_STATUS.PENDING), label: "Pending" },
  { value: String(PURCHASE_STATUS.APPROVED), label: "Approved" },
  { value: String(PURCHASE_STATUS.CANCELLED), label: "Cancelled" },
];

const STATUS_COLORS: Record<number, string> = {
  [PURCHASE_STATUS.PENDING]: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  [PURCHASE_STATUS.APPROVED]: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  [PURCHASE_STATUS.CANCELLED]: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
};

const nameOf = (list: Option[] | undefined, code: string) => list?.find((o) => o.value === String(code))?.label ?? "—";

// Purchase Manage like parts_bazar: one row per item, PO columns merged
export default function PurchaseManage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<PurchaseFormOptions | null>(null);
  const [stores, setStores] = useState<Option[]>([]);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [voucherId, setVoucherId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await purchaseService.getPurchases({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
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
    document.title = "Purchase Manage | Multibrand POS";
    purchaseService.getFormOptions().then(setOptions).catch(() => {});
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

  const columns = useMemo((): ColumnDef<PurchaseRow>[] => {
    const byPo = (row: PurchaseRow) => row.purchase_id;
    const money = (value: string | number) => <span className="block text-right">{formatMoney(value)}</span>;

    return [
      {
        id: "cash_due",
        accessorKey: "cash_due",
        header: "Cash / Due",
        meta: { filterVariant: "select", filterOptions: options?.cash_due ?? [], mergeBy: byPo, widthClass: "w-[90px]" },
        cell: ({ row }) => nameOf(options?.cash_due, row.original.cash_due),
      },
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
        id: "purchase_type",
        accessorKey: "purchase_type",
        header: "Local / Import",
        meta: { filterVariant: "select", filterOptions: options?.purchase_type ?? [], mergeBy: byPo, widthClass: "w-[100px]" },
        cell: ({ row }) => nameOf(options?.purchase_type, row.original.purchase_type),
      },
      {
        id: "supplier_name",
        accessorKey: "supplier_name",
        header: "Supplier",
        meta: { filterVariant: "text", mergeBy: byPo, widthClass: "min-w-[150px]" },
        cell: ({ row }) => (
          <div>
            <div className="text-gray-800 dark:text-white/90">{row.original.supplier_name}</div>
            {row.original.supplier_bill_no && <div className="text-xs text-gray-400">Bill: {row.original.supplier_bill_no}</div>}
          </div>
        ),
      },
      {
        id: "store_id",
        accessorKey: "store_id",
        header: "Store",
        meta: { filterVariant: "searchSelect", filterOptions: stores, mergeBy: byPo, widthClass: "min-w-[170px]" },
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
        id: "unit",
        header: "Unit",
        meta: { filterVariant: "none", widthClass: "w-[50px]" },
        cell: ({ row }) => row.original.unit,
      },
      {
        id: "qty",
        header: "Qty",
        meta: { filterVariant: "none", widthClass: "w-[50px]" },
        cell: ({ row }) => <span className="block text-right">{row.original.qty}</span>,
      },
      {
        id: "unit_price",
        header: "Unit Price",
        meta: { filterVariant: "none", widthClass: "w-[90px]" },
        cell: ({ row }) => money(row.original.unit_price),
      },
      {
        id: "product_price",
        header: "Product Price",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => money(row.original.total_product_price),
      },
      {
        id: "weight_amount",
        header: "Total Weight Amount",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => money(row.original.total_weight_amount),
      },
      {
        id: "total_price",
        header: "Total Price",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => money(row.original.total_purchase_price),
      },
      {
        id: "grand_total",
        header: "Grand Total",
        meta: { filterVariant: "none", mergeBy: byPo, widthClass: "w-[110px]" },
        cell: ({ row }) => (
          <div className="text-right">
            <div className="font-semibold text-gray-800 dark:text-white/90">{formatMoney(row.original.grand_total)}</div>
            <div className="text-xs text-gray-400">Paid {formatMoney(row.original.payment_amount)}</div>
            <div className="text-xs text-gray-400">Due {formatMoney(row.original.due_amount)}</div>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        meta: { filterVariant: "select", filterOptions: STATUS_OPTIONS, mergeBy: byPo, widthClass: "w-[90px]" },
        cell: ({ row }) => (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.original.status] ?? ""}`}>
            {row.original.status_name}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        meta: { filterVariant: "none", mergeBy: byPo, widthClass: "w-[120px]" },
        cell: ({ row }) => {
          const r = row.original;
          const pending = r.status === PURCHASE_STATUS.PENDING;
          return (
            <ActionButtons
              row={r}
              buttons={[
                { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print", onClick: () => setVoucherId(r.purchase_id) },
                {
                  icon: FiCheckCircle, variant: "success", size: "sm", tooltip: "Approve (receive into stock)",
                  show: () => pending && hasPermission("purchase.approve"),
                  onClick: () => act("Approve Purchase?", `Approve ${r.po_no}? Stock, purchase price and payment will be saved and the PO will be locked.`,
                    () => purchaseService.approvePurchase(r.purchase_id), `${r.po_no} approved`),
                },
                {
                  icon: FiEdit, variant: "primary", size: "sm", tooltip: "Edit",
                  show: () => pending && hasPermission("purchase.edit"),
                  onClick: () => router.push(`/purchases/purchase?id=${r.purchase_id}`),
                },
                {
                  icon: FiXCircle, variant: "warning", size: "sm", tooltip: "Cancel Order",
                  show: () => pending && hasPermission("purchase.delete"),
                  onClick: () => act("Cancel Purchase?", `Cancel order ${r.po_no}?`, () => purchaseService.cancelPurchase(r.purchase_id), `Order ${r.po_no} cancelled`),
                },
                {
                  icon: FiRotateCcw, variant: "success", size: "sm", tooltip: "Undo Cancel",
                  show: () => r.status === PURCHASE_STATUS.CANCELLED && hasPermission("purchase.delete"),
                  onClick: () => act("Undo Cancel?", `Make ${r.po_no} pending again?`, () => purchaseService.undoCancelPurchase(r.purchase_id), `Order ${r.po_no} cancelation undone`),
                },
                {
                  icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
                  show: () => r.status !== PURCHASE_STATUS.APPROVED && hasPermission("purchase.delete"),
                  onClick: () => act("Delete Purchase?", `Delete ${r.po_no}? This can not be undone.`, () => purchaseService.deletePurchase(r.purchase_id), `${r.po_no} deleted`),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [options, stores, hasPermission, act, router]);

  return (
    <AccessRoute requiredPermissions={["purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.approve"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Purchase Manage" }]} />
        <ComponentCard
          title="Purchase Manage"
          desc="Approve a purchase to receive it into stock. After approve the PO is locked."
          showAddButton={hasPermission("purchase.create")}
          buttonLabel="New Purchase"
          openModal={() => router.push("/purchases/purchase")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="purchases"
            showExportAllOption={false}
          />
        </ComponentCard>
        <PurchaseVoucher purchaseId={voucherId} onClose={() => setVoucherId(null)} />
      </div>
    </AccessRoute>
  );
}
