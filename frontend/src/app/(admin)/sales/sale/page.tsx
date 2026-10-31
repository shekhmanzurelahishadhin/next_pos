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
  const editId = Number(useSearchParams().get("id")) || null;
  const f = useSaleForm(editId);
  const { header, entry, items, options } = f;
  const companyLocked = items.length > 0; // parts_bazar locks the company once items are in the grid
  const item = entry.item;

  useEffect(() => {
    document.title = `${editId ? "Edit Sale" : "Sales Form"} | Multibrand POS`;
  }, [editId]);

  const enterAdds = (e: React.KeyboardEvent) => e.key === "Enter" && (e.preventDefault(), f.addItem());

  return (
    <div>
      <PageBreadcrumb items={[{ title: "Sales" }, { title: editId ? "Edit Sale" : "Sales Form" }]} />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Section title="Order No & Date">
            <div className="space-y-2.5">
              <Row label="Order Date" required>
                <DatePicker id="order_date" defaultDate={header.order_date} onChange={f.changeDate} />
              </Row>
              <Row label="Cash / Due" required>
                <ReactSelect options={options?.cash_due ?? []} placeholder="Select" value={header.cash_due} onChange={(v) => f.changeCashDue(String(v ?? ""))} />
              </Row>
              <Row label="Memo No">
                <input type="text" value={header.memo_no} onChange={(e) => f.setHeaderField("memo_no", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Customer Due">
                <div className={`${readOnlyClass} flex items-center justify-end`}>{header.customer_due === null ? "" : formatMoney(header.customer_due)}</div>
              </Row>
              <Row label="Due Limit Exceed Accept?">
                <ReactSelect options={DUE_LIMIT_OPTIONS} value={header.due_limit_exceed_accept} isClearable={false} onChange={(v) => f.setHeaderField("due_limit_exceed_accept", String(v ?? "1"))} />
              </Row>
              <Row label="Company" required>
                <ReactSelect options={f.companies} placeholder="Select" value={header.company_id} isDisabled={companyLocked} onChange={(v) => f.setHeaderField("company_id", String(v ?? ""))} />
              </Row>
            </div>
          </Section>

          <Section title="Customer">
            <div className="space-y-2.5">
              <Row label="Customer" required>
                <Autocomplete
                  value={header.customer_text}
                  onChange={(text) => {
                    f.setHeaderField("customer_text", text);
                    f.setHeaderField("customer_id", null);
                  }}
                  canSearch={f.canSearchCustomer}
                  search={(term) => saleService.searchCustomers(term)}
                  onSelect={f.selectCustomer}
                  placeholder="Type customer name or phone"
                  renderItem={(c) => (
                    <div className="flex justify-between gap-3">
                      <span>{c.name}{c.phone && <span className="text-gray-400"> ({c.phone})</span>}</span>
                      <span className="text-xs text-gray-500">Due {formatMoney(c.due)}</span>
                    </div>
                  )}
                />
              </Row>
              <Row label="Mobile No">
                <input readOnly tabIndex={-1} value={header.mobile_no} className={readOnlyClass} />
              </Row>
              <Row label="Car Name & Model">
                <input type="text" value={header.car_name} onChange={(e) => f.setHeaderField("car_name", e.target.value)} className={inputClass} />
              </Row>
              <Row label="Car No">
                <input type="text" value={header.car_no} onChange={(e) => f.setHeaderField("car_no", e.target.value)} className={inputClass} />
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
                  {formatMoney(f.grandTotal)}
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
                  onChange={(e) => f.setHeaderField("received_amount", e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={`${inputClass} text-right`}
                />
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
            <table className="w-full min-w-[1300px] text-[13px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  {["Store", "Location", "Product Name", "Part Number", "Unit", "Closing Stock", "Barcode No", "Qty", "P/P", "Price", "Reset", "Action"].map((h) => (
                    <th key={h} className="px-1 pb-1.5 font-medium">{h}</th>
                  ))}
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
                      inputRef={f.barcodeRef}
                      value={entry.barcode_text}
                      onChange={(text) => f.setEntry((e) => ({ ...e, barcode_text: text, item: null }))}
                      canSearch={f.canSearchBarcode}
                      search={(term) => saleService.searchBarcodes(term, Number(header.company_id), editId)}
                      onSelect={f.selectBarcode}
                      placeholder="Barcode"
                      renderItem={(b) => (
                        <div>
                          <div className="font-medium">{b.barcode}</div>
                          <div className="text-xs text-gray-500">{b.product_name} · {b.part_number} · Stock {b.stock}</div>
                        </div>
                      )}
                    />
                  </td>
                  <td className="w-[80px] px-1">
                    <input
                      ref={f.qtyRef}
                      type="number"
                      min="0"
                      step="1"
                      value={entry.qty}
                      onChange={(e) => f.changeEntryQty(e.target.value)}
                      onKeyDown={enterAdds}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
                      onChange={(e) => f.setEntryField("sell_price", e.target.value)}
                      onKeyDown={enterAdds}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="w-[70px] px-1">
                    <Button type="button" size="sm" variant="outline" onClick={f.resetEntry} className="h-9 w-full px-2">Reset</Button>
                  </td>
                  <td className="w-[70px] px-1">
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
            <table className="w-full min-w-[1100px] text-[13px]">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  {["SL", "Store", "Location", "Item", "Barcode", "Part Number", "Unit", "Stock", "Qty", "Price", "Amount", "Action"].map((h, i) => (
                    <th key={h} className={`px-2 py-2 font-medium ${i >= 7 && i <= 10 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {items.length === 0 ? (
                  <tr><td colSpan={12} className="py-6 text-center text-gray-400">No item added yet</td></tr>
                ) : (
                  items.map((row, i) => (
                    <tr key={row.barcode} className="text-gray-700 dark:text-gray-300">
                      <td className="px-2 py-1.5">{i + 1}</td>
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
                        <input type="number" min="1" step="1" value={row.qty} onChange={(e) => f.changeItem(i, "qty", e.target.value)}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()} className={`${inputClass} h-8 text-right`} />
                      </td>
                      <td className="w-[110px] px-2 py-1">
                        <input type="number" min="0" step="any" value={row.sell_price} onChange={(e) => f.changeItem(i, "sell_price", e.target.value)}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()} className={`${inputClass} h-8 text-right`} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold">{formatMoney(lineAmount(row))}</td>
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
                    <td colSpan={10} className="px-2 py-2 text-right">Grand Total</td>
                    <td className="px-2 py-2 text-right">{formatMoney(f.grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Section>

        {/* on the left, so the bottom-right messages never cover it */}
        <div className="flex justify-start gap-3">
          <Button type="button" onClick={f.saveSale} disabled={f.saving}>
            {f.saving ? "Saving..." : editId ? "Update SO" : "Create SO"}
          </Button>
          {!editId && (
            <Button type="button" variant="outline" onClick={f.cancelForm} disabled={f.saving}>Cancel</Button>
          )}
        </div>
      </div>

      <SaleInvoice saleId={f.savedId} onClose={() => f.setSavedId(null)} />
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
