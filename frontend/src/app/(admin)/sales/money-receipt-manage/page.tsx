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
import { formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_TYPES, paymentTypeName } from "@/lib/payment";
import { moneyReceiptService, MrRow } from "@/services/moneyReceiptService";
import { MoneyReceiptVoucherModal, orderLabel } from "../components/MoneyReceiptModals";

// parts_bazar moneyReceipt/admin: one row per MR no
export default function ManageMoneyReceiptPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<MrRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [voucherNo, setVoucherNo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await moneyReceiptService.getReceipts({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load money receipts");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Manage Money Receipt | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const remove = useCallback(async (row: MrRow) => {
    const result = await confirm({ title: "Delete Money Receipt?", text: `Delete ${row.mr_no}? The customer due goes back up by ${formatMoney(row.total_amount)}.` });
    if (!result.isConfirmed) return;
    try {
      await moneyReceiptService.deleteReceipt(row.mr_no);
      toast.success(`${row.mr_no} deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete money receipt");
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<MrRow>[] => {
    const money = (value: string | number) => <span className="block text-right">{formatMoney(value)}</span>;
    return [
      {
        id: "receipt_date",
        accessorKey: "receipt_date",
        header: "Receipt Date",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => formatDate(row.original.receipt_date),
      },
      {
        id: "mr_no",
        accessorKey: "mr_no",
        header: "MR No",
        meta: { filterVariant: "text", widthClass: "w-[110px]" },
        cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.mr_no}</span>,
      },
      {
        id: "customer_name",
        accessorKey: "customer_name",
        header: "Customer",
        meta: { filterVariant: "text", widthClass: "min-w-[160px]" },
        cell: ({ row }) => row.original.customer_name,
      },
      {
        id: "order_no",
        accessorKey: "order_nos",
        header: "SO No",
        meta: { filterVariant: "text", widthClass: "min-w-[120px]" },
        cell: ({ row }) => row.original.order_nos.split(", ").map(orderLabel).join(", "),
      },
      {
        id: "received_type",
        accessorKey: "received_type",
        header: "Receive Type",
        meta: { filterVariant: "select", filterOptions: PAYMENT_TYPES, widthClass: "w-[110px]" },
        cell: ({ row }) => paymentTypeName(row.original.received_type),
      },
      { id: "received_amount", header: "Received Amount", meta: { filterVariant: "none", widthClass: "w-[100px]" }, cell: ({ row }) => money(row.original.received_amount) },
      { id: "discount", header: "Discount Amount", meta: { filterVariant: "none", widthClass: "w-[90px]" }, cell: ({ row }) => money(row.original.discount) },
      { id: "vds", header: "VDS Amount", meta: { filterVariant: "none", widthClass: "w-[80px]" }, cell: ({ row }) => money(row.original.vds) },
      { id: "tds", header: "TDS Amount", meta: { filterVariant: "none", widthClass: "w-[80px]" }, cell: ({ row }) => money(row.original.tds) },
      {
        id: "total_amount",
        header: "Total Amount",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => <span className="block text-right font-semibold">{formatMoney(row.original.total_amount)}</span>,
      },
      {
        id: "actions",
        header: "Options",
        meta: { filterVariant: "none", widthClass: "w-[80px]" },
        cell: ({ row }) => (
          <ActionButtons
            row={row.original}
            buttons={[
              { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print", onClick: () => setVoucherNo(row.original.mr_no) },
              {
                icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
                show: () => hasPermission("money-receipt.delete"),
                onClick: () => remove(row.original),
              },
            ]}
          />
        ),
      },
    ];
  }, [hasPermission, remove]);

  return (
    <AccessRoute requiredPermissions={["money-receipt.view", "money-receipt.create", "money-receipt.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Manage Money Receipt" }]} />
        <ComponentCard
          title="Manage Money Receipt"
          desc="One row per MR no. Deleting an MR puts the amount back on the customer due."
          showAddButton={hasPermission("money-receipt.create")}
          buttonLabel="New Money Receipt"
          openModal={() => router.push("/sales/money-receipt")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="money-receipts"
          />
        </ComponentCard>
        <MoneyReceiptVoucherModal mrNo={voucherNo} onClose={() => setVoucherNo(null)} />
      </div>
    </AccessRoute>
  );
}
