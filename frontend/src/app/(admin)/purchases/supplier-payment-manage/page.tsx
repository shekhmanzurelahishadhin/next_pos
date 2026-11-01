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
import { supplierPaymentService, SpRow } from "@/services/supplierPaymentService";
import { SupplierPaymentVoucherModal, poLabel } from "../components/SupplierPaymentModals";

// parts_bazar paymentReceipt/admin: one row per PR no
export default function ManageSupplierPaymentPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<SpRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [voucherNo, setVoucherNo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierPaymentService.getPayments({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load supplier payments");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Manage Supplier Payment | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const remove = useCallback(async (row: SpRow) => {
    const result = await confirm({ title: "Delete Supplier Payment?", text: `Delete ${row.sl_no}? The supplier due goes back up by ${formatMoney(row.total_amount)}.` });
    if (!result.isConfirmed) return;
    try {
      await supplierPaymentService.deletePayment(row.sl_no);
      toast.success(`${row.sl_no} deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete supplier payment");
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<SpRow>[] => {
    const money = (value: string | number) => <span className="block text-right">{formatMoney(value)}</span>;
    return [
      {
        id: "payment_date",
        accessorKey: "payment_date",
        header: "Payment Date",
        meta: { filterVariant: "none", widthClass: "w-[100px]" },
        cell: ({ row }) => formatDate(row.original.payment_date),
      },
      {
        id: "sl_no",
        accessorKey: "sl_no",
        header: "PR No",
        meta: { filterVariant: "text", widthClass: "w-[110px]" },
        cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.sl_no}</span>,
      },
      {
        id: "supplier_name",
        accessorKey: "supplier_name",
        header: "Supplier",
        meta: { filterVariant: "text", widthClass: "min-w-[160px]" },
        cell: ({ row }) => row.original.supplier_name,
      },
      {
        id: "po_no",
        accessorKey: "po_nos",
        header: "PO No",
        meta: { filterVariant: "text", widthClass: "min-w-[120px]" },
        cell: ({ row }) => row.original.po_nos.split(", ").map(poLabel).join(", "),
      },
      {
        id: "payment_type",
        accessorKey: "payment_type",
        header: "Payment Type",
        meta: { filterVariant: "select", filterOptions: PAYMENT_TYPES, widthClass: "w-[110px]" },
        cell: ({ row }) => paymentTypeName(row.original.payment_type),
      },
      { id: "paid_amount", header: "Payment Amount", meta: { filterVariant: "none", widthClass: "w-[100px]" }, cell: ({ row }) => money(row.original.paid_amount) },
      { id: "discount", header: "Discount Amount", meta: { filterVariant: "none", widthClass: "w-[90px]" }, cell: ({ row }) => money(row.original.discount) },
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
              { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print", onClick: () => setVoucherNo(row.original.sl_no) },
              {
                icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
                show: () => hasPermission("supplier-payment.delete"),
                onClick: () => remove(row.original),
              },
            ]}
          />
        ),
      },
    ];
  }, [hasPermission, remove]);

  return (
    <AccessRoute requiredPermissions={["supplier-payment.view", "supplier-payment.create", "supplier-payment.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Manage Supplier Payment" }]} />
        <ComponentCard
          title="Manage Supplier Payment"
          desc="One row per PR no. Deleting a payment puts the amount back on the supplier due."
          showAddButton={hasPermission("supplier-payment.create")}
          buttonLabel="New Supplier Payment"
          openModal={() => router.push("/purchases/supplier-payment")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="supplier-payments"
          />
        </ComponentCard>
        <SupplierPaymentVoucherModal slNo={voucherNo} onClose={() => setVoucherNo(null)} />
      </div>
    </AccessRoute>
  );
}
