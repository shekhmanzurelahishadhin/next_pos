"use client";
// Cheque Entry, like parts_bazar chequebook/chequeEntry: the register of the cheques written by
// Bank Payment and Contra vouchers. A row can be printed on the cheque leaf, and its clearance
// date is set once the bank clears it. Rows come only from the vouchers (no add form, like parts_bazar).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiCheckCircle, FiPrinter } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import ActionButtons from "@/components/ui/button/ActionButton";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import { formatDate, formatMoney } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { chequeBookService, ChequeEntry, chequeEntryService } from "@/services/chequeBookService";
import { PAYMENT_TYPES } from "@/services/journalEntryService";
import { ChequePrint } from "./ChequePrint";

type Option = { value: string; label: string };

const CLEARANCE_OPTIONS: Option[] = [
  { value: "pending", label: "Not Cleared" },
  { value: "cleared", label: "Cleared" },
];

function paymentTypeName(value: number | null) {
  for (const option of PAYMENT_TYPES) {
    if (option.value === String(value)) {
      return option.label;
    }
  }
  return "NA";
}

// today in local time as "2026-11-23"
function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

export default function ChequeEntryPage() {
  const { hasPermission } = useAuth();

  const [rows, setRows] = useState<ChequeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [banks, setBanks] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const [printing, setPrinting] = useState<ChequeEntry | null>(null);

  const [clearing, setClearing] = useState<ChequeEntry | null>(null);
  const [clearanceDate, setClearanceDate] = useState("");
  const [clearError, setClearError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await chequeEntryService.getList({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load the cheque entries");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Cheque Entry | Multibrand POS";
    chequeBookService
      .banks()
      .then((list) => setBanks(list))
      .catch(() => setBanks([]));
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const openClearance = useCallback((entry: ChequeEntry) => {
    setClearing(entry);
    setClearanceDate(localToday());
    setClearError("");
  }, []);

  const changeClearanceDate = useCallback((_dates: Date[], value: string) => {
    setClearanceDate(value);
  }, []);

  async function saveClearance() {
    if (!clearing) {
      return;
    }
    setClearError("");
    if (!clearanceDate) {
      setClearError("Clearance Date cannot be blank.");
      return;
    }
    try {
      setSaving(true);
      await chequeEntryService.setClearance(clearing.id, clearanceDate);
      toast.success("successfully updated");
      setClearing(null);
      load();
    } catch (err) {
      setClearError(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  // like parts_bazar: a zero amount row is red, a cleared row is blue
  function rowColor(entry: ChequeEntry) {
    if (Number(entry.amount) === 0) {
      return "text-error-600 dark:text-error-400";
    }
    if (entry.clearance_date) {
      return "text-blue-light-600 dark:text-blue-light-400";
    }
    return "";
  }

  const columns = useMemo<ColumnDef<ChequeEntry>[]>(
    () => [
      {
        id: "max_sl",
        accessorKey: "max_sl",
        header: "SL NO",
        meta: { filterVariant: "text", widthClass: "w-[70px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{row.original.max_sl}</span>,
      },
      {
        id: "entry_date",
        header: "Entry Date",
        meta: { filterVariant: "none", widthClass: "w-[110px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{formatDate(row.original.entry_date)}</span>,
      },
      {
        id: "cb_bank_id",
        accessorKey: "cb_bank_id",
        header: "Bank Name",
        meta: { filterVariant: "select", filterOptions: banks, widthClass: "min-w-[150px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{row.original.bank && row.original.bank.title ? row.original.bank.title : ""}</span>,
      },
      {
        id: "payment_type",
        accessorKey: "payment_type",
        header: "Payment Type",
        meta: { filterVariant: "select", filterOptions: PAYMENT_TYPES, widthClass: "w-[130px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{paymentTypeName(row.original.payment_type)}</span>,
      },
      {
        id: "payment_name",
        accessorKey: "payment_name",
        header: "Beneficiary",
        meta: { filterVariant: "text", widthClass: "min-w-[140px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{row.original.payment_name || ""}</span>,
      },
      {
        id: "cheque_no",
        accessorKey: "cheque_no",
        header: "Cheque No",
        meta: { filterVariant: "text", widthClass: "w-[130px]" },
        cell: ({ row }) => <span className={"font-mono " + rowColor(row.original)}>{row.original.cheque_no}</span>,
      },
      {
        id: "cheque_date",
        header: "Cheque Date",
        meta: { filterVariant: "none", widthClass: "w-[110px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{formatDate(row.original.cheque_date)}</span>,
      },
      {
        id: "clearance",
        accessorKey: "clearance_date",
        header: "Clearance Date",
        meta: { filterVariant: "select", filterOptions: CLEARANCE_OPTIONS, widthClass: "w-[130px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{row.original.clearance_date ? formatDate(row.original.clearance_date) : ""}</span>,
      },
      {
        id: "amount",
        header: "Amount",
        meta: { filterVariant: "none", widthClass: "w-[120px]", align: "right" },
        cell: ({ row }) => <span className={"block text-right " + rowColor(row.original)}>{formatMoney(row.original.amount)}</span>,
      },
      {
        id: "note",
        accessorKey: "note",
        header: "Purpose",
        meta: { filterVariant: "text", widthClass: "min-w-[160px]" },
        cell: ({ row }) => <span className={rowColor(row.original)}>{row.original.note || ""}</span>,
      },
      {
        id: "actions",
        header: "Options",
        meta: { filterVariant: "none", widthClass: "w-[90px]" },
        cell: ({ row }) => (
          <ActionButtons
            row={row.original}
            buttons={[
              { icon: FiPrinter, variant: "success", size: "sm", tooltip: "View / Print Cheque", show: () => true, onClick: () => setPrinting(row.original) },
              {
                icon: FiCheckCircle,
                variant: "primary",
                size: "sm",
                tooltip: "Clear The Entry",
                show: () => !row.original.clearance_date && hasPermission("cheque-entry.edit"),
                onClick: () => openClearance(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [banks, hasPermission, openClearance]
  );

  return (
    <AccessRoute requiredPermissions={["cheque-entry.view", "cheque-entry.edit"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Voucher" }, { title: "Cheque Entry" }]} />
        <ComponentCard
          title="Cheque Entry"
          desc="Cheques written by Bank Payment and Contra vouchers. Print a cheque, and set its clearance date when the bank clears it."
        >
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span><span className="font-semibold text-blue-light-600 dark:text-blue-light-400">Blue</span> = cleared</span>
            <span><span className="font-semibold text-error-600 dark:text-error-400">Red</span> = amount 0</span>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            pagination={pagination}
            onPaginationChange={setPagination}
            onColumnFilterChange={handleFilterChange}
            total={total}
            loading={loading}
            exportFilename="cheque-entry"
            showExportAllOption={false}
          />
        </ComponentCard>

        <ChequePrint entry={printing} onClose={() => setPrinting(null)} />

        <Modal
          isOpen={clearing !== null}
          onClose={() => setClearing(null)}
          className="max-w-sm"
          title={clearing ? "Clear Cheque " + clearing.cheque_no : "Clear Cheque"}
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setClearing(null)}>Cancel</Button>
              <Button type="button" size="sm" onClick={saveClearance} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </>
          }
        >
          <div key={clearing ? clearing.id : "none"} className="space-y-4">
            {clearError && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{clearError}</div>
            )}
            <div>
              <Label required>Clearance Date</Label>
              <DatePicker id="clearance_date" defaultDate={clearanceDate || undefined} onChange={changeClearanceDate} placeholder="Select date" />
            </div>
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
