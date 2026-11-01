"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiDollarSign } from "react-icons/fi";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { formatMoney } from "@/lib/format";
import { moneyReceiptService, MrCustomerRow } from "@/services/moneyReceiptService";
import { MoneyReceiptFormModal, MoneyReceiptVoucherModal } from "../components/MoneyReceiptModals";

// parts_bazar customers/adminMoneyReceipt: customers list, the button opens the money receipt form
export default function CreateMoneyReceiptPage() {
  const [rows, setRows] = useState<MrCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [voucherNo, setVoucherNo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await moneyReceiptService.getCustomers({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Create Money Receipt | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const columns = useMemo((): ColumnDef<MrCustomerRow>[] => [
    {
      id: "id",
      header: "ID",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => row.original.id,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Customer Name",
      meta: { filterVariant: "text", widthClass: "min-w-[200px]" },
      cell: ({ row }) => <span className="font-medium text-gray-800 dark:text-white/90">{row.original.name}</span>,
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: "Phone",
      meta: { filterVariant: "text", widthClass: "w-[140px]" },
      cell: ({ row }) => row.original.phone,
    },
    {
      id: "address",
      header: "Address",
      meta: { filterVariant: "none", widthClass: "min-w-[160px]" },
      cell: ({ row }) => row.original.address,
    },
    {
      id: "due",
      header: "Due",
      meta: { filterVariant: "none", widthClass: "w-[110px]" },
      cell: ({ row }) => (
        <span className={`block text-right font-medium ${row.original.due > 0 ? "text-error-500" : row.original.due < 0 ? "text-success-600" : ""}`}>
          {formatMoney(row.original.due)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[{
            icon: FiDollarSign, variant: "success", size: "sm", tooltip: "Money Receipt",
            onClick: () => setCustomerId(row.original.id),
          }]}
        />
      ),
    },
  ], []);

  return (
    <AccessRoute requiredPermissions={["money-receipt.create"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Create Money Receipt" }]} />
        <ComponentCard title="Customer's Money Receipts" desc="Pick a customer to receive money against the due invoices. A minus due is advance.">
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="customer-dues"
          />
        </ComponentCard>
        <MoneyReceiptFormModal
          customerId={customerId}
          onClose={() => setCustomerId(null)}
          onSaved={(mrNo) => {
            setCustomerId(null);
            setVoucherNo(mrNo);
            load();
          }}
        />
        <MoneyReceiptVoucherModal mrNo={voucherNo} onClose={() => setVoucherNo(null)} />
      </div>
    </AccessRoute>
  );
}
