"use client";
// parts_bazar sellItems/sellReport: every line of the approved sales between the dates,
// the order no, date, customer and grand total are merged over the lines of one order
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField, reportInputClass } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { CustomerPicker, ProductPicker } from "@/components/report/ReportPickers";
import { reportService, SalesReport } from "@/services/reportService";

type Option = { value: string; label: string; category_id?: string };
type Named = { id: number; name: string; category_id?: number };

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + "01";
const emptyForm = () => ({
  start_date: monthStart(), end_date: today(), customer_id: "", category_id: "", sub_category_id: "", product_id: "", barcode: "",
});

const money = (n: number) => Math.round(n).toLocaleString("en-US");
const qty = (n: number) => Number(n.toFixed(2)).toLocaleString("en-US");

export default function SalesReportPage() {
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState(0); // new key = fresh date pickers on reset
  const [customerText, setCustomerText] = useState("");
  const [productText, setProductText] = useState("");
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [searched, setSearched] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (name: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    document.title = "Sales Report | Multibrand POS";
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
      setReport(await reportService.sales(params));
      setSearched(form);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(emptyForm());
    setCustomerText("");
    setProductText("");
    setError("");
    setFormKey((k) => k + 1);
  };

  const rows = useMemo(() => report?.rows ?? [], [report]);

  // lines of one order are next to each other: the first line gets the merged cells
  const orderSpan = useMemo(() => {
    const span: Record<number, number> = {};
    rows.forEach((r, i) => {
      if (i > 0 && rows[i - 1].sale_id === r.sale_id) return;
      span[i] = rows.filter((x) => x.sale_id === r.sale_id).length;
    });
    return span;
  }, [rows]);

  const totals = useMemo(() => {
    const orders = new Map(rows.map((r) => [r.sale_id, r.grand_total]));
    return {
      orders: orders.size,
      qty: rows.reduce((t, r) => t + r.qty, 0),
      discount: rows.reduce((t, r) => t + r.discount, 0),
      lineTotal: rows.reduce((t, r) => t + r.total_amount, 0),
      grandTotal: [...orders.values()].reduce((t, v) => t + v, 0),
    };
  }, [rows]);

  const lines = searched && report
    ? [
        `From ${formatDate(searched.start_date)} To ${formatDate(searched.end_date)}`,
        ...Object.entries(report.labels).map(([k, v]) => `${k}: ${v}`),
      ]
    : [];

  const heads = ["SL", "Order No", "Order Date", "Customer Name", "Product Name", "Part Number", "Barcode", "Sales Qty", "Unit Price", "Discount", "Line Total", "Grand Total"];

  return (
    <AccessRoute requiredPermissions={["sales-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Sales Report" }]} />

        <ReportSearchCard title="Sales Report" onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Date From" required>
            <DatePicker key={`s${formKey}`} id="rpt_start_date" defaultDate={form.start_date} onChange={changeStart} placeholder="Date from" />
          </ReportField>
          <ReportField label="Date To" required>
            <DatePicker key={`e${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEnd} placeholder="Date to" />
          </ReportField>
          <ReportField label="Customer" className="sm:col-span-2">
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
            title="Sales Report"
            lines={lines}
            company={report.company}
            fileName="sales-report"
            rowCount={rows.length}
            summary={[
              { label: "Orders", value: String(totals.orders) },
              { label: "Sales Qty", value: qty(totals.qty) },
              { label: "Line Discount", value: money(totals.discount), tone: "error" },
              { label: "Line Total", value: money(totals.lineTotal) },
              { label: "Grand Total", value: money(totals.grandTotal), tone: "brand" },
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
                  const span = orderSpan[i];
                  return (
                    <tr key={r.id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                      <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
                      {span && (
                        <>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top font-medium text-gray-800 dark:text-white/90`}>{r.so_no}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{formatDate(r.order_date)}</td>
                          <td rowSpan={span} className={`${rptTd} min-w-[130px] align-top`}>{r.customer_name}</td>
                        </>
                      )}
                      <td className={`${rptTd} min-w-[130px]`}>{r.product_name}</td>
                      <td className={`${rptTd} whitespace-nowrap`}>{r.part_number}</td>
                      <td className={`${rptTd} whitespace-nowrap`}>{r.barcode}</td>
                      <td className={`${rptTd} num text-right`}>{qty(r.qty)}</td>
                      <td className={`${rptTd} num text-right`}>{money(r.sell_price)}</td>
                      <td className={`${rptTd} num text-right ${r.discount ? "text-error-600 dark:text-error-400" : "text-gray-400"}`}>{money(r.discount)}</td>
                      <td className={`${rptTd} num text-right`}>{money(r.total_amount)}</td>
                      {span && (
                        <td rowSpan={span} className={`${rptTd} num align-top text-right font-semibold text-gray-800 dark:text-white/90`}>{money(r.grand_total)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={7} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{qty(totals.qty)}</td>
                    <td className={rptTd}></td>
                    <td className={`${rptTd} num text-right`}>{money(totals.discount)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.lineTotal)}</td>
                    <td className={`${rptTd} num text-right`}>{money(totals.grandTotal)}</td>
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
