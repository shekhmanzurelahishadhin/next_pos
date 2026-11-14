"use client";
// Customer Info Report (parts_bazar customers/customerInfoReport)
// Contact details of the customers: name, contact no, address, car and email.
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiErrorMessage, filledFields, labelLines } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Autocomplete from "@/components/form/Autocomplete";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh } from "@/components/report/ReportView";
import { CustomerPicker } from "@/components/report/ReportPickers";
import { reportService, CustomerInfoReport } from "@/services/reportService";

type SearchForm = { customer_id: string; car_name: string; car_no: string };

function emptyForm(): SearchForm {
  return { customer_id: "", car_name: "", car_no: "" };
}

export default function CustomerInfoReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [customerText, setCustomerText] = useState("");
  const [report, setReport] = useState<CustomerInfoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Customer Info Report | Multibrand POS";
  }, []);

  function setField(name: keyof SearchForm, value: string) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  async function search() {
    setLoading(true);
    try {
      const result = await reportService.customerInfo(filledFields(form));
      setReport(result);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(emptyForm());
    setCustomerText("");
  }

  const rows = report ? report.rows : [];

  // lines under the report title
  const headerLines: string[] = [];
  if (report) {
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["customer-info-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Customer Info Report" }]} />

        <ReportSearchCard title="Customer Info Report" onSearch={search} onReset={reset} loading={loading}>
          <ReportField label="Customer Name">
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
          <ReportField label="Car Name & Model">
            <Autocomplete<string>
              value={form.car_name}
              onChange={(text) => setField("car_name", text)}
              search={(term) => reportService.searchCarValues("car_name", term)}
              onSelect={(value) => setField("car_name", value)}
              renderItem={(value) => <span>{value}</span>}
              placeholder="Car name or model"
            />
          </ReportField>
          <ReportField label="Car No">
            <Autocomplete<string>
              value={form.car_no}
              onChange={(text) => setField("car_no", text)}
              search={(term) => reportService.searchCarValues("car_no", term)}
              onSelect={(value) => setField("car_no", value)}
              renderItem={(value) => <span>{value}</span>}
              placeholder="Car no"
            />
          </ReportField>
        </ReportSearchCard>

        {!report && !loading && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Press <b>Search</b> to see the contact information of the customers.
          </div>
        )}

        {report && (
          <ReportView
            title="Customer Contact Information"
            lines={headerLines}
            company={report.company}
            fileName="customer-info-report"
            rowCount={rows.length}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Customer Name</th>
                  <th className={`${rptTh} text-left`}>Contact No</th>
                  <th className={`${rptTh} text-left`}>Address</th>
                  <th className={`${rptTh} text-left`}>Car Name & Model</th>
                  <th className={`${rptTh} text-left`}>Car No</th>
                  <th className={`${rptTh} text-left`}>Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.id} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} min-w-[180px] font-medium text-gray-800 dark:text-white/90`}>{row.name}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.phone}</td>
                    <td className={`${rptTd} min-w-[200px]`}>{row.address}</td>
                    <td className={rptTd}>{row.car_name}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{row.car_no}</td>
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
