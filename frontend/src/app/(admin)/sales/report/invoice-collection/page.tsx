"use client";
// parts_bazar moneyReceipt/invoiceWiseCollectionReport: every invoice line of the money receipts between the dates;
// date, MR no, customer, type and the MR total are merged over the lines of one MR
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PAYMENT_TYPES, paymentTypeName } from "@/lib/payment";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { groupSpans, rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { CustomerPicker } from "@/components/report/ReportPickers";
import { reportService, InvoiceCollectionReport } from "@/services/reportService";

type Option = { value: string; label: string };
type Named = { id: number; name: string };

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + "01";
const emptyForm = () => ({ start_date: monthStart(), end_date: today(), company_id: "", received_type: "", bank_name: "", customer_id: "" });

const money = (n: number) => Math.round(n).toLocaleString("en-US");

export default function InvoiceCollectionReportPage() {
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState(0); // new key = fresh date pickers on reset
  const [customerText, setCustomerText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [banks, setBanks] = useState<Option[]>([]);
  const [report, setReport] = useState<InvoiceCollectionReport | null>(null);
  const [searched, setSearched] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (name: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    document.title = "Invoice Wise Collection Report | Multibrand POS";
    api.get("/configure/companies", { params: { status: 1 } })
      .then((res) => {
        const list = res.data.data.data.map((c: Named) => ({ value: String(c.id), label: c.name }));
        setCompanies(list);
        if (list.length === 1) setForm((f) => ({ ...f, company_id: list[0].value }));
      })
      .catch(() => {});
    // the bank is saved by name on the money receipt
    api.get("/configure/lookups", { params: { status: 1, type: "bank_name" } })
      .then((res) => setBanks(res.data.data.data.map((b: Named) => ({ value: b.name, label: b.name }))))
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
      setReport(await reportService.invoiceCollection(params));
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
  const mrSpan = useMemo(() => groupSpans(rows, (r) => r.mr_no), [rows]);
  const totals = useMemo(() => ({
    mrs: new Set(rows.map((r) => r.mr_no)).size,
    received: rows.reduce((t, r) => t + r.received_amount, 0),
    discount: rows.reduce((t, r) => t + r.discount, 0),
    vds: rows.reduce((t, r) => t + r.vds, 0),
    tds: rows.reduce((t, r) => t + r.tds, 0),
  }), [rows]);
  const grandTotal = totals.received + totals.discount + totals.vds + totals.tds;

  const lines = searched && report
    ? [`From ${formatDate(searched.start_date)} To ${formatDate(searched.end_date)}`, ...Object.entries(report.labels).map(([k, v]) => `${k}: ${v}`)]
    : [];

  const heads = ["SL", "Date", "MR No", "Customer Name", "Receive Type", "Manual No", "Invoice No",
    "Received Amount", "Discount Amount", "VDS Amount", "TDS Amount", "Total Amount"];

  return (
    <AccessRoute requiredPermissions={["invoice-wise-collection-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Invoice Wise Collection Report" }]} />

        <ReportSearchCard title="Invoice Wise Collection Report" onSearch={search} onReset={reset} loading={loading} error={error}>
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
          <ReportField label="MR Type">
            <ReactSelect options={PAYMENT_TYPES} value={form.received_type || null} placeholder="All" onChange={(v) => set("received_type", v ? String(v) : "")} />
          </ReportField>
          <ReportField label="Bank Name">
            <ReactSelect options={banks} value={form.bank_name || null} placeholder="All" onChange={(v) => set("bank_name", v ? String(v) : "")} />
          </ReportField>
          <ReportField label="Customer" className="sm:col-span-2 xl:col-span-1">
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
            title="Invoice Wise Collection Report"
            lines={lines}
            company={report.company}
            fileName="invoice-wise-collection-report"
            rowCount={rows.length}
            summary={[
              { label: "Money Receipts", value: String(totals.mrs) },
              { label: "Invoice Lines", value: String(rows.length) },
              { label: "Received", value: money(totals.received), tone: "success" },
              { label: "Discount + VDS + TDS", value: money(totals.discount + totals.vds + totals.tds) },
              { label: "Total Amount", value: money(grandTotal), tone: "brand" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  {heads.map((h, i) => (
                    <th key={h} className={`${rptTh} ${i >= 7 ? "num text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={heads.length} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td></tr>
                )}
                {rows.map((r, i) => {
                  const span = mrSpan[i];
                  return (
                    <tr key={r.id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                      <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
                      {span && (
                        <>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{formatDate(r.receipt_date)}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top font-medium text-gray-800 dark:text-white/90`}>{r.mr_no}</td>
                          <td rowSpan={span} className={`${rptTd} min-w-[140px] align-top`}>{r.customer_name}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{paymentTypeName(r.received_type ?? "1")}</td>
                        </>
                      )}
                      <td className={rptTd}>{r.memo_no}</td>
                      <td className={`${rptTd} whitespace-nowrap ${r.invoice_no === "Opening Balance" || r.invoice_no === "Advance" ? "italic text-gray-500" : ""}`}>{r.invoice_no}</td>
                      <td className={`${rptTd} num text-right font-semibold text-success-600 dark:text-success-400`}>{money(r.received_amount)}</td>
                      <td className={`${rptTd} num text-right ${r.discount ? "" : "text-gray-400"}`}>{money(r.discount)}</td>
                      <td className={`${rptTd} num text-right ${r.vds ? "" : "text-gray-400"}`}>{money(r.vds)}</td>
                      <td className={`${rptTd} num text-right ${r.tds ? "" : "text-gray-400"}`}>{money(r.tds)}</td>
                      {span && (
                        <td rowSpan={span} className={`${rptTd} num align-top text-right font-semibold`}>{money(r.mr_total)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={7} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.received)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.discount)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.vds)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.tds)}</td>
                    <td className={`${rptTd} num text-right`}>{money(grandTotal)}</td>
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
