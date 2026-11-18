"use client";
// Supplier Due Report (parts_bazar purchaseItems/dueReport)
// Every supplier we owe money to up to the date
// (the closing balance of the Supplier Ledger on that date).
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, filledFields, labelLines, loadOptions, Option, reportMoney, today } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { SupplierPicker } from "@/components/report/ReportPickers";
import { reportService, SupplierDueReport } from "@/services/reportService";

type SearchForm = { end_date: string; company_id: string; supplier_id: string };

function emptyForm(): SearchForm {
  return { end_date: today(), company_id: "", supplier_id: "" };
}

export default function SupplierDueReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives a fresh date picker on reset
  const [supplierText, setSupplierText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [report, setReport] = useState<SupplierDueReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Supplier Due Report | Multibrand POS";
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
      // the list is only a filter, the page still works without it
    }
  }

  function setField(name: keyof SearchForm, value: string) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  // the date picker needs a function that does not change on every render
  const changeEndDate = useCallback((_dates: Date[], value: string) => {
    setForm((old) => ({ ...old, end_date: value }));
  }, []);

  async function search() {
    if (!form.end_date) {
      setError("Please select Up To date!");
      return;
    }
    setError("");

    setLoading(true);
    try {
      const result = await reportService.supplierDue(filledFields(form));
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
  let totalDue = 0;
  for (const row of rows) {
    totalDue += row.due_amount;
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`Up To ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["supplier-due-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Report" }, { title: "Supplier Due Report" }]} />

        <ReportSearchCard title="Supplier Due Report" onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Up To" required>
            <DatePicker key={`end${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEndDate} placeholder="Up to" />
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
          <ReportField label="Supplier Name" className="sm:col-span-2">
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
            Pick the date, then press <b>Search</b> to see which suppliers we owe money to.
          </div>
        )}

        {report && (
          <ReportView
            title="Supplier Due Report"
            lines={headerLines}
            company={report.company}
            fileName="supplier-due-report"
            rowCount={rows.length}
            summary={[
              { label: "Suppliers With Due", value: String(rows.length) },
              { label: "Total Due", value: reportMoney(totalDue), tone: "error" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Supplier Name</th>
                  <th className={`${rptTh} text-left`}>Contact No</th>
                  <th className={`${rptTh} text-left`}>E-Mail</th>
                  <th className={`${rptTh} num text-right`}>Total Due</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`${rptTd} center py-6 text-center text-gray-400`}>No due found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} min-w-[180px] font-medium text-gray-800 dark:text-white/90`}>{row.supplier_name}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.phone}</td>
                    <td className={rptTd}>{row.email}</td>
                    <td className={`${rptTd} num text-right font-semibold text-error-600 dark:text-error-400`}>{reportMoney(row.due_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={4} className={`${rptTd} num text-right`}>Total:</td>
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
