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
import { apiErrorMessage, blurOnWheel, Option, today } from "@/lib/options";
import { ADJUSTMENT, BANK_TYPES, distributeLot, PAYMENT_TYPES, paymentTypeName, toNum } from "@/lib/payment";
import { moneyReceiptService, MrForm, MrPayload } from "@/services/moneyReceiptService";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";
const readOnlyClass =
  "flex h-9 w-full items-center rounded-md bg-gray-100 px-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300";
const formHeadCell = "px-2 py-2 text-center font-medium";

const CASH = "1";

// what is typed on one invoice row
type LineInput = { amount: string; discount: string; vds: string; tds: string };

function emptyLine(): LineInput {
  return { amount: "", discount: "", vds: "", tds: "" };
}

// one empty row for every due invoice
function emptyLines(count: number): LineInput[] {
  const lines: LineInput[] = [];
  for (let i = 0; i < count; i++) {
    lines.push(emptyLine());
  }
  return lines;
}

// amount + discount + VDS + TDS of one row
function lineTotal(line: LineInput) {
  return toNum(line.amount) + toNum(line.discount) + toNum(line.vds) + toNum(line.tds);
}

// the SO no of the opening balance and advance lines is shown as a word
export function orderLabel(orderNo: string) {
  if (orderNo === "ob") {
    return "Opening";
  }
  if (orderNo === "advance") {
    return "Advance";
  }
  return orderNo;
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

  // a new customer: clear the form and load the due invoices
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
    if (!customerId) {
      return;
    }
    moneyReceiptService.getForm(customerId)
      .then((data) => {
        setForm(data);
        setLines(emptyLines(data.lines.length));
      })
      .catch((err) => {
        toast.error(apiErrorMessage(err, "Failed to load money receipt form"));
        onClose();
      });
  }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // the date pickers need functions that do not change on every render
  const changeDate = useCallback((_dates: Date[], dateStr: string) => setDate(dateStr), []);
  const changeChequeDate = useCallback((_dates: Date[], dateStr: string) => setChequeDate(dateStr), []);

  // totals of the due invoices and of what is typed
  let totalBill = 0;
  let totalPrevReceived = 0;
  let totalDue = 0;
  if (form) {
    for (const line of form.lines) {
      totalBill += line.bill_amount;
      totalPrevReceived += line.prev_received;
      totalDue += line.due;
    }
  }
  let received = 0;
  let discount = 0;
  let vds = 0;
  let tds = 0;
  let typedTotal = 0;
  for (const line of lines) {
    received += toNum(line.amount);
    discount += toNum(line.discount);
    vds += toNum(line.vds);
    tds += toNum(line.tds);
    typedTotal += lineTotal(line);
  }

  const isAdjustment = receivedType === ADJUSTMENT;
  const noBank = receivedType === CASH || isAdjustment; // cash and adjustment have no bank / cheque

  // what is left of the lot is an advance; an Adjustment uses old advance, so it never makes a new one
  let advance = 0;
  if (!isAdjustment) {
    advance = Math.max(0, toNum(lot) - received);
  }

  const advanceBalance = form ? form.advance_balance : 0;

  const bankOptions: Option[] = [];
  if (form) {
    for (const name of form.banks) {
      bankOptions.push({ value: name, label: name });
    }
  }

  // parts_bazar: picking the receive type clears the rows and puts the whole due
  // (for Adjustment the advance balance) as lot amount
  function changeReceivedType(value: string) {
    setReceivedType(value);
    setLines(emptyLines(lines.length));

    if (value === ADJUSTMENT) {
      if (advanceBalance <= 0) {
        toast.error("This customer has no advance to adjust");
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
      setCustomerBankName("");
      setChequeNo("");
      setChequeDate("");
    }
  }

  // "Distribute": share the lot over the due invoices, oldest first
  function distribute() {
    if (!receivedType) {
      toast.error("Select Receive Type");
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
      const line = emptyLine();
      if (amount > 0) {
        line.amount = String(amount);
      }
      newLines.push(line);
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

  // parts_bazar calculateAmount: a row can not take more than its due
  function changeLine(index: number, field: keyof LineInput, value: string) {
    if (!receivedType) {
      toast.error("Select Receive Type.");
      return;
    }

    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    if (form && lineTotal(newLines[index]) > form.lines[index].due) {
      toast.error("Amount can not be more than the due amount");
      newLines[index] = emptyLine();
    }

    let newReceived = 0;
    for (const line of newLines) {
      newReceived += toNum(line.amount);
    }

    if (isAdjustment && newReceived > toNum(lot)) {
      // an adjustment can not use more than its amount
      toast.error("Adjustment amount exceeded the advance amount.");
      newLines[index] = emptyLine();
    } else if (newReceived > toNum(lot)) {
      // receiving more than the lot makes the lot bigger
      setLot(String(Number(newReceived.toFixed(2))));
    }

    setLines(newLines);
  }

  async function save() {
    if (!form) {
      return;
    }
    if (!date) {
      toast.error("Please select a Date");
      return;
    }
    if (!receivedType) {
      toast.error("Please select a Receive Type");
      return;
    }
    if (lot === "") {
      toast.error("Lot amount cannot be blank");
      return;
    }
    if (BANK_TYPES.includes(receivedType) && !bankName.trim()) {
      toast.error("Please select a Bank Name");
      return;
    }
    if (received <= 0 && advance <= 0 && typedTotal <= 0) {
      toast.error("Please insert amount!");
      return;
    }

    const receiptLines: MrPayload["lines"] = [];
    for (let i = 0; i < form.lines.length; i++) {
      const typed = lines[i] || emptyLine();
      receiptLines.push({
        sale_id: form.lines[i].sale_id,
        amount: toNum(typed.amount),
        discount: toNum(typed.discount),
        vds: toNum(typed.vds),
        tds: toNum(typed.tds),
      });
    }

    setSaving(true);
    try {
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
        lines: receiptLines,
      });
      toast.success(`Money receipt saved (${saved.mr_no})`);
      onSaved(saved.mr_no);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Money receipt not saved"));
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
        readOnly={!receivedType}
        onChange={(e) => changeLine(index, field, e.target.value)}
        onWheel={blurOnWheel}
        className={`${inputClass} text-right`}
      />
    );
  }

  return (
    <Modal
      isOpen={customerId !== null}
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
      {!form && <p className="py-8 text-center text-sm text-gray-500">Loading...</p>}

      {form && (
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
                <ReactSelect
                  options={PAYMENT_TYPES}
                  placeholder="Select"
                  value={receivedType}
                  isClearable={false}
                  onChange={(value) => changeReceivedType(value ? String(value) : "")}
                />
              </Field>
              <Field label="Bank Name" required={BANK_TYPES.includes(receivedType)}>
                <ReactSelect
                  options={bankOptions}
                  placeholder={bankOptions.length > 0 ? "Select" : "No bank yet (Configure > Lookups, type bank_name)"}
                  value={bankName || null}
                  isDisabled={noBank}
                  onChange={(value) => setBankName(value ? String(value) : "")}
                />
              </Field>
              <Field label="Customer Bank Name">
                <input type="text" maxLength={255} value={customerBankName} disabled={noBank} onChange={(e) => setCustomerBankName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Cheque No">
                <input type="text" maxLength={255} value={chequeNo} disabled={noBank} onChange={(e) => setChequeNo(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Cheque Date">
                {noBank && <div className={readOnlyClass} />}
                {!noBank && <DatePicker id="mr_cheque_date" defaultDate={chequeDate || undefined} onChange={changeChequeDate} />}
              </Field>
              <Field label={isAdjustment ? "Adjustment Amount" : "Lot Amount"} required>
                <div className="flex gap-2">
                  <input type="number" min="0" value={lot} onChange={(e) => changeLot(e.target.value)} onWheel={blurOnWheel} className={`${inputClass} text-right`} />
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
                  <th className={formHeadCell}>SL</th>
                  <th className={formHeadCell}>SO No</th>
                  <th className={formHeadCell}>Memo No</th>
                  <th className={formHeadCell}>Order Date</th>
                  <th className={formHeadCell}>Bill Amount</th>
                  <th className={formHeadCell}>Previous Received</th>
                  <th className={formHeadCell}>Due Amount</th>
                  <th className={formHeadCell}>Amount</th>
                  <th className={formHeadCell}>Discount</th>
                  <th className={formHeadCell}>VDS</th>
                  <th className={formHeadCell}>TDS</th>
                  <th className={formHeadCell}>Total Amount</th>
                  <th className={formHeadCell}>Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-center text-gray-700 dark:divide-white/[0.05] dark:text-gray-300">
                {form.lines.length === 0 && (
                  <tr><td colSpan={13} className="py-4 text-gray-400">No due invoice. The whole lot amount is saved as advance.</td></tr>
                )}
                {form.lines.map((line, index) => {
                  const total = lineTotal(lines[index] || emptyLine());
                  return (
                    <tr key={line.sale_id ?? "ob"}>
                      <td className="px-2 py-1.5">{index + 1}</td>
                      <td className="px-2 py-1.5 font-medium">{orderLabel(line.order_no)}</td>
                      <td className="px-2 py-1.5">{line.memo_no}</td>
                      <td className="px-2 py-1.5">{line.order_date ? formatDate(line.order_date) : ""}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(line.bill_amount)}</td>
                      <td className="px-2 py-1.5 text-right">{formatMoney(line.prev_received)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatMoney(line.due)}</td>
                      <td className="w-[100px] px-1 py-1.5">{numberInput(index, "amount")}</td>
                      <td className="w-[85px] px-1 py-1.5">{numberInput(index, "discount")}</td>
                      <td className="w-[75px] px-1 py-1.5">{numberInput(index, "vds")}</td>
                      <td className="w-[75px] px-1 py-1.5">{numberInput(index, "tds")}</td>
                      <td className="px-2 py-1.5 text-right">{total > 0 ? formatMoney(total) : ""}</td>
                      <td className="px-2 py-1.5 text-right">{total > 0 ? formatMoney(line.due - total) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-right font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90">
                  <td colSpan={4} className="px-2 py-2 text-left">Total</td>
                  <td className="px-2 py-2">{formatMoney(totalBill)}</td>
                  <td className="px-2 py-2">{formatMoney(totalPrevReceived)}</td>
                  <td className="px-2 py-2">{formatMoney(totalDue)}</td>
                  <td className="px-2 py-2">{formatMoney(received)}</td>
                  <td className="px-2 py-2">{formatMoney(discount)}</td>
                  <td className="px-2 py-2">{formatMoney(vds)}</td>
                  <td className="px-2 py-2">{formatMoney(tds)}</td>
                  <td className="px-2 py-2">{formatMoney(typedTotal)}</td>
                  <td className="px-2 py-2">{formatMoney(totalDue - typedTotal)}</td>
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
const voucherHeadCell = `${cell} text-left font-medium`;

// MR voucher: shown after saving and from Manage Money Receipt
export function MoneyReceiptVoucherModal({ mrNo, onClose }: { mrNo: string | null; onClose: () => void }) {
  const [receipt, setReceipt] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReceipt(null);
    if (mrNo) {
      moneyReceiptService.getReceipt(mrNo)
        .then(setReceipt)
        .catch(() => toast.error("Failed to load money receipt"));
    }
  }, [mrNo]);

  function print() {
    if (!printArea.current) {
      return;
    }
    const title = receipt ? receipt.mr_no : "Money Receipt";
    printHtml(title, printArea.current.innerHTML, PRINT_STYLE);
  }

  // totals of the voucher lines
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalVds = 0;
  let totalTds = 0;
  if (receipt) {
    for (const line of receipt.lines) {
      totalAmount += Number(line.amount ?? 0);
      totalDiscount += Number(line.discount ?? 0);
      totalVds += Number(line.vds ?? 0);
      totalTds += Number(line.tds ?? 0);
    }
  }

  // bank, cheque no and cheque date in one line
  let bankText = "";
  if (receipt && receipt.bank_name) {
    bankText = receipt.bank_name;
    if (receipt.cheque_no) {
      bankText += ` / Cheque ${receipt.cheque_no}`;
    }
    if (receipt.cheque_date) {
      bankText += ` (${formatDate(receipt.cheque_date)})`;
    }
  }

  return (
    <Modal
      isOpen={mrNo !== null}
      onClose={onClose}
      className="max-w-4xl"
      title="Money Receipt"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!receipt}>Print</Button>
        </>
      }
    >
      {!receipt && <p className="py-8 text-center text-sm text-gray-500">Loading...</p>}

      {receipt && (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{receipt.company ? receipt.company.name : "Money Receipt"}</h2>
            {receipt.company?.address && <div className="text-xs text-gray-500">{receipt.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold">MONEY RECEIPT</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Received From</td><td className="font-semibold">{receipt.customer?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Contact Number</td><td>{receipt.customer?.phone || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Address</td><td>{receipt.customer?.address || "-"}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">MR No</td><td className="font-semibold">{receipt.mr_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(receipt.receipt_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Receive Type</td><td>{paymentTypeName(receipt.received_type)}</td></tr>
                {bankText && <tr><td className="pr-3 text-gray-500">Bank</td><td>{bankText}</td></tr>}
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={voucherHeadCell}>SL</th>
                <th className={voucherHeadCell}>SO No</th>
                <th className={voucherHeadCell}>Bill Amount</th>
                <th className={voucherHeadCell}>Previous Received</th>
                <th className={voucherHeadCell}>Due Amount</th>
                <th className={voucherHeadCell}>Amount</th>
                <th className={voucherHeadCell}>Discount</th>
                <th className={voucherHeadCell}>VDS</th>
                <th className={voucherHeadCell}>TDS</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line: any, index: number) => (
                <tr key={line.id}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>{orderLabel(line.order_no)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.bill_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.prev_received_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.receivable_amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.amount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.discount)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.vds)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.tds)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td colSpan={5} className={`${cell} text-right`}>Total</td>
                <td className={`${cell} text-right`}>{formatMoney(totalAmount)}</td>
                <td className={`${cell} text-right`}>{formatMoney(totalDiscount)}</td>
                <td className={`${cell} text-right`}>{formatMoney(totalVds)}</td>
                <td className={`${cell} text-right`}>{formatMoney(totalTds)}</td>
              </tr>
            </tbody>
          </table>
          {receipt.remarks && <p className="mt-2 text-xs">Note: {receipt.remarks}</p>}

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {receipt.created_by ? receipt.created_by.name : ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Authorised Signature</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
