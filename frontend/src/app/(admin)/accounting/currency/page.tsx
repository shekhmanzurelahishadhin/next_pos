"use client";
// Currency, like parts_bazar accounting/currencyConvertionInBdt:
// the rate of a currency in BDT for a date range. Chart Of AC Opening takes its rate from here.
import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { FiEdit, FiTrash } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/hooks/useAlert";
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
import { formatDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/options";
import { accountingSetupService, CurrencyConversion, CurrencyConversionPayload, Option } from "@/services/accountingSetupService";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function emptyForm(): CurrencyConversionPayload {
  return { currency_id: "", date_from: "", date_to: "", amount_in_bdt: "" };
}

export default function CurrencyPage() {
  const { hasPermission } = useAuth();
  const { confirm } = useAlert();

  const [rows, setRows] = useState<CurrencyConversion[]>([]);
  const [currencies, setCurrencies] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string | number>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CurrencyConversion | null>(null);
  const [form, setForm] = useState<CurrencyConversionPayload>(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountingSetupService.getCurrencyRates(filters);
      setRows(res.data);
      setCurrencies(res.currencies);
    } catch {
      toast.error("Failed to load the currency rates");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = "Currency | Multibrand POS";
  }, []);

  const handleFilterChange = useCallback((name: string, value: string | number) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  function currencyName(code: number) {
    for (const currency of currencies) {
      if (currency.value === String(code)) {
        return currency.label;
      }
    }
    return "";
  }

  function openForm(row: CurrencyConversion | null) {
    setEditing(row);
    setError("");
    if (row) {
      setForm({
        currency_id: String(row.currency_id),
        date_from: row.date_from,
        date_to: row.date_to,
        amount_in_bdt: String(Number(row.amount_in_bdt)),
      });
    } else {
      setForm(emptyForm());
    }
    setModalOpen(true);
  }

  // stable functions, so the date pickers are not rebuilt on every render
  const changeFrom = useCallback((_dates: Date[], value: string) => {
    setForm((old) => ({ ...old, date_from: value }));
  }, []);
  const changeTo = useCallback((_dates: Date[], value: string) => {
    setForm((old) => ({ ...old, date_to: value }));
  }, []);

  async function save() {
    setError("");
    if (!form.currency_id) {
      setError("Currency cannot be blank.");
      return;
    }
    if (!form.date_from || !form.date_to) {
      setError("Date From and Date To cannot be blank.");
      return;
    }
    if (form.date_to < form.date_from) {
      setError("Date To can not be before Date From.");
      return;
    }
    if (!(Number(form.amount_in_bdt) > 0)) {
      setError("Amount In BDT must be more than 0.");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await accountingSetupService.saveCurrencyRate(form, editing.id);
        toast.success("successfully updated");
      } else {
        await accountingSetupService.saveCurrencyRate(form);
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

  async function remove(row: CurrencyConversion) {
    const result = await confirm({ title: "Delete Currency Rate?", text: "Delete the " + currencyName(row.currency_id) + " rate of " + formatDate(row.date_from) + " to " + formatDate(row.date_to) + "?" });
    if (!result.isConfirmed) {
      return;
    }
    try {
      await accountingSetupService.deleteCurrencyRate(row.id);
      toast.success("Deleted successfully");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete"));
    }
  }

  const columns: ColumnDef<CurrencyConversion>[] = [
    {
      id: "currency_id",
      accessorKey: "currency_id",
      header: "Currency",
      meta: { filterVariant: "select", filterOptions: currencies, widthClass: "w-[140px]" },
      cell: ({ row }) => <span className="font-semibold text-gray-800 dark:text-white/90">{currencyName(row.original.currency_id)}</span>,
    },
    {
      id: "date_from",
      header: "Date From",
      meta: { filterVariant: "none", widthClass: "w-[130px]" },
      cell: ({ row }) => formatDate(row.original.date_from),
    },
    {
      id: "date_to",
      header: "Date To",
      meta: { filterVariant: "none", widthClass: "w-[130px]" },
      cell: ({ row }) => formatDate(row.original.date_to),
    },
    {
      id: "amount_in_bdt",
      header: "Amount In BDT",
      meta: { filterVariant: "none", widthClass: "w-[140px]", align: "right" },
      cell: ({ row }) => <span className="block text-right">{Number(row.original.amount_in_bdt)}</span>,
    },
    {
      id: "actions",
      header: "Options",
      meta: { filterVariant: "none", widthClass: "w-[90px]" },
      cell: ({ row }) => (
        <ActionButtons
          row={row.original}
          buttons={[
            { icon: FiEdit, variant: "primary", size: "sm", tooltip: "Update", show: () => hasPermission("currency-conversion.edit"), onClick: () => openForm(row.original) },
            { icon: FiTrash, variant: "danger", size: "sm", tooltip: "Delete", show: () => hasPermission("currency-conversion.delete"), onClick: () => remove(row.original) },
          ]}
        />
      ),
    },
  ];

  let modalTitle = "Add New Currency Conversion In BDT";
  let saveLabel = "Add";
  if (editing) {
    modalTitle = "Update Currency Conversion In BDT";
    saveLabel = "Update";
  }
  if (saving) {
    saveLabel = "Saving...";
  }

  return (
    <AccessRoute requiredPermissions={["currency-conversion.view", "currency-conversion.create", "currency-conversion.edit", "currency-conversion.delete"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Accounting" }, { title: "Configure" }, { title: "Currency" }]} />
        <ComponentCard
          title="Currency Conversion In BDT"
          desc="1 unit of the currency in BDT for a date range. Chart Of AC Opening takes the rate of its date from here."
          showAddButton={hasPermission("currency-conversion.create")}
          buttonLabel="Add New Rate"
          openModal={() => openForm(null)}
        >
          <DataTable columns={columns} data={rows} onColumnFilterChange={handleFilterChange} total={rows.length} loading={loading} exportFilename="currency-conversion" />
        </ComponentCard>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          className="max-w-md"
          title={modalTitle}
          footer={
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>{saveLabel}</Button>
            </>
          }
        >
          {/* key: fresh date pickers each time the modal opens */}
          <div key={`${editing ? editing.id : "new"}-${modalOpen}`} className="space-y-4">
            {error && (
              <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>
            )}
            <div>
              <Label required>Currency</Label>
              <ReactSelect options={currencies} value={form.currency_id || null} placeholder="select" onChange={(value) => setForm({ ...form, currency_id: value ? String(value) : "" })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Date From</Label>
                <DatePicker id="rate_date_from" defaultDate={form.date_from || undefined} onChange={changeFrom} placeholder="Select date" />
              </div>
              <div>
                <Label required>Date To</Label>
                <DatePicker id="rate_date_to" defaultDate={form.date_to || undefined} onChange={changeTo} placeholder="Select date" />
              </div>
            </div>
            <div>
              <Label required>Amount In BDT</Label>
              <input type="number" value={form.amount_in_bdt} min={0} step="0.0001" placeholder="e.g. 122.50" onChange={(e) => setForm({ ...form, amount_in_bdt: e.target.value })} className={inputClass} />
            </div>
          </div>
        </Modal>
      </div>
    </AccessRoute>
  );
}
