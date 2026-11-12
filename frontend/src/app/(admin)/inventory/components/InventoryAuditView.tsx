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

// a difference shown with its sign: +2, -3, 0
function diffText(diff: number) {
  if (diff > 0) {
    return `+${diff}`;
  }
  return String(diff);
}

// red when stock is short, orange when there is more than the ERP shows
function diffClass(diff: number) {
  if (diff < 0) {
    return "text-error-600";
  }
  if (diff > 0) {
    return "text-warning-600";
  }
  return "";
}

export function InventoryAuditViewModal({ auditId, onClose }: { auditId: number | null; onClose: () => void }) {
  const [audit, setAudit] = useState<any>(null);
  const [onlyDifference, setOnlyDifference] = useState(false);
  const printArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAudit(null);
    setOnlyDifference(false);
    if (auditId) {
      inventoryAuditService.getAudit(auditId)
        .then(setAudit)
        .catch(() => toast.error("Failed to load audit"));
    }
  }, [auditId]);

  function print() {
    if (!printArea.current) {
      return;
    }
    const title = audit ? audit.entry_no : "Inventory Audit";
    printHtml(title, printArea.current.innerHTML, PRINT_STYLE);
  }

  // the lines to show, and their totals
  const lines: any[] = [];
  let erpTotal = 0;
  let physicalTotal = 0;
  if (audit) {
    for (const line of audit.details) {
      const isDifferent = Number(line.physical_qty) !== Number(line.erp_qty);
      if (onlyDifference && !isDifferent) {
        continue;
      }
      lines.push(line);
      erpTotal += Number(line.erp_qty);
      physicalTotal += Number(line.physical_qty);
    }
  }

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
          <Button type="button" size="sm" onClick={print} disabled={!audit}>Print</Button>
        </>
      }
    >
      {!audit ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : (
        <div ref={printArea} className="text-[13px] text-gray-800 dark:text-gray-200">
          <div className="text-center">
            <h2 className="text-lg font-semibold">{audit.company ? audit.company.name : "Inventory Audit"}</h2>
            {audit.company?.address && <div className="text-xs text-gray-500">{audit.company.address}</div>}
            <h3 className="mt-1 text-sm font-semibold">INVENTORY AUDIT{onlyDifference ? " (DIFFERENCES)" : ""}</h3>
          </div>

          <div className="info my-3 flex flex-wrap justify-between gap-6">
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Entry No</td><td className="font-semibold">{audit.entry_no}</td></tr>
                <tr><td className="pr-3 text-gray-500">Audit Name</td><td>{audit.audit_name?.audit_name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Audit Period</td><td>{formatDate(audit.audit_name?.from_date)} to {formatDate(audit.audit_name?.to_date)}</td></tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr><td className="pr-3 text-gray-500">Store</td><td>{audit.store?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Location</td><td>{audit.location?.name}</td></tr>
                <tr><td className="pr-3 text-gray-500">Created</td><td>{audit.created_by?.name} · {formatDate(audit.created_at)}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="items w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className={`${cell} text-left font-medium`}>SL</th>
                <th className={`${cell} text-left font-medium`}>Product Name</th>
                <th className={`${cell} text-left font-medium`}>Product Code</th>
                <th className={`${cell} text-left font-medium`}>Barcode</th>
                <th className={`${cell} text-left font-medium`}>ERP Location</th>
                <th className={`${cell} text-left font-medium`}>ERP Qty</th>
                <th className={`${cell} text-left font-medium`}>Physical Qty</th>
                <th className={`${cell} text-left font-medium`}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={8} className={`${cell} text-center text-gray-400`}>No difference found</td></tr>
              )}
              {lines.map((line, index) => {
                const diff = Number(line.physical_qty) - Number(line.erp_qty);
                return (
                  <tr key={line.id}>
                    <td className={cell}>{index + 1}</td>
                    <td className={cell}>{line.product?.name}</td>
                    <td className={cell}>{line.product?.part_number}</td>
                    <td className={cell}>{line.barcode}</td>
                    <td className={cell}>{line.location?.name}</td>
                    <td className={`${cell} text-right`}>{Number(line.erp_qty)}</td>
                    <td className={`${cell} text-right`}>{Number(line.physical_qty)}</td>
                    <td className={`${cell} text-right font-semibold ${diffClass(diff)}`}>{diffText(diff)}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={5} className={`${cell} text-right font-semibold`}>Total Qty</td>
                <td className={`${cell} text-right font-semibold`}>{erpTotal}</td>
                <td className={`${cell} text-right font-semibold`}>{physicalTotal}</td>
                <td className={`${cell} text-right font-semibold`}>{diffText(physicalTotal - erpTotal)}</td>
              </tr>
              {audit.remarks && (
                <tr>
                  <td className={cell}>Remarks</td>
                  <td colSpan={7} className={cell}>{audit.remarks}</td>
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
