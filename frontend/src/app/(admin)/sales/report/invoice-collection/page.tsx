"use client";
// Invoice Wise Collection Report (parts_bazar moneyReceipt/invoiceWiseCollectionReport)
// Every invoice line of the money receipts between the dates.
// The date, MR no, customer, type and MR total are merged over the lines of one MR.
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/format";
import { PAYMENT_TYPES, paymentTypeName } from "@/lib/payment";
import { apiErrorMessage, filledFields, firstDayOfMonth, labelLines, loadOptions, Option, reportMoney, today } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField } from "@/components/report/ReportSearchCard";
import ReportView, { groupSpans, rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { CustomerPicker } from "@/components/report/ReportPickers";
import { reportService, InvoiceCollectionReport } from "@/services/reportService";

type SearchForm = {
  start_date: string;
  end_date: string;
  company_id: string;
  received_type: string;
  bank_name: string;
  customer_id: string;
};

function emptyForm(): SearchForm {
  return { start_date: firstDayOfMonth(), end_date: today(), company_id: "", received_type: "", bank_name: "", customer_id: "" };
}

export default function InvoiceCollectionReportPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [customerText, setCustomerText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [banks, setBanks] = useState<Option[]>([]);
  const [report, setReport] = useState<InvoiceCollectionReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Invoice Wise Collection Report | Multibrand POS";
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

  // the bank is saved by name on the money receipt, so the option value is the name
  async function loadBanks() {
    try {
      const list = await loadOptions("/configure/lookups", { type: "bank_name" });
      const bankOptions: Option[] = [];
      for (const bank of list) {
        bankOptions.push({ value: bank.label, label: bank.label });
      }
      setBanks(bankOptions);
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
      const result = await reportService.invoiceCollection(filledFields(form));
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

  const rows = report ? report.rows : [];

  // the first line of an MR gets the merged cells
  const mrSpans = groupSpans(rows, (row) => row.mr_no);

  // totals of the report
  let mrCount = 0;
  let totalReceived = 0;
  let totalDiscount = 0;
  let totalVds = 0;
  let totalTds = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    totalReceived += row.received_amount;
    totalDiscount += row.discount;
    totalVds += row.vds;
    totalTds += row.tds;
    if (mrSpans[i]) {
      mrCount++;
    }
  }
  const grandTotal = totalReceived + totalDiscount + totalVds + totalTds;

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From ${formatDate(searchedForm.start_date)} To ${formatDate(searchedForm.end_date)}`);
    headerLines.push(...labelLines(report.labels));
  }

  return (
    <AccessRoute requiredPermissions={["invoice-wise-collection-report.view"]}>
      <div>
        <PageBreadcrumb items={[{ title: "Sales" }, { title: "Report" }, { title: "Invoice Wise Collection Report" }]} />

        <ReportSearchCard title="Invoice Wise Collection Report" onSearch={search} onReset={reset} loading={loading} error={error}>
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
          <ReportField label="MR Type">
            <ReactSelect
              options={PAYMENT_TYPES}
              value={form.received_type || null}
              placeholder="All"
              onChange={(value) => setField("received_type", value ? String(value) : "")}
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
          <ReportField label="Customer" className="sm:col-span-2 xl:col-span-1">
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
            title="Invoice Wise Collection Report"
            lines={headerLines}
            company={report.company}
            fileName="invoice-wise-collection-report"
            rowCount={rows.length}
            summary={[
              { label: "Money Receipts", value: String(mrCount) },
              { label: "Invoice Lines", value: String(rows.length) },
              { label: "Received", value: reportMoney(totalReceived), tone: "success" },
              { label: "Discount + VDS + TDS", value: reportMoney(totalDiscount + totalVds + totalTds) },
              { label: "Total Amount", value: reportMoney(grandTotal), tone: "brand" },
            ]}
          >
            <table className="rpt-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`${rptTh} text-left`}>SL</th>
                  <th className={`${rptTh} text-left`}>Date</th>
                  <th className={`${rptTh} text-left`}>MR No</th>
                  <th className={`${rptTh} text-left`}>Customer Name</th>
                  <th className={`${rptTh} text-left`}>Receive Type</th>
                  <th className={`${rptTh} text-left`}>Manual No</th>
                  <th className={`${rptTh} text-left`}>Invoice No</th>
                  <th className={`${rptTh} num text-right`}>Received Amount</th>
                  <th className={`${rptTh} num text-right`}>Discount Amount</th>
                  <th className={`${rptTh} num text-right`}>VDS Amount</th>
                  <th className={`${rptTh} num text-right`}>TDS Amount</th>
                  <th className={`${rptTh} num text-right`}>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className={`${rptTd} center py-6 text-center text-gray-400`}>No result found!</td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  const span = mrSpans[index]; // only set on the first line of an MR
                  // opening balance and advance lines have no real invoice, so they are shown in italic
                  const noInvoice = row.invoice_no === "Opening Balance" || row.invoice_no === "Advance";

                  return (
                    <tr key={row.id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.04]">
                      <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
                      {span && (
                        <>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{formatDate(row.receipt_date)}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top font-medium text-gray-800 dark:text-white/90`}>{row.mr_no}</td>
                          <td rowSpan={span} className={`${rptTd} min-w-[140px] align-top`}>{row.customer_name}</td>
                          <td rowSpan={span} className={`${rptTd} whitespace-nowrap align-top`}>{paymentTypeName(row.received_type || "1")}</td>
                        </>
                      )}
                      <td className={rptTd}>{row.memo_no}</td>
                      <td className={`${rptTd} whitespace-nowrap ${noInvoice ? "italic text-gray-500" : ""}`}>{row.invoice_no}</td>
                      <td className={`${rptTd} num text-right font-semibold text-success-600 dark:text-success-400`}>{reportMoney(row.received_amount)}</td>
                      <td className={`${rptTd} num text-right ${row.discount ? "" : "text-gray-400"}`}>{reportMoney(row.discount)}</td>
                      <td className={`${rptTd} num text-right ${row.vds ? "" : "text-gray-400"}`}>{reportMoney(row.vds)}</td>
                      <td className={`${rptTd} num text-right ${row.tds ? "" : "text-gray-400"}`}>{reportMoney(row.tds)}</td>
                      {span && (
                        <td rowSpan={span} className={`${rptTd} num align-top text-right font-semibold`}>{reportMoney(row.mr_total)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={rptTotal}>
                    <td colSpan={7} className={`${rptTd} num text-right`}>Total</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalReceived)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalDiscount)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalVds)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(totalTds)}</td>
                    <td className={`${rptTd} num text-right`}>{reportMoney(grandTotal)}</td>
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
