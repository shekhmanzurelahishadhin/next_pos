"use client";
// Supplier Ledger (parts_bazar suppliers/partyLedgerViewDateWise)
// Shows every purchase, return, refund and payment of one supplier between the dates,
// with a running balance (what we owe the supplier) that starts from the opening balance.
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
import { SupplierPicker } from "@/components/report/ReportPickers";
import { reportService, SupplierLedgerReport } from "@/services/reportService";

type SearchForm = { start_date: string; end_date: string; company_id: string; supplier_id: string };

function emptyForm(): SearchForm {
  return { start_date: firstDayOfMonth(), end_date: today(), company_id: "", supplier_id: "" };
}

// colour of the small label before each account head
const typeColors = {
  Purchase: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  Return: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
  Refund: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  Payment: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
};

export default function SupplierLedgerReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [supplierText, setSupplierText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [report, setReport] = useState<SupplierLedgerReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Supplier Ledger | Multibrand POS";
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
    if (!form.supplier_id) {
      setError("Please select a supplier!");
      return;
    }
    setError("");

    setLoading(true);
    try {
      const result = await reportService.supplierLedger(filledFields(form));
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

  // totals of the report
  const rows = report ? report.rows : [];
  const opening = report ? report.opening : 0;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const row of rows) {
    totalDebit = totalDebit + row.debit;
    totalCredit = totalCredit + row.credit;
  }
  const closing = opening + totalCredit - totalDebit;

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    const supplier = report.supplier;
    headerLines.push(supplier.code ? `Supplier: ${supplier.name} (${supplier.code})` : `Supplier: ${supplier.name}`);
    if (supplier.address) {
      headerLines.push(supplier.address);
    }
    if (supplier.phone) {
      headerLines.push(`Contact No: ${supplier.phone}`);
    }
    headerLines.push(`Transaction: ${formatDate(searchedForm.start_date)} - ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["supplier-ledger-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Report" }, { title: "Supplier (Ledger)" }]} />

        <ReportSearchCard title="Supplier (Ledger)" onSearch={search} onReset={reset} loading={loading} error={error}>
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
          <ReportField label="Supplier" required>
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
            Pick the dates and a supplier, then press <b>Search</b> to see the ledger.
          </div>
        )}

        {report && (
          <ReportView
            title="Supplier Ledger"
            lines={headerLines}
            company={report.company}
            fileName="supplier-ledger"
            rowCount={rows.length}
            summary={[
              { label: "Opening Balance", value: reportMoney(opening) },
              { label: "Total Dr", value: reportMoney(totalDebit), tone: "success" },
              { label: "Total Cr", value: reportMoney(totalCredit), tone: "brand" },
              { label: "Closing Balance", value: reportMoney(closing), tone: closing > 0 ? "error" : "success" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Date</th>
                  <th className={`${rptTh} text-left`}>Account Head</th>
                  <th className={`${rptTh} text-left`}>Supplier Bill No</th>
                  <th className={`${rptTh} num text-right`}>Dr Amount</th>
                  <th className={`${rptTh} num text-right`}>Cr Amount</th>
                  <th className={`${rptTh} num text-right`}>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50 font-semibold dark:bg-white/[0.03]">
                  <td colSpan={4} className={`${rptTd} num text-right`}>Opening</td>
                  <td className={rptTd}></td>
                  <td className={rptTd}></td>
                  <td className={`${rptTd} num text-right`}>{reportMoney(opening)}</td>
                </tr>

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`${rptTd} center py-6 text-center text-gray-400`}>No transaction in this period!</td>
                  </tr>
                )}

                {rows.map((row, index) => (
                  <tr key={row.type + row.id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{formatDate(row.date)}</td>
                    <td className={`${rptTd} min-w-[260px]`}>
                      <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[row.type]}`}>{row.type}</span>
                      {row.head}
                    </td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.bill_no}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.debit)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(row.credit)}</td>
                    <td className={`${rptTd} num text-right font-semibold`}>{reportMoney(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={rptTotal}>
                  <td colSpan={4} className={`${rptTd} num text-right`}>Closing</td>
                  <td className={`${rptTd} num text-right`}>{reportMoney(totalDebit)}</td>
                  <td className={`${rptTd} num text-right`}>{reportMoney(totalCredit)}</td>
                  <td className={`${rptTd} num text-right`}>{reportMoney(closing)}</td>
                </tr>
              </tfoot>
            </table>
          </ReportView>
        )}
      </div>
    </AccessRoute>
  );
}
