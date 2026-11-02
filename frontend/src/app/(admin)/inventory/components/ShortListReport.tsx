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
  const [data, setData] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null);
    if (maxSlNo) shortListOrderService.getList(maxSlNo).then(setData).catch(() => toast.error("Failed to load short list"));
  }, [maxSlNo]);

  const print = () => {
    if (printArea.current) printHtml(`Short List ${maxSlNo}`, printArea.current.innerHTML, PRINT_STYLE);
  };

  const r = data;
  const total = r ? r.lines.reduce((sum: number, d: any) => sum + Number(d.purchase_price) * Number(d.order_qty), 0) : 0;

  return (
    <Modal
      isOpen={!!maxSlNo}
      onClose={onClose}
      className="max-w-4xl"
      title="Short List Order"
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
            <h2 className="text-lg font-semibold">{r.company?.name ?? "Short List Order"}</h2>
            {r.company?.address && <div className="text-xs text-gray-500">{r.company.address}</div>}
            {r.company?.phone && <div className="text-xs text-gray-500">Phone No: {r.company.phone}</div>}
            <h3 className="mt-1 text-sm font-semibold">SHORT LIST ORDER</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">SL No</td><td className="font-semibold">{r.max_sl_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(r.created_at)}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {["Sl No", "Store", "Product Name", "Part Number", "Stock Qty", "Purchase Price", "Order Qty", "Total"].map((h) => (
                  <th key={h} className={`${cell} text-left font-medium`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.lines.map((d: any, i: number) => (
                <tr key={d.id}>
                  <td className={cell}>{i + 1}</td>
                  <td className={cell}>{d.store?.name}</td>
                  <td className={cell}>{d.product?.name}</td>
                  <td className={cell}>{d.code || d.product?.part_number}</td>
                  <td className={`${cell} text-right`}>{Number(d.stock_qty)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(d.purchase_price)}</td>
                  <td className={`${cell} text-right`}>{Number(d.order_qty)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(Number(d.purchase_price) * Number(d.order_qty))}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className={`${cell} text-right font-semibold`}>Grand Total</td>
                <td className={`${cell} text-right font-semibold`}>{formatMoney(total)}</td>
              </tr>
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {r.created_by ?? ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Signature (Store Manager)</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Signature</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
