"use client";
// Short list report, like parts_bazar shortListOrder/poReport: shown after saving and from the manage page
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { shortListOrderService } from "@/services/shortListOrderService";

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

export function ShortListReportModal({ maxSlNo, onClose }: { maxSlNo: number | null; onClose: () => void }) {
  const [shortList, setShortList] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShortList(null);
    if (maxSlNo) {
      shortListOrderService.getList(maxSlNo)
        .then(setShortList)
        .catch(() => toast.error("Failed to load short list"));
    }
  }, [maxSlNo]);

  function print() {
    if (!printArea.current) {
      return;
    }
    printHtml(`Short List ${maxSlNo}`, printArea.current.innerHTML, PRINT_STYLE);
  }

  let grandTotal = 0;
  if (shortList) {
    for (const line of shortList.lines) {
      grandTotal += Number(line.purchase_price) * Number(line.order_qty);
    }
  }

  return (
    <Modal
      isOpen={!!maxSlNo}
      onClose={onClose}
      className="max-w-4xl"
      title="Short List Order"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!shortList}>Print</Button>
        </>
      }
    >
      {!shortList ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{shortList.company ? shortList.company.name : "Short List Order"}</h2>
            {shortList.company?.address && <div className="text-xs text-gray-500">{shortList.company.address}</div>}
            {shortList.company?.phone && <div className="text-xs text-gray-500">Phone No: {shortList.company.phone}</div>}
            <h3 className="mt-1 text-sm font-semibold">SHORT LIST ORDER</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">SL No</td><td className="font-semibold">{shortList.max_sl_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(shortList.created_at)}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={`${cell} text-left font-medium`}>Sl No</th>
                <th className={`${cell} text-left font-medium`}>Store</th>
                <th className={`${cell} text-left font-medium`}>Product Name</th>
                <th className={`${cell} text-left font-medium`}>Part Number</th>
                <th className={`${cell} text-left font-medium`}>Stock Qty</th>
                <th className={`${cell} text-left font-medium`}>Purchase Price</th>
                <th className={`${cell} text-left font-medium`}>Order Qty</th>
                <th className={`${cell} text-left font-medium`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {shortList.lines.map((line: any, index: number) => (
                <tr key={line.id}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>{line.store?.name}</td>
                  <td className={cell}>{line.product?.name}</td>
                  <td className={cell}>{line.code || line.product?.part_number}</td>
                  <td className={`${cell} text-right`}>{Number(line.stock_qty)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(line.purchase_price)}</td>
                  <td className={`${cell} text-right`}>{Number(line.order_qty)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(Number(line.purchase_price) * Number(line.order_qty))}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className={`${cell} text-right font-semibold`}>Grand Total</td>
                <td className={`${cell} text-right font-semibold`}>{formatMoney(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {shortList.created_by ? shortList.created_by : ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Signature (Store Manager)</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Signature</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
