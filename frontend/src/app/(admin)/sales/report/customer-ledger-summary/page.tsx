"use client";
// Customer Ledger Summary (parts_bazar customers/partyLedgerSummaryDateWise)
// One row per customer: opening balance, Dr and Cr between the dates, closing balance.
// Same amounts as the Customer Ledger of each customer.
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
import { reportService, CustomerLedgerSummaryReport } from "@/services/reportService";

type SearchForm = { start_date: string; end_date: string; company_id: string; customer_id: string };

function emptyForm(): SearchForm {
  return { start_date: firstDayOfMonth(), end_date: today(), company_id: "", customer_id: "" };
}

export default function CustomerLedgerSummaryReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [customerText, setCustomerText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [report, setReport] = useState<CustomerLedgerSummaryReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Customer Ledger Summary | Multibrand POS";
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
      const result = await reportService.customerLedgerSummary(filledFields(form));
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
  let totalOpening = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let totalClosing = 0;
  for (const row of rows) {
    totalOpening = totalOpening + row.opening;
    totalDebit = totalDebit + row.debit;
    totalCredit = totalCredit + row.credit;
    totalClosing = totalClosing + row.closing;
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From: ${formatDate(searchedForm.start_date)} To: ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["customer-ledger-summary-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Customer Ledger Summary" }]} />

        <ReportSearchCard title="Customer Ledger Summary" onSearch={search} onReset={reset} loading={loading} error={error}>
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
          <ReportField label="Customer">
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
            Pick the dates, then press <b>Search</b> to see the ledger summary of every customer.
          </div>
        )}

        {report && (
          <ReportView
            title="Customer Ledger Summary Report"
            lines={headerLines}
            company={report.company}
            fileName="customer-ledger-summary"
            rowCount={rows.length}
            summary={[
              { label: "Opening Balance", value: reportMoney(totalOpening) },
              { label: "Total Dr", value: reportMoney(totalDebit), tone: "brand" },
              { label: "Total Cr", value: reportMoney(totalCredit), tone: "success" },
              { label: "Closing Balance", value: reportMoney(totalClosing), tone: totalClosing > 0 ? "error" : "success" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Customer</th>
                  <th className={`${rptTh} num text-right`}>Opening Balance</th>
                  <th className={`${rptTh} num text-right`}>Dr (Amount)</th>
                  <th className={`${rptTh} num text-right`}>Cr (Amount)</th>
                  <th className={`${rptTh} num text-right`}>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} min-w-[180px] font-medium text-gray-800 dark:text-white/90`}>{row.customer_name}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.opening)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.debit)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.credit)}</td>
                    <td className={`${rptTd} num text-right font-semibold`}>{reportMoney(row.closing)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={2} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalOpening)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalDebit)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalCredit)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalClosing)}</td>
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
