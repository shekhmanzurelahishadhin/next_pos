"use client";
import { Suspense, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Label from "@/components/form/Label";
import ReactSelect from "@/components/form/ReactSelect";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import Autocomplete from "@/components/form/Autocomplete";
import { FiPlus, FiTrash } from "@/icons/index";
import { formatMoney } from "@/lib/format";
import { blurOnWheel } from "@/lib/options";
import { purchaseService } from "@/services/purchaseService";
import { EntryRow, LOCAL, usePurchaseForm } from "./hooks/usePurchaseForm";
import { PurchaseVoucher } from "../components/PurchaseVoucher";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";
const readOnlyClass =
  "h-9 w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
const headCell = "px-1 pb-1.5 font-medium";
const gridHeadCell = "px-2 py-2 font-medium";
const gridCell = "px-2 py-1.5";

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

// The totals of the "Add" row stay empty until a qty is typed, like parts_bazar
function entryValue(entry: EntryRow, value: number) {
  if (entry.qty === "") {
    return "";
  }
  return value.toFixed(2);
}

function PurchaseForm() {
  // ?id=12 opens purchase 12 to edit
  const idInUrl = Number(useSearchParams().get("id"));
  const editId = idInUrl > 0 ? idInUrl : null;

  const form = usePurchaseForm(editId);
  const { header, entry, items, options } = form;
  const { setHeaderField } = form;
  const storeLocked = items.length > 0; // parts_bazar locks the store once items are in the grid

  // the date picker needs a function that does not change on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const changeDate = useCallback((_dates: Date[], dateStr: string) => setHeaderField("purchase_date", dateStr), []);

  useEffect(() => {
    document.title = `${editId ? "Edit Purchase" : "Purchase"} | Multibrand POS`;
  }, [editId]);

  // Enter in a number box of the "Add" row works like the Add button
  function addOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      form.addItem();
    }
  }

  function numberInput(field: "qty" | "unit_price" | "per_kg" | "sell_price", placeholder: string) {
    // a local purchase has no weight cost
    const disabled = field === "per_kg" && header.purchase_type === LOCAL;

    return (
      <input
        type="number"
        min="0"
        step={field === "qty" ? "1" : "any"}
        value={entry[field]}
        placeholder={placeholder}
        onChange={(e) => form.setEntryField(field, e.target.value)}
        onKeyDown={addOnEnter}
        onWheel={blurOnWheel}
        disabled={disabled}
        className={`${inputClass} text-right`}
      />
    );
  }

  let saveLabel = editId ? "Update PO" : "Create PO";
  if (form.saving) {
    saveLabel = "Saving...";
  }

  return (
    <div>
      <PageBreadcrumb items={[{ title: "Purchases" }, { title: editId ? "Edit Purchase" : "Purchase" }]} />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Section title="Order No">
            <div className="space-y-2.5">
              <Row label="Purchase Date" required>
                <DatePicker id="purchase_date" defaultDate={header.purchase_date} onChange={changeDate} placeholder="Select date" />
              </Row>
              <Row label="Cash / Due" required>
                <ReactSelect
                  options={options ? options.cash_due : []}
                  placeholder="Select"
                  value={header.cash_due}
                  onChange={(value) => form.changeCashDue(value ? String(value) : "")}
                />
              </Row>
              <Row label="Local / Import" required>
                <ReactSelect
                  options={options ? options.purchase_type : []}
                  placeholder="Select"
                  value={header.purchase_type}
                  onChange={(value) => form.changePurchaseType(value ? String(value) : "")}
                />
              </Row>
              <Row label="Store" required>
                <ReactSelect
                  options={form.stores}
                  placeholder="Select"
                  value={header.store_id}
                  isDisabled={storeLocked}
                  onChange={(value) => form.changeStore(value ? String(value) : "")}
                />
              </Row>
              <Row label="Ship By">
                <ReactSelect
                  options={options ? options.ship_by : []}
                  placeholder="Select"
                  value={header.ship_by}
                  onChange={(value) => form.setHeaderField("ship_by", value ? String(value) : "")}
                />
              </Row>
              <Row label="Supplier" required>
                <Autocomplete
                  value={header.supplier_text}
                  onChange={(text) => {
                    // typing again clears the picked supplier
                    form.setHeaderField("supplier_text", text);
                    form.setHeaderField("supplier_id", null);
                  }}
                  canSearch={form.canSearchSupplier}
                  search={(term) => purchaseService.searchSuppliers(term)}
                  onSelect={form.selectSupplier}
                  placeholder="Type supplier name or phone"
                  renderItem={(supplier) => (
                    <div className="flex justify-between gap-3">
                      <span>
                        {supplier.name}
                        {supplier.phone && <span className="text-gray-400"> · {supplier.phone}</span>}
                      </span>
                      <span className="text-xs text-gray-500">Due {formatMoney(supplier.due)}</span>
                    </div>
                  )}
                />
              </Row>
            </div>
          </Section>

          <Section title="Received Information">
            <div className="space-y-2.5">
              <Row label="Payment Type" required>
                <ReactSelect options={options ? options.payment_type : []} value={header.payment_type} isDisabled isClearable={false} onChange={() => {}} />
              </Row>
              <Row label="Payment Amount">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={header.payment_amount}
                  disabled={header.cash_due !== "1"}
                  onChange={(e) => form.changePaymentAmount(e.target.value)}
                  onWheel={blurOnWheel}
                  className={`${inputClass} text-right`}
                />
              </Row>
              <Row label="Supplier Bill No">
                <input type="text" value={header.supplier_bill_no} onChange={(e) => form.setHeaderField("supplier_bill_no", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Grand Total">
                <div className="flex h-9 items-center justify-center rounded-md bg-gray-100 text-base font-bold text-success-600 dark:bg-gray-800 dark:text-success-400">
                  {formatMoney(form.grandTotal)}
                </div>
              </Row>
              <Row label="Due Amount">
                <div className={`${readOnlyClass} flex items-center justify-center`}>
                  {header.supplier_due !== null && formatMoney(header.supplier_due)}
                </div>
              </Row>
            </div>
          </Section>
        </div>

        {form.error && (
          <div className="rounded-md border border-error-200 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {form.error}
          </div>
        )}

        <Section title="Product Information">
          <div className="custom-scrollbar overflow-x-auto pb-1">
            <table className="w-full min-w-[1500px] text-[13px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  <th className={headCell}>Location</th>
                  <th className={headCell}>Product Name</th>
                  <th className={headCell}>Part Number</th>
                  <th className={headCell}>Unit</th>
                  <th className={headCell}>Qty</th>
                  <th className={headCell}>Unit Price</th>
                  <th className={headCell}>PER KG</th>
                  <th className={headCell}>SP</th>
                  <th className={headCell}>Total Unit Price</th>
                  <th className={headCell}>Total Product Price</th>
                  <th className={headCell}>Weight Unit</th>
                  <th className={headCell}>Total Weight</th>
                  <th className={headCell}>Total Weight Amount</th>
                  <th className={headCell}>Total Purchase Price</th>
                  <th className={headCell}></th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="w-[180px] px-1">
                    <ReactSelect
                      options={form.locations}
                      placeholder="Select"
                      value={entry.location_id}
                      onChange={(value) => form.setEntryField("location_id", value ? String(value) : "")}
                    />
                  </td>
                  <td className="w-[170px] px-1">
                    <input readOnly tabIndex={-1} value={entry.product ? entry.product.name : ""} className={readOnlyClass} />
                  </td>
                  <td className="w-[150px] px-1">
                    <Autocomplete
                      inputRef={form.partNumberRef}
                      value={entry.part_text}
                      onChange={form.changePartText}
                      canSearch={form.canSearchProduct}
                      search={(term) => purchaseService.searchProducts(term, Number(header.store_id), Number(entry.location_id))}
                      onSelect={form.selectProduct}
                      placeholder="Part number"
                      renderItem={(product) => (
                        <div>
                          <div className="font-medium">{product.part_number}</div>
                          <div className="text-xs text-gray-500">{product.name} · Stock {product.stock} {product.unit ?? ""}</div>
                        </div>
                      )}
                    />
                  </td>
                  <td className="w-[60px] px-1">
                    <div className="flex h-9 items-center text-gray-600 dark:text-gray-400">{entry.product ? entry.product.unit : ""}</div>
                  </td>
                  <td className="w-[80px] px-1">{numberInput("qty", "Qty")}</td>
                  <td className="w-[100px] px-1">{numberInput("unit_price", "Price")}</td>
                  <td className="w-[90px] px-1">{numberInput("per_kg", "0")}</td>
                  <td className="w-[100px] px-1">{numberInput("sell_price", "SP")}</td>
                  <td className="w-[100px] px-1">
                    <input readOnly tabIndex={-1} value={entryValue(entry, form.entryTotals.total_unit_price)} className={`${readOnlyClass} text-right`} />
                  </td>
                  <td className="w-[110px] px-1">
                    <input readOnly tabIndex={-1} value={entryValue(entry, form.entryTotals.total_product_price)} className={`${readOnlyClass} text-right`} />
                  </td>
                  <td className="w-[80px] px-1">
                    <input readOnly tabIndex={-1} value={entry.weight_unit} className={`${readOnlyClass} text-right`} />
                  </td>
                  <td className="w-[90px] px-1">
                    <input readOnly tabIndex={-1} value={entryValue(entry, form.entryTotals.total_weight)} className={`${readOnlyClass} text-right`} />
                  </td>
                  <td className="w-[110px] px-1">
                    <input readOnly tabIndex={-1} value={entryValue(entry, form.entryTotals.total_weight_amount)} className={`${readOnlyClass} text-right`} />
                  </td>
                  <td className="w-[120px] px-1">
                    <input readOnly tabIndex={-1} value={entryValue(entry, form.entryTotals.total_purchase_price)} className={`${readOnlyClass} text-right font-semibold`} />
                  </td>
                  <td className="w-[60px] px-1">
                    <Button type="button" size="sm" onClick={form.addItem} className="h-9 w-full px-2">
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
                  <th className={gridHeadCell}>SL</th>
                  <th className={gridHeadCell}>Location</th>
                  <th className={gridHeadCell}>Product Name</th>
                  <th className={gridHeadCell}>Part Number</th>
                  <th className={gridHeadCell}>Unit</th>
                  <th className={`${gridHeadCell} text-right`}>Qty</th>
                  <th className={`${gridHeadCell} text-right`}>Unit Price</th>
                  <th className={`${gridHeadCell} text-right`}>PER KG</th>
                  <th className={`${gridHeadCell} text-right`}>Sell Price</th>
                  <th className={`${gridHeadCell} text-right`}>Total Unit Price</th>
                  <th className={`${gridHeadCell} text-right`}>Total Product Price</th>
                  <th className={`${gridHeadCell} text-right`}>Weight Unit</th>
                  <th className={`${gridHeadCell} text-right`}>Total Weight</th>
                  <th className={`${gridHeadCell} text-right`}>Total Weight Amount</th>
                  <th className={`${gridHeadCell} text-right`}>Total Purchase Price</th>
                  <th className={gridHeadCell}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={16} className="py-6 text-center text-gray-400">No item added yet</td>
                  </tr>
                )}
                {items.map((item, index) => (
                  <tr key={item.product_id} className="text-gray-700 dark:text-gray-300">
                    <td className={gridCell}>{index + 1}</td>
                    <td className={gridCell}>{item.location_name}</td>
                    <td className={gridCell}>{item.product_name}</td>
                    <td className={`${gridCell} font-medium`}>{item.part_number}</td>
                    <td className={gridCell}>{item.unit}</td>
                    <td className={`${gridCell} text-right`}>{item.qty}</td>
                    <td className={`${gridCell} text-right`}>{formatMoney(item.unit_price)}</td>
                    <td className={`${gridCell} text-right`}>{formatMoney(item.per_kg)}</td>
                    <td className={`${gridCell} text-right`}>{formatMoney(item.sell_price)}</td>
                    <td className={`${gridCell} text-right`}>{formatMoney(item.total_unit_price)}</td>
                    <td className={`${gridCell} text-right`}>{formatMoney(item.total_product_price)}</td>
                    <td className={`${gridCell} text-right`}>{item.weight_unit}</td>
                    <td className={`${gridCell} text-right`}>{item.total_weight}</td>
                    <td className={`${gridCell} text-right`}>{formatMoney(item.total_weight_amount)}</td>
                    <td className={`${gridCell} text-right font-semibold`}>{formatMoney(item.total_purchase_price)}</td>
                    <td className={gridCell}>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => form.removeItem(index)}
                        className="rounded p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <FiTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                    <td colSpan={14} className="px-2 py-2 text-right">Grand Total</td>
                    <td className="px-2 py-2 text-right">{formatMoney(form.grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Section>

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start">
          <Button type="button" onClick={form.savePurchase} disabled={form.saving}>
            {saveLabel}
          </Button>
        </div>
      </div>

      <PurchaseVoucher purchaseId={form.savedId} onClose={() => form.setSavedId(null)} />
    </div>
  );
}

export default function PurchasePage() {
  return (
    <AccessRoute requiredPermissions={["purchase.create", "purchase.edit"]}>
      <Suspense fallback={null}>
        <PurchaseForm />
      </Suspense>
    </AccessRoute>
  );
}
