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
import { supplierPaymentService, SpSupplierRow } from "@/services/supplierPaymentService";
import { SupplierPaymentFormModal, SupplierPaymentVoucherModal } from "../components/SupplierPaymentModals";

// parts_bazar suppliers/adminPaymentReceipt: suppliers list, the button opens the payment form
export default function CreateSupplierPaymentPage() {
  const [rows, setRows] = useState<SpSupplierRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [voucherNo, setVoucherNo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierPaymentService.getSuppliers({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Create Supplier Payment | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const columns = useMemo((): ColumnDef<SpSupplierRow>[] => [
    {
      id: "id",
      header: "ID",
      meta: { filterVariant: "none", widthClass: "w-[70px]" },
      cell: ({ row }) => row.original.id,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Supplier Name",
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
            icon: FiDollarSign, variant: "success", size: "sm", tooltip: "Supplier Payment",
            onClick: () => setSupplierId(row.original.id),
          }]}
        />
      ),
    },
  ], []);

  return (
    <AccessRoute requiredPermissions={["supplier-payment.create"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Create Supplier Payment" }]} />
        <ComponentCard title="Supplier Payment" desc="Pick a supplier to pay against the due POs. A minus due is advance.">
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="supplier-dues"
          />
        </ComponentCard>
        <SupplierPaymentFormModal
          supplierId={supplierId}
          onClose={() => setSupplierId(null)}
          onSaved={(slNo) => {
            setSupplierId(null);
            setVoucherNo(slNo);
            load();
          }}
        />
        <SupplierPaymentVoucherModal slNo={voucherNo} onClose={() => setVoucherNo(null)} />
      </div>
    </AccessRoute>
  );
}
