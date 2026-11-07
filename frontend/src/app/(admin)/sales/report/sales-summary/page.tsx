"use client";
// parts_bazar sellItems/salesSummaryReport: one row per approved bill with the money received and the balance due
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { CustomerPicker } from "@/components/report/ReportPickers";
import { reportService, SalesSummaryReport } from "@/services/reportService";

type Option = { value: string; label: string };
type Named = { id: number; name: string };

const STATUS_OPTIONS = [
  { value: "0", label: "Due" },
  { value: "1", label: "Paid" },
];

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + "01";
const emptyForm = () => ({ start_date: monthStart(), end_date: today(), company_id: "", customer_type_id: "", customer_id: "", paid: "" });

const money = (n: number) => Math.round(n).toLocaleString("en-US");
const toOptions = (list: Named[]): Option[] => list.map((x) => ({ value: String(x.id), label: x.name }));

export default function SalesSummaryReportPage() {
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState(0); // new key = fresh date pickers on reset
  const [customerText, setCustomerText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [customerTypes, setCustomerTypes] = useState<Option[]>([]);
  const [report, setReport] = useState<SalesSummaryReport | null>(null);
  const [searched, setSearched] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (name: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    document.title = "Sales Summary Report | Multibrand POS";
    api.get("/configure/companies", { params: { status: 1 } })
      .then((res) => {
        const list = toOptions(res.data.data.data);
        setCompanies(list);
        if (list.length === 1) setForm((f) => ({ ...f, company_id: list[0].value }));
      })
      .catch(() => {});
    api.get("/configure/lookups", { params: { status: 1, type: "customer_type" } })
      .then((res) => setCustomerTypes(toOptions(res.data.data.data)))
      .catch(() => {});
  }, []);

  // stable functions, so the date pickers are not rebuilt on every render
  const changeStart = useCallback((_d: Date[], value: string) => setForm((f) => ({ ...f, start_date: value })), []);
  const changeEnd = useCallback((_d: Date[], value: string) => setForm((f) => ({ ...f, end_date: value })), []);

  const search = async () => {
    if (!form.start_date || !form.end_date) return setError("Please select date range!");
    if (form.end_date < form.start_date) return setError("Date To can not be before Date From.");
    setError("");
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      setReport(await reportService.salesSummary(params));
      setSearched(form);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({ ...emptyForm(), company_id: companies.length === 1 ? companies[0].value : "" });
    setCustomerText("");
    setError("");
    setFormKey((k) => k + 1);
  };

  const rows = useMemo(() => report?.rows ?? [], [report]);
  const totals = useMemo(() => ({
    bill: rows.reduce((t, r) => t + r.grand_total, 0),
    received: rows.reduce((t, r) => t + r.received_amount, 0),
    due: rows.reduce((t, r) => t + r.due_amount, 0),
    dueBills: rows.filter((r) => !r.paid).length,
  }), [rows]);

  const lines = searched && report
    ? [`From ${formatDate(searched.start_date)} To ${formatDate(searched.end_date)}`, ...Object.entries(report.labels).map(([k, v]) => `${k}: ${v}`)]
    : [];

  const heads = ["SL", "Bill Date", "Order Status", "Customer Type", "Customer Name", "Bill No", "Bill Amount", "Received Amount", "Balance Due"];

  return (
    <AccessRoute requiredPermissions={["sales-summary-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Sales Summary Report" }]} />

        <ReportSearchCard title="Sales Summary Report" onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Date From" required>
            <DatePicker key={`s${formKey}`} id="rpt_start_date" defaultDate={form.start_date} onChange={changeStart} placeholder="Date from" />
          </ReportField>
          <ReportField label="Date To" required>
            <DatePicker key={`e${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEnd} placeholder="Date to" />
          </ReportField>
          <ReportField label="Company">
            <ReactSelect
              options={companies}
              value={form.company_id || null}
              placeholder="All companies"
              isDisabled={companies.length === 1}
              onChange={(v) => set("company_id", v ? String(v) : "")}
            />
          </ReportField>
          <ReportField label="Customer Type">
            <ReactSelect options={customerTypes} value={form.customer_type_id || null} placeholder="All" onChange={(v) => set("customer_type_id", v ? String(v) : "")} />
          </ReportField>
          <ReportField label="Order Status">
            <ReactSelect options={STATUS_OPTIONS} value={form.paid || null} placeholder="All" onChange={(v) => set("paid", v === null ? "" : String(v))} />
          </ReportField>
          <ReportField label="Customer Name" className="sm:col-span-2">
            <CustomerPicker
              text={customerText}
              onText={(t) => { setCustomerText(t); set("customer_id", ""); }}
              onPick={(id, t) => { setCustomerText(t); set("customer_id", id); }}
            />
          </ReportField>
        </ReportSearchCard>

        {!report && !loading && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Pick the dates and filters, then press <b>Search</b> to see the report.
          </div>
        )}

        {report && (
          <ReportView
            title="Sales Summary Report"
            lines={lines}
            company={report.company}
            fileName="sales-summary-report"
            rowCount={rows.length}
            summary={[
              { label: "Bills", value: String(rows.length) },
              { label: "Due Bills", value: String(totals.dueBills), tone: totals.dueBills ? "error" : undefined },
              { label: "Bill Amount", value: money(totals.bill) },
              { label: "Received", value: money(totals.received), tone: "success" },
              { label: "Balance Due", value: money(totals.due), tone: totals.due > 0 ? "error" : undefined },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  {heads.map((h, i) => (
                    <th key={h} className={`${rptTh} ${i >= 6 ? "num text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={heads.length} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{formatDate(r.order_date)}</td>
                    <td className={rptTd}>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.paid
                        ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                        : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"}`}
                      >
                        {r.paid ? "Paid" : "Due"}
                      </span>
                    </td>
                    <td className={rptTd}>{r.customer_type}</td>
                    <td className={`${rptTd} min-w-[150px]`}>{r.customer_name}</td>
                    <td className={`${rptTd} whitespace-nowrap font-medium text-gray-800 dark:text-white/90`}>{r.so_no}</td>
                    <td className={`${rptTd} num text-right`}>{money(r.grand_total)}</td>
                    <td className={`${rptTd} num text-right text-success-600 dark:text-success-400`}>{money(r.received_amount)}</td>
                    <td className={`${rptTd} num text-right font-semibold ${r.due_amount > 0 ? "text-error-600 dark:text-error-400" : ""}`}>{money(r.due_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={6} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.bill)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.received)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.due)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </ReportView>
        )}
      </div>
    </AccessRoute>
  );
}
