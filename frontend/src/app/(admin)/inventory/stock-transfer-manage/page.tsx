"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiCheckCircle, FiEdit, FiEye, FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { formatDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { stockTransferService, StockTransferRow, TRANSFER_STATUS } from "@/services/stockTransferService";
import { StockTransferViewModal } from "../components/StockTransferView";

const STATUS_OPTIONS = [
  { value: String(TRANSFER_STATUS.PENDING), label: "Pending" },
  { value: String(TRANSFER_STATUS.APPROVED), label: "Approved" },
];

// "2026-11-03 10:25:00" shown as the date and the hh:mm
function dateTime(value?: string | null) {
  if (!value) {
    return "";
  }
  return `${formatDate(value)} ${String(value).slice(11, 16)}`;
}

// parts_bazar stockTransfer/admin: one row per transfer, edit / delete / approve while pending
export default function StockTransferManage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<StockTransferRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [viewId, setViewId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stockTransferService.getRows({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load stock transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Stock Transfer Manage | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const removeTransfer = useCallback(async (transfer: StockTransferRow) => {
    const result = await confirm({ title: "Delete Stock Transfer?", text: `Delete ${transfer.transfer_no}? This can not be undone.` });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await stockTransferService.deleteTransfer(transfer.id);
      toast.success(`${transfer.transfer_no} deleted`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"));
    }
  }, [confirm, load]);

  const approveTransfer = useCallback(async (transfer: StockTransferRow) => {
    const result = await confirm({
      title: "Approve Stock Transfer?",
      text: `Approve ${transfer.transfer_no}? The goods move to the new store / location with new barcodes, and the transfer is locked.`,
    });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await stockTransferService.approveTransfer(transfer.id);
      toast.success("Stock Transfer Approved Successfully");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"));
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<StockTransferRow>[] => [
    {
      id: "transfer_date",
      accessorKey: "transfer_date",
      header: "Transfer Date",
      meta: { filterVariant: "text", widthClass: "w-[110px]" },
      cell: ({ row }) => formatDate(row.original.transfer_date),
    },
    {
      id: "transfer_no",
      accessorKey: "transfer_no",
      header: "Transfer No",
      meta: { filterVariant: "text", widthClass: "w-[120px]" },
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-gray-800 dark:text-white/90">{row.original.transfer_no}</div>
          <div className="text-xs text-gray-400">{row.original.items} item(s) · Qty {Number(row.original.total_qty)}</div>
        </div>
      ),
    },
    {
      id: "created_by_name",
      accessorKey: "created_by_name",
      header: "Created By",
      meta: { filterVariant: "text", widthClass: "min-w-[120px]" },
      cell: ({ row }) => row.original.created_by_name,
    },
    {
      id: "created_at",
      header: "Created At",
      meta: { filterVariant: "none", widthClass: "w-[130px]" },
      cell: ({ row }) => dateTime(row.original.created_at),
    },
    {
      id: "approved_by_name",
      accessorKey: "approved_by_name",
      header: "Approve By",
      meta: { filterVariant: "text", widthClass: "min-w-[120px]" },
      cell: ({ row }) => row.original.approved_by_name,
    },
    {
      id: "approved_at",
      header: "Approve At",
      meta: { filterVariant: "none", widthClass: "w-[130px]" },
      cell: ({ row }) => dateTime(row.original.approved_at),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { filterVariant: "select", filterOptions: STATUS_OPTIONS, widthClass: "w-[90px]" },
      cell: ({ row }) =>
        row.original.status === TRANSFER_STATUS.APPROVED ? (
          <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">Approved</span>
        ) : (
          <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-600 dark:bg-warning-500/15 dark:text-orange-400">Pending</span>
        ),
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[130px]" },
      cell: ({ row }) => {
        const transfer = row.original;
        const pending = transfer.status === TRANSFER_STATUS.PENDING;
        return (
          <ActionButtons
            row={transfer}
            buttons={[
              { icon: FiEye, variant: "success", size: "sm", tooltip: "View Details", onClick: () => setViewId(transfer.id) },
              {
                icon: FiEdit, variant: "primary", size: "sm", tooltip: "Edit",
                show: () => pending && hasPermission("stock-transfer.edit"),
                onClick: () => router.push(`/inventory/stock-transfer?id=${transfer.id}`),
              },
              {
                icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete",
                show: () => pending && hasPermission("stock-transfer.delete"),
                onClick: () => removeTransfer(transfer),
              },
              {
                icon: FiCheckCircle, variant: "success", size: "sm", tooltip: "Approve",
                show: () => pending && hasPermission("stock-transfer.approve"),
                onClick: () => approveTransfer(transfer),
              },
            ]}
          />
        );
      },
    },
  ], [hasPermission, removeTransfer, approveTransfer, router]);

  return (
    <AccessRoute requiredPermissions={["stock-transfer.view", "stock-transfer.create", "stock-transfer.edit", "stock-transfer.delete", "stock-transfer.approve"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Stock Transfer Manage" }]} />
        <ComponentCard
          title="Stock Transfer Manage"
          desc="Approve a transfer to move the stock. After approve it is locked."
          showAddButton={hasPermission("stock-transfer.create")}
          buttonLabel="New Transfer"
          openModal={() => router.push("/inventory/stock-transfer")}
        >
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="stock-transfers"
          />
        </ComponentCard>
        <StockTransferViewModal transferId={viewId} onClose={() => setViewId(null)} />
      </div>
    </AccessRoute>
  );
}
