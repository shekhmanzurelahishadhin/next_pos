"use client";
// Alert Quantity Report (parts_bazar inventory/alertQtyReport) and
// Out Of Stock Report (parts_bazar inventory/outOfStockReport).
// One row per product; the stock is counted over all time ("Upto today").
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, filledFields, loadOptions, Option, reportQty } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh } from "@/components/report/ReportView";
import { ProductPicker } from "@/components/report/ReportPickers";
import { reportService, ProductStockReport as ProductStockResult } from "@/services/reportService";

type SearchForm = { company_id: string; sub_category_id: string; brand_id: string; product_id: string };

// the two reports that use this page
const REPORTS = {
  "alert-qty": { title: "Alert Quantity Report", permission: "alert-qty-report.view", hasCompanyFilter: false },
  "out-of-stock": { title: "Out Of Stock Report", permission: "out-of-stock-report.view", hasCompanyFilter: true },
};

function emptyForm(): SearchForm {
  return { company_id: "", sub_category_id: "", brand_id: "", product_id: "" };
}

export default function ProductStockReport({ kind }: { kind: "alert-qty" | "out-of-stock" }) {
  const config = REPORTS[kind];
  const isAlertReport = kind === "alert-qty";

  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [productText, setProductText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [report, setReport] = useState<ProductStockResult | null>(null);
  const [searchedAt, setSearchedAt] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = `${config.title} | Multibrand POS`;
    if (config.hasCompanyFilter) {
      loadCompanies();
    }
    loadSubCategories();
    loadOptions("/configure/brands").then(setBrands).catch(() => {});
  }, [config.title, config.hasCompanyFilter]);

  async function loadCompanies() {
    try {
      const list = await loadOptions("/configure/companies");
      setCompanies(list);

      // a company user has only one company, so pick it
      if (list.length === 1) {
        setForm((old) => ({ ...old, company_id: list[0].value }));
      }
    } catch {
      // the list is only a filter, the page still works without it
    }
  }

  // the same sub category name is under many categories, so the label is "Engine (G)"
  async function loadSubCategories() {
    try {
      const categoryRes = await api.get("/configure/categories", { params: { status: 1 } });
      const subCategoryRes = await api.get("/configure/sub-categories", { params: { status: 1 } });

      const categoryNames: Record<number, string> = {};
      for (const category of categoryRes.data.data.data) {
        categoryNames[category.id] = category.name;
      }

      const list: Option[] = [];
      for (const subCategory of subCategoryRes.data.data.data) {
        const categoryName = categoryNames[subCategory.category_id] || "-";
        list.push({ value: String(subCategory.id), label: `${subCategory.name} (${categoryName})` });
      }
      setSubCategories(list);
    } catch {
      // the list is only a filter
    }
  }

  function setField(name: keyof SearchForm, value: string) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  async function search() {
    setLoading(true);
    try {
      const result = await reportService.productStockReport(kind, filledFields(form));
      setReport(result);
      setSearchedAt(new Date().toISOString());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    const newForm = emptyForm();
    if (companies.length === 1) {
      newForm.company_id = companies[0].value;
    }
    setForm(newForm);
    setProductText("");
  }

  const rows = report ? report.rows : [];

  return (
    <AccessRoute requiredPermissions={[config.permission]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Report" }, { title: config.title }]} />

        <ReportSearchCard title={config.title} onSearch={search} onReset={reset} loading={loading}>
          {config.hasCompanyFilter && (
            <ReportField label="Company">
              <ReactSelect
                options={companies}
                value={form.company_id || null}
                placeholder="All companies"
                isDisabled={companies.length === 1}
                onChange={(value) => setField("company_id", value ? String(value) : "")}
              />
            </ReportField>
          )}
          <ReportField label="Product Sub-Category">
            <ReactSelect
              options={subCategories}
              value={form.sub_category_id || null}
              placeholder="All"
              onChange={(value) => setField("sub_category_id", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Vehicle Brand">
            <ReactSelect
              options={brands}
              value={form.brand_id || null}
              placeholder="All"
              onChange={(value) => setField("brand_id", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Product (name / part number)" className="sm:col-span-2">
            <ProductPicker
              text={productText}
              onText={(text) => {
                setProductText(text);
                setField("product_id", ""); // typing again clears the picked product
              }}
              onPick={(id, text) => {
                setProductText(text);
                setField("product_id", id);
              }}
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
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Product Sub-Category</th>
                  <th className={`${rptTh} text-left`}>Vehicle Brand</th>
                  <th className={`${rptTh} text-left`}>Product Name</th>
                  <th className={`${rptTh} text-left`}>Part Number</th>
                  {isAlertReport && <th className={`${rptTh} num text-right`}>Closing Stock</th>}
                  {isAlertReport && <th className={`${rptTh} num text-right`}>Alert QTY</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={isAlertReport ? 7 : 5} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  const closingStock = row.closing_stock || 0;
                  // no stock at all is red, low stock is orange
                  const stockColor = closingStock <= 0 ? "text-error-600 dark:text-error-400" : "text-warning-600 dark:text-warning-400";

                  return (
                    <tr key={row.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                      <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                      <td className={rptTd}>{row.sub_category_name}</td>
                      <td className={rptTd}>{row.brand_name}</td>
                      <td className={`${rptTd} min-w-[140px]`}>{row.product_name}</td>
                      <td className={`${rptTd} whitespace-nowrap font-medium`}>{row.part_number}</td>
                      {isAlertReport && <td className={`${rptTd} num text-right font-semibold ${stockColor}`}>{reportQty(closingStock)}</td>}
                      {isAlertReport && <td className={`${rptTd} num text-right`}>{reportQty(row.alert_qty || 0)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ReportView>
        )}
      </div>
    </AccessRoute>
  );
}
