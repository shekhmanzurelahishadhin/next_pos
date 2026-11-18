"use client";
// Supplier Info Report (parts_bazar suppliers/supplierInfoReport)
// Contact information of every supplier, or of the picked one.
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiErrorMessage, filledFields, labelLines, loadOptions, Option } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh } from "@/components/report/ReportView";
import { SupplierPicker } from "@/components/report/ReportPickers";
import { reportService, SupplierInfoReport } from "@/services/reportService";

type SearchForm = { company_id: string; supplier_id: string };

function emptyForm(): SearchForm {
  return { company_id: "", supplier_id: "" };
}

export default function SupplierInfoReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [supplierText, setSupplierText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [report, setReport] = useState<SupplierInfoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Supplier Info Report | Multibrand POS";
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
      // the list is only for the report header, the page still works without it
    }
  }

  function setField(name: keyof SearchForm, value: string) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  async function search() {
    setLoading(true);
    try {
      const result = await reportService.supplierInfo(filledFields(form));
      setReport(result);
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
  }

  const rows = report ? report.rows : [];

  // lines under the report title
  const headerLines: string[] = [];
  if (report) {
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["supplier-info-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Report" }, { title: "Supplier Info Report" }]} />

        <ReportSearchCard title="Supplier Info Report" onSearch={search} onReset={reset} loading={loading}>
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
            Press <b>Search</b> to see the contact information of the suppliers.
          </div>
        )}

        {report && (
          <ReportView
            title="Supplier Contact Information"
            lines={headerLines}
            company={report.company}
            fileName="supplier-info-report"
            rowCount={rows.length}
            summary={[{ label: "Suppliers", value: String(rows.length) }]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Supplier Name</th>
                  <th className={`${rptTh} text-left`}>Contact No</th>
                  <th className={`${rptTh} text-left`}>Address</th>
                  <th className={`${rptTh} text-left`}>Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} min-w-[180px] font-medium text-gray-800 dark:text-white/90`}>{row.name}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.phone}</td>
                    <td className={`${rptTd} min-w-[180px]`}>{row.address}</td>
                    <td className={rptTd}>{row.email}</td>
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
