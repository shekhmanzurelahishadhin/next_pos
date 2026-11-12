"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { purchaseService } from "@/services/purchaseService";

interface PurchaseVoucherProps {
  purchaseId: number | null;
  onClose: () => void;
}

// Plain styles for the print window (the app's Tailwind classes are not loaded there)
const PRINT_STYLE = `
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h2 { margin: 0; font-size: 18px; } h3 { margin: 4px 0 12px; font-size: 14px; font-weight: normal; }
  .center { text-align: center; } .right { text-align: right; }
  .info { display: flex; justify-content: space-between; margin: 12px 0; gap: 24px; }
  .info table td { padding: 2px 8px 2px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.items th, table.items td { border: 1px solid #999; padding: 4px 6px; }
  table.items th { background: #eee; }
  .sign { display: flex; justify-content: space-between; margin-top: 60px; }
  .sign span { border-top: 1px solid #333; padding-top: 4px; width: 160px; text-align: center; }
`;

const headCell = "border border-gray-200 px-2 py-1.5 text-left font-medium dark:border-gray-700";
const cell = "border border-gray-200 px-2 py-1 dark:border-gray-700";
const numberCell = "right border border-gray-200 px-2 py-1 text-right dark:border-gray-700";
const totalCell = "right border border-gray-200 px-2 py-1 text-right font-semibold dark:border-gray-700";

// PO voucher like the parts_bazar "PR Voucher Preview": shown after saving and from Purchase Manage
export function PurchaseVoucher({ purchaseId, onClose }: PurchaseVoucherProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [purchase, setPurchase] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPurchase(null);
    if (purchaseId) {
      purchaseService.getPurchase(purchaseId).then(setPurchase);
    }
  }, [purchaseId]);

  function print() {
    if (printArea.current && purchase) {
      printHtml(purchase.po_no, printArea.current.innerHTML, PRINT_STYLE);
    }
  }

  return (
    <Modal
      isOpen={purchaseId !== null}
      onClose={onClose}
      className="max-w-4xl"
      title="Purchase Voucher Preview"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!purchase}>Print</Button>
        </>
      }
    >
      {!purchase && <p className="py-8 text-center text-sm text-gray-500">Loading...</p>}

      {purchase && (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="center text-center">
            <h2 className="text-lg font-semibold">{purchase.company ? purchase.company.name : "Purchase Order"}</h2>
            {purchase.company && purchase.company.address && <div className="text-xs text-gray-500">{purchase.company.address}</div>}
            <h3 className="mt-1 text-sm">Purchase Order ({purchase.status_name})</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">PO No</td><td className="font-semibold">{purchase.po_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(purchase.purchase_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Supplier</td><td>{purchase.supplier ? purchase.supplier.name : ""}</td></tr>
                <tr><td className="pr-3 text-gray-500">Supplier Bill No</td><td>{purchase.supplier_bill_no || "-"}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Store</td><td>{purchase.store ? purchase.store.name : ""}</td></tr>
                <tr><td className="pr-3 text-gray-500">Cash / Due</td><td>{purchase.cash_due_name || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Local / Import</td><td>{purchase.purchase_type_name || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Ship By</td><td>{purchase.ship_by_name || "-"}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={headCell}>SL</th>
                <th className={headCell}>Part Number</th>
                <th className={headCell}>Product Name</th>
                <th className={headCell}>Location</th>
                <th className={headCell}>Unit</th>
                <th className={headCell}>Qty</th>
                <th className={headCell}>Unit Price</th>
                <th className={headCell}>Weight Amount</th>
                <th className={headCell}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {purchase.details.map((detail: any, index: number) => (
                <tr key={detail.id}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>{detail.product ? detail.product.part_number : ""}</td>
                  <td className={cell}>{detail.product ? detail.product.name : ""}</td>
                  <td className={cell}>{detail.location ? detail.location.name : ""}</td>
                  <td className={cell}>{detail.unit}</td>
                  <td className={numberCell}>{detail.qty}</td>
                  <td className={numberCell}>{formatMoney(detail.unit_price)}</td>
                  <td className={numberCell}>{formatMoney(detail.total_weight_amount)}</td>
                  <td className={numberCell}>{formatMoney(detail.total_purchase_price)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={8} className={totalCell}>Grand Total</td>
                <td className={totalCell}>{formatMoney(purchase.grand_total)}</td>
              </tr>
              <tr>
                <td colSpan={8} className={totalCell}>Paid</td>
                <td className={totalCell}>{formatMoney(purchase.payment_amount)}</td>
              </tr>
              <tr>
                <td colSpan={8} className={totalCell}>Due</td>
                <td className={totalCell}>{formatMoney(purchase.due_amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {purchase.created_by ? purchase.created_by.name : ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Approved By: {purchase.approved_by ? purchase.approved_by.name : ""}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
