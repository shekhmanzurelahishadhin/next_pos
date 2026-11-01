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

// PO voucher like the parts_bazar "PR Voucher Preview": shown after saving and from Purchase Manage
export function PurchaseVoucher({ purchaseId, onClose }: PurchaseVoucherProps) {
  const [purchase, setPurchase] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPurchase(null);
    if (purchaseId) purchaseService.getPurchase(purchaseId).then(setPurchase);
  }, [purchaseId]);

  const print = () => {
    if (printArea.current) printHtml(purchase?.po_no ?? "Purchase", printArea.current.innerHTML, PRINT_STYLE);
  };

  const p = purchase;

  return (
    <Modal
      isOpen={!!purchaseId}
      onClose={onClose}
      className="max-w-4xl"
      title="Purchase Voucher Preview"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!p}>Print</Button>
        </>
      }
    >
      {!p ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="center text-center">
            <h2 className="text-lg font-semibold">{p.company?.name ?? "Purchase Order"}</h2>
            {p.company?.address && <div className="text-xs text-gray-500">{p.company.address}</div>}
            <h3 className="mt-1 text-sm">Purchase Order ({p.status_name})</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">PO No</td><td className="font-semibold">{p.po_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(p.purchase_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Supplier</td><td>{p.supplier?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Supplier Bill No</td><td>{p.supplier_bill_no || "-"}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Store</td><td>{p.store?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Cash / Due</td><td>{p.cash_due_name ?? "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Local / Import</td><td>{p.purchase_type_name ?? "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Ship By</td><td>{p.ship_by_name ?? "-"}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {["SL", "Part Number", "Product Name", "Location", "Unit", "Qty", "Unit Price", "Weight Amount", "Total"].map((h) => (
                  <th key={h} className="border border-gray-200 px-2 py-1.5 text-left font-medium dark:border-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.details.map((d: any, i: number) => (
                <tr key={d.id}>
                  <td className="border border-gray-200 px-2 py-1 dark:border-gray-700">{i + 1}</td>
                  <td className="border border-gray-200 px-2 py-1 dark:border-gray-700">{d.product?.part_number}</td>
                  <td className="border border-gray-200 px-2 py-1 dark:border-gray-700">{d.product?.name}</td>
                  <td className="border border-gray-200 px-2 py-1 dark:border-gray-700">{d.location?.name}</td>
                  <td className="border border-gray-200 px-2 py-1 dark:border-gray-700">{d.unit}</td>
                  <td className="right border border-gray-200 px-2 py-1 text-right dark:border-gray-700">{d.qty}</td>
                  <td className="right border border-gray-200 px-2 py-1 text-right dark:border-gray-700">{formatMoney(d.unit_price)}</td>
                  <td className="right border border-gray-200 px-2 py-1 text-right dark:border-gray-700">{formatMoney(d.total_weight_amount)}</td>
                  <td className="right border border-gray-200 px-2 py-1 text-right dark:border-gray-700">{formatMoney(d.total_purchase_price)}</td>
                </tr>
              ))}
              {[
                ["Grand Total", p.grand_total],
                ["Paid", p.payment_amount],
                ["Due", p.due_amount],
              ].map(([label, value]) => (
                <tr key={label as string}>
                  <td colSpan={8} className="right border border-gray-200 px-2 py-1 text-right font-semibold dark:border-gray-700">{label}</td>
                  <td className="right border border-gray-200 px-2 py-1 text-right font-semibold dark:border-gray-700">{formatMoney(value as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Prepared By: {p.created_by?.name ?? ""}</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Approved By: {p.approved_by?.name ?? ""}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
