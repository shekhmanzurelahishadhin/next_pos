"use client";
// Audit report, like parts_bazar inventoryAudit/preview: ERP qty, physical qty and the difference
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { printHtml } from "@/lib/print";
import { formatDate } from "@/lib/format";
import { inventoryAuditService } from "@/services/inventoryAuditService";

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
const diffText = (diff: number) => (diff > 0 ? `+${diff}` : String(diff));

export function InventoryAuditViewModal({ auditId, onClose }: { auditId: number | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [onlyDifference, setOnlyDifference] = useState(false);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null);
    setOnlyDifference(false);
    if (auditId) inventoryAuditService.getAudit(auditId).then(setData).catch(() => toast.error("Failed to load audit"));
  }, [auditId]);

  const print = () => {
    if (printArea.current) printHtml(data?.entry_no ?? "Inventory Audit", printArea.current.innerHTML, PRINT_STYLE);
  };

  const r = data;
  const lines: any[] = r ? r.details.filter((d: any) => !onlyDifference || Number(d.physical_qty) !== Number(d.erp_qty)) : [];
  const erp = lines.reduce((s, d) => s + Number(d.erp_qty), 0);
  const physical = lines.reduce((s, d) => s + Number(d.physical_qty), 0);

  return (
    <Modal
      isOpen={!!auditId}
      onClose={onClose}
      className="max-w-5xl"
      title="Inventory Audit"
      footer={
        <>
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={onlyDifference} onChange={(e) => setOnlyDifference(e.target.checked)} />
            Show only differences
          </label>
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
            <h2 className="text-lg font-semibold">{r.company?.name ?? "Inventory Audit"}</h2>
            {r.company?.address && <div className="text-xs text-gray-500">{r.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold">INVENTORY AUDIT{onlyDifference ? " (DIFFERENCES)" : ""}</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Entry No</td><td className="font-semibold">{r.entry_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Audit Name</td><td>{r.audit_name?.audit_name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Audit Period</td><td>{formatDate(r.audit_name?.from_date)} to {formatDate(r.audit_name?.to_date)}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Store</td><td>{r.store?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Location</td><td>{r.location?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Created</td><td>{r.created_by?.name} · {formatDate(r.created_at)}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                {["SL", "Product Name", "Product Code", "Barcode", "ERP Location", "ERP Qty", "Physical Qty", "Difference"].map((h) => (
                  <th key={h} className={`${cell} text-left font-medium`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={8} className={`${cell} text-center text-gray-400`}>No difference found</td></tr>
              )}
              {lines.map((d: any, i: number) => {
                const diff = Number(d.physical_qty) - Number(d.erp_qty);
                return (
                  <tr key={d.id}>
                    <td className={cell}>{i + 1}</td>
                    <td className={cell}>{d.product?.name}</td>
                    <td className={cell}>{d.product?.part_number}</td>
                    <td className={cell}>{d.barcode}</td>
                    <td className={cell}>{d.location?.name}</td>
                    <td className={`${cell} text-right`}>{Number(d.erp_qty)}</td>
                    <td className={`${cell} text-right`}>{Number(d.physical_qty)}</td>
                    <td className={`${cell} text-right font-semibold ${diff < 0 ? "text-error-600" : diff > 0 ? "text-warning-600" : ""}`}>{diffText(diff)}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={5} className={`${cell} text-right font-semibold`}>Total Qty</td>
                <td className={`${cell} text-right font-semibold`}>{erp}</td>
                <td className={`${cell} text-right font-semibold`}>{physical}</td>
                <td className={`${cell} text-right font-semibold`}>{diffText(physical - erp)}</td>
              </tr>
              {r.remarks && (
                <tr>
                  <td className={cell}>Remarks</td>
                  <td colSpan={7} className={cell}>{r.remarks}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="sign mt-14 flex justify-between text-xs">
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Counted By</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Store Manager</span>
            <span className="w-40 border-t border-gray-400 pt-1 text-center">Checked By</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
