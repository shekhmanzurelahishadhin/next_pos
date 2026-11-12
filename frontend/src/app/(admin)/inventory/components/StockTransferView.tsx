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
  const [transfer, setTransfer] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTransfer(null);
    if (transferId) {
      stockTransferService.getTransfer(transferId)
        .then(setTransfer)
        .catch(() => toast.error("Failed to load stock transfer"));
    }
  }, [transferId]);

  function print() {
    if (!printArea.current) {
      return;
    }
    const title = transfer ? transfer.transfer_no : "Stock Transfer";
    printHtml(title, printArea.current.innerHTML, PRINT_STYLE);
  }

  return (
    <Modal
      isOpen={!!transferId}
      onClose={onClose}
      className="max-w-5xl"
      title="Stock Transfer"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!transfer}>Print</Button>
        </>
      }
    >
      {!transfer ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{transfer.company ? transfer.company.name : "Stock Transfer"}</h2>
            {transfer.company?.address && <div className="text-xs text-gray-500">{transfer.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold">STOCK TRANSFER</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Transfer No</td><td className="font-semibold">{transfer.transfer_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Transfer Date</td><td>{formatDate(transfer.transfer_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Company Name</td><td>{transfer.company?.name}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Status</td><td className="font-semibold">{transfer.status === 1 ? "Approved" : "Pending"}</td></tr>
                {transfer.approved_by && <tr><td className="pr-3 text-gray-500">Approved By</td><td>{transfer.approved_by.name}</td></tr>}
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={`${cell} text-left font-medium`}>Sl.</th>
                <th className={`${cell} text-left font-medium`}>Transfer From</th>
                <th className={`${cell} text-left font-medium`}>Location</th>
                <th className={`${cell} text-left font-medium`}>Product Name</th>
                <th className={`${cell} text-left font-medium`}>Part Number</th>
                <th className={`${cell} text-left font-medium`}>Barcode</th>
                <th className={`${cell} text-left font-medium`}>Stock Qty</th>
                <th className={`${cell} text-left font-medium`}>Transfer To</th>
                <th className={`${cell} text-left font-medium`}>Location</th>
                <th className={`${cell} text-left font-medium`}>Transfer Qty</th>
                <th className={`${cell} text-left font-medium`}>Barcode Generate</th>
              </tr>
            </thead>
            <tbody>
              {transfer.details.map((detail: any, index: number) => (
                <tr key={detail.id}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>{detail.from_store?.name}</td>
                  <td className={cell}>{detail.from_location?.name}</td>
                  <td className={cell}>{detail.product?.name}</td>
                  <td className={cell}>{detail.product?.part_number}</td>
                  <td className={cell}>{detail.barcode}</td>
                  <td className={`${cell} text-right`}>{Number(detail.stock_qty)}</td>
                  <td className={cell}>{detail.to_store?.name}</td>
                  <td className={cell}>{detail.to_location?.name}</td>
                  <td className={`${cell} text-right`}>{Number(detail.transfer_qty)}</td>
                  <td className={cell}>{detail.new_barcode}</td>
                </tr>
              ))}
              <tr>
                <td className={cell}>Remarks</td>
                <td colSpan={10} className={cell}>{transfer.remarks}</td>
              </tr>
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {transfer.created_by ? transfer.created_by.name : ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Received By</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
