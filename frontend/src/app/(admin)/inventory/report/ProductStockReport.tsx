"use client";
// parts_bazar "Alert Quantity Report" (inventory/alertQtyReport) and "Out Of Stock Report" (inventory/outOfStockReport):
// one row per product, stock counted over all time ("Upto today")
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReactSelect from "@/components/form/ReactSelect";
import Autocomplete from "@/components/form/Autocomplete";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh } from "@/components/report/ReportView";
import { reportService, ProductStockReport as Report, ReportProduct } from "@/services/reportService";

type Option = { value: string; label: string };
type Named = { id: number; name: string; category_id?: number };

const KINDS = {
  "alert-qty": { title: "Alert Quantity Report", permission: "alert-qty-report.view", withCompany: false },
  "out-of-stock": { title: "Out Of Stock Report", permission: "out-of-stock-report.view", withCompany: true },
};

const emptyForm = () => ({ company_id: "", sub_category_id: "", brand_id: "", product_id: "" });
const qty = (n?: number) => Number((n ?? 0).toFixed(2)).toLocaleString("en-US");
const toOptions = (list: Named[]): Option[] => list.map((x) => ({ value: String(x.id), label: x.name }));

export default function ProductStockReport({ kind }: { kind: keyof typeof KINDS }) {
  const config = KINDS[kind];
  const isAlert = kind === "alert-qty";
  const [form, setForm] = useState(emptyForm);
  const [productText, setProductText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [searchedAt, setSearchedAt] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (name: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    document.title = `${config.title} | Multibrand POS`;
    if (config.withCompany) {
      api.get("/configure/companies", { params: { status: 1 } })
        .then((res) => {
          const list = toOptions(res.data.data.data);
          setCompanies(list);
          if (list.length === 1) setForm((f) => ({ ...f, company_id: list[0].value }));
        })
        .catch(() => {});
    }
    // same sub category name is under many categories, so show "Engine (G)"
    Promise.all([
      api.get("/configure/categories", { params: { status: 1 } }),
      api.get("/configure/sub-categories", { params: { status: 1 } }),
    ]).then(([cats, subs]) => {
      const catNames = new Map<number, string>(cats.data.data.data.map((c: Named) => [c.id, c.name]));
      setSubCategories(subs.data.data.data.map((s: Named) => ({
        value: String(s.id),
        label: `${s.name} (${catNames.get(s.category_id ?? 0) ?? "-"})`,
      })));
    }).catch(() => {});
    api.get("/configure/brands", { params: { status: 1 } })
      .then((res) => setBrands(toOptions(res.data.data.data)))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      setReport(await reportService.productStockReport(kind, params));
      setSearchedAt(new Date().toISOString());
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({ ...emptyForm(), company_id: companies.length === 1 ? companies[0].value : "" });
    setProductText("");
  };

  const rows = useMemo(() => report?.rows ?? [], [report]);
  const heads = ["SL", "Product Sub-Category", "Vehicle Brand", "Product Name", "Part Number", ...(isAlert ? ["Closing Stock", "Alert QTY"] : [])];

  return (
    <AccessRoute requiredPermissions={[config.permission]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Report" }, { title: config.title }]} />

        <ReportSearchCard title={config.title} onSearch={search} onReset={reset} loading={loading}>
          {config.withCompany && (
            <ReportField label="Company">
              <ReactSelect
                options={companies}
                value={form.company_id || null}
                placeholder="All companies"
                isDisabled={companies.length === 1}
                onChange={(v) => set("company_id", v ? String(v) : "")}
              />
            </ReportField>
          )}
          <ReportField label="Product Sub-Category">
            <ReactSelect options={subCategories} value={form.sub_category_id || null} placeholder="All" onChange={(v) => set("sub_category_id", v ? String(v) : "")} />
          </ReportField>
          <ReportField label="Vehicle Brand">
            <ReactSelect options={brands} value={form.brand_id || null} placeholder="All" onChange={(v) => set("brand_id", v ? String(v) : "")} />
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
        </ReportSearchCard>

        {!report && !loading && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Pick the filters if needed, then press <b>Search</b> to see the report.
          </div>
        )}

        {report && (
          <ReportView
            title={config.title}
            lines={[`Upto ${formatDate(searchedAt)}`]}
            company={report.company}
            fileName={kind + "-report"}
            rowCount={rows.length}
          >
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
                  <tr><td colSpan={heads.length} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{i + 1}</td>
                    <td className={rptTd}>{r.sub_category_name}</td>
                    <td className={rptTd}>{r.brand_name}</td>
                    <td className={`${rptTd} min-w-[140px]`}>{r.product_name}</td>
                    <td className={`${rptTd} whitespace-nowrap font-medium`}>{r.part_number}</td>
                    {isAlert && (
                      <>
                        <td className={`${rptTd} num text-right font-semibold ${(r.closing_stock ?? 0) <= 0 ? "text-error-600 dark:text-error-400" : "text-warning-600 dark:text-warning-400"}`}>{qty(r.closing_stock)}</td>
                        <td className={`${rptTd} num text-right`}>{qty(r.alert_qty)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportView>
        )}
      </div>
    </AccessRoute>
  );
}
