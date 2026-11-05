"use client";
// parts_bazar "Stock QTY Report" (inventory/stockReportInAmount) and "Inventory Stock Amount Report"
// (inventory/stockAmountReport): same search and query, one row per product + barcode.
// qty = opening, in, out, closing stock; amount = the same with purchase price x qty beside each
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import Autocomplete from "@/components/form/Autocomplete";
import ReportSearchCard, { ReportField, reportInputClass } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { reportService, ReportProduct, StockQtyReport, StockQtyRow } from "@/services/reportService";

type Option = { value: string; label: string; company_id?: string };

const SHOW_OPTIONS = [
  { value: "current", label: "Current" },
  { value: "all", label: "Show All" },
];

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + "01";
const emptyForm = () => ({
  start_date: monthStart(), end_date: today(), company_id: "", store_id: "", location_id: "",
  category_id: "", sub_category_id: "", product_id: "", barcode: "", show: "current",
});

const qty = (n: number) => Number(n.toFixed(2)).toLocaleString("en-US");
const amount = (n: number) => Math.round(n).toLocaleString("en-US");
type Named = { id: number; name: string; company_id?: number | null };
const toOptions = (list: Named[]): Option[] => list.map((x) => ({ value: String(x.id), label: x.name, company_id: String(x.company_id ?? "") }));

const KINDS = {
  qty: { title: "Stock QTY Report", reportTitle: "Inventory Stock Report", permission: "stock-qty-report.view", file: "stock-qty-report" },
  amount: { title: "Inventory Stock Amount Report", reportTitle: "Inventory Stock Amount Report", permission: "stock-amount-report.view", file: "stock-amount-report" },
};

export default function StockReport({ kind }: { kind: keyof typeof KINDS }) {
  const config = KINDS[kind];
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState(0); // new key = fresh date pickers on reset
  const [productText, setProductText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [stores, setStores] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [report, setReport] = useState<StockQtyReport | null>(null);
  const [searched, setSearched] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (name: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    document.title = `${config.title} | Multibrand POS`;
    const load = (url: string, setter: (o: Option[]) => void) =>
      api.get(url, { params: { status: 1 } }).then((res) => setter(toOptions(res.data.data.data))).catch(() => {});
    api.get("/configure/companies", { params: { status: 1 } })
      .then((res) => {
        const list = toOptions(res.data.data.data);
        setCompanies(list);
        // one company only: pick it, like the user's own company in parts_bazar
        if (list.length === 1) setForm((f) => ({ ...f, company_id: list[0].value }));
      })
      .catch(() => {});
    load("/configure/stores", setStores);
    load("/configure/categories", setCategories);
    // parts_bazar "Product Type" = sub category; same name is under many categories, so show "Engine (G)"
    Promise.all([
      api.get("/configure/categories", { params: { status: 1 } }),
      api.get("/configure/sub-categories", { params: { status: 1 } }),
    ]).then(([cats, subs]) => {
      const catNames = new Map<number, string>(cats.data.data.data.map((c: Named) => [c.id, c.name]));
      setSubCategories(subs.data.data.data.map((s: Named & { category_id: number }) => ({
        value: String(s.id),
        label: `${s.name} (${catNames.get(s.category_id) ?? "-"})`,
      })));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // locations of the picked store
  useEffect(() => {
    setLocations([]);
    if (!form.store_id) return;
    api.get("/configure/locations", { params: { store_id: form.store_id, status: 1 } })
      .then((res) => setLocations(toOptions(res.data.data.data)))
      .catch(() => {});
  }, [form.store_id]);

  const companyStores = useMemo(
    () => (form.company_id ? stores.filter((s) => s.company_id === form.company_id) : stores),
    [stores, form.company_id]
  );

  // stable functions, so the date pickers are not rebuilt on every render
  const changeStart = useCallback((_d: Date[], value: string) => setForm((f) => ({ ...f, start_date: value })), []);
  const changeEnd = useCallback((_d: Date[], value: string) => setForm((f) => ({ ...f, end_date: value })), []);

  const search = async () => {
    if (!form.start_date || !form.end_date) return setError("Please select a Start & End Date!");
    if (form.end_date < form.start_date) return setError("End Date can not be before Start Date.");
    setError("");
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      setReport(await reportService.stockReport(kind, params));
      setSearched(form);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({ ...emptyForm(), company_id: companies.length === 1 ? companies[0].value : "" });
    setProductText("");
    setError("");
    setFormKey((k) => k + 1);
  };

  const rows = useMemo(() => report?.rows ?? [], [report]);
  const totals = useMemo(() => rows.reduce(
    (t, r) => ({
      opening: t.opening + r.opening_stock, stockIn: t.stockIn + r.stock_in, stockOut: t.stockOut + r.stock_out,
      closing: t.closing + r.closing_stock, amount: t.amount + r.total_amount,
      price: t.price + r.purchase_price, openingAmount: t.openingAmount + r.opening_stock * r.purchase_price,
      inAmount: t.inAmount + r.stock_in * r.purchase_price, outAmount: t.outAmount + r.stock_out * r.purchase_price,
    }),
    { opening: 0, stockIn: 0, stockOut: 0, closing: 0, amount: 0, price: 0, openingAmount: 0, inAmount: 0, outAmount: 0 }
  ), [rows]);

  const lines = searched
    ? [
        `From: ${formatDate(searched.start_date)} To: ${formatDate(searched.end_date)}`,
        report?.store ? `STORE: ${report.store}${report?.location ? ` · LOCATION: ${report.location}` : ""}` : "ALL STORES",
      ]
    : [];

  return (
    <AccessRoute requiredPermissions={[config.permission]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Report" }, { title: config.title }]} />

        <ReportSearchCard title={config.title} onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Start Date" required>
            <DatePicker key={`s${formKey}`} id="rpt_start_date" defaultDate={form.start_date} onChange={changeStart} placeholder="Start date" />
          </ReportField>
          <ReportField label="End Date" required>
            <DatePicker key={`e${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEnd} placeholder="End date" />
          </ReportField>
          <ReportField label="Company">
            <ReactSelect
              options={companies}
              value={form.company_id || null}
              placeholder="All companies"
              isDisabled={companies.length === 1}
              onChange={(v) => setForm((f) => ({ ...f, company_id: v ? String(v) : "", store_id: "", location_id: "" }))}
            />
          </ReportField>
          <ReportField label="Store">
            <ReactSelect
              options={companyStores}
              value={form.store_id || null}
              placeholder="All stores"
              onChange={(v) => setForm((f) => ({ ...f, store_id: v ? String(v) : "", location_id: "" }))}
            />
          </ReportField>
          <ReportField label="Location">
            <ReactSelect
              options={locations}
              value={form.location_id || null}
              placeholder={form.store_id ? "All locations" : "Select store first"}
              isDisabled={!form.store_id}
              onChange={(v) => set("location_id", v ? String(v) : "")}
            />
          </ReportField>
          <ReportField label="Show">
            <ReactSelect options={SHOW_OPTIONS} value={form.show} isClearable={false} onChange={(v) => set("show", String(v ?? "current"))} />
          </ReportField>
          <ReportField label="Quality">
            <ReactSelect options={categories} value={form.category_id || null} placeholder="All" onChange={(v) => set("category_id", v ? String(v) : "")} />
          </ReportField>
          <ReportField label="Product Type">
            <ReactSelect options={subCategories} value={form.sub_category_id || null} placeholder="All" onChange={(v) => set("sub_category_id", v ? String(v) : "")} />
          </ReportField>
          <ReportField label="Product (name / part number)" className="sm:col-span-2">
            <Autocomplete<ReportProduct>
              value={productText}
              onChange={(text) => {
                setProductText(text);
                set("product_id", "");
              }}
              search={(term) => reportService.searchProducts(term)}
              onSelect={(p) => {
                setProductText(`${p.name} (${p.part_number})`);
                set("product_id", String(p.id));
              }}
              renderItem={(p) => (
                <span>
                  {p.name} <span className="text-gray-400">· {p.part_number}</span>
                </span>
              )}
              placeholder="Type 2+ letters"
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
            title={config.reportTitle}
            lines={lines}
            company={report.company}
            fileName={config.file}
            rowCount={rows.length}
            summary={kind === "qty" ? [
              { label: "Opening Stock", value: qty(totals.opening) },
              { label: "Stock In", value: qty(totals.stockIn), tone: "success" },
              { label: "Stock Out", value: qty(totals.stockOut), tone: "error" },
              { label: "Closing Stock", value: qty(totals.closing), tone: "brand" },
              { label: "Barcodes", value: String(rows.length) },
              { label: "Total Purchase", value: amount(totals.amount), tone: "brand" },
            ] : [
              { label: "Opening Amount", value: amount(totals.openingAmount) },
              { label: "Stock In Amount", value: amount(totals.inAmount), tone: "success" },
              { label: "Stock Out Amount", value: amount(totals.outAmount), tone: "error" },
              { label: "Closing Stock", value: qty(totals.closing) },
              { label: "Barcodes", value: String(rows.length) },
              { label: "Closing Amount", value: amount(totals.amount), tone: "brand" },
            ]}
          >
            {kind === "qty" ? <QtyTable rows={rows} totals={totals} /> : <AmountTable rows={rows} totals={totals} />}
          </ReportView>
        )}
      </div>
    </AccessRoute>
  );
}

type Totals = Record<"opening" | "stockIn" | "stockOut" | "closing" | "amount" | "price" | "openingAmount" | "inAmount" | "outAmount", number>;
const cellTone = (value: number, tone: string) => (value ? tone : "text-gray-400");

function QtyTable({ rows, totals }: { rows: StockQtyRow[]; totals: Totals }) {
  return (
    <table className="rpt-table w-full border-collapse text-xs">
      <thead>
        <tr>
          {["SL", "Item Desc.", "Part Number", "Barcode", "Quality", "Opening Stock", "Stock In", "Stock Out", "Closing Stock", "Purchase Price", "Total Purchase"].map((h, i) => (
            <th key={h} className={`${rptTh} ${i >= 5 ? "num text-right" : "text-left"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={11} className={`${rptTd} center py-6 text-center text-gray-400`}>No stock found for these conditions</td></tr>
        )}
        {rows.map((r, i) => (
          <tr key={`${r.product_id}-${r.barcode}`} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
            <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
            <td className={`${rptTd} min-w-[140px]`}>{r.product_name}</td>
            <td className={`${rptTd} whitespace-nowrap font-medium`}>{r.part_number}</td>
            <td className={`${rptTd} whitespace-nowrap`}>{r.barcode}</td>
            <td className={`${rptTd} center text-center`}>{r.category_name}</td>
            <td className={`${rptTd} num text-right`}>{qty(r.opening_stock)}</td>
            <td className={`${rptTd} num text-right ${r.stock_in ? "text-success-600 dark:text-success-400" : "text-gray-400"}`}>{qty(r.stock_in)}</td>
            <td className={`${rptTd} num text-right ${r.stock_out ? "text-error-600 dark:text-error-400" : "text-gray-400"}`}>{qty(r.stock_out)}</td>
            <td className={`${rptTd} num text-right font-semibold ${r.closing_stock < 0 ? "text-error-600" : ""}`}>{qty(r.closing_stock)}</td>
            <td className={`${rptTd} num text-right`}>{amount(r.purchase_price)}</td>
            <td className={`${rptTd} num text-right`}>{amount(r.total_amount)}</td>
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className={rptTotal}>
            <td colSpan={5} className={`${rptTd} num text-right`}>Total:</td>
            <td className={`${rptTd} num text-right`}>{qty(totals.opening)}</td>
            <td className={`${rptTd} num text-right`}>{qty(totals.stockIn)}</td>
            <td className={`${rptTd} num text-right`}>{qty(totals.stockOut)}</td>
            <td className={`${rptTd} num text-right`}>{qty(totals.closing)}</td>
            <td className={rptTd}></td>
            <td className={`${rptTd} num text-right`}>{amount(totals.amount)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// like parts_bazar stockAmountReportView: price x qty beside every qty; the price total is the sum of the prices
function AmountTable({ rows, totals }: { rows: StockQtyRow[]; totals: Totals }) {
  const heads = ["SL", "Item Desc.", "Part Number", "Barcode", "Quality", "Purchase Price", "Opening Stock", "Opening Stock Amount",
    "Stock In", "Stock In Amount", "Stock Out", "Stock Out Amount", "Closing Stock", "Closing Stock Amount"];
  return (
    <table className="rpt-table w-full border-collapse text-xs">
      <thead>
        <tr>
          {heads.map((h, i) => (
            <th key={h} className={`${rptTh} ${i >= 5 ? "num text-right" : "text-left"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={14} className={`${rptTd} center py-6 text-center text-gray-400`}>No stock found for these conditions</td></tr>
        )}
        {rows.map((r, i) => (
          <tr key={`${r.product_id}-${r.barcode}`} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
            <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
            <td className={`${rptTd} min-w-[140px]`}>{r.product_name}</td>
            <td className={`${rptTd} whitespace-nowrap font-medium`}>{r.part_number}</td>
            <td className={`${rptTd} whitespace-nowrap`}>{r.barcode}</td>
            <td className={`${rptTd} center text-center`}>{r.category_name}</td>
            <td className={`${rptTd} num text-right`}>{amount(r.purchase_price)}</td>
            <td className={`${rptTd} num text-right`}>{qty(r.opening_stock)}</td>
            <td className={`${rptTd} num text-right`}>{amount(r.opening_stock * r.purchase_price)}</td>
            <td className={`${rptTd} num text-right ${cellTone(r.stock_in, "text-success-600 dark:text-success-400")}`}>{qty(r.stock_in)}</td>
            <td className={`${rptTd} num text-right ${cellTone(r.stock_in, "text-success-600 dark:text-success-400")}`}>{amount(r.stock_in * r.purchase_price)}</td>
            <td className={`${rptTd} num text-right ${cellTone(r.stock_out, "text-error-600 dark:text-error-400")}`}>{qty(r.stock_out)}</td>
            <td className={`${rptTd} num text-right ${cellTone(r.stock_out, "text-error-600 dark:text-error-400")}`}>{amount(r.stock_out * r.purchase_price)}</td>
            <td className={`${rptTd} num text-right font-semibold ${r.closing_stock < 0 ? "text-error-600" : ""}`}>{qty(r.closing_stock)}</td>
            <td className={`${rptTd} num text-right font-semibold`}>{amount(r.total_amount)}</td>
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className={rptTotal}>
            <td colSpan={5} className={`${rptTd} num text-right`}>Total:</td>
            {[amount(totals.price), qty(totals.opening), amount(totals.openingAmount), qty(totals.stockIn), amount(totals.inAmount),
              qty(totals.stockOut), amount(totals.outAmount), qty(totals.closing), amount(totals.amount)].map((v, i) => (
              <td key={i} className={`${rptTd} num text-right`}>{v}</td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}
