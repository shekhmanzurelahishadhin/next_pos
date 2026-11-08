"use client";
// parts_bazar sellReturn/sellReturnReport: every returned line between the dates next to the sale line it came from;
// the return no, date, SO no and customer are merged over the lines of one return
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField, reportInputClass } from "@/components/report/ReportSearchCard";
import ReportView, { groupSpans, rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { CustomerPicker, ProductPicker } from "@/components/report/ReportPickers";
import { reportService, SalesReturnReport } from "@/services/reportService";

type Option = { value: string; label: string; category_id?: string };
type Named = { id: number; name: string; category_id?: number };

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + "01";
const emptyForm = () => ({
  start_date: monthStart(), end_date: today(), company_id: "", customer_id: "", category_id: "", sub_category_id: "", product_id: "", barcode: "",
});

const money = (n: number) => Math.round(n).toLocaleString("en-US");
const qty = (n: number) => Number(n.toFixed(2)).toLocaleString("en-US");

export default function SalesReturnReportPage() {
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState(0); // new key = fresh date pickers on reset
  const [customerText, setCustomerText] = useState("");
  const [productText, setProductText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [report, setReport] = useState<SalesReturnReport | null>(null);
  const [searched, setSearched] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (name: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    document.title = "Sales Return Report | Multibrand POS";
    api.get("/configure/companies", { params: { status: 1 } })
      .then((res) => {
        const list = res.data.data.data.map((c: Named) => ({ value: String(c.id), label: c.name }));
        setCompanies(list);
        if (list.length === 1) setForm((f) => ({ ...f, company_id: list[0].value }));
      })
      .catch(() => {});
    api.get("/configure/categories", { params: { status: 1 } })
      .then((res) => setCategories(res.data.data.data.map((c: Named) => ({ value: String(c.id), label: c.name }))))
      .catch(() => {});
    api.get("/configure/sub-categories", { params: { status: 1 } })
      .then((res) => setSubCategories(res.data.data.data.map((s: Named) => ({ value: String(s.id), label: s.name, category_id: String(s.category_id) }))))
      .catch(() => {});
  }, []);

  // sub categories of the picked category, like parts_bazar
  const categorySubs = useMemo(
    () => (form.category_id ? subCategories.filter((s) => s.category_id === form.category_id) : subCategories),
    [subCategories, form.category_id]
  );

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
      setReport(await reportService.salesReturn(params));
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
    setProductText("");
    setError("");
    setFormKey((k) => k + 1);
  };

  const rows = useMemo(() => report?.rows ?? [], [report]);
  const returnSpan = useMemo(() => groupSpans(rows, (r) => r.return_id), [rows]);
  const totals = useMemo(() => ({
    returns: new Set(rows.map((r) => r.return_id)).size,
    saleQty: rows.reduce((t, r) => t + r.sale_qty, 0),
    saleAmount: rows.reduce((t, r) => t + r.sale_amount, 0),
    returnQty: rows.reduce((t, r) => t + r.return_qty, 0),
    returnAmount: rows.reduce((t, r) => t + r.return_amount, 0),
  }), [rows]);

  const lines = searched && report
    ? [`From ${formatDate(searched.start_date)} To ${formatDate(searched.end_date)}`, ...Object.entries(report.labels).map(([k, v]) => `${k}: ${v}`)]
    : [];

  const heads = ["SL", "Return No", "Return Date", "SO Number", "Customer Name", "Part Number", "Barcode", "Product Name",
    "Sales Qty", "Unit Price", "Sales Amount", "Returned Qty", "Total Return Amount"];

  return (
    <AccessRoute requiredPermissions={["sales-return-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Sales Return Report" }]} />

        <ReportSearchCard title="Sales Return Report" onSearch={search} onReset={reset} loading={loading} error={error}>
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
          <ReportField label="Customer" className="sm:col-span-2 xl:col-span-3">
            <CustomerPicker
              text={customerText}
              onText={(t) => { setCustomerText(t); set("customer_id", ""); }}
              onPick={(id, t) => { setCustomerText(t); set("customer_id", id); }}
            />
          </ReportField>
          <ReportField label="Category">
            <ReactSelect
              options={categories}
              value={form.category_id || null}
              placeholder="All"
              onChange={(v) => setForm((f) => ({ ...f, category_id: v ? String(v) : "", sub_category_id: "" }))}
            />
          </ReportField>
          <ReportField label="Sub-Category">
            <ReactSelect options={categorySubs} value={form.sub_category_id || null} placeholder="All" onChange={(v) => set("sub_category_id", v ? String(v) : "")} />
          </ReportField>
          <ReportField label="Product (name / part number)" className="sm:col-span-2">
            <ProductPicker
              text={productText}
              onText={(t) => { setProductText(t); set("product_id", ""); }}
              onPick={(id, t) => { setProductText(t); set("product_id", id); }}
            />
          </ReportField>
          <ReportField label="Barcode">
            <input type="text" value={form.barcode} onChange={(e) => set("barcode", e.target.value.trim())} placeholder="Exact barcode" className={reportInputClass} />
          </ReportField>
        </ReportSearchCard>

        {!report && !loading && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Pick the dates and filters, then press <b>Search</b> to see the report.
          </div>
        )}

        {report && (
          <ReportView
            title="Sales Return Report"
            lines={lines}
            company={report.company}
            fileName="sales-return-report"
            rowCount={rows.length}
            summary={[
              { label: "Returns", value: String(totals.returns) },
              { label: "Sales Amount", value: money(totals.saleAmount) },
              { label: "Returned Qty", value: qty(totals.returnQty), tone: "error" },
              { label: "Return Amount", value: money(totals.returnAmount), tone: "error" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  {heads.map((h, i) => (
                    <th key={h} className={`${rptTh} ${i >= 8 ? "num text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={heads.length} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td></tr>
                )}
                {rows.map((r, i) => {
                  const span = returnSpan[i];
                  return (
                    <tr key={r.id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                      <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
                      {span && (
                        <>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top font-medium text-gray-800 dark:text-white/90`}>{r.return_no}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{formatDate(r.return_date)}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{r.so_no}</td>
                          <td rowSpan={span} className={`${rptTd} min-w-[130px] align-top`}>{r.customer_name}</td>
                        </>
                      )}
                      <td className={`${rptTd} whitespace-nowrap`}>{r.part_number}</td>
                      <td className={`${rptTd} whitespace-nowrap`}>{r.barcode}</td>
                      <td className={`${rptTd} min-w-[130px]`}>{r.product_name}</td>
                      <td className={`${rptTd} num text-right`}>{qty(r.sale_qty)}</td>
                      <td className={`${rptTd} num text-right`}>{money(r.sell_price)}</td>
                      <td className={`${rptTd} num text-right`}>{money(r.sale_amount)}</td>
                      <td className={`${rptTd} num text-right font-semibold text-error-600 dark:text-error-400`}>{qty(r.return_qty)}</td>
                      <td className={`${rptTd} num text-right font-semibold text-error-600 dark:text-error-400`}>{money(r.return_amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={8} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{qty(totals.saleQty)}</td>
                    <td className={rptTd}></td>
                    <td className={`${rptTd} num text-right`}>{money(totals.saleAmount)}</td>
                    <td className={`${rptTd} num text-right`}>{qty(totals.returnQty)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.returnAmount)}</td>
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
