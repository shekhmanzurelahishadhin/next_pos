"use client";
// Chart Of AC Opening, like parts_bazar accounting/chartOfAcOpening:
// the opening amount of a CA Head (a head with no child head).
// The conversion rate comes from Currency for the Opening Amount Date;
// Opening Amount (BDT) = Conversion Rate x Opening Amount (FC).
import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEdit, FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
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
import ReactSelect from "@/components/form/ReactSelect";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import {
  accountingSetupService,
  ChartOfAcOpening,
  ChartOfAcOpeningPayload,
  CREDIT,
  DEBIT,
  Option,
} from "@/services/accountingSetupService";

const DR_CR = [
  { value: String(DEBIT), label: "Dr" },
  { value: String(CREDIT), label: "Cr" },
];

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function emptyForm(): ChartOfAcOpeningPayload {
  return { ca_id: null, opening_amount_date: "", currency_id: "", transaction_type: String(DEBIT), amount_in_foreign_currency: "" };
}

// "4,762,997 Cr" in red, "3,097 Dr" in green, like parts_bazar transTypeColor
function DrCrAmount({ type, amount }: { type: number; amount: string }) {
  if (Number(amount) === 0) {
    return <span className="block text-right">0</span>;
  }
  if (Number(type) === DEBIT) {
    return <span className="block text-right font-medium text-success-600 dark:text-success-500">{formatMoney(amount)} Dr</span>;
  }
  return <span className="block text-right font-medium text-error-600 dark:text-error-400">{formatMoney(amount)} Cr</span>;
}

export default function ChartOfAcOpeningPage() {
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<ChartOfAcOpening[]>([]);
  const [total, setTotal] = useState(0);
  const [totalDr, setTotalDr] = useState(0);
  const [totalCr, setTotalCr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});
  const debouncedFilters = useDebounce(filters, 300);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const [heads, setHeads] = useState<{ value: number; label: string }[]>([]);
  const [currencies, setCurrencies] = useState<Option[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChartOfAcOpening | null>(null);
  const [form, setForm] = useState<ChartOfAcOpeningPayload>(emptyForm());
  const [rate, setRate] = useState<number | null>(null); // null = not looked up yet
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountingSetupService.getOpenings({ ...debouncedFilters, page: pagination.pageIndex + 1, per_page: pagination.pageSize });
      setRows(res.data);
      setTotal(res.total);
      setTotalDr(res.total_dr);
      setTotalCr(res.total_cr);
    } catch {
      toast.error("Failed to load the opening amounts");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Chart Of AC Opening | Multibrand POS";
    loadLists();
  }, []);

  async function loadLists() {
    try {
      const list = await accountingSetupService.currencies();
      setCurrencies(list);
    } catch {
      // the currency names are missing, the page still works
    }
    try {
      const list = await accountingSetupService.openingHeads();
      setHeads(list);
    } catch {
      // only a user who can add or update gets the head list
    }
  }

  // the rate of the picked currency on the picked date, like parts_bazar getAvailableConvertionRate
  useEffect(() => {
    if (!modalOpen || !form.currency_id || !form.opening_amount_date) {
      setRate(null);
      return;
    }
    let stillWanted = true;
    accountingSetupService
      .rateOn(form.currency_id, form.opening_amount_date)
      .then((found) => {
        if (stillWanted) {
          setRate(found);
        }
      })
      .catch(() => {
        if (stillWanted) {
          setRate(0);
        }
      });
    return () => {
      stillWanted = false;
    };
  }, [modalOpen, form.currency_id, form.opening_amount_date]);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  function currencyName(code: number) {
    for (const currency of currencies) {
      if (currency.value === String(code)) {
        return currency.label;
      }
    }
    return "";
  }

  // users who made or changed an opening, for the filters
  const userOptions: Option[] = [];
  const userSeen: Record<number, boolean> = {};
  for (const row of rows) {
    const people = [row.created_by, row.updated_by];
    for (const person of people) {
      if (person && !userSeen[person.id]) {
        userSeen[person.id] = true;
        userOptions.push({ value: String(person.id), label: person.name });
      }
    }
  }

  function openForm(row: ChartOfAcOpening | null) {
    setEditing(row);
    setError("");
    if (row) {
      setForm({
        ca_id: row.ca_id,
        opening_amount_date: row.opening_amount_date,
        currency_id: String(row.currency_id),
        transaction_type: String(row.transaction_type),
        amount_in_foreign_currency: String(Number(row.amount_in_foreign_currency)),
      });
    } else {
      setForm(emptyForm());
    }
    setModalOpen(true);
  }

  const changeDate = useCallback((_dates: Date[], value: string) => {
    setForm((old) => ({ ...old, opening_amount_date: value }));
  }, []);

  function setField(name: keyof ChartOfAcOpeningPayload, value: string | number | null) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  async function save() {
    setError("");
    if (!form.ca_id) {
      setError("CA Head cannot be blank.");
      return;
    }
    if (!form.opening_amount_date) {
      setError("Opening Amount Date cannot be blank.");
      return;
    }
    if (!form.currency_id) {
      setError("Currency cannot be blank.");
      return;
    }
    if (rate !== null && rate <= 0) {
      setError("No conversion rate of this currency for the Opening Amount Date. Add it in Currency first.");
      return;
    }
    if (!(Number(form.amount_in_foreign_currency) > 0)) {
      setError("Opening Amount (FC) must be more than 0.");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await accountingSetupService.saveOpening(form, editing.id);
        toast.success("successfully updated");
      } else {
        await accountingSetupService.saveOpening(form);
        toast.success("Data saved successfully.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Data not saved"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: ChartOfAcOpening) {
    let title = "";
    if (row.account) {
      title = row.account.title;
    }
    const result = await confirm({ title: "Delete Opening Amount?", text: 'Delete the opening of "' + title + '"?' });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await accountingSetupService.deleteOpening(row.id);
      toast.success("Deleted successfully");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete"));
    }
  }

  const columns: ColumnDef<ChartOfAcOpening>[] = [
    {
      id: "ca_head",
      accessorKey: "ca_id",
      header: "CA Head",
      meta: { filterVariant: "text", widthClass: "min-w-[200px]", placeholder: "Title or code" },
      cell: ({ row }) => {
        if (!row.original.account) {
          return "";
        }
        return (
          <span className="font-medium text-gray-800 dark:text-white/90">
            {row.original.account.title} <span className="text-xs text-gray-400">({row.original.account.code})</span>
          </span>
        );
      },
    },
    {
      id: "opening_amount_date",
      accessorKey: "opening_amount_date",
      header: "Opening Amount Date",
      meta: { filterVariant: "text", widthClass: "w-[140px]", placeholder: "YYYY-MM-DD" },
      cell: ({ row }) => formatDate(row.original.opening_amount_date),
    },
    {
      id: "currency_id",
      accessorKey: "currency_id",
      header: "Currency",
      meta: { filterVariant: "select", filterOptions: currencies, widthClass: "w-[100px]" },
      cell: ({ row }) => currencyName(row.original.currency_id),
    },
    {
      id: "transaction_type",
      accessorKey: "transaction_type",
      header: "Opening Amount (FC)",
      meta: { filterVariant: "select", filterOptions: DR_CR, widthClass: "w-[150px]", align: "right" },
      cell: ({ row }) => <DrCrAmount type={row.original.transaction_type} amount={row.original.amount_in_foreign_currency} />,
    },
    {
      id: "opening_amount",
      header: "Opening Amount (BDT)",
      meta: { filterVariant: "none", widthClass: "w-[150px]", align: "right" },
      cell: ({ row }) => <DrCrAmount type={row.original.transaction_type} amount={row.original.opening_amount} />,
    },
    {
      id: "created_by",
      accessorKey: "created_by",
      header: "Create By",
      meta: { filterVariant: "select", filterOptions: userOptions, widthClass: "w-[120px]" },
      cell: ({ row }) => {
        const person = row.original.created_by;
        return (
          <div className="leading-tight">
            <div>{person ? person.name : ""}</div>
            <div className="text-[11px] text-gray-400">{formatDateTime(row.original.created_at)}</div>
          </div>
        );
      },
    },
    {
      id: "updated_by",
      accessorKey: "updated_by",
      header: "Update By",
      meta: { filterVariant: "select", filterOptions: userOptions, widthClass: "w-[120px]" },
      cell: ({ row }) => {
        const person = row.original.updated_by;
        if (!person) {
          return "";
        }
        return (
          <div className="leading-tight">
            <div>{person.name}</div>
            <div className="text-[11px] text-gray-400">{formatDateTime(row.original.updated_at)}</div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[90px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Update", show: () => hasPermission("chart-of-ac-opening.edit"), onClick: () => openForm(row.original) },
            { icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete", show: () => hasPermission("chart-of-ac-opening.delete"), onClick: () => remove(row.original) },
          ]}
        />
      ),
    },
  ];

  // Opening Amount (BDT) shown while typing
  let bdtAmount = 0;
  if (rate && Number(form.amount_in_foreign_currency) > 0) {
    bdtAmount = rate * Number(form.amount_in_foreign_currency);
  }

  let rateText = "Pick the currency and the date";
  if (rate !== null && rate > 0) {
    rateText = String(rate);
  } else if (rate === 0) {
    rateText = "No rate for this date";
  }

  let modalTitle = "Add New Opening Amount";
  let saveLabel = "Add";
  if (editing) {
    modalTitle = "Update Opening Amount";
    saveLabel = "Update";
  }
  if (saving) {
    saveLabel = "Saving...";
  }

  let drCrLabel = "Dr";
  if (form.transaction_type === String(CREDIT)) {
    drCrLabel = "Cr";
  }

  return (
    <AccessRoute requiredPermissions={["chart-of-ac-opening.view", "chart-of-ac-opening.create", "chart-of-ac-opening.edit", "chart-of-ac-opening.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Chart Of AC Opening" }]} />
        <ComponentCard
          title="Manage Opening Amounts"
          desc="Opening amount of an account head. Only a head with no child head can have an opening."
          showAddButton={hasPermission("chart-of-ac-opening.create")}
          buttonLabel="Add New Opening"
          openModal={() => openForm(null)}
        >
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Dr (BDT)</div>
              <div className="text-lg font-semibold text-success-600 dark:text-success-500">{formatMoney(totalDr)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Cr (BDT)</div>
              <div className="text-lg font-semibold text-error-600 dark:text-error-400">{formatMoney(totalCr)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">Difference (Dr - Cr)</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{formatMoney(totalDr - totalCr)}</div>
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
            exportFilename="chart-of-ac-opening"
          />
        </ComponentCard>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          className="max-w-lg"
          title={modalTitle}
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>{saveLabel}</Button>
            </>
          }
        >
          {/* key: a fresh date picker each time the modal opens */}
          <div key={`${editing ? editing.id : "new"}-${modalOpen}`} className="space-y-4">
            {error && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
            )}
            <div>
              <Label required>CA Head</Label>
              <ReactSelect options={heads} value={form.ca_id} placeholder="Type to search" onChange={(value) => setField("ca_id", value ? Number(value) : null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Opening Amount Date</Label>
                <DatePicker id="opening_amount_date" defaultDate={form.opening_amount_date || undefined} onChange={changeDate} placeholder="Select date" />
              </div>
              <div>
                <Label required>Currency</Label>
                <ReactSelect options={currencies} value={form.currency_id || null} placeholder="select" onChange={(value) => setField("currency_id", value ? String(value) : "")} />
              </div>
            </div>
            <div>
              <Label required>Conversion Rate</Label>
              <input
                type="text"
                value={rateText}
                readOnly
                className={`${inputClass} cursor-not-allowed bg-gray-100 dark:bg-gray-800 ${rate === 0 ? "text-error-600 dark:text-error-400" : ""}`}
              />
            </div>
            <div>
              <Label required>Opening Amount (FC)</Label>
              <div className="flex gap-2">
                <div className="w-24 shrink-0">
                  <ReactSelect options={DR_CR} value={form.transaction_type} isClearable={false} onChange={(value) => setField("transaction_type", value ? String(value) : String(DEBIT))} />
                </div>
                <input
                  type="number"
                  value={form.amount_in_foreign_currency}
                  min={0}
                  step="0.01"
                  placeholder="Amount"
                  onChange={(e) => setField("amount_in_foreign_currency", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-white/[0.03]">
              <span className="text-gray-500 dark:text-gray-400">Opening Amount (BDT): </span>
              <span className="font-semibold text-gray-800 dark:text-white/90">
                {formatMoney(bdtAmount)} {drCrLabel}
              </span>
            </div>
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
