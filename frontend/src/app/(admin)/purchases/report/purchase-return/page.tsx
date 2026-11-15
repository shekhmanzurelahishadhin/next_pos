"use client";
// Purchase Return Report (parts_bazar purchaseReturn/purchaseReturnReport)
// One row per product of every purchase return between the dates, with what was
// purchased on that PO line. Unit price is the PO line amount / PO line qty, like parts_bazar.
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
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { ProductPicker, SupplierPicker } from "@/components/report/ReportPickers";
import { reportService, PurchaseReturnReport } from "@/services/reportService";

type SubCategoryOption = Option & { category_id: string };

type SearchForm = {
  start_date: string;
  end_date: string;
  company_id: string;
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
    company_id: "",
    supplier_id: "",
    category_id: "",
    sub_category_id: "",
    product_id: "",
    barcode: "",
  };
}

export default function PurchaseReturnReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [supplierText, setSupplierText] = useState("");
  const [productText, setProductText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [report, setReport] = useState<PurchaseReturnReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Purchase Return Report | Multibrand POS";
    loadCompanies();
    loadOptions("/configure/categories").then(setCategories).catch(() => {});
    loadSubCategories();
  }, []);

  async function loadCompanies() {
    try {
      const list = await loadOptions("/configure/companies");
      setCompanies(list);

      // a company user has only one company, so pick it
      if (list.length === 1) {
        setForm((old) => ({ ...old, company_id: list[0].value }));
      }
    } catch {
      // the company list is only a filter, the page still works without it
    }
  }

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
      const result = await reportService.purchaseReturn(filledFields(form));
      setReport(result);
      setSearchedForm(form);
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

  // totals of the report, like parts_bazar
  const rows = report ? report.rows : [];
  let totalPurchaseQty = 0;
  let totalUnitPrice = 0;
  let totalPurchaseAmount = 0;
  let totalReturnQty = 0;
  let totalReturnAmount = 0;
  for (const row of rows) {
    totalPurchaseQty = totalPurchaseQty + row.purchase_qty;
    totalUnitPrice = totalUnitPrice + row.unit_price;
    totalPurchaseAmount = totalPurchaseAmount + row.purchase_amount;
    totalReturnQty = totalReturnQty + row.return_qty;
    totalReturnAmount = totalReturnAmount + row.return_amount;
  }

  // number of returns in the report
  const returnIds: number[] = [];
  for (const row of rows) {
    if (!returnIds.includes(row.return_id)) {
      returnIds.push(row.return_id);
    }
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From ${formatDate(searchedForm.start_date)} To ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["purchase-return-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchase" }, { title: "Report" }, { title: "Purchase Return Report" }]} />

        <ReportSearchCard title="Purchase Return Report" onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Date From" required>
            <DatePicker key={`start${formKey}`} id="rpt_start_date" defaultDate={form.start_date} onChange={changeStartDate} placeholder="Date from" />
          </ReportField>
          <ReportField label="Date To" required>
            <DatePicker key={`end${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEndDate} placeholder="Date to" />
          </ReportField>
          <ReportField label="Company">
            <ReactSelect
              options={companies}
              value={form.company_id || null}
              placeholder="All companies"
              isDisabled={companies.length === 1}
              onChange={(value) => setField("company_id", value ? String(value) : "")}
            />
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
            title="Purchase Return Report"
            lines={headerLines}
            company={report.company}
            fileName="purchase-return-report"
            rowCount={rows.length}
            summary={[
              { label: "Returns", value: String(returnIds.length) },
              { label: "Purchase Qty", value: reportQty(totalPurchaseQty) },
              { label: "Purchase Amount", value: reportMoney(totalPurchaseAmount) },
              { label: "Returned Qty", value: reportQty(totalReturnQty) },
              { label: "Total Return Amount", value: reportMoney(totalReturnAmount), tone: "brand" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Return No</th>
                  <th className={`${rptTh} text-left`}>Return Date</th>
                  <th className={`${rptTh} text-left`}>PO Number</th>
                  <th className={`${rptTh} text-left`}>Supplier Name</th>
                  <th className={`${rptTh} text-left`}>Part Number</th>
                  <th className={`${rptTh} text-left`}>Barcode</th>
                  <th className={`${rptTh} text-left`}>Product Name</th>
                  <th className={`${rptTh} center text-center`}>Purchase Qty</th>
                  <th className={`${rptTh} num text-right`}>Unit Price</th>
                  <th className={`${rptTh} num text-right`}>Purchase Amount</th>
                  <th className={`${rptTh} center text-center`}>Returned Qty</th>
                  <th className={`${rptTh} num text-right`}>Total Return Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={13} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={`${row.return_id}-${row.purchase_detail_id}`} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} whitespace-nowrap font-medium text-gray-800 dark:text-white/90`}>{row.return_no}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{formatDate(row.return_date)}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.po_no}</td>
                    <td className={`${rptTd} min-w-[130px]`}>{row.supplier_name}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.part_number}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.barcode}</td>
                    <td className={`${rptTd} min-w-[130px]`}>{row.product_name}</td>
                    <td className={`${rptTd} center text-center`}>{reportQty(row.purchase_qty)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.unit_price)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.purchase_amount)}</td>
                    <td className={`${rptTd} center text-center`}>{reportQty(row.return_qty)}</td>
                    <td className={`${rptTd} num text-right font-semibold text-gray-800 dark:text-white/90`}>{reportMoney(row.return_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={8} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} center text-center`}>{reportQty(totalPurchaseQty)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalUnitPrice)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalPurchaseAmount)}</td>
                    <td className={`${rptTd} center text-center`}>{reportQty(totalReturnQty)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalReturnAmount)}</td>
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
