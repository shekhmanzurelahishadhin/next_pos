"use client";
// Voucher preview like parts_bazar journalEntry/voucher: heads, Dr / Cr, total,
// amount in words, narration and the signature row. It can be printed.
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { amountInWords } from "@/lib/inWords";
import { apiErrorMessage } from "@/lib/options";
import { costCenterName, DEBIT, journalEntryService, VoucherDetail } from "@/services/journalEntryService";

// plain styles for the print window (the app's Tailwind classes are not loaded there)
const PRINT_STYLE = `
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h2 { margin: 0; font-size: 18px; } h3 { margin: 4px 0 12px; font-size: 14px; }
  .center { text-align: center; } .right { text-align: right; }
  .info { display: flex; justify-content: space-between; margin: 12px 0; gap: 24px; }
  .info table td { padding: 2px 8px 2px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.items th, table.items td { border: 1px solid #999; padding: 4px 6px; }
  table.items th { background: #eee; }
  .sign { display: flex; justify-content: space-between; margin-top: 60px; gap: 12px; }
  .sign span { border-top: 1px solid #333; padding-top: 4px; flex: 1; text-align: center; }
`;

const headCell = "border border-gray-200 px-2 py-1.5 text-left font-medium dark:border-gray-700";
const cell = "border border-gray-200 px-2 py-1 dark:border-gray-700";
const numberCell = "right border border-gray-200 px-2 py-1 text-right dark:border-gray-700";
const totalCell = "right border border-gray-200 px-2 py-1 text-right font-semibold dark:border-gray-700";

interface Props {
  voucher: { voucherType: number; entryNo: string } | null;
  onClose: () => void;
}

export function VoucherPreview({ voucher, onClose }: Props) {
  const [detail, setDetail] = useState<VoucherDetail | null>(null);
  const [error, setError] = useState("");
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDetail(null);
    setError("");
    if (voucher) {
      journalEntryService
        .getVoucher(voucher.voucherType, voucher.entryNo)
        .then((data) => setDetail(data))
        .catch((err) => setError(apiErrorMessage(err, "No result found !")));
    }
  }, [voucher]);

  function print() {
    if (printArea.current && detail) {
      printHtml(detail.voucher_no, printArea.current.innerHTML, PRINT_STYLE);
    }
  }

  let totalDr = 0;
  let totalCr = 0;
  if (detail) {
    for (const line of detail.lines) {
      if (line.transaction_type === DEBIT) {
        totalDr = totalDr + Number(line.amount);
      } else {
        totalCr = totalCr + Number(line.amount);
      }
    }
  }

  return (
    <Modal
      isOpen={voucher !== null}
      onClose={onClose}
      className="max-w-3xl"
      title="Voucher"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!detail}>Print</Button>
        </>
      }
    >
      {!detail && !error && <p className="py-8 text-center text-sm text-gray-500">Loading...</p>}
      {error && <p className="py-8 text-center text-sm text-error-500">{error}</p>}

      {detail && (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="center text-center">
            <h2 className="text-lg font-semibold">{detail.company ? detail.company.name : ""}</h2>
            {detail.company && detail.company.address && <div className="text-xs text-gray-500">{detail.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold uppercase">{detail.voucher_type_name}</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Voucher No</td><td className="font-semibold">: {detail.voucher_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>: {formatDate(detail.entry_date)}</td></tr>
                {detail.bill_no && <tr><td className="pr-3 text-gray-500">Bill No</td><td>: {detail.bill_no}</td></tr>}
                {detail.chalan_no && <tr><td className="pr-3 text-gray-500">Chalan No</td><td>: {detail.chalan_no}</td></tr>}
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Cheque No</td><td>: {detail.cheque_no || ""}</td></tr>
                <tr><td className="pr-3 text-gray-500">Cheque Date</td><td>: {detail.cheque_date ? formatDate(detail.cheque_date) : ""}</td></tr>
                {detail.pay_to && <tr><td className="pr-3 text-gray-500">Pay To</td><td>: {detail.pay_to}</td></tr>}
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={headCell + " w-12"}>SL</th>
                <th className={headCell}>Accounts Head</th>
                <th className={headCell + " w-32 text-right"}>DR Amount</th>
                <th className={headCell + " w-32 text-right"}>CR Amount</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line, index) => (
                <tr key={line.id}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>
                    {line.account ? line.account.title + " (" + line.account.code + ")" : ""}
                    {line.cost_center && <div style={{ fontSize: "11px", color: "#666" }}>Cost Center: {costCenterName(line.cost_center)}</div>}
                  </td>
                  <td className={numberCell}>{line.transaction_type === DEBIT ? formatMoney(line.amount) : ""}</td>
                  <td className={numberCell}>{line.transaction_type === DEBIT ? "" : formatMoney(line.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} className={totalCell}>Total Amount:</td>
                <td className={totalCell}>{formatMoney(totalDr)}</td>
                <td className={totalCell}>{formatMoney(totalCr)}</td>
              </tr>
              <tr>
                <td colSpan={4} className={cell}><b>In Words:</b> {amountInWords(totalDr)}</td>
              </tr>
              <tr>
                <td colSpan={4} className={cell}><b>Narration:</b> {detail.narration || ""}</td>
              </tr>
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between gap-3 text-[11px]">
            <span className="flex-1 border-t border-gray-400 pt-1 text-center">PREPARED BY{detail.created_by ? ": " + detail.created_by.name : ""}</span>
            <span className="flex-1 border-t border-gray-400 pt-1 text-center">CHECKED BY</span>
            <span className="flex-1 border-t border-gray-400 pt-1 text-center">ACCOUNTANT</span>
            <span className="flex-1 border-t border-gray-400 pt-1 text-center">APPROVED BY</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
