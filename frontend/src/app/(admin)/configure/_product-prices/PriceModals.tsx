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
import { productPriceService, ProductPriceRow, SellPriceHistory } from "@/services/productPriceService";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const ACTIVE_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

const today = () => new Date().toISOString().slice(0, 10);
const num = (value: string) => (isNaN(parseFloat(value)) ? 0 : parseFloat(value));

// Read the first message from a 422 response
const firstError = (err: any) => {
  const errors = err?.response?.data?.errors;
  const first = errors && Object.values(errors)[0];
  return (Array.isArray(first) ? first[0] : null) || err?.response?.data?.message || "Failed to save";
};

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

// Purchase price = original price + VAT %, rounded (parts_bazar calculate_pp_with_vat)
export function PurchasePriceModal({ product, onClose, onSaved }: AddModalProps) {
  const [form, setForm] = useState({ original_price: "", vat_percent: "0", purchase_price: "", date: today(), is_active: "1" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) setForm({ original_price: "", vat_percent: "0", purchase_price: "", date: today(), is_active: "1" });
  }, [product]);

  const changePrice = (field: "original_price" | "vat_percent", value: string) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      const original = num(next.original_price);
      next.purchase_price = next.original_price === "" ? "" : String(Math.round(original + (original * num(next.vat_percent)) / 100));
      return next;
    });
  };

  const changeDate = useCallback((_dates: Date[], dateStr: string) => setForm((f) => ({ ...f, date: dateStr })), []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    try {
      setSaving(true);
      await productPriceService.addPurchasePrice(product.id, {
        original_price: num(form.original_price),
        vat_percent: num(form.vat_percent),
        purchase_price: num(form.purchase_price),
        date: form.date,
        is_active: form.is_active === "1",
      });
      toast.success("Purchase Price Added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      className="max-w-xl"
      title="Add Purchase Price"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="purchase-price-form" size="sm" disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
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
            <input type="number" min="0" step="any" value={form.purchase_price} onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))} className={`${inputClass} text-right`} />
          </Field>
          <Field label="Date" required>
            <DatePicker id="purchase_price_date" defaultDate={form.date} onChange={changeDate} />
          </Field>
          <Field label="Is Active" required>
            <ReactSelect options={ACTIVE_OPTIONS} value={form.is_active} isClearable={false} onChange={(v) => setForm((f) => ({ ...f, is_active: String(v ?? "1") }))} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

export function SellPriceModal({ product, onClose, onSaved }: AddModalProps) {
  const [form, setForm] = useState({ sell_price: "", market_price: "", discount: "", is_active: "1" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) setForm({ sell_price: "", market_price: "", discount: "", is_active: "1" });
  }, [product]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    try {
      setSaving(true);
      await productPriceService.addSellPrice(product.id, {
        sell_price: num(form.sell_price),
        market_price: num(form.market_price),
        discount: num(form.discount),
        is_active: form.is_active === "1",
      });
      toast.success("Sell Price Added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(firstError(err));
    } finally {
      setSaving(false);
    }
  };

  const numberField = (field: "sell_price" | "market_price" | "discount", autoFocus = false) => (
    <input type="number" min="0" step="any" value={form[field]} autoFocus={autoFocus}
      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} className={`${inputClass} text-right`} />
  );

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      className="max-w-xl"
      title="Add Sell Price"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="sell-price-form" size="sm" disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
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
            <ReactSelect options={ACTIVE_OPTIONS} value={form.is_active} isClearable={false} onChange={(v) => setForm((f) => ({ ...f, is_active: String(v ?? "1") }))} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

export function SellPriceHistoryModal({ product, onClose }: { product: ProductPriceRow | null; onClose: () => void }) {
  const [history, setHistory] = useState<SellPriceHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) return;
    setLoading(true);
    productPriceService.getSellPriceHistory(product.id)
      .then(setHistory)
      .catch(() => toast.error("Failed to load price history"))
      .finally(() => setLoading(false));
  }, [product]);

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      className="max-w-3xl"
      title={`Sell Price History: ${product?.name ?? ""} (${product?.part_number ?? ""})`}
      footer={<Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {["Sell Price", "Market Price", "Discount", "Ideal Qty", "Warn Qty", "Start Date", "End Date", "Status"].map((h) => (
                <th key={h} className="px-2 py-2 text-center font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-center text-gray-700 dark:divide-white/[0.05] dark:text-gray-300">
            {loading ? (
              <tr><td colSpan={8} className="py-6 text-gray-400">Loading...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={8} className="py-6 text-gray-400">No result found!</td></tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td className="px-2 py-1.5">{formatMoney(h.sell_price)}</td>
                  <td className="px-2 py-1.5">{formatMoney(h.market_price)}</td>
                  <td className="px-2 py-1.5">{Number(h.discount)}%</td>
                  <td className="px-2 py-1.5">{h.ideal_qty ?? ""}</td>
                  <td className="px-2 py-1.5">{h.warn_qty ?? ""}</td>
                  <td className="px-2 py-1.5">{h.start_date ?? ""}</td>
                  <td className="px-2 py-1.5">{h.end_date ?? ""}</td>
                  <td className="px-2 py-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${h.is_active ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"}`}>
                      {h.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
