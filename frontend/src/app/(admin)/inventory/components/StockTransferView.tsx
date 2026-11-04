"use client";
// Stock transfer details, like parts_bazar stockTransfer/view: shown after saving and from the manage page
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { printHtml } from "@/lib/print";
import { formatDate } from "@/lib/format";
import { stockTransferService } from "@/services/stockTransferService";

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

export function StockTransferViewModal({ transferId, onClose }: { transferId: number | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null);
    if (transferId) stockTransferService.getTransfer(transferId).then(setData).catch(() => toast.error("Failed to load stock transfer"));
  }, [transferId]);

  const print = () => {
    if (printArea.current) printHtml(data?.transfer_no ?? "Stock Transfer", printArea.current.innerHTML, PRINT_STYLE);
  };

  const r = data;

  return (
    <Modal
      isOpen={!!transferId}
      onClose={onClose}
      className="max-w-5xl"
      title="Stock Transfer"
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
            <h2 className="text-lg font-semibold">{r.company?.name ?? "Stock Transfer"}</h2>
            {r.company?.address && <div className="text-xs text-gray-500">{r.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold">STOCK TRANSFER</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Transfer No</td><td className="font-semibold">{r.transfer_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Transfer Date</td><td>{formatDate(r.transfer_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Company Name</td><td>{r.company?.name}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Status</td><td className="font-semibold">{r.status === 1 ? "Approved" : "Pending"}</td></tr>
                {r.approved_by && <tr><td className="pr-3 text-gray-500">Approved By</td><td>{r.approved_by.name}</td></tr>}
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {["Sl.", "Transfer From", "Location", "Product Name", "Part Number", "Barcode", "Stock Qty", "Transfer To", "Location", "Transfer Qty", "Barcode Generate"].map((h, i) => (
                  <th key={i} className={`${cell} text-left font-medium`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.details.map((d: any, i: number) => (
                <tr key={d.id}>
                  <td className={cell}>{i + 1}</td>
                  <td className={cell}>{d.from_store?.name}</td>
                  <td className={cell}>{d.from_location?.name}</td>
                  <td className={cell}>{d.product?.name}</td>
                  <td className={cell}>{d.product?.part_number}</td>
                  <td className={cell}>{d.barcode}</td>
                  <td className={`${cell} text-right`}>{Number(d.stock_qty)}</td>
                  <td className={cell}>{d.to_store?.name}</td>
                  <td className={cell}>{d.to_location?.name}</td>
                  <td className={`${cell} text-right`}>{Number(d.transfer_qty)}</td>
                  <td className={cell}>{d.new_barcode}</td>
                </tr>
              ))}
              <tr>
                <td className={cell}>Remarks</td>
                <td colSpan={10} className={cell}>{r.remarks}</td>
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
