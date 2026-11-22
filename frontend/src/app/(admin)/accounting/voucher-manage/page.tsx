"use client";
// Voucher Manage, like parts_bazar accounting/journalEntry/admin:
// one row per Dr / Cr line, the voucher columns are merged over its lines.
// The voucher no opens the voucher; a manual voucher that is not locked can be deleted.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEdit, FiEye, FiLock, FiTrash, FiUnlock } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { DEBIT, ENTRY_SOURCES, journalEntryService, JournalRow, VOUCHER_TABS } from "@/services/journalEntryService";
import { VoucherPreview } from "./VoucherPreview";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

// voucher type options, in the parts_bazar order (1 Journal ... 6 Bank Receive)
function typeOptions() {
  const list: { value: string; label: string }[] = [];
  for (let id = 1; id <= 6; id++) {
    for (const tab of VOUCHER_TABS) {
      if (tab.id === id) {
        list.push({ value: String(id), label: tab.label });
      }
    }
  }
  return list;
}
const TYPE_OPTIONS = typeOptions();

function typeName(id: number) {
  for (const option of TYPE_OPTIONS) {
    if (option.value === String(id)) {
      return option.label;
    }
  }
  return "";
}

export default function VoucherManagePage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<JournalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [preview, setPreview] = useState<{ voucherType: number; entryNo: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await journalEntryService.getList({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load the vouchers");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Voucher Manage | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const changeDateFrom = useCallback((_dates: Date[], value: string) => {
    handleFilterChange("date_from", value);
  }, [handleFilterChange]);
  const changeDateTo = useCallback((_dates: Date[], value: string) => {
    handleFilterChange("date_to", value);
  }, [handleFilterChange]);

  const remove = useCallback(async (row: JournalRow) => {
    const result = await confirm({ title: "Delete Voucher?", text: "Are you sure, you delete " + row.voucher_no + "? All its lines will be deleted." });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const message = await journalEntryService.deleteVoucher(row.voucher_type, row.entry_no);
      toast.success(message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete"));
    }
  }, [confirm, load]);

  const toggleLock = useCallback(async (row: JournalRow) => {
    let title = "Lock Voucher?";
    let text = "Are you sure, you want to lock " + row.voucher_no + "? A locked voucher can not be updated or deleted.";
    if (row.is_locked) {
      title = "Unlock Voucher?";
      text = "Are you sure, you want to unlock " + row.voucher_no + "?";
    }
    const result = await confirm({ title: title, text: text });
    if (!result.isConfirmed) {
      return;
    }
    try {
      const message = await journalEntryService.toggleLock(row.voucher_type, row.entry_no);
      toast.success(message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"));
    }
  }, [confirm, load]);

  const columns = useMemo((): ColumnDef<JournalRow>[] => {
    // the voucher columns are merged over the lines of one voucher
    function byVoucher(row: JournalRow) {
      return row.voucher_key;
    }

    return [
      {
        id: "voucher_type",
        accessorKey: "voucher_type",
        header: "Voucher Type",
        meta: { filterVariant: "select", filterOptions: TYPE_OPTIONS, mergeBy: byVoucher, widthClass: "w-[120px]" },
        cell: ({ row }) => typeName(row.original.voucher_type),
      },
      {
        id: "entry_no",
        accessorKey: "entry_no",
        header: "Voucher No",
        meta: { filterVariant: "text", mergeBy: byVoucher, widthClass: "w-[130px]" },
        cell: ({ row }) => (
          <div>
            <button
              type="button"
              title="View voucher"
              onClick={() => setPreview({ voucherType: row.original.voucher_type, entryNo: row.original.entry_no })}
              className="whitespace-nowrap font-mono font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {row.original.voucher_no}
            </button>
            <div className="text-xs text-gray-400">{formatDate(row.original.entry_date)}</div>
            {row.original.is_locked ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-medium text-warning-700 dark:bg-warning-500/15 dark:text-orange-400">
                <FiLock className="h-3 w-3" /> Locked
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "account",
        accessorKey: "account",
        header: "Account Title",
        meta: { filterVariant: "text", widthClass: "min-w-[180px]" },
        cell: ({ row }) => {
          if (!row.original.account) {
            return "";
          }
          return <span className="text-gray-800 dark:text-white/90">{row.original.account.title} <span className="text-xs text-gray-400">({row.original.account.code})</span></span>;
        },
      },
      {
        id: "dr_amount",
        header: "Amount (DR)",
        meta: { filterVariant: "none", widthClass: "w-[120px]", align: "right" },
        cell: ({ row }) => {
          if (row.original.transaction_type !== DEBIT) {
            return "";
          }
          return <span className="block text-right font-medium text-success-600 dark:text-success-500">{formatMoney(row.original.amount)}</span>;
        },
      },
      {
        id: "cr_amount",
        header: "Amount (CR)",
        meta: { filterVariant: "none", widthClass: "w-[120px]", align: "right" },
        cell: ({ row }) => {
          if (row.original.transaction_type === DEBIT) {
            return "";
          }
          return <span className="block text-right font-medium text-error-600 dark:text-error-400">{formatMoney(row.original.amount)}</span>;
        },
      },
      {
        id: "narration",
        accessorKey: "narration",
        header: "Narration",
        meta: { filterVariant: "text", mergeBy: byVoucher, widthClass: "min-w-[160px]" },
        cell: ({ row }) => row.original.narration || "",
      },
      {
        id: "cheque_no",
        accessorKey: "cheque_no",
        header: "Cheque No",
        meta: { filterVariant: "text", mergeBy: byVoucher, widthClass: "w-[110px]" },
        cell: ({ row }) => row.original.cheque_no || "",
      },
      {
        id: "entry_source",
        header: "Entry Point",
        meta: { filterVariant: "none", mergeBy: byVoucher, widthClass: "w-[100px]" },
        cell: ({ row }) => (
          <div>
            <div>{ENTRY_SOURCES[row.original.entry_source_type] || ""}</div>
            {row.original.entry_source_no && <div className="text-xs text-gray-400">{row.original.entry_source_no}</div>}
          </div>
        ),
      },
      {
        id: "created_by",
        accessorKey: "created_by",
        header: "Created By",
        meta: { filterVariant: "text", mergeBy: byVoucher, widthClass: "w-[140px]" },
        cell: ({ row }) => (
          <div>
            <div>{row.original.created_by ? row.original.created_by.name : ""}</div>
            <div className="text-xs text-gray-400">{formatDateTime(row.original.created_at)}</div>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Options",
        meta: { filterVariant: "none", mergeBy: byVoucher, widthClass: "w-[150px]" },
        cell: ({ row }) => {
          const line = row.original;
          // like parts_bazar: only a manual voucher can be locked, and only when it is not locked
          // can it be updated or deleted
          const isManual = line.entry_source_type === 1;
          const isLocked = Boolean(line.is_locked);
          const canEdit = isManual && !isLocked && hasPermission("voucher-entry.edit");
          const canDelete = isManual && !isLocked && hasPermission("voucher-entry.delete");
          const canLock = isManual && hasPermission("voucher-entry.edit");
          let lockIcon = FiLock;
          let lockTip = "Lock";
          if (isLocked) {
            lockIcon = FiUnlock;
            lockTip = "Unlock";
          }
          return (
            <ActionButtons
              row={line}
              buttons={[
                { icon: FiEye, variant: "success", size: "sm", tooltip: "View / Print", onClick: () => setPreview({ voucherType: line.voucher_type, entryNo: line.entry_no }) },
                { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Update", show: () => canEdit, onClick: () => router.push("/accounting/voucher-entry?type=" + line.voucher_type + "&no=" + line.entry_no) },
                { icon: lockIcon, variant: "warning", size: "sm", tooltip: lockTip, show: () => canLock, onClick: () => toggleLock(line) },
                { icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete", show: () => canDelete, onClick: () => remove(line) },
              ]}
            />
          );
        },
      },
    ];
  }, [hasPermission, remove, toggleLock, router]);

  return (
    <AccessRoute requiredPermissions={["voucher-entry.view", "voucher-entry.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Voucher Manage" }]} />
        <ComponentCard
          title="Manage Entries"
          desc="Click a voucher no to see and print the voucher."
          showAddButton={hasPermission("voucher-entry.create")}
          buttonLabel="New Voucher"
          openModal={() => router.push("/accounting/voucher-entry")}
        >
          {/* search like the parts_bazar top search: date, voucher type, voucher no from - to */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Date From</Label>
              <DatePicker id="vm_date_from" onChange={changeDateFrom} placeholder="Select date" />
            </div>
            <div>
              <Label>Date To</Label>
              <DatePicker id="vm_date_to" onChange={changeDateTo} placeholder="Select date" />
            </div>
            <div>
              <Label>Voucher Type</Label>
              <ReactSelect options={TYPE_OPTIONS} value={filters.voucher_type ? String(filters.voucher_type) : null} placeholder="All" onChange={(value) => handleFilterChange("voucher_type", value ? String(value) : "")} />
            </div>
            <div>
              <Label>Voucher No From</Label>
              <input type="text" placeholder="e.g. 2611001" value={String(filters.voucher_no_from || "")} onChange={(e) => handleFilterChange("voucher_no_from", e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label>Voucher No To</Label>
              <input type="text" placeholder="e.g. 2611050" value={String(filters.voucher_no_to || "")} onChange={(e) => handleFilterChange("voucher_no_to", e.target.value)} className={inputClass} />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="vouchers"
            showExportAllOption={false}
          />
        </ComponentCard>
        <VoucherPreview voucher={preview} onClose={() => setPreview(null)} />
      </div>
    </AccessRoute>
  );
}
