"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Autocomplete from "@/components/form/Autocomplete";
import { FiPlus, FiTrash } from "@/icons/index";
import { formatMoney } from "@/lib/format";
import { purchaseService } from "@/services/purchaseService";
import { usePurchaseForm } from "./hooks/usePurchaseForm";
import { PurchaseVoucher } from "../components/PurchaseVoucher";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";
const readOnlyClass =
  "h-9 w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

// Section box like the parts_bazar fieldsets
function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] ${className}`}>
      <h3 className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">{title}</h3>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3">
      <Label className="mb-0" required={required}>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function PurchaseForm() {
  const editId = Number(useSearchParams().get("id")) || null;
  const f = usePurchaseForm(editId);
  const { header, entry, items, options } = f;
  const storeLocked = items.length > 0; // parts_bazar locks the store once items are in the grid

  useEffect(() => {
    document.title = `${editId ? "Edit Purchase" : "Purchase"} | Multibrand POS`;
  }, [editId]);

  const numberInput = (field: "qty" | "unit_price" | "per_kg" | "sell_price", placeholder: string) => (
    <input
      type="number"
      min="0"
      step={field === "qty" ? "1" : "any"}
      value={entry[field]}
      placeholder={placeholder}
      onChange={(e) => f.setEntryField(field, e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), f.addItem())}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      className={`${inputClass} text-right`}
    />
  );

  return (
    <div>
      <PageBreadcrumb items={[{ title: "Purchases" }, { title: editId ? "Edit Purchase" : "Purchase" }]} />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Section title="Order No">
            <div className="space-y-2.5">
              <Row label="PO No">
                <div className="flex h-9 items-center rounded-md bg-gray-100 px-3 text-sm font-semibold text-brand-600 dark:bg-gray-800 dark:text-brand-400">
                  {f.poNo || "..."}
                </div>
              </Row>
              <Row label="Purchase Date" required>
                <input type="date" value={header.purchase_date} onChange={(e) => f.setHeaderField("purchase_date", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Cash / Due" required>
                <Select options={options?.cash_due ?? []} placeholder="Select" value={header.cash_due} onChange={(e) => f.changeCashDue(e.target.value)} />
              </Row>
              <Row label="Local / Import" required>
                <Select options={options?.purchase_type ?? []} placeholder="Select" value={header.purchase_type} onChange={(e) => f.setHeaderField("purchase_type", e.target.value)} />
              </Row>
              <Row label="Store" required>
                <Select options={f.stores} placeholder="Select" value={header.store_id} disabled={storeLocked} onChange={(e) => f.changeStore(e.target.value)} />
              </Row>
              <Row label="Ship By">
                <Select options={options?.ship_by ?? []} placeholder="Select" value={header.ship_by} onChange={(e) => f.setHeaderField("ship_by", e.target.value)} />
              </Row>
              <Row label="Supplier" required>
                <Autocomplete
                  value={header.supplier_text}
                  onChange={(text) => {
                    f.setHeaderField("supplier_text", text);
                    f.setHeaderField("supplier_id", null);
                  }}
                  canSearch={f.canSearchSupplier}
                  search={(term) => purchaseService.searchSuppliers(term)}
                  onSelect={f.selectSupplier}
                  placeholder="Type supplier name or phone"
                  renderItem={(s) => (
                    <div className="flex justify-between gap-3">
                      <span>{s.name}{s.phone && <span className="text-gray-400"> · {s.phone}</span>}</span>
                      <span className="text-xs text-gray-500">Due {formatMoney(s.due)}</span>
                    </div>
                  )}
                />
              </Row>
            </div>
          </Section>

          <Section title="Received Information">
            <div className="space-y-2.5">
              <Row label="Payment Type" required>
                <Select options={options?.payment_type ?? []} value={header.payment_type} disabled onChange={() => {}} />
              </Row>
              <Row label="Payment Amount">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={header.payment_amount}
                  disabled={header.cash_due !== "1"}
                  onChange={(e) => f.changePaymentAmount(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={`${inputClass} text-right`}
                />
              </Row>
              <Row label="Supplier Bill No">
                <input type="text" value={header.supplier_bill_no} onChange={(e) => f.setHeaderField("supplier_bill_no", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Grand Total">
                <div className="flex h-9 items-center justify-center rounded-md bg-gray-100 text-base font-bold text-success-600 dark:bg-gray-800 dark:text-success-400">
                  {formatMoney(f.grandTotal)}
                </div>
              </Row>
              <Row label="Due Amount">
                <div className={`${readOnlyClass} flex items-center justify-center`}>
                  {header.supplier_due === null ? "" : formatMoney(header.supplier_due)}
                </div>
              </Row>
            </div>
          </Section>
        </div>

        {f.error && (
          <div className="rounded-md border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {f.error}
          </div>
        )}

        <Section title="Product Information">
          <div className="custom-scrollbar overflow-x-auto pb-1">
            <table className="w-full min-w-[1500px] text-[13px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {["Location", "Product Name", "Part Number", "Unit", "Qty", "Unit Price", "PER KG", "SP", "Total Unit Price",
                    "Total Product Price", "Weight Unit", "Total Weight", "Total Weight Amount", "Total Purchase Price", ""].map((h) => (
                    <th key={h} className="px-1 pb-1.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="w-[130px] px-1">
                    <Select options={f.locations} placeholder="Select" value={entry.location_id} onChange={(e) => f.setEntryField("location_id", e.target.value)} />
                  </td>
                  <td className="w-[170px] px-1"><input readOnly tabIndex={-1} value={entry.product?.name ?? ""} className={readOnlyClass} /></td>
                  <td className="w-[150px] px-1">
                    <Autocomplete
                      inputRef={f.partNumberRef}
                      value={entry.part_text}
                      onChange={(text) => setPartText(f, text)}
                      canSearch={f.canSearchProduct}
                      search={(term) => purchaseService.searchProducts(term, Number(header.store_id), Number(entry.location_id))}
                      onSelect={f.selectProduct}
                      placeholder="Part number"
                      renderItem={(p) => (
                        <div>
                          <div className="font-medium">{p.part_number}</div>
                          <div className="text-xs text-gray-500">{p.name} · Stock {p.stock} {p.unit ?? ""}</div>
                        </div>
                      )}
                    />
                  </td>
                  <td className="w-[60px] px-1"><div className="flex h-9 items-center text-gray-600 dark:text-gray-400">{entry.product?.unit ?? ""}</div></td>
                  <td className="w-[80px] px-1">{numberInput("qty", "Qty")}</td>
                  <td className="w-[100px] px-1">{numberInput("unit_price", "Price")}</td>
                  <td className="w-[90px] px-1">{numberInput("per_kg", "0")}</td>
                  <td className="w-[100px] px-1">{numberInput("sell_price", "SP")}</td>
                  <td className="w-[100px] px-1"><input readOnly tabIndex={-1} value={entryValue(entry, f.entryTotals.total_unit_price)} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[110px] px-1"><input readOnly tabIndex={-1} value={entryValue(entry, f.entryTotals.total_product_price)} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[80px] px-1"><input readOnly tabIndex={-1} value={entry.weight_unit} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[90px] px-1"><input readOnly tabIndex={-1} value={entryValue(entry, f.entryTotals.total_weight)} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[110px] px-1"><input readOnly tabIndex={-1} value={entryValue(entry, f.entryTotals.total_weight_amount)} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[120px] px-1"><input readOnly tabIndex={-1} value={entryValue(entry, f.entryTotals.total_purchase_price)} className={`${readOnlyClass} text-right font-semibold`} /></td>
                  <td className="w-[60px] px-1">
                    <Button type="button" size="sm" onClick={f.addItem} className="h-9 w-full px-2">
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
            <table className="w-full min-w-[1400px] text-[13px]">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  {["SL", "Location", "Product Name", "Part Number", "Unit", "Qty", "Unit Price", "PER KG", "Sell Price", "Total Unit Price",
                    "Total Product Price", "Weight Unit", "Total Weight", "Total Weight Amount", "Total Purchase Price", "Action"].map((h, i) => (
                    <th key={h} className={`px-2 py-2 font-medium ${i >= 5 && i <= 14 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {items.length === 0 ? (
                  <tr><td colSpan={16} className="py-6 text-center text-gray-400">No item added yet</td></tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={item.product_id} className="text-gray-700 dark:text-gray-300">
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5">{item.location_name}</td>
                      <td className="px-2 py-1.5">{item.product_name}</td>
                      <td className="px-2 py-1.5 font-medium">{item.part_number}</td>
                      <td className="px-2 py-1.5">{item.unit}</td>
                      <td className="px-2 py-1.5 text-right">{item.qty}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.unit_price)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.per_kg)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.sell_price)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.total_unit_price)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.total_product_price)}</td>
                      <td className="px-2 py-1.5 text-right">{item.weight_unit}</td>
                      <td className="px-2 py-1.5 text-right">{item.total_weight}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.total_weight_amount)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{formatMoney(item.total_purchase_price)}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" title="Remove" onClick={() => f.removeItem(i)} className="rounded p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10">
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
                    <td colSpan={14} className="px-2 py-2 text-right">Grand Total</td>
                    <td className="px-2 py-2 text-right">{formatMoney(f.grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Section>

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start">
          <Button type="button" onClick={f.savePurchase} disabled={f.saving}>
            {f.saving ? "Saving..." : editId ? "Update PO" : "Create PO"}
          </Button>
        </div>
      </div>

      <PurchaseVoucher purchaseId={f.savedId} onClose={() => f.setSavedId(null)} />
    </div>
  );
}

// Typing a new part number drops the product picked before
function setPartText(f: ReturnType<typeof usePurchaseForm>, text: string) {
  f.setEntryField("part_text", text);
  if (f.entry.product) f.setEntryField("product", null);
}

// Totals stay empty until a qty is typed, like parts_bazar
const entryValue = (entry: { qty: string }, value: number) => (entry.qty === "" ? "" : value.toFixed(2));

export default function PurchasePage() {
  return (
    <AccessRoute requiredPermissions={["purchase.create", "purchase.edit"]}>
      <Suspense fallback={null}>
        <PurchaseForm />
      </Suspense>
    </AccessRoute>
  );
}
