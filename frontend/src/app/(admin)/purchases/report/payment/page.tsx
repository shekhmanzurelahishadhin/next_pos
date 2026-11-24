"use client";
// Payment Report (parts_bazar paymentReceipt/paymentReport)
// One row per supplier payment (PR no) between the dates, with the payment and discount amounts.
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/format";
import { ADJUSTMENT, PAYMENT_TYPES, paymentTypeName } from "@/lib/payment";
import { api } from "@/lib/api";
import { apiErrorMessage, filledFields, firstDayOfMonth, labelLines, loadOptions, Option, reportMoney, today } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField, reportInputClass } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { SupplierPicker } from "@/components/report/ReportPickers";
import { reportService, PaymentReport } from "@/services/reportService";

type SearchForm = {
  start_date: string;
  end_date: string;
  company_id: string;
  payment_type: string;
  bank_name: string;
  supplier_id: string;
  barcode: string;
};

function emptyForm(): SearchForm {
  return { start_date: firstDayOfMonth(), end_date: today(), company_id: "", payment_type: "", bank_name: "", supplier_id: "", barcode: "" };
}

// like parts_bazar, Adjustment is not in the payment type list
const typeOptions: Option[] = [];
for (const type of PAYMENT_TYPES) {
  if (type.value !== ADJUSTMENT) {
    typeOptions.push(type);
  }
}

export default function PaymentReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [supplierText, setSupplierText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [banks, setBanks] = useState<Option[]>([]);
  const [report, setReport] = useState<PaymentReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Payment Report | Multibrand POS";
    loadCompanies();
    loadBanks();
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

  // the bank is a Chart of Accounts head (Cash At Bank) on the supplier payment, so the option value is its id
  async function loadBanks() {
    try {
      const res = await api.get("/reports/banks");
      setBanks(res.data.data);
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
      const result = await reportService.payment(filledFields(form));
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
  let totalPayment = 0;
  let totalDiscount = 0;
  let totalAmount = 0;
  for (const row of rows) {
    totalPayment += row.payment_amount;
    totalDiscount += row.discount;
    totalAmount += row.total_amount;
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From ${formatDate(searchedForm.start_date)} To ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["payment-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Purchases" }, { title: "Report" }, { title: "Payment Report" }]} />

        <ReportSearchCard title="Payment Report" onSearch={search} onReset={reset} loading={loading} error={error}>
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
          <ReportField label="Payment Type">
            <ReactSelect
              options={typeOptions}
              value={form.payment_type || null}
              placeholder="All"
              onChange={(value) => setField("payment_type", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Bank Name">
            <ReactSelect
              options={banks}
              value={form.bank_name || null}
              placeholder="All"
              onChange={(value) => setField("bank_name", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Supplier">
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
            title="Payment Report"
            lines={headerLines}
            company={report.company}
            fileName="payment-report"
            rowCount={rows.length}
            summary={[
              { label: "Payments", value: String(rows.length) },
              { label: "Payment Amount", value: reportMoney(totalPayment), tone: "success" },
              { label: "Discount", value: reportMoney(totalDiscount) },
              { label: "Total Amount", value: reportMoney(totalAmount), tone: "brand" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Date</th>
                  <th className={`${rptTh} text-left`}>PR No</th>
                  <th className={`${rptTh} text-left`}>Barcode</th>
                  <th className={`${rptTh} text-left`}>Supplier Name</th>
                  <th className={`${rptTh} text-left`}>Payment Type</th>
                  <th className={`${rptTh} text-left`}>Bank Name</th>
                  <th className={`${rptTh} num text-right`}>Payment Amount</th>
                  <th className={`${rptTh} num text-right`}>Discount Amount</th>
                  <th className={`${rptTh} num text-right`}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => (
                  <tr key={row.sl_no} className="even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]">
                    <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{formatDate(row.payment_date)}</td>
                    <td className={`${rptTd} whitespace-nowrap font-medium text-gray-800 dark:text-white/90`}>{row.sl_no}</td>
                    <td className={`${rptTd} min-w-[120px]`}>{row.barcode}</td>
                    <td className={`${rptTd} min-w-[150px]`}>{row.supplier_name}</td>
                    <td className={`${rptTd} whitespace-nowrap`}>{paymentTypeName(row.payment_type || "1")}</td>
                    <td className={rptTd}>{row.bank_name}</td>
                    <td className={`${rptTd} num text-right font-semibold text-success-600 dark:text-success-400`}>{reportMoney(row.payment_amount)}</td>
                    <td className={`${rptTd} num text-right ${row.discount ? "" : "text-gray-400"}`}>{reportMoney(row.discount)}</td>
                    <td className={`${rptTd} num text-right font-semibold`}>{reportMoney(row.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={7} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalPayment)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalDiscount)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalAmount)}</td>
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
