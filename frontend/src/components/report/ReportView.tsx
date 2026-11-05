"use client";
// Result part of every report: company header, title, the table and Print / Excel buttons.
// The report table uses the "rpt-*" classes so the print copy looks the same without Tailwind.
import { useRef } from "react";
import { FiFileText, FiPrinter } from "react-icons/fi";
import { printHtml } from "@/lib/print";
import { ReportCompany } from "@/services/reportService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PRINT_STYLE = `
  @page { margin: 12mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; }
  .rpt-head { text-align: center; margin-bottom: 10px; }
  .rpt-head img { max-height: 50px; margin-bottom: 4px; }
  .rpt-company { font-size: 16px; font-weight: bold; }
  .rpt-address { font-size: 11px; color: #444; }
  .rpt-title { font-size: 14px; font-weight: bold; margin-top: 6px; text-transform: uppercase; }
  .rpt-sub { font-size: 11px; color: #333; }
  table.rpt-table { width: 100%; border-collapse: collapse; }
  table.rpt-table th, table.rpt-table td { border: 1px solid #999; padding: 3px 5px; }
  table.rpt-table th { background: #eee; text-transform: uppercase; font-size: 10px; }
  table.rpt-table thead { display: table-header-group; }
  table.rpt-table tr { page-break-inside: avoid; }
  .num { text-align: right; }
  .center { text-align: center; }
  .rpt-total td { font-weight: bold; background: #f3f3f3; }
`;

export const rptTh = "rpt-th sticky top-0 z-10 border border-gray-200 bg-gray-100 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
export const rptTd = "border border-gray-200 px-2 py-1.5 dark:border-gray-700";
export const rptTotal = "rpt-total bg-gray-50 font-semibold text-gray-800 dark:bg-white/[0.04] dark:text-white/90";

interface Props {
  title: string;
  lines: string[]; // under the title: period, store ...
  company: ReportCompany | null;
  fileName: string;
  rowCount: number;
  summary?: { label: string; value: string; tone?: "success" | "error" | "brand" }[];
  children: React.ReactNode;
}

const toneClass = {
  success: "text-success-600 dark:text-success-400",
  error: "text-error-600 dark:text-error-400",
  brand: "text-brand-600 dark:text-brand-400",
};

export default function ReportView({ title, lines, company, fileName, rowCount, summary, children }: Props) {
  const area = useRef<HTMLDivElement>(null);

  const print = () => {
    if (area.current) printHtml(title, area.current.innerHTML, PRINT_STYLE);
  };

  // xlsx is loaded only when exporting
  const exportExcel = async () => {
    const table = area.current?.querySelector("table");
    if (!table) return;
    const XLSX = await import("xlsx");
    const book = XLSX.utils.table_to_book(table, { sheet: "Report" });
    XLSX.writeFile(book, `${fileName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const logo = company?.logo ? (company.logo.startsWith("http") ? company.logo : `${API_BASE_URL}/storage/${company.logo.replace(/^\//, "")}`) : null;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-800 dark:text-white/90">{rowCount}</span> row{rowCount === 1 ? "" : "s"} found
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportExcel}
            disabled={rowCount === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success-300 px-3 text-xs font-medium text-success-700 hover:bg-success-50 disabled:opacity-50 dark:border-success-500/40 dark:text-success-400 dark:hover:bg-success-500/10"
          >
            <FiFileText className="size-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={print}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-gray-800 px-3 text-xs font-medium text-white hover:bg-gray-700 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <FiPrinter className="size-3.5" /> Print
          </button>
        </div>
      </div>

      {summary && summary.length > 0 && (
        <div className="grid grid-cols-2 gap-px border-b border-gray-100 bg-gray-100 sm:grid-cols-3 lg:grid-cols-6 dark:border-gray-800 dark:bg-gray-800">
          {summary.map((s) => (
            <div key={s.label} className="bg-white px-4 py-2.5 dark:bg-gray-900">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</div>
              <div className={`text-base font-semibold ${s.tone ? toneClass[s.tone] : "text-gray-800 dark:text-white/90"}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div ref={area} className="p-4 text-[13px] text-gray-800 dark:text-gray-200">
        <div className="rpt-head mb-3 text-center">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="mx-auto mb-1 max-h-12" />
          )}
          {company && <div className="rpt-company text-lg font-bold">{company.name}</div>}
          {company?.address && <div className="rpt-address text-xs text-gray-500">{company.address}</div>}
          <div className="rpt-title mt-1 text-sm font-bold uppercase tracking-wide">{title}</div>
          {lines.map((line) => (
            <div key={line} className="rpt-sub text-xs text-gray-600 dark:text-gray-400">{line}</div>
          ))}
        </div>
        <div className="max-h-[65vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}
