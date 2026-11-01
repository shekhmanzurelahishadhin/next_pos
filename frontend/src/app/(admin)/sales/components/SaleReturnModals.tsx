"use client";
// Return form and return chalan, like parts_bazar sellDelivery/_returnForm and sellReturn/return_chalan
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { saleReturnService, SaleReturnForm } from "@/services/saleReturnService";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const readOnlyClass =
  "flex h-9 w-full items-center rounded-md bg-gray-100 px-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300";

const today = () => new Date().toISOString().slice(0, 10);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3">
      <Label className="mb-0">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

interface SaleReturnFormModalProps {
  saleId: number | null;
  onClose: () => void;
  onSaved: (returnId: number) => void;
}

export function SaleReturnFormModal({ saleId, onClose, onSaved }: SaleReturnFormModalProps) {
  const [form, setForm] = useState<SaleReturnForm | null>(null);
  const [qty, setQty] = useState<Record<number, string>>({}); // return qty by sale_detail_id
  const [returnDate, setReturnDate] = useState(today());
  const [remarks, setRemarks] = useState("");
  const [isRefund, setIsRefund] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(null);
    setQty({});
    setReturnDate(today());
    setRemarks("");
    setIsRefund(false);
    if (!saleId) return;
    saleReturnService.getForm(saleId)
      .then(setForm)
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to load return form");
        onClose();
      });
  }, [saleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeDate = useCallback((_dates: Date[], dateStr: string) => setReturnDate(dateStr), []);

  // parts_bazar calculateGridInLine: return qty can not pass the remaining qty
  const changeQty = (detailId: number, value: string, remaining: number) => {
    const n = parseInt(value);
    if (value !== "" && (isNaN(n) || n < 0 || n > remaining)) {
      toast.error("Return qty exceeded!");
      setQty((q) => ({ ...q, [detailId]: "" }));
      return;
    }
    setQty((q) => ({ ...q, [detailId]: value }));
  };

  const lineQty = (detailId: number) => parseInt(qty[detailId] ?? "") || 0;
  const totalAmount = form?.items.reduce((sum, item) => sum + item.sell_price * lineQty(item.sale_detail_id), 0) ?? 0;

  const save = async () => {
    if (!form) return;
    if (!returnDate) return toast.error("Please select return date!");
    if (!form.items.some((item) => lineQty(item.sale_detail_id) > 0)) return toast.error("Please enter return qty!");

    try {
      setSaving(true);
      const saved = await saleReturnService.createReturn({
        sale_id: form.sale_id,
        return_date: returnDate,
        is_refund: isRefund,
        remarks: remarks || undefined,
        items: form.items.map((item) => ({ sale_detail_id: item.sale_detail_id, return_qty: lineQty(item.sale_detail_id) })),
      });
      toast.success(`Successfully Returned (${saved.return_no})`);
      onSaved(saved.id);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const first = errors && Object.values(errors)[0];
      toast.error((Array.isArray(first) ? first[0] : null) || err?.response?.data?.message || "Return not saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!saleId}
      onClose={onClose}
      className="max-w-5xl"
      title="Return Form"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || !form}>{saving ? "Saving..." : "Return"}</Button>
        </>
      }
    >
      {!form ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="SO No"><div className={`${readOnlyClass} font-semibold`}>{form.so_no}</div></Field>
            <Field label="Customer"><div className={readOnlyClass}>{form.customer_name}</div></Field>
            <Field label="Memo No"><div className={readOnlyClass}>{form.memo_no || ""}</div></Field>
            <Field label="Order Date"><div className={readOnlyClass}>{form.order_date}</div></Field>
            <Field label="Return Date">
              <DatePicker id="sale_return_date" defaultDate={returnDate} onChange={changeDate} />
            </Field>
            <Field label="Remarks">
              <input type="text" maxLength={255} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Is Refund">
              <label className="flex h-9 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={isRefund} onChange={(e) => setIsRefund(e.target.checked)} className="h-4 w-4" />
                Money paid back to the customer
              </label>
            </Field>
            {isRefund && (
              <Field label="Refund Amount"><div className={`${readOnlyClass} justify-end font-semibold`}>{formatMoney(totalAmount)}</div></Field>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {["SL", "Store", "Location", "Product Name", "Part Number", "Barcode", "Sales Qty", "Old Return Qty", "Return Qty", "Remaining Qty", "Sell Price", "Amount"].map((h) => (
                    <th key={h} className="px-2 py-2 text-center font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-center text-gray-700 dark:divide-white/[0.05] dark:text-gray-300">
                {form.items.map((item, i) => {
                  const remaining = item.sold_qty - item.returned_qty;
                  const q = lineQty(item.sale_detail_id);
                  return (
                    <tr key={item.sale_detail_id}>
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5">{item.store_name}</td>
                      <td className="px-2 py-1.5">{item.location_name}</td>
                      <td className="px-2 py-1.5">{item.product_name}</td>
                      <td className="px-2 py-1.5 font-medium">{item.part_number}</td>
                      <td className="px-2 py-1.5 text-xs">{item.barcode}</td>
                      <td className="px-2 py-1.5">{item.sold_qty}</td>
                      <td className="px-2 py-1.5">{item.returned_qty}</td>
                      <td className="w-[90px] px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={qty[item.sale_detail_id] ?? ""}
                          disabled={remaining <= 0}
                          onChange={(e) => changeQty(item.sale_detail_id, e.target.value, remaining)}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          className={`${inputClass} text-center disabled:bg-gray-100 dark:disabled:bg-gray-800`}
                        />
                      </td>
                      <td className="px-2 py-1.5">{remaining - q}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.sell_price)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(item.sell_price * q)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                  <td colSpan={11} className="px-2 py-2 text-right">Total Return Amount</td>
                  <td className="px-2 py-2 text-right">{formatMoney(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

const PRINT_STYLE = `
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h2 { margin: 0; font-size: 18px; } h3 { margin: 4px 0 12px; font-size: 14px; font-weight: normal; }
  .text-center { text-align: center; } .text-right { text-align: right; }
  .info { display: flex; justify-content: space-between; margin: 12px 0; gap: 24px; }
  .info table td { padding: 2px 8px 2px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.items th, table.items td { border: 1px solid #999; padding: 4px 6px; }
  table.items th { background: #eee; }
  .sign { display: flex; justify-content: space-between; margin-top: 60px; }
  .sign span { border-top: 1px solid #333; padding-top: 4px; width: 160px; text-align: center; }
`;

const cell = "border border-gray-200 px-2 py-1 dark:border-gray-700";

// "SALES RETURN" chalan: shown after saving and from Sales Return Manage
export function SaleReturnChalanModal({ returnId, onClose }: { returnId: number | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null);
    if (returnId) saleReturnService.getReturn(returnId).then(setData).catch(() => toast.error("Failed to load return"));
  }, [returnId]);

  const print = () => {
    if (printArea.current) printHtml(data?.return_no ?? "Return", printArea.current.innerHTML, PRINT_STYLE);
  };

  const r = data;

  return (
    <Modal
      isOpen={!!returnId}
      onClose={onClose}
      className="max-w-4xl"
      title="Sales Return Chalan"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!r}>Print</Button>
        </>
      }
    >
      {!r ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{r.company?.name ?? "Sales Return"}</h2>
            {r.company?.address && <div className="text-xs text-gray-500">{r.company.address}</div>}
            {r.company?.phone && <div className="text-xs text-gray-500">Phone No: {r.company.phone}</div>}
            <h3 className="mt-1 text-sm font-semibold">SALES RETURN</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Customer Name</td><td className="font-semibold">{r.customer?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Contact Number</td><td>{r.customer?.phone || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Address</td><td>{r.customer?.address || "-"}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Return No</td><td className="font-semibold">{r.return_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Return Date</td><td>{formatDate(r.return_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Invoice No</td><td>{r.sale?.so_no}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {["SL", "Location", "Items Name", "Barcode", "Sales Qty", "Return Qty", "Return Amount"].map((h) => (
                  <th key={h} className={`${cell} text-left font-medium`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.details.map((d: any, i: number) => (
                <tr key={d.id}>
                  <td className={cell}>{i + 1}</td>
                  <td className={cell}>{d.location?.name}</td>
                  <td className={cell}>{d.product?.name}</td>
                  <td className={cell}>{d.barcode}</td>
                  <td className={`${cell} text-right`}>{Number(d.sale_detail?.qty ?? 0)} {d.sale_detail?.unit ?? ""}</td>
                  <td className={`${cell} text-right`}>{Number(d.return_qty)} {d.sale_detail?.unit ?? ""}</td>
                  <td className={`${cell} text-right`}>{formatMoney(d.total_price)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className={`${cell} text-right font-semibold`}>Total Return Amount</td>
                <td className={`${cell} text-right font-semibold`}>{formatMoney(r.total_amount)}</td>
              </tr>
              <tr>
                <td colSpan={6} className={`${cell} text-right font-semibold`}>Refund Amount</td>
                <td className={`${cell} text-right font-semibold`}>{formatMoney(r.refund_amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {r.created_by?.name ?? ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Received By</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
