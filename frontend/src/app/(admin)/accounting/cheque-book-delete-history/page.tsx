"use client";
// Cheque Book Delete History, like parts_bazar accounting/chequeBookDeleteHistory:
// the leaves of the deleted cheque books, with the remarks given at the delete. View only.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatDateTime, formatMoney } from "@/lib/format";
import { CHEQUE_ACTIVE, CHEQUE_STATUS, chequeBookService, ChequeHistory, USED_TYPES, usedTypeName } from "@/services/chequeBookService";
import { ChequeStatusBadge } from "../cheque-book/ChequeStatusBadge";

type Option = { value: string; label: string };

export default function ChequeBookDeleteHistoryPage() {
  const [rows, setRows] = useState<ChequeHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [banks, setBanks] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await chequeBookService.getHistory({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load the delete history");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Cheque Book Delete History | Multibrand POS";
    chequeBookService
      .banks()
      .then((list) => setBanks(list))
      .catch(() => setBanks([]));
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const byBook = useCallback((row: ChequeHistory) => row.bank_id + "-" + row.book_no + "-" + row.created_at, []);

  const columns = useMemo<ColumnDef<ChequeHistory>[]>(
    () => [
      {
        id: "book_no",
        accessorKey: "book_no",
        header: "Book No",
        meta: { filterVariant: "text", mergeBy: byBook, widthClass: "w-[120px]" },
        cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{row.original.book_no}</span>,
      },
      {
        id: "bank_id",
        accessorKey: "bank_id",
        header: "Bank",
        meta: { filterVariant: "select", filterOptions: banks, mergeBy: byBook, widthClass: "min-w-[160px]" },
        cell: ({ row }) => {
          if (row.original.bank && row.original.bank.title) {
            return row.original.bank.title;
          }
          return "";
        },
      },
      {
        id: "branch_name",
        accessorKey: "branch_name",
        header: "Branch Name",
        meta: { filterVariant: "text", mergeBy: byBook, widthClass: "w-[140px]" },
        cell: ({ row }) => row.original.branch_name || "",
      },
      {
        id: "cheque_no",
        accessorKey: "cheque_no",
        header: "Cheque No",
        meta: { filterVariant: "text", widthClass: "w-[140px]" },
        cell: ({ row }) => <span className="font-mono">{row.original.cheque_no}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        meta: { filterVariant: "select", filterOptions: CHEQUE_STATUS, widthClass: "w-[120px]" },
        cell: ({ row }) => <ChequeStatusBadge status={row.original.status} />,
      },
      {
        id: "used_type",
        accessorKey: "used_type",
        header: "Used Type",
        meta: { filterVariant: "select", filterOptions: USED_TYPES, widthClass: "w-[150px]" },
        cell: ({ row }) => {
          // like parts_bazar, an active leaf shows no used type
          if (row.original.status === CHEQUE_ACTIVE) {
            return "";
          }
          return usedTypeName(row.original.used_type);
        },
      },
      {
        id: "remarks",
        accessorKey: "remarks",
        header: "Remarks",
        meta: { filterVariant: "text", mergeBy: byBook, widthClass: "min-w-[160px]" },
        cell: ({ row }) => row.original.remarks,
      },
      {
        id: "amount",
        header: "Amount",
        meta: { filterVariant: "none", widthClass: "w-[110px]", align: "right" },
        cell: ({ row }) => {
          if (row.original.status === CHEQUE_ACTIVE || row.original.amount === null) {
            return "";
          }
          return <span className="block text-right">{formatMoney(row.original.amount)}</span>;
        },
      },
      {
        id: "created_at",
        header: "Deleted By / At",
        meta: { filterVariant: "none", mergeBy: byBook, widthClass: "w-[160px]" },
        cell: ({ row }) => (
          <div>
            <div>{row.original.created_by && row.original.created_by.name ? row.original.created_by.name : ""}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.original.created_at)}</div>
          </div>
        ),
      },
    ],
    [banks, byBook]
  );

  return (
    <AccessRoute requiredPermissions={["cheque-book-delete-history.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Cheque Book Delete History" }]} />
        <ComponentCard title="Cheque Book Delete History" desc="Leaves of the deleted cheque books, with the remarks given at the delete.">
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="cheque-book-delete-history"
            showExportAllOption={false}
          />
        </ComponentCard>
      </div>
    </AccessRoute>
  );
}
