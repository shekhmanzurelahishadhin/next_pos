"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
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
    if (saleId) saleService.getSale(saleId).then(setSale);
  }, [saleId]);

  const print = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win || !printArea.current) return;
    win.document.write(`<html><head><title>${sale?.so_no ?? "Invoice"}</title><style>${PRINT_STYLE}</style></head><body>${printArea.current.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const s = sale;
  const total = s ? Number(s.grand_total) : 0;
  const received = s ? Number(s.received_amount) : 0;

  return (
    <Modal
      isOpen={!!saleId}
      onClose={onClose}
      className="max-w-4xl"
      title="Sales Invoice"
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" onClick={print} disabled={!s}>Print</Button>
        </>
      }
    >
      {!s ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{s.company?.name ?? "Invoice"}</h2>
            {s.company?.address && <div className="text-xs text-gray-500">{s.company.address}</div>}
            <h3 className="mt-1 text-sm">Invoice ({s.status_name})</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Customer</td><td className="font-semibold">{s.customer?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Contact Number</td><td>{s.mobile_no || s.customer?.phone || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Address</td><td>{s.customer?.address || "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Car</td><td>{[s.car_name, s.car_no].filter(Boolean).join(" / ") || "-"}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Invoice No</td><td className="font-semibold">{s.so_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Date</td><td>{formatDate(s.order_date)}</td></tr>
                <tr><td className="pr-3 text-gray-500">Cash / Due</td><td>{s.cash_due_name ?? "-"}</td></tr>
                <tr><td className="pr-3 text-gray-500">Memo No</td><td>{s.memo_no || "-"}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {["Sl No", "Description of Goods", "Qty", "Unit Price", "Amount"].map((h) => (
                  <th key={h} className={`${cell} text-left font-medium`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.details.map((d: any, i: number) => (
                <tr key={d.id}>
                  <td className={cell}>{i + 1}</td>
                  <td className={cell}>{d.product?.name} ({d.barcode})</td>
                  <td className={`${cell} text-right`}>{Number(d.qty)} {d.unit ?? ""}</td>
                  <td className={`${cell} text-right`}>{formatMoney(d.sell_price)}</td>
                  <td className={`${cell} text-right`}>{formatMoney(d.total_amount)}</td>
                </tr>
              ))}
              {[
                ["Total", total],
                ["Received", received],
                ["Due", Math.max(0, total - received)],
              ].map(([label, value]) => (
                <tr key={label as string}>
                  <td colSpan={4} className={`${cell} text-right font-semibold`}>{label} :</td>
                  <td className={`${cell} text-right font-semibold`}>{formatMoney(value as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-32 border-t border-gray-400 pt-1 text-center">Prepared By: {s.created_by?.name ?? ""}</span>
            <span className="w-32 border-t border-gray-400 pt-1 text-center">Received By</span>
            <span className="w-32 border-t border-gray-400 pt-1 text-center">Authorised signature</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
