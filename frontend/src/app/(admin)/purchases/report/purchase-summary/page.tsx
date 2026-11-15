"use client";
// Purchase Summary Report (parts_bazar purchaseItems/purchaseSummaryReport)
// One row per approved purchase between the dates: order qty, total amount,
// what was paid against it and the due.
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, filledFields, firstDayOfMonth, labelLines, loadOptions, Option, reportMoney, reportQty, today } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { SupplierPicker } from "@/components/report/ReportPickers";
import { reportService, PurchaseSummaryReport } from "@/services/reportService";

type SearchForm = { start_date: string; end_date: string; company_id: string; supplier_id: string };

function emptyForm(): SearchForm {
  return { start_date: firstDayOfMonth(), end_date: today(), company_id: "", supplier_id: "" };
}

export default function PurchaseSummaryReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [supplierText, setSupplierText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [report, setReport] = useState<PurchaseSummaryReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Purchase Summary Report | Multibrand POS";
    loadCompanies();
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
      const result = await reportService.purchaseSummary(filledFields(form));
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
    setError("");
    setFormKey(formKey + 1);
  }

  // totals of the report, like parts_bazar
  const rows = report ? report.rows : [];
  let totalQty = 0;
  let totalAmount = 0;
  let totalPaid = 0;
  let totalDue = 0;
  for (const row of rows) {
    totalQty = totalQty + row.total_qty;
    totalAmount = totalAmount + row.total_amount;
    totalPaid = totalPaid + row.paid_amount;
    totalDue = totalDue + row.due_amount;
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From ${formatDate(searchedForm.start_date)} To ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["purchase-summary-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchase" }, { title: "Report" }, { title: "Purchase Summary Report" }]} />

        <ReportSearchCard title="Purchase Summary Report" onSearch={search} onReset={reset} loading={loading} error={error}>
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
        </ReportSearchCard>

        {!report && !loading && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Pick the dates and filters, then press <b>Search</b> to see the report.
          </div>
        )}

        {report && (
          <ReportView
            title="Purchase Summary Report"
            lines={headerLines}
            company={report.company}
            fileName="purchase-summary-report"
            rowCount={rows.length}
            summary={[
              { label: "Orders", value: String(rows.length) },
              { label: "Order Qty", value: reportQty(totalQty) },
              { label: "Total Amount", value: reportMoney(totalAmount) },
              { label: "Payment Amount", value: reportMoney(totalPaid) },
              { label: "Due Amount", value: reportMoney(totalDue), tone: "brand" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>PO Date</th>
                  <th className={`${rptTh} text-left`}>PO No</th>
                  <th className={`${rptTh} text-left`}>Supplier Bill No</th>
                  <th className={`${rptTh} text-left`}>Supplier</th>
                  <th className={`${rptTh} center text-center`}>Order QTY</th>
                  <th className={`${rptTh} num text-right`}>Total Amount</th>
                  <th className={`${rptTh} num text-right`}>Payment Amount</th>
                  <th className={`${rptTh} num text-right`}>DUE Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{formatDate(row.purchase_date)}</td>
                    <td className={`${rptTd} whitespace-nowrap font-medium text-gray-800 dark:text-white/90`}>{row.po_no}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.supplier_bill_no}</td>
                    <td className={`${rptTd} min-w-[130px]`}>{row.supplier_name}</td>
                    <td className={`${rptTd} center text-center`}>{reportQty(row.total_qty)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.total_amount)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.paid_amount)}</td>
                    <td className={`${rptTd} num text-right font-semibold text-gray-800 dark:text-white/90`}>{reportMoney(row.due_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={5} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} center text-center`}>{reportQty(totalQty)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalAmount)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalPaid)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalDue)}</td>
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
