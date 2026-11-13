"use client";
// "Add Purchase Price", "Add Sell Price" and "Sell Price History" popups, same fields as parts_bazar
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import DatePicker from "@/components/form/date-picker";
import { formatMoney } from "@/lib/format";
import { apiErrorMessage, today } from "@/lib/options";
import { productPriceService, ProductPriceRow, SellPriceHistory } from "@/services/productPriceService";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const ACTIVE_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

// a typed number, 0 when it is empty or not a number
function toNumber(value: string) {
  const number = parseFloat(value);
  if (isNaN(number)) {
    return 0;
  }
  return number;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
      <Label className="mb-0" required={required}>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function ProductName({ product }: { product: ProductPriceRow }) {
  return (
    <div className="flex h-9 items-center rounded-md bg-gray-100 px-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {product.name} <span className="ml-1 text-gray-400">({product.part_number})</span>
    </div>
  );
}

interface AddModalProps {
  product: ProductPriceRow | null;
  onClose: () => void;
  onSaved: () => void;
}

function emptyPurchaseForm() {
  return { original_price: "", vat_percent: "0", purchase_price: "", date: today(), is_active: "1" };
}

// Purchase price = original price + VAT %, rounded (parts_bazar calculate_pp_with_vat)
export function PurchasePriceModal({ product, onClose, onSaved }: AddModalProps) {
  const [form, setForm] = useState(emptyPurchaseForm());
  const [saving, setSaving] = useState(false);

  // a new empty form each time the popup opens
  useEffect(() => {
    if (product) {
      setForm(emptyPurchaseForm());
    }
  }, [product]);

  function changePrice(field: "original_price" | "vat_percent", value: string) {
    const newForm = { ...form, [field]: value };
    if (newForm.original_price === "") {
      newForm.purchase_price = "";
    } else {
      const original = toNumber(newForm.original_price);
      const vat = (original * toNumber(newForm.vat_percent)) / 100;
      newForm.purchase_price = String(Math.round(original + vat));
    }
    setForm(newForm);
  }

  const changeDate = useCallback((_dates: Date[], dateStr: string) => {
    setForm((oldForm) => ({ ...oldForm, date: dateStr }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product) {
      return;
    }
    try {
      setSaving(true);
      await productPriceService.addPurchasePrice(product.id, {
        original_price: toNumber(form.original_price),
        vat_percent: toNumber(form.vat_percent),
        purchase_price: toNumber(form.purchase_price),
        date: form.date,
        is_active: form.is_active === "1",
      });
      toast.success("Purchase Price Added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  let saveText = "Add";
  if (saving) {
    saveText = "Saving...";
  }

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      className="max-w-xl"
      title="Add Purchase Price"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="purchase-price-form" size="sm" disabled={saving}>{saveText}</Button>
        </>
      }
    >
      {product && (
        <form id="purchase-price-form" onSubmit={save} className="space-y-3">
          <Field label="Product"><ProductName product={product} /></Field>
          <Field label="Original Purchase Price" required>
            <input type="number" min="0" step="any" value={form.original_price} onChange={(e) => changePrice("original_price", e.target.value)} className={`${inputClass} text-right`} autoFocus />
          </Field>
          <Field label="VAT (%)">
            <input type="number" min="0" step="any" value={form.vat_percent} onChange={(e) => changePrice("vat_percent", e.target.value)} className={`${inputClass} text-right`} />
          </Field>
          <Field label="Purchase Price" required>
            <input type="number" min="0" step="any" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className={`${inputClass} text-right`} />
          </Field>
          <Field label="Date" required>
            <DatePicker id="purchase_price_date" defaultDate={form.date} onChange={changeDate} />
          </Field>
          <Field label="Is Active" required>
            <ReactSelect options={ACTIVE_OPTIONS} value={form.is_active} isClearable={false} onChange={(value) => setForm({ ...form, is_active: String(value ?? "1") })} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

function emptySellForm() {
  return { sell_price: "", market_price: "", discount: "", is_active: "1" };
}

export function SellPriceModal({ product, onClose, onSaved }: AddModalProps) {
  const [form, setForm] = useState(emptySellForm());
  const [saving, setSaving] = useState(false);

  // a new empty form each time the popup opens
  useEffect(() => {
    if (product) {
      setForm(emptySellForm());
    }
  }, [product]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product) {
      return;
    }
    try {
      setSaving(true);
      await productPriceService.addSellPrice(product.id, {
        sell_price: toNumber(form.sell_price),
        market_price: toNumber(form.market_price),
        discount: toNumber(form.discount),
        is_active: form.is_active === "1",
      });
      toast.success("Sell Price Added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  function numberField(field: "sell_price" | "market_price" | "discount", autoFocus = false) {
    return (
      <input type="number" min="0" step="any" value={form[field]} autoFocus={autoFocus}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })} className={`${inputClass} text-right`} />
    );
  }

  let saveText = "Add";
  if (saving) {
    saveText = "Saving...";
  }

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      className="max-w-xl"
      title="Add Sell Price"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="sell-price-form" size="sm" disabled={saving}>{saveText}</Button>
        </>
      }
    >
      {product && (
        <form id="sell-price-form" onSubmit={save} className="space-y-3">
          <Field label="Product"><ProductName product={product} /></Field>
          <Field label="Sell Price" required>{numberField("sell_price", true)}</Field>
          <Field label="Market Price">{numberField("market_price")}</Field>
          <Field label="Discount (%)">{numberField("discount")}</Field>
          <Field label="Is Active" required>
            <ReactSelect options={ACTIVE_OPTIONS} value={form.is_active} isClearable={false} onChange={(value) => setForm({ ...form, is_active: String(value ?? "1") })} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

const ACTIVE_CLASS = "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
const INACTIVE_CLASS = "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500";

function HistoryRow({ price }: { price: SellPriceHistory }) {
  let statusClass = INACTIVE_CLASS;
  let statusText = "Inactive";
  if (price.is_active) {
    statusClass = ACTIVE_CLASS;
    statusText = "Active";
  }

  return (
    <tr>
      <td className="px-2 py-1.5">{formatMoney(price.sell_price)}</td>
      <td className="px-2 py-1.5">{formatMoney(price.market_price)}</td>
      <td className="px-2 py-1.5">{Number(price.discount)}%</td>
      <td className="px-2 py-1.5">{price.ideal_qty ?? ""}</td>
      <td className="px-2 py-1.5">{price.warn_qty ?? ""}</td>
      <td className="px-2 py-1.5">{price.start_date ?? ""}</td>
      <td className="px-2 py-1.5">{price.end_date ?? ""}</td>
      <td className="px-2 py-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>{statusText}</span>
      </td>
    </tr>
  );
}

export function SellPriceHistoryModal({ product, onClose }: { product: ProductPriceRow | null; onClose: () => void }) {
  const [history, setHistory] = useState<SellPriceHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // the history is loaded each time the popup opens
  useEffect(() => {
    if (!product) {
      return;
    }
    const productId = product.id;

    async function loadHistory() {
      setLoading(true);
      try {
        setHistory(await productPriceService.getSellPriceHistory(productId));
      } catch {
        toast.error("Failed to load price history");
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [product]);

  let body: React.ReactNode;
  if (loading) {
    body = <tr><td colSpan={8} className="py-6 text-gray-400">Loading...</td></tr>;
  } else if (history.length === 0) {
    body = <tr><td colSpan={8} className="py-6 text-gray-400">No result found!</td></tr>;
  } else {
    const rows: React.ReactNode[] = [];
    for (const price of history) {
      rows.push(<HistoryRow key={price.id} price={price} />);
    }
    body = rows;
  }

  let title = "Sell Price History:  ()";
  if (product) {
    title = "Sell Price History: " + product.name + " (" + product.part_number + ")";
  }

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      className="max-w-3xl"
      title={title}
      footer={<Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="px-2 py-2 text-center font-medium">Sell Price</th>
              <th className="px-2 py-2 text-center font-medium">Market Price</th>
              <th className="px-2 py-2 text-center font-medium">Discount</th>
              <th className="px-2 py-2 text-center font-medium">Ideal Qty</th>
              <th className="px-2 py-2 text-center font-medium">Warn Qty</th>
              <th className="px-2 py-2 text-center font-medium">Start Date</th>
              <th className="px-2 py-2 text-center font-medium">End Date</th>
              <th className="px-2 py-2 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-center text-gray-700 dark:divide-white/[0.05] dark:text-gray-300">
            {body}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
