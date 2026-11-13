"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { printHtml } from "@/lib/print";
import { formatDate, formatMoney } from "@/lib/format";
import { saleService } from "@/services/saleService";

interface SaleInvoiceProps {
  saleId: number | null;
  onClose: () => void;
}

// Plain styles for the print window (the app's Tailwind classes are not loaded there)
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

// parts_bazar soReport: invoice with total, received and due
export function SaleInvoice({ saleId, onClose }: SaleInvoiceProps) {
  const [sale, setSale] = useState<any>(null);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSale(null);
    if (saleId) {
      saleService.getSale(saleId)
        .then(setSale)
        .catch(() => toast.error("Failed to load sale"));
    }
  }, [saleId]);

  function print() {
    if (!printArea.current) {
      return;
    }
    const title = sale ? sale.so_no : "Invoice";
    printHtml(title, printArea.current.innerHTML, PRINT_STYLE);
  }

  let total = 0;
  let received = 0;
  let due = 0;
  let contactNumber = "-";
  let carText = "-";
  if (sale) {
    total = Number(sale.grand_total);
    received = Number(sale.received_amount);
    due = total - received;
    if (due < 0) {
      due = 0;
    }

    // the mobile number of the SO, or else the customer's phone
    if (sale.mobile_no) {
      contactNumber = sale.mobile_no;
    } else if (sale.customer && sale.customer.phone) {
      contactNumber = sale.customer.phone;
    }

    // car name and car no, whichever are filled
    const carParts: string[] = [];
    if (sale.car_name) {
      carParts.push(sale.car_name);
    }
    if (sale.car_no) {
      carParts.push(sale.car_no);
    }
    if (carParts.length > 0) {
      carText = carParts.join(" / ");
    }
  }

  return (
    <Modal
      isOpen={!!saleId}
      onClose={onClose}
      className="max-w-4xl"
      title="Sales Invoice"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!sale}>Print</Button>
        </>
      }
    >
      {!sale ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{sale.company ? sale.company.name : "Invoice"}</h2>
            {sale.company?.address && <div className="text-xs text-gray-500">{sale.company.address}</div>}
            <h3 className="mt-1 text-sm">Invoice ({sale.status_name})</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Customer</td><td className="font-semibold">{sale.customer?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Contact Number</td><td>{contactNumber}</td></tr>
                <tr><td className="pr-3 text-gray-500">Address</td><td>{sale.customer?.address || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Car</td><td>{carText}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Invoice No</td><td className="font-semibold">{sale.so_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(sale.order_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Cash / Due</td><td>{sale.cash_due_name ?? "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Memo No</td><td>{sale.memo_no || "-"}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={`${cell} text-left font-medium`}>Sl No</th>
                <th className={`${cell} text-left font-medium`}>Description of Goods</th>
                <th className={`${cell} text-left font-medium`}>Qty</th>
                <th className={`${cell} text-left font-medium`}>Unit Price</th>
                <th className={`${cell} text-left font-medium`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.details.map((detail: any, index: number) => (
                <tr key={detail.id}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>{detail.product?.name} ({detail.barcode})</td>
                  <td className={`${cell} text-right`}>{Number(detail.qty)} {detail.unit ?? ""}</td>
                  <td className={`${cell} text-right`}>{formatMoney(detail.sell_price)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(detail.total_amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className={`${cell} text-right font-semibold`}>Total :</td>
                <td className={`${cell} text-right font-semibold`}>{formatMoney(total)}</td>
              </tr>
              <tr>
                <td colSpan={4} className={`${cell} text-right font-semibold`}>Received :</td>
                <td className={`${cell} text-right font-semibold`}>{formatMoney(received)}</td>
              </tr>
              <tr>
                <td colSpan={4} className={`${cell} text-right font-semibold`}>Due :</td>
                <td className={`${cell} text-right font-semibold`}>{formatMoney(due)}</td>
              </tr>
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-32 border-t border-gray-400 pt-1 text-center">Prepared By: {sale.created_by ? sale.created_by.name : ""}</span>
            <span className="w-32 border-t border-gray-400 pt-1 text-center">Received By</span>
            <span className="w-32 border-t border-gray-400 pt-1 text-center">Authorised signature</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
