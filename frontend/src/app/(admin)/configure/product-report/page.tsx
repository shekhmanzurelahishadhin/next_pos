"use client";
// Product Report (parts_bazar prodModels/allProductReport)
// Every product with its category, unit, weight, alert qty and the vehicles it fits.
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { apiErrorMessage, filledFields, Option, reportQty } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh } from "@/components/report/ReportView";
import { ProductPicker } from "@/components/report/ReportPickers";
import { reportService, ProductReport } from "@/services/reportService";

type SearchForm = { category_id: string; sub_category_id: string; product_id: string; part_number: string };

type SubCategoryOption = Option & { category_id: string };

function emptyForm(): SearchForm {
  return { category_id: "", sub_category_id: "", product_id: "", part_number: "" };
}

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

// "LANCER, OUTLANDER" is shown one per line as "1) LANCER", "2) OUTLANDER", like parts_bazar
function NumberedList({ text }: { text: string | null }) {
  if (!text) {
    return null;
  }

  const lines: React.ReactNode[] = [];
  let number = 1;
  for (const part of text.split(",")) {
    const name = part.trim();
    if (name === "") {
      continue;
    }
    lines.push(<div key={number}>{number}) {name}</div>);
    number++;
  }
  return <>{lines}</>;
}

export default function ProductReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [productText, setProductText] = useState("");
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [report, setReport] = useState<ProductReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Product Report | Multibrand POS";
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const categoryRes = await api.get("/configure/categories", { params: { status: 1 } });
      const subCategoryRes = await api.get("/configure/sub-categories", { params: { status: 1 } });

      const categoryList: Option[] = [];
      for (const category of categoryRes.data.data.data) {
        categoryList.push({ value: String(category.id), label: category.name });
      }
      setCategories(categoryList);

      const subCategoryList: SubCategoryOption[] = [];
      for (const subCategory of subCategoryRes.data.data.data) {
        subCategoryList.push({ value: String(subCategory.id), label: subCategory.name, category_id: String(subCategory.category_id) });
      }
      setSubCategories(subCategoryList);
    } catch {
      // the lists are only filters, the page still works without them
    }
  }

  function setField(name: keyof SearchForm, value: string) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  // a new category clears the picked sub-category, like parts_bazar
  function changeCategory(categoryId: string) {
    setForm((old) => ({ ...old, category_id: categoryId, sub_category_id: "" }));
  }

  // only the sub-categories of the picked category
  const subCategoryOptions: Option[] = [];
  for (const subCategory of subCategories) {
    if (!form.category_id || subCategory.category_id === form.category_id) {
      subCategoryOptions.push(subCategory);
    }
  }

  async function search() {
    setLoading(true);
    try {
      const result = await reportService.productReport(filledFields(form));
      setReport(result);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(emptyForm());
    setProductText("");
  }

  const rows = report ? report.rows : [];

  return (
    <AccessRoute requiredPermissions={["product-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Configure" }, { title: "Report" }, { title: "Product Report" }]} />

        <ReportSearchCard title="Product Report" onSearch={search} onReset={reset} loading={loading}>
          <ReportField label="Category">
            <ReactSelect
              options={categories}
              value={form.category_id || null}
              placeholder="All"
              onChange={(value) => changeCategory(value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Sub-Category">
            <ReactSelect
              options={subCategoryOptions}
              value={form.sub_category_id || null}
              placeholder="All"
              onChange={(value) => setField("sub_category_id", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Product Name">
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
          <ReportField label="Part Number">
            <input
              type="text"
              value={form.part_number}
              onChange={(e) => setField("part_number", e.target.value)}
              placeholder="Exact part number"
              className={inputClass}
            />
          </ReportField>
        </ReportSearchCard>

        {!report && !loading && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Pick the filters if needed, then press <b>Search</b> to see the products.
          </div>
        )}

        {report && (
          <ReportView title="All Product Report" lines={[]} company={report.company} fileName="product-report" rowCount={rows.length}>
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} center text-center`}>SL</th>
                  <th className={`${rptTh} text-left`}>Category</th>
                  <th className={`${rptTh} text-left`}>Sub-Category</th>
                  <th className={`${rptTh} text-left`}>Name</th>
                  <th className={`${rptTh} text-left`}>Part Number</th>
                  <th className={`${rptTh} center text-center`}>Unit</th>
                  <th className={`${rptTh} center text-center`}>Weight</th>
                  <th className={`${rptTh} center text-center`}>Alert QTY</th>
                  <th className={`${rptTh} text-left`}>V. Brand</th>
                  <th className={`${rptTh} text-left`}>Car Models</th>
                  <th className={`${rptTh} text-left`}>Engine</th>
                  <th className={`${rptTh} text-left`}>Chassis</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={rptTd}>{row.category_name}</td>
                    <td className={rptTd}>{row.sub_category_name}</td>
                    <td className={`${rptTd} min-w-[140px]`}>{row.product_name}</td>
                    <td className={`${rptTd} whitespace-nowrap font-medium`}>{row.part_number}</td>
                    <td className={`${rptTd} center text-center`}>{row.unit_name}</td>
                    <td className={`${rptTd} center text-center`}>{row.unit_weight}</td>
                    <td className={`${rptTd} center text-center`}>{row.alert_qty ? reportQty(Number(row.alert_qty)) : ""}</td>
                    <td className={rptTd}>{row.vehicle_brand_name}</td>
                    <td className={`${rptTd} min-w-[120px]`}><NumberedList text={row.supported_models} /></td>
                    <td className={rptTd}><NumberedList text={row.engine} /></td>
                    <td className={rptTd}><NumberedList text={row.chassis} /></td>
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
