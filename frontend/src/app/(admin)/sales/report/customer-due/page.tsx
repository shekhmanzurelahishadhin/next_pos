"use client";
// parts_bazar sellItems/dueReport: every customer who owes money up to the date,
// with how many bills are not paid and how old the oldest one is
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
import { reportService, CustomerDueReport } from "@/services/reportService";

type Option = { value: string; label: string };
type Named = { id: number; name: string };

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ end_date: today(), company_id: "", customer_id: "" });

const money = (n: number) => Math.round(n).toLocaleString("en-US");

// older dues stand out more
const daysClass = (days: number) =>
  days > 90 ? "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
    : days > 30 ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
      : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400";

export default function CustomerDueReportPage() {
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState(0); // new key = fresh date picker on reset
  const [customerText, setCustomerText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [report, setReport] = useState<CustomerDueReport | null>(null);
  const [searched, setSearched] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (name: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    document.title = "Customer Due Report | Multibrand POS";
    api.get("/configure/companies", { params: { status: 1 } })
      .then((res) => {
        const list = res.data.data.data.map((c: Named) => ({ value: String(c.id), label: c.name }));
        setCompanies(list);
        if (list.length === 1) setForm((f) => ({ ...f, company_id: list[0].value }));
      })
      .catch(() => {});
  }, []);

  // stable function, so the date picker is not rebuilt on every render
  const changeEnd = useCallback((_d: Date[], value: string) => setForm((f) => ({ ...f, end_date: value })), []);

  const search = async () => {
    if (!form.end_date) return setError("Please select Up To date!");
    setError("");
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      setReport(await reportService.customerDue(params));
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
    due: rows.reduce((t, r) => t + r.due_amount, 0),
    bills: rows.reduce((t, r) => t + r.bill_qty, 0),
    over30: rows.filter((r) => r.due_days > 30).length,
  }), [rows]);

  const lines = searched && report
    ? [`Up To ${formatDate(searched.end_date)}`, ...Object.entries(report.labels).map(([k, v]) => `${k}: ${v}`)]
    : [];

  const heads = ["SL", "Due Days", "Customer Name", "Contact No", "Bill Qty", "Total Due"];

  return (
    <AccessRoute requiredPermissions={["customer-due-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Customer Due Report" }]} />

        <ReportSearchCard title="Customer Due Report" onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Up To" required>
            <DatePicker key={`e${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEnd} placeholder="Up to" />
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
            Pick the date, then press <b>Search</b> to see who owes money.
          </div>
        )}

        {report && (
          <ReportView
            title="Customer Due Report"
            lines={lines}
            company={report.company}
            fileName="customer-due-report"
            rowCount={rows.length}
            summary={[
              { label: "Customers With Due", value: String(rows.length) },
              { label: "Unpaid Bills", value: String(totals.bills) },
              { label: "Due Over 30 Days", value: String(totals.over30), tone: totals.over30 ? "error" : undefined },
              { label: "Total Due", value: money(totals.due), tone: "error" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  {heads.map((h, i) => (
                    <th key={h} className={`${rptTh} ${i === 5 ? "num text-right" : i === 1 || i === 4 ? "center text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={heads.length} className={`${rptTd} center py-6 text-center text-gray-400`}>No due found!</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
                    <td className={`${rptTd} center text-center`}>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${daysClass(r.due_days)}`}>{r.due_days}</span>
                    </td>
                    <td className={`${rptTd} min-w-[180px] font-medium text-gray-800 dark:text-white/90`}>{r.customer_name}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{r.phone}</td>
                    <td className={`${rptTd} center text-center`}>{r.bill_qty}</td>
                    <td className={`${rptTd} num text-right font-semibold text-error-600 dark:text-error-400`}>{money(r.due_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={4} className={`${rptTd} num text-right`}>Total:</td>
                    <td className={`${rptTd} center text-center`}>{totals.bills}</td>
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
