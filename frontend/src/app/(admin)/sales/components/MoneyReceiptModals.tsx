"use client";
// Money receipt form and MR voucher, like parts_bazar moneyReceipt/_addMoneyReceiptForm and voucherPreview
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { ADJUSTMENT, BANK_TYPES, distributeLot, PAYMENT_TYPES, paymentTypeName, toNum } from "@/lib/payment";
import { moneyReceiptService, MrForm } from "@/services/moneyReceiptService";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";
const readOnlyClass =
  "flex h-9 w-full items-center rounded-md bg-gray-100 px-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300";

const today = () => new Date().toISOString().slice(0, 10);

// what is typed on one invoice row
type LineInput = { amount: string; discount: string; vds: string; tds: string };
const EMPTY_LINE: LineInput = { amount: "", discount: "", vds: "", tds: "" };
const lineTotal = (l: LineInput) => toNum(l.amount) + toNum(l.discount) + toNum(l.vds) + toNum(l.tds);

export const orderLabel = (orderNo: string) => (orderNo === "ob" ? "Opening" : orderNo === "advance" ? "Advance" : orderNo);

// bordered block with a title, like the Sales Form sections
function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <h4 className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">{title}</h4>
      <div className="space-y-2.5 p-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3">
      <Label className="mb-0">{label}{required && <span className="text-error-500"> *</span>}</Label>
      <div>{children}</div>
    </div>
  );
}

interface MoneyReceiptFormModalProps {
  customerId: number | null;
  onClose: () => void;
  onSaved: (mrNo: string) => void;
}

export function MoneyReceiptFormModal({ customerId, onClose, onSaved }: MoneyReceiptFormModalProps) {
  const [form, setForm] = useState<MrForm | null>(null);
  const [date, setDate] = useState(today());
  const [receivedType, setReceivedType] = useState("");
  const [bankName, setBankName] = useState("");
  const [customerBankName, setCustomerBankName] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [lot, setLot] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<LineInput[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(null);
    setDate(today());
    setReceivedType("");
    setBankName("");
    setCustomerBankName("");
    setChequeNo("");
    setChequeDate("");
    setLot("");
    setRemarks("");
    setLines([]);
    if (!customerId) return;
    moneyReceiptService.getForm(customerId)
      .then((data) => {
        setForm(data);
        setLines(data.lines.map(() => ({ ...EMPTY_LINE })));
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to load money receipt form");
        onClose();
      });
  }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeDate = useCallback((_d: Date[], dateStr: string) => setDate(dateStr), []);
  const changeChequeDate = useCallback((_d: Date[], dateStr: string) => setChequeDate(dateStr), []);

  const totalDue = form?.lines.reduce((sum, l) => sum + l.due, 0) ?? 0;
  const sum = (field: keyof LineInput) => lines.reduce((s, l) => s + toNum(l[field]), 0);
  const received = sum("amount");
  const isCash = receivedType === "1";
  const isAdjustment = receivedType === ADJUSTMENT;
  const noBank = isCash || isAdjustment;
  // an Adjustment uses old advance, so it never makes a new one
  const advance = isAdjustment ? 0 : Math.max(0, toNum(lot) - received);
  const bankOptions = (form?.banks ?? []).map((name) => ({ value: name, label: name }));

  // parts_bazar: picking the receive type clears the rows and puts the whole due
  // (for Adjustment the advance balance) as lot amount
  const changeReceivedType = (value: string) => {
    setReceivedType(value);
    setLines((list) => list.map(() => ({ ...EMPTY_LINE })));
    if (value === ADJUSTMENT) {
      const balance = form?.advance_balance ?? 0;
      if (balance <= 0) toast.error("This customer has no advance to adjust");
      setLot(balance > 0 ? String(balance) : "");
    } else {
      setLot(totalDue > 0 ? String(totalDue) : "");
    }
    if (value === "1" || value === ADJUSTMENT) {
      setBankName("");
      setCustomerBankName("");
      setChequeNo("");
      setChequeDate("");
    }
  };

  const distribute = () => {
    if (!receivedType) return toast.error("Select Receive Type");
    if (!form) return;
    const { amounts } = distributeLot(form.lines.map((l) => l.due), toNum(lot));
    setLines(amounts.map((amount) => ({ ...EMPTY_LINE, amount: amount > 0 ? String(amount) : "" })));
  };

  // parts_bazar: the adjustment amount can not pass the advance balance
  const changeLot = (value: string) => {
    if (isAdjustment && toNum(value) > (form?.advance_balance ?? 0)) {
      toast.error("Adjustment amount exceeded the advance amount.");
      setLot(String(form?.advance_balance ?? 0));
      return;
    }
    setLot(value);
  };

  // parts_bazar calculateAmount: a row can not take more than its due
  const changeLine = (index: number, field: keyof LineInput, value: string) => {
    if (!receivedType) return toast.error("Select Receive Type.");
    const next = lines.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    if (form && lineTotal(next[index]) > form.lines[index].due) {
      toast.error("Amount can not be more than the due amount");
      next[index] = { ...EMPTY_LINE };
    }
    const nextReceived = next.reduce((s, l) => s + toNum(l.amount), 0);
    if (isAdjustment && nextReceived > toNum(lot)) {
      toast.error("Adjustment amount exceeded the advance amount.");
      next[index] = { ...EMPTY_LINE };
    } else if (nextReceived > toNum(lot)) {
      setLot(String(+nextReceived.toFixed(2)));
    }
    setLines(next);
  };

  const save = async () => {
    if (!form) return;
    if (!date) return toast.error("Please select a Date");
    if (!receivedType) return toast.error("Please select a Receive Type");
    if (lot === "") return toast.error("Lot amount cannot be blank");
    if (BANK_TYPES.includes(receivedType) && !bankName.trim()) return toast.error("Please select a Bank Name");
    if (received <= 0 && advance <= 0 && !lines.some((l) => lineTotal(l) > 0)) return toast.error("Please insert amount!");

    try {
      setSaving(true);
      const saved = await moneyReceiptService.createReceipt({
        customer_id: form.customer_id,
        receipt_date: date,
        received_type: receivedType,
        lot_amount: toNum(lot),
        bank_name: bankName || undefined,
        customer_bank_name: customerBankName || undefined,
        cheque_no: chequeNo || undefined,
        cheque_date: chequeDate || undefined,
        remarks: remarks || undefined,
        lines: form.lines.map((l, i) => ({
          sale_id: l.sale_id,
          amount: toNum(lines[i]?.amount),
          discount: toNum(lines[i]?.discount),
          vds: toNum(lines[i]?.vds),
          tds: toNum(lines[i]?.tds),
        })),
      });
      toast.success(`Money receipt saved (${saved.mr_no})`);
      onSaved(saved.mr_no);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const first = errors && Object.values(errors)[0];
      toast.error((Array.isArray(first) ? first[0] : null) || err?.response?.data?.message || "Money receipt not saved");
    } finally {
      setSaving(false);
    }
  };

  const numInput = (index: number, field: keyof LineInput) => (
    <input
      type="number"
      min="0"
      value={lines[index]?.[field] ?? ""}
      readOnly={!receivedType}
      onChange={(e) => changeLine(index, field, e.target.value)}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      className={`${inputClass} text-right`}
    />
  );

  return (
    <Modal
      isOpen={!!customerId}
      onClose={onClose}
      className="max-w-6xl"
      title="Create Money Receipt"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || !form}>{saving ? "Saving..." : "Create MR"}</Button>
        </>
      }
    >
      {!form ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Box title="Customer Information">
              <Field label="Customer"><div className={`${readOnlyClass} font-semibold`}>{form.name}</div></Field>
              <Field label="Address"><div className={readOnlyClass}>{form.address || ""}</div></Field>
              <Field label="Phone"><div className={readOnlyClass}>{form.phone || ""}</div></Field>
              <Field label="Date" required>
                <DatePicker id="mr_date" defaultDate={date} onChange={changeDate} />
              </Field>
              <Field label="Customer Due"><div className={`${readOnlyClass} font-semibold`}>{formatMoney(form.total_due)}</div></Field>
            </Box>
            <Box title="Receive Information">
              <Field label="Receive Type" required>
                <ReactSelect options={PAYMENT_TYPES} placeholder="Select" value={receivedType} isClearable={false} onChange={(v) => changeReceivedType(String(v ?? ""))} />
              </Field>
              <Field label="Bank Name" required={BANK_TYPES.includes(receivedType)}>
                <ReactSelect
                  options={bankOptions}
                  placeholder={bankOptions.length ? "Select" : "No bank yet (Configure > Lookups, type bank_name)"}
                  value={bankName || null}
                  isDisabled={noBank}
                  onChange={(v) => setBankName(String(v ?? ""))}
                />
              </Field>
              <Field label="Customer Bank Name">
                <input type="text" maxLength={255} value={customerBankName} disabled={noBank} onChange={(e) => setCustomerBankName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Cheque No">
                <input type="text" maxLength={255} value={chequeNo} disabled={noBank} onChange={(e) => setChequeNo(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Cheque Date">
                {noBank
                  ? <div className={readOnlyClass} />
                  : <DatePicker id="mr_cheque_date" defaultDate={chequeDate || undefined} onChange={changeChequeDate} />}
              </Field>
              <Field label={isAdjustment ? "Adjustment Amount" : "Lot Amount"} required>
                <div className="flex gap-2">
                  <input type="number" min="0" value={lot} onChange={(e) => changeLot(e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} className={`${inputClass} text-right`} />
                  <Button type="button" size="sm" variant="outline" onClick={distribute}>Distribute</Button>
                </div>
              </Field>
              <Field label="Advanced Amount"><div className={`${readOnlyClass} justify-end font-semibold text-error-500`}>{formatMoney(advance)}</div></Field>
              <Field label="Advance Balance"><div className={`${readOnlyClass} justify-end`}>{formatMoney(form.advance_balance)}</div></Field>
            </Box>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full min-w-[1000px] text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {["SL", "SO No", "Memo No", "Order Date", "Bill Amount", "Previous Received", "Due Amount", "Amount", "Discount", "VDS", "TDS", "Total Amount", "Balance"].map((h) => (
                    <th key={h} className="px-2 py-2 text-center font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-center text-gray-700 dark:divide-white/[0.05] dark:text-gray-300">
                {form.lines.length === 0 && (
                  <tr><td colSpan={13} className="py-4 text-gray-400">No due invoice. The whole lot amount is saved as advance.</td></tr>
                )}
                {form.lines.map((l, i) => {
                  const total = lineTotal(lines[i] ?? EMPTY_LINE);
                  return (
                    <tr key={l.sale_id ?? "ob"}>
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5 font-medium">{orderLabel(l.order_no)}</td>
                      <td className="px-2 py-1.5">{l.memo_no}</td>
                      <td className="px-2 py-1.5">{l.order_date ? formatDate(l.order_date) : ""}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(l.bill_amount)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(l.prev_received)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatMoney(l.due)}</td>
                      <td className="w-[100px] px-1 py-1.5">{numInput(i, "amount")}</td>
                      <td className="w-[85px] px-1 py-1.5">{numInput(i, "discount")}</td>
                      <td className="w-[75px] px-1 py-1.5">{numInput(i, "vds")}</td>
                      <td className="w-[75px] px-1 py-1.5">{numInput(i, "tds")}</td>
                      <td className="px-2 py-1.5 text-right">{total > 0 ? formatMoney(total) : ""}</td>
                      <td className="px-2 py-1.5 text-right">{total > 0 ? formatMoney(l.due - total) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-right font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                  <td colSpan={4} className="px-2 py-2 text-left">Total</td>
                  <td className="px-2 py-2">{formatMoney(form.lines.reduce((s, l) => s + l.bill_amount, 0))}</td>
                  <td className="px-2 py-2">{formatMoney(form.lines.reduce((s, l) => s + l.prev_received, 0))}</td>
                  <td className="px-2 py-2">{formatMoney(totalDue)}</td>
                  <td className="px-2 py-2">{formatMoney(received)}</td>
                  <td className="px-2 py-2">{formatMoney(sum("discount"))}</td>
                  <td className="px-2 py-2">{formatMoney(sum("vds"))}</td>
                  <td className="px-2 py-2">{formatMoney(sum("tds"))}</td>
                  <td className="px-2 py-2">{formatMoney(lines.reduce((s, l) => s + lineTotal(l), 0))}</td>
                  <td className="px-2 py-2">{formatMoney(totalDue - lines.reduce((s, l) => s + lineTotal(l), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <Field label="Note">
            <input type="text" maxLength={255} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

const PRINT_STYLE = `
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h2 { margin: 0; font-size: 18px; } h3 { margin: 4px 0 12px; font-size: 14px; }
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

// MR voucher: shown after saving and from Manage Money Receipt
export function MoneyReceiptVoucherModal({ mrNo, onClose }: { mrNo: string | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null);
    if (mrNo) moneyReceiptService.getReceipt(mrNo).then(setData).catch(() => toast.error("Failed to load money receipt"));
  }, [mrNo]);

  const print = () => {
    if (printArea.current) printHtml(data?.mr_no ?? "Money Receipt", printArea.current.innerHTML, PRINT_STYLE);
  };

  const r = data;
  const total = (field: string) => r?.lines.reduce((s: number, l: any) => s + Number(l[field] ?? 0), 0) ?? 0;

  return (
    <Modal
      isOpen={!!mrNo}
      onClose={onClose}
      className="max-w-4xl"
      title="Money Receipt"
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
            <h2 className="text-lg font-semibold">{r.company?.name ?? "Money Receipt"}</h2>
            {r.company?.address && <div className="text-xs text-gray-500">{r.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold">MONEY RECEIPT</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Received From</td><td className="font-semibold">{r.customer?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Contact Number</td><td>{r.customer?.phone || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Address</td><td>{r.customer?.address || "-"}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">MR No</td><td className="font-semibold">{r.mr_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(r.receipt_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Receive Type</td><td>{paymentTypeName(r.received_type)}</td></tr>
                {r.bank_name && <tr><td className="pr-3 text-gray-500">Bank</td><td>{r.bank_name}{r.cheque_no ? ` / Cheque ${r.cheque_no}` : ""}{r.cheque_date ? ` (${formatDate(r.cheque_date)})` : ""}</td></tr>}
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {["SL", "SO No", "Bill Amount", "Previous Received", "Due Amount", "Amount", "Discount", "VDS", "TDS"].map((h) => (
                  <th key={h} className={`${cell} text-left font-medium`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l: any, i: number) => (
                <tr key={l.id}>
                  <td className={cell}>{i + 1}</td>
                  <td className={cell}>{orderLabel(l.order_no)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(l.bill_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(l.prev_received_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(l.receivable_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(l.amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(l.discount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(l.vds)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(l.tds)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td colSpan={5} className={`${cell} text-right`}>Total</td>
                <td className={`${cell} text-right`}>{formatMoney(total("amount"))}</td>
                <td className={`${cell} text-right`}>{formatMoney(total("discount"))}</td>
                <td className={`${cell} text-right`}>{formatMoney(total("vds"))}</td>
                <td className={`${cell} text-right`}>{formatMoney(total("tds"))}</td>
              </tr>
            </tbody>
          </table>
          {r.remarks && <p className="mt-2 text-xs">Note: {r.remarks}</p>}

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {r.created_by?.name ?? ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Authorised Signature</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
