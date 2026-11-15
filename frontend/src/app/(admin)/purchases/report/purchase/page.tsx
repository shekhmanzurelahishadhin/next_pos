"use client";
// Purchase Report (parts_bazar purchaseItems/purchaseReport)
// Every line of the approved purchases between the dates, with the weight cost.
// The order no, date, supplier, store and grand total are merged over the lines of one order.
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, filledFields, firstDayOfMonth, labelLines, loadOptions, Option, reportMoney, reportQty, today } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField, reportInputClass } from "@/components/report/ReportSearchCard";
import ReportView, { groupSpans, rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { ProductPicker, SupplierPicker } from "@/components/report/ReportPickers";
import { reportService, PurchaseReport } from "@/services/reportService";

type SubCategoryOption = Option & { category_id: string };

type SearchForm = {
  start_date: string;
  end_date: string;
  supplier_id: string;
  category_id: string;
  sub_category_id: string;
  product_id: string;
  barcode: string;
};

function emptyForm(): SearchForm {
  return {
    start_date: firstDayOfMonth(),
    end_date: today(),
    supplier_id: "",
    category_id: "",
    sub_category_id: "",
    product_id: "",
    barcode: "",
  };
}

export default function PurchaseReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [supplierText, setSupplierText] = useState("");
  const [productText, setProductText] = useState("");
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [report, setReport] = useState<PurchaseReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Purchase Report | Multibrand POS";
    loadOptions("/configure/categories").then(setCategories).catch(() => {});
    loadSubCategories();
  }, []);

  async function loadSubCategories() {
    try {
      const res = await api.get("/configure/sub-categories", { params: { status: 1 } });
      const list: SubCategoryOption[] = [];
      for (const subCategory of res.data.data.data) {
        list.push({ value: String(subCategory.id), label: subCategory.name, category_id: String(subCategory.category_id) });
      }
      setSubCategories(list);
    } catch {
      // the list is only a filter
    }
  }

  function setField(name: keyof SearchForm, value: string) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  // the date pickers need functions that do not change on every render
  const changeStartDate = useCallback((_dates: Date[], value: string) => {
    setForm((old) => ({ ...old, start_date: value }));
  }, []);
  const changeEndDate = useCallback((_dates: Date[], value: string) => {
    setForm((old) => ({ ...old, end_date: value }));
  }, []);

  async function search() {
    if (!form.start_date || !form.end_date) {
      setError("Please select date range!");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("Date To can not be before Date From.");
      return;
    }
    setError("");

    setLoading(true);
    try {
      const result = await reportService.purchase(filledFields(form));
      setReport(result);
      setSearchedForm(form);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(emptyForm());
    setSupplierText("");
    setProductText("");
    setError("");
    setFormKey(formKey + 1);
  }

  // sub categories of the picked category, like parts_bazar
  const categorySubCategories: Option[] = [];
  for (const subCategory of subCategories) {
    if (!form.category_id || subCategory.category_id === form.category_id) {
      categorySubCategories.push(subCategory);
    }
  }

  const rows = report ? report.rows : [];

  // the first line of an order gets the merged cells
  const orderSpans = groupSpans(rows, (row) => row.purchase_id);

  // totals of every column, like parts_bazar; the grand total is counted once for each order
  let totalQty = 0;
  let totalWeightUnit = 0;
  let totalWeight = 0;
  let totalPerKg = 0;
  let totalWeightAmount = 0;
  let totalUnitPrice = 0;
  let totalUnitPriceWithWeight = 0;
  let totalProductPrice = 0;
  let totalPurchasePrice = 0;
  let totalGrand = 0;
  let orderCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    totalQty += row.qty;
    totalWeightUnit += row.weight_unit;
    totalWeight += row.total_weight;
    totalPerKg += row.per_kg;
    totalWeightAmount += row.total_weight_amount;
    totalUnitPrice += row.unit_price;
    totalUnitPriceWithWeight += row.total_unit_price;
    totalProductPrice += row.total_product_price;
    totalPurchasePrice += row.total_purchase_price;
    if (orderSpans[i]) {
      orderCount++;
      totalGrand += row.grand_total;
    }
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From ${formatDate(searchedForm.start_date)} To ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["purchase-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchase" }, { title: "Report" }, { title: "Purchase Report" }]} />

        <ReportSearchCard title="Purchase Report" onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Date From" required>
            <DatePicker key={`start${formKey}`} id="rpt_start_date" defaultDate={form.start_date} onChange={changeStartDate} placeholder="Date from" />
          </ReportField>
          <ReportField label="Date To" required>
            <DatePicker key={`end${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEndDate} placeholder="Date to" />
          </ReportField>
          <ReportField label="Supplier" className="sm:col-span-2">
            <SupplierPicker
              text={supplierText}
              onText={(text) => {
                setSupplierText(text);
                setField("supplier_id", ""); // typing again clears the picked supplier
              }}
              onPick={(id, text) => {
                setSupplierText(text);
                setField("supplier_id", id);
              }}
            />
          </ReportField>
          <ReportField label="Category">
            <ReactSelect
              options={categories}
              value={form.category_id || null}
              placeholder="All"
              onChange={(value) => {
                // a new category clears the sub category
                setForm((old) => ({ ...old, category_id: value ? String(value) : "", sub_category_id: "" }));
              }}
            />
          </ReportField>
          <ReportField label="Sub-Category">
            <ReactSelect
              options={categorySubCategories}
              value={form.sub_category_id || null}
              placeholder="All"
              onChange={(value) => setField("sub_category_id", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Product (name / part number)" className="sm:col-span-2">
            <ProductPicker
              text={productText}
              onText={(text) => {
                setProductText(text);
                setField("product_id", "");
              }}
              onPick={(id, text) => {
                setProductText(text);
                setField("product_id", id);
              }}
            />
          </ReportField>
          <ReportField label="Barcode">
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setField("barcode", e.target.value.trim())}
              placeholder="Exact barcode"
              className={reportInputClass}
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
            title="Purchase Report"
            lines={headerLines}
            company={report.company}
            fileName="purchase-report"
            rowCount={rows.length}
            summary={[
              { label: "Orders", value: String(orderCount) },
              { label: "Purchase Qty", value: reportQty(totalQty) },
              { label: "Weight Amount", value: reportMoney(totalWeightAmount) },
              { label: "Total Purchase Price", value: reportMoney(totalPurchasePrice) },
              { label: "Grand Total", value: reportMoney(totalGrand), tone: "brand" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Order No</th>
                  <th className={`${rptTh} text-left`}>Purchase Date</th>
                  <th className={`${rptTh} text-left`}>Supplier</th>
                  <th className={`${rptTh} text-left`}>Store Name</th>
                  <th className={`${rptTh} text-left`}>Product Name</th>
                  <th className={`${rptTh} text-left`}>Part Number</th>
                  <th className={`${rptTh} text-left`}>Barcode</th>
                  <th className={`${rptTh} center text-center`}>Unit</th>
                  <th className={`${rptTh} num text-right`}>Qty</th>
                  <th className={`${rptTh} num text-right`}>Weight Unit (Kg)</th>
                  <th className={`${rptTh} num text-right`}>Total Weight (Kg)</th>
                  <th className={`${rptTh} num text-right`}>Per Kg Amount</th>
                  <th className={`${rptTh} num text-right`}>Total Weight Amount</th>
                  <th className={`${rptTh} num text-right`}>Product Unit Price</th>
                  <th className={`${rptTh} num text-right`}>Unit Price With Weight</th>
                  <th className={`${rptTh} num text-right`}>Total Product Unit Price</th>
                  <th className={`${rptTh} num text-right`}>Total Purchase Price</th>
                  <th className={`${rptTh} num text-right`}>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={19} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  const span = orderSpans[index]; // only set on the first line of an order
                  return (
                    <tr key={row.id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                      <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                      {span && (
                        <>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top font-medium text-gray-800 dark:text-white/90`}>{row.po_no}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{formatDate(row.purchase_date)}</td>
                          <td rowSpan={span} className={`${rptTd} min-w-[130px] align-top`}>{row.supplier_name}</td>
                          <td rowSpan={span} className={`${rptTd} min-w-[110px] align-top`}>{row.store_name}</td>
                        </>
                      )}
                      <td className={`${rptTd} min-w-[130px]`}>{row.product_name}</td>
                      <td className={`${rptTd} whitespace-nowrap`}>{row.part_number}</td>
                      <td className={`${rptTd} whitespace-nowrap`}>{row.barcode}</td>
                      <td className={`${rptTd} center text-center`}>{row.unit_name}</td>
                      <td className={`${rptTd} num text-right`}>{reportQty(row.qty)}</td>
                      <td className={`${rptTd} num text-right`}>{reportQty(row.weight_unit)}</td>
                      <td className={`${rptTd} num text-right`}>{reportQty(row.total_weight)}</td>
                      <td className={`${rptTd} num text-right`}>{reportMoney(row.per_kg)}</td>
                      <td className={`${rptTd} num text-right`}>{reportMoney(row.total_weight_amount)}</td>
                      <td className={`${rptTd} num text-right`}>{reportMoney(row.unit_price)}</td>
                      <td className={`${rptTd} num text-right`}>{reportMoney(row.total_unit_price)}</td>
                      <td className={`${rptTd} num text-right`}>{reportMoney(row.total_product_price)}</td>
                      <td className={`${rptTd} num text-right`}>{reportMoney(row.total_purchase_price)}</td>
                      {span && (
                        <td rowSpan={span} className={`${rptTd} num align-top text-right font-semibold text-gray-800 dark:text-white/90`}>{reportMoney(row.grand_total)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={9} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{reportQty(totalQty)}</td>
                    <td className={`${rptTd} num text-right`}>{reportQty(totalWeightUnit)}</td>
                    <td className={`${rptTd} num text-right`}>{reportQty(totalWeight)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalPerKg)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalWeightAmount)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalUnitPrice)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalUnitPriceWithWeight)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalProductPrice)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalPurchasePrice)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalGrand)}</td>
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
