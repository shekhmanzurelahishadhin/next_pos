"use client";
// Sales Summary Report (parts_bazar sellItems/salesSummaryReport)
// One row per approved bill with the money received against it and the balance due.
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, filledFields, firstDayOfMonth, labelLines, loadOptions, Option, reportMoney, today } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { CustomerPicker } from "@/components/report/ReportPickers";
import { reportService, SalesSummaryReport } from "@/services/reportService";

type SearchForm = {
  start_date: string;
  end_date: string;
  company_id: string;
  customer_type_id: string;
  customer_id: string;
  paid: string; // "1" = paid, "0" = due, "" = all
};

const STATUS_OPTIONS = [
  { value: "0", label: "Due" },
  { value: "1", label: "Paid" },
];

function emptyForm(): SearchForm {
  return { start_date: firstDayOfMonth(), end_date: today(), company_id: "", customer_type_id: "", customer_id: "", paid: "" };
}

export default function SalesSummaryReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [customerText, setCustomerText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [customerTypes, setCustomerTypes] = useState<Option[]>([]);
  const [report, setReport] = useState<SalesSummaryReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Sales Summary Report | Multibrand POS";
    loadCompanies();
    loadOptions("/configure/lookups", { type: "customer_type" }).then(setCustomerTypes).catch(() => {});
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
      // the list is only a filter, the page still works without it
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
      const result = await reportService.salesSummary(filledFields(form));
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
    setCustomerText("");
    setError("");
    setFormKey(formKey + 1);
  }

  // totals of the report
  const rows = report ? report.rows : [];
  let totalBill = 0;
  let totalReceived = 0;
  let totalDue = 0;
  let dueBillCount = 0;
  for (const row of rows) {
    totalBill += row.grand_total;
    totalReceived += row.received_amount;
    totalDue += row.due_amount;
    if (!row.paid) {
      dueBillCount++;
    }
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From ${formatDate(searchedForm.start_date)} To ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["sales-summary-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Sales Summary Report" }]} />

        <ReportSearchCard title="Sales Summary Report" onSearch={search} onReset={reset} loading={loading} error={error}>
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
          <ReportField label="Customer Type">
            <ReactSelect
              options={customerTypes}
              value={form.customer_type_id || null}
              placeholder="All"
              onChange={(value) => setField("customer_type_id", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Order Status">
            <ReactSelect
              options={STATUS_OPTIONS}
              value={form.paid || null}
              placeholder="All"
              onChange={(value) => setField("paid", value === null ? "" : String(value))}
            />
          </ReportField>
          <ReportField label="Customer Name" className="sm:col-span-2">
            <CustomerPicker
              text={customerText}
              onText={(text) => {
                setCustomerText(text);
                setField("customer_id", ""); // typing again clears the picked customer
              }}
              onPick={(id, text) => {
                setCustomerText(text);
                setField("customer_id", id);
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
            title="Sales Summary Report"
            lines={headerLines}
            company={report.company}
            fileName="sales-summary-report"
            rowCount={rows.length}
            summary={[
              { label: "Bills", value: String(rows.length) },
              { label: "Due Bills", value: String(dueBillCount), tone: dueBillCount > 0 ? "error" : undefined },
              { label: "Bill Amount", value: reportMoney(totalBill) },
              { label: "Received", value: reportMoney(totalReceived), tone: "success" },
              { label: "Balance Due", value: reportMoney(totalDue), tone: totalDue > 0 ? "error" : undefined },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Bill Date</th>
                  <th className={`${rptTh} text-left`}>Order Status</th>
                  <th className={`${rptTh} text-left`}>Customer Type</th>
                  <th className={`${rptTh} text-left`}>Customer Name</th>
                  <th className={`${rptTh} text-left`}>Bill No</th>
                  <th className={`${rptTh} num text-right`}>Bill Amount</th>
                  <th className={`${rptTh} num text-right`}>Received Amount</th>
                  <th className={`${rptTh} num text-right`}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  let statusClass = "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400";
                  if (row.paid) {
                    statusClass = "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
                  }

                  return (
                    <tr key={row.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                      <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                      <td className={`${rptTd} whitespace-nowrap`}>{formatDate(row.order_date)}</td>
                      <td className={rptTd}>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>{row.paid ? "Paid" : "Due"}</span>
                      </td>
                      <td className={rptTd}>{row.customer_type}</td>
                      <td className={`${rptTd} min-w-[150px]`}>{row.customer_name}</td>
                      <td className={`${rptTd} whitespace-nowrap font-medium text-gray-800 dark:text-white/90`}>{row.so_no}</td>
                      <td className={`${rptTd} num text-right`}>{reportMoney(row.grand_total)}</td>
                      <td className={`${rptTd} num text-right text-success-600 dark:text-success-400`}>{reportMoney(row.received_amount)}</td>
                      <td className={`${rptTd} num text-right font-semibold ${row.due_amount > 0 ? "text-error-600 dark:text-error-400" : ""}`}>{reportMoney(row.due_amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={6} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalBill)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalReceived)}</td>
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
