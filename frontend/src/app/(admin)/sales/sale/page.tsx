"use client";
import { Suspense, useEffect } from "react";
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
import { saleService } from "@/services/saleService";
import { lineAmount, useSaleForm } from "./hooks/useSaleForm";
import { SaleInvoice } from "../components/SaleInvoice";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";
const readOnlyClass =
  "h-9 w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

const DUE_LIMIT_OPTIONS = [
  { value: "1", label: "Yes" },
  { value: "2", label: "No" },
];

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
    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
      <Label className="mb-0" required={required}>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function SaleForm() {
  // ?id=12 opens sale 12 to edit
  const idInUrl = Number(useSearchParams().get("id"));
  const editId = idInUrl > 0 ? idInUrl : null;

  const form = useSaleForm(editId);
  const { header, entry, items, options } = form;
  const companyLocked = items.length > 0; // parts_bazar locks the company once items are in the grid
  const item = entry.item;

  useEffect(() => {
    document.title = `${editId ? "Edit Sale" : "Sales Form"} | Multibrand POS`;
  }, [editId]);

  // Enter in a number box of the "Add" row works like the Add button
  function addOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      form.addItem();
    }
  }

  return (
    <div>
      <PageBreadcrumb items={[{ title: "Sales" }, { title: editId ? "Edit Sale" : "Sales Form" }]} />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Section title="Order No & Date">
            <div className="space-y-2.5">
              <Row label="Order Date" required>
                <DatePicker id="order_date" defaultDate={header.order_date} onChange={form.changeDate} />
              </Row>
              <Row label="Cash / Due" required>
                <ReactSelect options={options?.cash_due ?? []} placeholder="Select" value={header.cash_due} onChange={(value) => form.changeCashDue(value ? String(value) : "")} />
              </Row>
              <Row label="Memo No">
                <input type="text" value={header.memo_no} onChange={(e) => form.setHeaderField("memo_no", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Customer Due">
                <div className={`${readOnlyClass} flex items-center justify-end`}>{header.customer_due === null ? "" : formatMoney(header.customer_due)}</div>
              </Row>
              <Row label="Due Limit Exceed Accept?">
                <ReactSelect options={DUE_LIMIT_OPTIONS} value={header.due_limit_exceed_accept} isClearable={false} onChange={(value) => form.setHeaderField("due_limit_exceed_accept", value ? String(value) : "1")} />
              </Row>
              <Row label="Company" required>
                <ReactSelect options={form.companies} placeholder="Select" value={header.company_id} isDisabled={companyLocked} onChange={(value) => form.setHeaderField("company_id", value ? String(value) : "")} />
              </Row>
            </div>
          </Section>

          <Section title="Customer">
            <div className="space-y-2.5">
              <Row label="Customer" required>
                <Autocomplete
                  value={header.customer_text}
                  onChange={form.changeCustomerText}
                  canSearch={form.canSearchCustomer}
                  search={(term) => saleService.searchCustomers(term)}
                  onSelect={form.selectCustomer}
                  placeholder="Type customer name or phone"
                  renderItem={(customer) => (
                    <div className="flex justify-between gap-3">
                      <span>{customer.name}{customer.phone && <span className="text-gray-400"> ({customer.phone})</span>}</span>
                      <span className="text-xs text-gray-500">Due {formatMoney(customer.due)}</span>
                    </div>
                  )}
                />
              </Row>
              <Row label="Mobile No">
                <input readOnly tabIndex={-1} value={header.mobile_no} className={readOnlyClass} />
              </Row>
              <Row label="Car Name & Model">
                <input type="text" value={header.car_name} onChange={(e) => form.setHeaderField("car_name", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Car No">
                <input type="text" value={header.car_no} onChange={(e) => form.setHeaderField("car_no", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Due Limits">
                <div className={`${readOnlyClass} flex items-center justify-end`}>{header.due_limit === null ? "" : formatMoney(header.due_limit)}</div>
              </Row>
            </div>
          </Section>

          <Section title="Initials">
            <div className="space-y-2.5">
              <Row label="Grand Total">
                <div className="flex h-9 items-center justify-center rounded-md bg-gray-100 text-base font-bold text-success-600 dark:bg-gray-800 dark:text-success-400">
                  {formatMoney(form.grandTotal)}
                </div>
              </Row>
              <Row label="Received Type" required={header.cash_due === "1"}>
                <ReactSelect options={options?.received_type ?? []} value={header.received_type} isDisabled isClearable={false} onChange={() => {}} />
              </Row>
              <Row label="Received Amount">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={header.received_amount}
                  disabled={header.cash_due !== "1"}
                  onChange={(e) => form.setHeaderField("received_amount", e.target.value)}
                  onWheel={blurOnWheel}
                  className={`${inputClass} text-right`}
                />
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
            <table className="w-full min-w-[1300px] text-[13px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  <th className="px-1 pb-1.5 font-medium">Store</th>
                  <th className="px-1 pb-1.5 font-medium">Location</th>
                  <th className="px-1 pb-1.5 font-medium">Product Name</th>
                  <th className="px-1 pb-1.5 font-medium">Part Number</th>
                  <th className="px-1 pb-1.5 font-medium">Unit</th>
                  <th className="px-1 pb-1.5 font-medium">Closing Stock</th>
                  <th className="px-1 pb-1.5 font-medium">Barcode No</th>
                  <th className="px-1 pb-1.5 font-medium">Qty</th>
                  <th className="px-1 pb-1.5 font-medium">P/P</th>
                  <th className="px-1 pb-1.5 font-medium">Price</th>
                  <th className="px-1 pb-1.5 font-medium">Reset</th>
                  <th className="px-1 pb-1.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="w-[130px] px-1"><input readOnly tabIndex={-1} value={item?.store_name ?? ""} className={readOnlyClass} /></td>
                  <td className="w-[120px] px-1"><input readOnly tabIndex={-1} value={item?.location_name ?? ""} className={readOnlyClass} /></td>
                  <td className="w-[160px] px-1"><input readOnly tabIndex={-1} value={item?.product_name ?? ""} className={readOnlyClass} /></td>
                  <td className="w-[110px] px-1"><input readOnly tabIndex={-1} value={item?.part_number ?? ""} className={readOnlyClass} /></td>
                  <td className="w-[60px] px-1"><input readOnly tabIndex={-1} value={item?.unit ?? ""} className={readOnlyClass} /></td>
                  <td className="w-[80px] px-1"><input readOnly tabIndex={-1} value={item ? item.stock : ""} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[140px] px-1">
                    <Autocomplete
                      inputRef={form.barcodeRef}
                      value={entry.barcode_text}
                      onChange={form.changeBarcodeText}
                      canSearch={form.canSearchBarcode}
                      search={(term) => saleService.searchBarcodes(term, Number(header.company_id), editId)}
                      onSelect={form.selectBarcode}
                      placeholder="Barcode"
                      renderItem={(barcode) => (
                        <div>
                          <div className="font-medium">{barcode.barcode}</div>
                          <div className="text-xs text-gray-500">{barcode.product_name} · {barcode.part_number} · Stock {barcode.stock}</div>
                        </div>
                      )}
                    />
                  </td>
                  <td className="w-[80px] px-1">
                    <input
                      ref={form.qtyRef}
                      type="number"
                      min="0"
                      step="1"
                      value={entry.qty}
                      onChange={(e) => form.changeEntryQty(e.target.value)}
                      onKeyDown={addOnEnter}
                      onWheel={blurOnWheel}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="w-[90px] px-1"><input readOnly tabIndex={-1} value={item ? item.purchase_price : ""} className={`${readOnlyClass} text-right`} /></td>
                  <td className="w-[100px] px-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={entry.sell_price}
                      onChange={(e) => form.setEntryField("sell_price", e.target.value)}
                      onKeyDown={addOnEnter}
                      onWheel={blurOnWheel}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="w-[70px] px-1">
                    <Button type="button" size="sm" variant="outline" onClick={form.resetEntry} className="h-9 w-full px-2">Reset</Button>
                  </td>
                  <td className="w-[70px] px-1">
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
            <table className="w-full min-w-[1100px] text-[13px]">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-2 py-2 font-medium">SL</th>
                  <th className="px-2 py-2 font-medium">Store</th>
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">Barcode</th>
                  <th className="px-2 py-2 font-medium">Part Number</th>
                  <th className="px-2 py-2 font-medium">Unit</th>
                  <th className="px-2 py-2 font-medium text-right">Stock</th>
                  <th className="px-2 py-2 font-medium text-right">Qty</th>
                  <th className="px-2 py-2 font-medium text-right">Price</th>
                  <th className="px-2 py-2 font-medium text-right">Amount</th>
                  <th className="px-2 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {items.length === 0 && (
                  <tr><td colSpan={12} className="py-6 text-center text-gray-400">No item added yet</td></tr>
                )}
                {items.map((row, index) => (
                    <tr key={row.barcode} className="text-gray-700 dark:text-gray-300">
                      <td className="px-2 py-1.5">{index + 1}</td>
                      <td className="px-2 py-1.5">{row.store_name}</td>
                      <td className="px-2 py-1.5">{row.location_name}</td>
                      <td className="px-2 py-1.5">
                        <div>{row.product_name}</div>
                        <div className="text-xs text-gray-400">Code: {row.part_number} · Unit: {row.unit ?? "-"}</div>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs">{row.barcode}</td>
                      <td className="px-2 py-1.5 font-medium">{row.part_number}</td>
                      <td className="px-2 py-1.5">{row.unit}</td>
                      <td className="px-2 py-1.5 text-right">{row.stock}</td>
                      <td className="w-[90px] px-2 py-1">
                        <input type="number" min="1" step="1" value={row.qty} onChange={(e) => form.changeItem(index, "qty", e.target.value)}
                          onWheel={blurOnWheel} className={`${inputClass} h-8 text-right`} />
                      </td>
                      <td className="w-[110px] px-2 py-1">
                        <input type="number" min="0" step="any" value={row.sell_price} onChange={(e) => form.changeItem(index, "sell_price", e.target.value)}
                          onWheel={blurOnWheel} className={`${inputClass} h-8 text-right`} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold">{formatMoney(lineAmount(row))}</td>
                      <td className="px-2 py-1.5">
                        <button type="button" title="Remove" onClick={() => form.removeItem(index)} className="rounded p-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10">
                          <FiTrash size={14} />
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                    <td colSpan={10} className="px-2 py-2 text-right">Grand Total</td>
                    <td className="px-2 py-2 text-right">{formatMoney(form.grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Section>

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start gap-3">
          <Button type="button" onClick={form.saveSale} disabled={form.saving}>
            {form.saving ? "Saving..." : editId ? "Update SO" : "Create SO"}
          </Button>
          {!editId && (
            <Button type="button" variant="outline" onClick={form.cancelForm} disabled={form.saving}>Cancel</Button>
          )}
        </div>
      </div>

      <SaleInvoice saleId={form.savedId} onClose={() => form.setSavedId(null)} />
    </div>
  );
}

export default function SalePage() {
  return (
    <AccessRoute requiredPermissions={["sale.create", "sale.edit"]}>
      <Suspense fallback={null}>
        <SaleForm />
      </Suspense>
    </AccessRoute>
  );
}
