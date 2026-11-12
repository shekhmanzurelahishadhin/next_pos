"use client";
// Supplier payment form and payment voucher, like parts_bazar paymentReceipt/_addPaymentReceiptForm and voucherPreview
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { apiErrorMessage, blurOnWheel, Option, today } from "@/lib/options";
import { ADJUSTMENT, BANK_TYPES, distributeLot, PAYMENT_TYPES, paymentTypeName, toNum } from "@/lib/payment";
import { SpForm, supplierPaymentService } from "@/services/supplierPaymentService";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";
const readOnlyClass =
  "flex h-9 w-full items-center rounded-md bg-gray-100 px-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300";
const formHeadCell = "px-2 py-2 text-center font-medium";

const CASH = "1";

// what is typed on one PO row
type LineInput = { amount: string; discount: string };

function emptyLine(): LineInput {
  return { amount: "", discount: "" };
}

// one empty row for every due PO
function emptyLines(count: number): LineInput[] {
  const lines: LineInput[] = [];
  for (let i = 0; i < count; i++) {
    lines.push(emptyLine());
  }
  return lines;
}

// amount + discount of one row
function lineTotal(line: LineInput) {
  return toNum(line.amount) + toNum(line.discount);
}

// the PO no of the opening balance and advance lines is shown as a word
export function poLabel(poNo: string) {
  if (poNo === "ob") {
    return "Opening";
  }
  if (poNo === "advance") {
    return "Advance";
  }
  return poNo;
}

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
      <Label className="mb-0">
        {label}
        {required && <span className="text-error-500"> *</span>}
      </Label>
      <div>{children}</div>
    </div>
  );
}

interface SupplierPaymentFormModalProps {
  supplierId: number | null;
  onClose: () => void;
  onSaved: (slNo: string) => void;
}

export function SupplierPaymentFormModal({ supplierId, onClose, onSaved }: SupplierPaymentFormModalProps) {
  const [form, setForm] = useState<SpForm | null>(null);
  const [date, setDate] = useState(today());
  const [supplierMrNo, setSupplierMrNo] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [lot, setLot] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<LineInput[]>([]);
  const [saving, setSaving] = useState(false);

  // a new supplier: clear the form and load the due POs
  useEffect(() => {
    setForm(null);
    setDate(today());
    setSupplierMrNo("");
    setPaymentType("");
    setBankName("");
    setChequeNo("");
    setChequeDate("");
    setLot("");
    setRemarks("");
    setLines([]);
    if (!supplierId) {
      return;
    }
    supplierPaymentService.getForm(supplierId)
      .then((data) => {
        setForm(data);
        setLines(emptyLines(data.lines.length));
      })
      .catch((err) => {
        toast.error(apiErrorMessage(err, "Failed to load payment form"));
        onClose();
      });
  }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  // the date pickers need functions that do not change on every render
  const changeDate = useCallback((_dates: Date[], dateStr: string) => setDate(dateStr), []);
  const changeChequeDate = useCallback((_dates: Date[], dateStr: string) => setChequeDate(dateStr), []);

  // totals of the due POs and of what is typed
  let totalBill = 0;
  let totalPrevPaid = 0;
  let totalDue = 0;
  if (form) {
    for (const line of form.lines) {
      totalBill += line.bill_amount;
      totalPrevPaid += line.prev_paid;
      totalDue += line.due;
    }
  }
  let paid = 0;
  let discount = 0;
  for (const line of lines) {
    paid += toNum(line.amount);
    discount += toNum(line.discount);
  }

  const isAdjustment = paymentType === ADJUSTMENT;
  const noBank = paymentType === CASH || isAdjustment; // cash and adjustment have no bank / cheque

  // what is left of the lot is an advance; an Adjustment uses old advance, so it never makes a new one
  let advance = 0;
  if (!isAdjustment) {
    advance = Math.max(0, toNum(lot) - paid);
  }

  const advanceBalance = form ? form.advance_balance : 0;

  const bankOptions: Option[] = [];
  if (form) {
    for (const name of form.banks) {
      bankOptions.push({ value: name, label: name });
    }
  }

  // parts_bazar: picking the payment type clears the rows and puts the whole due as lot amount
  function changePaymentType(value: string) {
    setPaymentType(value);
    setLines(emptyLines(lines.length));

    if (value === ADJUSTMENT) {
      if (advanceBalance <= 0) {
        toast.error("This supplier has no advance to adjust");
        setLot("");
      } else {
        setLot(String(advanceBalance));
      }
    } else if (totalDue > 0) {
      setLot(String(totalDue));
    } else {
      setLot("");
    }

    if (value === CASH || value === ADJUSTMENT) {
      setBankName("");
      setChequeNo("");
      setChequeDate("");
    }
  }

  // "Distribute": share the lot over the due POs, oldest first
  function distribute() {
    if (lot === "") {
      toast.error("Select Lot Amount");
      return;
    }
    if (!paymentType) {
      toast.error("Select Payment Type");
      return;
    }
    if (BANK_TYPES.includes(paymentType) && !bankName.trim()) {
      toast.error("Select Bank Name");
      return;
    }
    if (!form) {
      return;
    }

    const dues: number[] = [];
    for (const line of form.lines) {
      dues.push(line.due);
    }
    const result = distributeLot(dues, toNum(lot));

    const newLines: LineInput[] = [];
    for (const amount of result.amounts) {
      newLines.push({ amount: amount > 0 ? String(amount) : "", discount: "" });
    }
    setLines(newLines);
  }

  // the adjustment amount can not pass the advance balance
  function changeLot(value: string) {
    if (isAdjustment && toNum(value) > advanceBalance) {
      toast.error("Adjustment amount exceeded the advance amount.");
      setLot(String(advanceBalance));
      return;
    }
    setLot(value);
  }

  // a row can not take more than its due
  function changeLine(index: number, field: keyof LineInput, value: string) {
    if (!paymentType) {
      toast.error("Select Payment Type");
      return;
    }

    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    if (form && lineTotal(newLines[index]) > form.lines[index].due) {
      toast.error("Amount can not be more than the due amount");
      newLines[index] = emptyLine();
    }

    let newPaid = 0;
    for (const line of newLines) {
      newPaid += toNum(line.amount);
    }

    if (isAdjustment && newPaid > toNum(lot)) {
      // an adjustment can not use more than its amount
      toast.error("Adjustment amount exceeded the advance amount.");
      newLines[index] = emptyLine();
    } else if (newPaid > toNum(lot)) {
      // paying more than the lot makes the lot bigger
      setLot(String(Number(newPaid.toFixed(2))));
    }

    setLines(newLines);
  }

  async function save() {
    if (!form) {
      return;
    }
    if (!date) {
      toast.error("Date cannot be blank");
      return;
    }
    if (!paymentType) {
      toast.error("Payment Type cannot be blank");
      return;
    }
    if (lot === "") {
      toast.error("Lot amount cannot be blank");
      return;
    }
    if (BANK_TYPES.includes(paymentType) && !bankName.trim()) {
      toast.error("Select Bank Name");
      return;
    }
    if (paid <= 0 && advance <= 0 && discount <= 0) {
      toast.error("Please check total receive amount !");
      return;
    }

    const paymentLines = [];
    for (let i = 0; i < form.lines.length; i++) {
      const typed = lines[i] || emptyLine();
      paymentLines.push({
        purchase_id: form.lines[i].purchase_id,
        amount: toNum(typed.amount),
        discount: toNum(typed.discount),
      });
    }

    setSaving(true);
    try {
      const saved = await supplierPaymentService.createPayment({
        supplier_id: form.supplier_id,
        payment_date: date,
        payment_type: paymentType,
        lot_amount: toNum(lot),
        supplier_mr_no: supplierMrNo || undefined,
        bank_name: bankName || undefined,
        cheque_no: chequeNo || undefined,
        cheque_date: chequeDate || undefined,
        remarks: remarks || undefined,
        lines: paymentLines,
      });
      toast.success(`Supplier payment saved (${saved.sl_no})`);
      onSaved(saved.sl_no);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Payment not saved"));
    } finally {
      setSaving(false);
    }
  }

  function numberInput(index: number, field: keyof LineInput) {
    const line = lines[index] || emptyLine();
    return (
      <input
        type="number"
        min="0"
        value={line[field]}
        readOnly={!paymentType}
        onChange={(e) => changeLine(index, field, e.target.value)}
        onWheel={blurOnWheel}
        className={`${inputClass} text-right`}
      />
    );
  }

  return (
    <Modal
      isOpen={supplierId !== null}
      onClose={onClose}
      className="max-w-6xl"
      title="Create Supplier Payment"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" size="sm" onClick={save} disabled={saving || !form}>{saving ? "Saving..." : "Save Payment"}</Button>
        </>
      }
    >
      {!form && <p className="py-8 text-center text-sm text-gray-500">Loading...</p>}

      {form && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Box title="Supplier Information">
              <Field label="Supplier"><div className={`${readOnlyClass} font-semibold`}>{form.name}</div></Field>
              <Field label="Address"><div className={readOnlyClass}>{form.address || ""}</div></Field>
              <Field label="Date" required>
                <DatePicker id="sp_date" defaultDate={date} onChange={changeDate} />
              </Field>
              <Field label="Supplier MR No">
                <input type="text" maxLength={255} value={supplierMrNo} onChange={(e) => setSupplierMrNo(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Supplier Due"><div className={`${readOnlyClass} font-semibold`}>{formatMoney(form.total_due)}</div></Field>
            </Box>
            <Box title="Payment Information">
              <Field label="Payment Type" required>
                <ReactSelect
                  options={PAYMENT_TYPES}
                  placeholder="Select"
                  value={paymentType}
                  isClearable={false}
                  onChange={(value) => changePaymentType(value ? String(value) : "")}
                />
              </Field>
              <Field label="Bank Name" required={BANK_TYPES.includes(paymentType)}>
                <ReactSelect
                  options={bankOptions}
                  placeholder={bankOptions.length > 0 ? "Select" : "No bank yet (Configure > Lookups, type bank_name)"}
                  value={bankName || null}
                  isDisabled={noBank}
                  onChange={(value) => setBankName(value ? String(value) : "")}
                />
              </Field>
              <Field label="Cheque No">
                <input type="text" maxLength={255} value={chequeNo} disabled={noBank} onChange={(e) => setChequeNo(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Cheque Date">
                {noBank && <div className={readOnlyClass} />}
                {!noBank && <DatePicker id="sp_cheque_date" defaultDate={chequeDate || undefined} onChange={changeChequeDate} />}
              </Field>
              <Field label={isAdjustment ? "Adjustment Amount" : "Lot Amount"} required>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={lot}
                    onChange={(e) => changeLot(e.target.value)}
                    onWheel={blurOnWheel}
                    className={`${inputClass} text-right`}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={distribute}>Distribute</Button>
                </div>
              </Field>
              <Field label="Advanced Amount"><div className={`${readOnlyClass} justify-end font-semibold text-error-500`}>{formatMoney(advance)}</div></Field>
              <Field label="Advance Balance"><div className={`${readOnlyClass} justify-end`}>{formatMoney(form.advance_balance)}</div></Field>
            </Box>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <th className={formHeadCell}>SL</th>
                  <th className={formHeadCell}>PO No</th>
                  <th className={formHeadCell}>Supplier Bill No</th>
                  <th className={formHeadCell}>PO Date</th>
                  <th className={formHeadCell}>Bill Amount</th>
                  <th className={formHeadCell}>Previous Paid</th>
                  <th className={formHeadCell}>Due Amount</th>
                  <th className={formHeadCell}>Amount</th>
                  <th className={formHeadCell}>Discount</th>
                  <th className={formHeadCell}>Total Amount</th>
                  <th className={formHeadCell}>Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-center text-gray-700 dark:divide-white/[0.05] dark:text-gray-300">
                {form.lines.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-4 text-gray-400">No due PO. The whole lot amount is saved as advance.</td>
                  </tr>
                )}
                {form.lines.map((line, index) => {
                  const total = lineTotal(lines[index] || emptyLine());
                  return (
                    <tr key={line.purchase_id ?? "ob"}>
                      <td className="px-2 py-1.5">{index + 1}</td>
                      <td className="px-2 py-1.5 font-medium">{poLabel(line.po_no)}</td>
                      <td className="px-2 py-1.5">{line.supplier_bill_no}</td>
                      <td className="px-2 py-1.5">{line.po_date ? formatDate(line.po_date) : ""}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(line.bill_amount)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(line.prev_paid)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatMoney(line.due)}</td>
                      <td className="w-[110px] px-1 py-1.5">{numberInput(index, "amount")}</td>
                      <td className="w-[95px] px-1 py-1.5">{numberInput(index, "discount")}</td>
                      <td className="px-2 py-1.5 text-right">{total > 0 && formatMoney(total)}</td>
                      <td className="px-2 py-1.5 text-right">{total > 0 && formatMoney(line.due - total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-right font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                  <td colSpan={4} className="px-2 py-2 text-left">Total</td>
                  <td className="px-2 py-2">{formatMoney(totalBill)}</td>
                  <td className="px-2 py-2">{formatMoney(totalPrevPaid)}</td>
                  <td className="px-2 py-2">{formatMoney(totalDue)}</td>
                  <td className="px-2 py-2">{formatMoney(paid)}</td>
                  <td className="px-2 py-2">{formatMoney(discount)}</td>
                  <td className="px-2 py-2">{formatMoney(paid + discount)}</td>
                  <td className="px-2 py-2">{formatMoney(totalDue - paid - discount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <Field label="Remarks (If any)">
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
const headCell = `${cell} text-left font-medium`;

// one line of a saved payment, as the voucher API sends it
interface VoucherLine {
  id: number;
  po_no: string;
  supplier_bill_no: string | null;
  bill_amount: string;
  prev_paid_amount: string;
  receivable_amount: string;
  amount: string;
  discount: string;
}

// Payment voucher: shown after saving and from Manage Supplier Payment
export function SupplierPaymentVoucherModal({ slNo, onClose }: { slNo: string | null; onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [payment, setPayment] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPayment(null);
    if (slNo) {
      supplierPaymentService.getPayment(slNo)
        .then(setPayment)
        .catch(() => toast.error("Failed to load supplier payment"));
    }
  }, [slNo]);

  function print() {
    if (printArea.current && payment) {
      printHtml(payment.sl_no, printArea.current.innerHTML, PRINT_STYLE);
    }
  }

  // totals of the voucher lines
  let totalAmount = 0;
  let totalDiscount = 0;
  const voucherLines: VoucherLine[] = payment ? payment.lines : [];
  for (const line of voucherLines) {
    totalAmount += Number(line.amount || 0);
    totalDiscount += Number(line.discount || 0);
  }

  // "Bank / Cheque 123 (01-11-2026)"
  let bankText = "";
  if (payment && payment.bank_name) {
    bankText = payment.bank_name;
    if (payment.cheque_no) {
      bankText += ` / Cheque ${payment.cheque_no}`;
    }
    if (payment.cheque_date) {
      bankText += ` (${formatDate(payment.cheque_date)})`;
    }
  }

  return (
    <Modal
      isOpen={slNo !== null}
      onClose={onClose}
      className="max-w-4xl"
      title="Payment Voucher"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!payment}>Print</Button>
        </>
      }
    >
      {!payment && <p className="py-8 text-center text-sm text-gray-500">Loading...</p>}

      {payment && (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{payment.company ? payment.company.name : "Payment Voucher"}</h2>
            {payment.company && payment.company.address && <div className="text-xs text-gray-500">{payment.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold">PAYMENT VOUCHER</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Paid To</td><td className="font-semibold">{payment.supplier ? payment.supplier.name : ""}</td></tr>
                <tr><td className="pr-3 text-gray-500">Contact Number</td><td>{(payment.supplier && payment.supplier.phone) || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Address</td><td>{(payment.supplier && payment.supplier.address) || "-"}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">PR No</td><td className="font-semibold">{payment.sl_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(payment.payment_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Payment Type</td><td>{paymentTypeName(payment.payment_type)}</td></tr>
                {payment.supplier_mr_no && <tr><td className="pr-3 text-gray-500">Supplier MR No</td><td>{payment.supplier_mr_no}</td></tr>}
                {bankText && <tr><td className="pr-3 text-gray-500">Bank</td><td>{bankText}</td></tr>}
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={headCell}>SL</th>
                <th className={headCell}>PO No</th>
                <th className={headCell}>Supplier Bill No</th>
                <th className={headCell}>Bill Amount</th>
                <th className={headCell}>Previous Paid</th>
                <th className={headCell}>Due Amount</th>
                <th className={headCell}>Amount</th>
                <th className={headCell}>Discount</th>
              </tr>
            </thead>
            <tbody>
              {voucherLines.map((line, index) => (
                <tr key={line.id}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>{poLabel(line.po_no)}</td>
                  <td className={cell}>{line.supplier_bill_no}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.bill_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.prev_paid_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.receivable_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.discount)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td colSpan={6} className={`${cell} text-right`}>Total</td>
                <td className={`${cell} text-right`}>{formatMoney(totalAmount)}</td>
                <td className={`${cell} text-right`}>{formatMoney(totalDiscount)}</td>
              </tr>
            </tbody>
          </table>
          {payment.remarks && <p className="mt-2 text-xs">Remarks: {payment.remarks}</p>}

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {payment.created_by ? payment.created_by.name : ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Received By</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
