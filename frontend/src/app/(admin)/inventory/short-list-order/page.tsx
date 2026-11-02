"use client";
// Short List Order Create, like parts_bazar shortListOrder/create:
// pick store and part number, type the order qty, "Add" to the grid, then "Create PR"
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReactSelect from "@/components/form/ReactSelect";
import Autocomplete from "@/components/form/Autocomplete";
import Button from "@/components/ui/button/Button";
import { FiPlus, FiTrash } from "@/icons/index";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { ProductHit } from "@/services/purchaseService";
import { shortListOrderService, ShortListItem } from "@/services/shortListOrderService";
import { ShortListReportModal } from "../components/ShortListReport";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const readOnlyClass =
  "h-9 w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

// Section box like the parts_bazar fieldsets
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">{title}</h3>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface Entry {
  store_id: string;
  product: ProductHit | null;
  part_text: string;
  order_qty: string;
}

const emptyEntry = (store_id = ""): Entry => ({ store_id, product: null, part_text: "", order_qty: "" });

function ShortListOrderCreate() {
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [entry, setEntry] = useState<Entry>(emptyEntry);
  const [items, setItems] = useState<ShortListItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSlNo, setSavedSlNo] = useState<number | null>(null);
  const partNumberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Short List Order Create | Multibrand POS";
    api.get("/configure/stores", { params: { status: 1 } })
      .then((res) => setStores(res.data.data.data.map((s: any) => ({ value: String(s.id), label: s.name }))))
      .catch(() => toast.error("Failed to load stores"));
  }, []);

  // the stock shown is for the selected store, so a new store drops the picked product
  const changeStore = (storeId: string) => setEntry(emptyEntry(storeId));

  const canSearchProduct = () => {
    if (!entry.store_id) {
      toast.warn("Please Select Store");
      return false;
    }
    return true;
  };

  const selectProduct = (product: ProductHit) => {
    setEntry((e) => ({ ...e, product, part_text: product.part_number }));
  };

  // "Add" button: same checks as parts_bazar AddNew()
  const addItem = () => {
    if (!entry.product) return setError("Please select a product!");
    if (!entry.store_id) return setError("Please select Store!");
    if (!(Number(entry.order_qty) > 0)) return setError("Please enter order qty!");

    const product = entry.product;
    if (items.some((item) => item.product_id === product.id && item.store_id === Number(entry.store_id))) {
      toast.error("This item is already added in the grid! Please try another one or change the store.");
      return;
    }

    setItems((list) => [
      ...list,
      {
        store_id: Number(entry.store_id),
        store_name: stores.find((s) => s.value === entry.store_id)?.label ?? "",
        product_id: product.id,
        product_name: product.name,
        code: product.part_number,
        stock_qty: Number(product.stock ?? 0),
        purchase_price: Number(product.purchase_price ?? 0),
        order_qty: Number(entry.order_qty),
      },
    ]);
    setError("");
    // keep the store for the next product
    setEntry(emptyEntry(entry.store_id));
    setTimeout(() => partNumberRef.current?.focus(), 0);
  };

  const save = async () => {
    if (items.length === 0) return setError("Please Insert Item In List!");
    try {
      setSaving(true);
      setError("");
      const saved = await shortListOrderService.createList(items);
      toast.success("Data saved successfully.");
      setItems([]);
      setEntry(emptyEntry());
      setSavedSlNo(saved.max_sl_no);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstError = errors && Object.values(errors)[0];
      setError((Array.isArray(firstError) ? firstError[0] : null) || err?.response?.data?.message || "Data not saved. Please solve the above errors!");
    } finally {
      setSaving(false);
    }
  };

  const grandTotal = items.reduce((sum, item) => sum + item.purchase_price * item.order_qty, 0);

  return (
    <div>
      <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Short List Order Create" }]} />

      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <Section title="Short List Order Entry">
          <div className="custom-scrollbar overflow-x-auto pb-1">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {["Store", "Product Name", "Part Number", "Stock Qty", "Purchase Price", "Order Qty", ""].map((h) => (
                    <th key={h} className="px-1 pb-1.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="w-[200px] px-1">
                    <ReactSelect options={stores} placeholder="Select" value={entry.store_id} onChange={(v) => changeStore(String(v ?? ""))} />
                  </td>
                  <td className="w-[200px] px-1"><input readOnly tabIndex={-1} value={entry.product?.name ?? ""} className={readOnlyClass} /></td>
                  <td className="w-[170px] px-1">
                    <Autocomplete
                      inputRef={partNumberRef}
                      value={entry.part_text}
                      onChange={(text) => setEntry((e) => ({ ...e, part_text: text, product: null }))}
                      canSearch={canSearchProduct}
                      search={(term) => shortListOrderService.searchProducts(term, Number(entry.store_id))}
                      onSelect={selectProduct}
                      placeholder="Part number"
                      renderItem={(p) => (
                        <div>
                          <div className="font-medium">{p.part_number}</div>
                          <div className="text-xs text-gray-500">{p.name} · Stock {p.stock} {p.unit ?? ""}</div>
                        </div>
                      )}
                    />
                    {entry.product?.unit && <span className="text-xs text-gray-500">{entry.product.unit}</span>}
                  </td>
                  <td className="w-[110px] px-1"><input readOnly tabIndex={-1} value={entry.product ? entry.product.stock : ""} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[120px] px-1"><input readOnly tabIndex={-1} value={entry.product ? entry.product.purchase_price : ""} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[120px] px-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={entry.order_qty}
                      placeholder="Qty"
                      onChange={(e) => setEntry((x) => ({ ...x, order_qty: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="w-[80px] px-1">
                    <Button type="button" size="sm" onClick={addItem} className="h-9 w-full px-2">
                      <FiPlus /> Add
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={`Added List (${items.length})`}>
          <div className="custom-scrollbar max-h-[360px] overflow-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  {["SL#", "Store", "Product Name", "Part Number", "Stock Qty", "Purchase Price", "Order Qty", "Total", "Action"].map((h, i) => (
                    <th key={h} className={`px-2 py-2 font-medium ${i >= 4 && i <= 7 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {items.length === 0 ? (
                  <tr><td colSpan={9} className="py-6 text-center text-gray-400">No item added yet</td></tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={`${item.store_id}-${item.product_id}`} className="text-gray-700 dark:text-gray-300">
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5">{item.store_name}</td>
                      <td className="px-2 py-1.5">{item.product_name}</td>
                      <td className="px-2 py-1.5 font-medium">{item.code}</td>
                      <td className="px-2 py-1.5 text-right">{item.stock_qty}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.purchase_price)}</td>
                      <td className="px-2 py-1.5 text-right">{item.order_qty}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{formatMoney(item.purchase_price * item.order_qty)}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" title="Remove" onClick={() => setItems((list) => list.filter((_, x) => x !== i))} className="rounded p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10">
                          <FiTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                    <td colSpan={7} className="px-2 py-2 text-right">Grand Total</td>
                    <td className="px-2 py-2 text-right">{formatMoney(grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Section>

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Create PR"}
          </Button>
        </div>
      </div>

      <ShortListReportModal maxSlNo={savedSlNo} onClose={() => setSavedSlNo(null)} />
    </div>
  );
}

export default function ShortListOrderPage() {
  return (
    <AccessRoute requiredPermissions={["short-list-order.create"]}>
      <ShortListOrderCreate />
    </AccessRoute>
  );
}
