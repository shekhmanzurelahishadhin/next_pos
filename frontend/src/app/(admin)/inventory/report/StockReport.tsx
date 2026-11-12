"use client";
// Stock QTY Report (parts_bazar inventory/stockReportInAmount) and
// Inventory Stock Amount Report (parts_bazar inventory/stockAmountReport).
// Both use the same search and the same rows, one row per product + barcode.
// kind "qty":    opening, in, out and closing stock
// kind "amount": the same, with purchase price x qty beside every qty
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { apiErrorMessage, filledFields, firstDayOfMonth, loadOptions, Option, reportMoney, reportQty, today } from "@/lib/report";
import AccessRoute from "@/routes/AccessRoute";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import ReactSelect from "@/components/form/ReactSelect";
import ReportSearchCard, { ReportField, reportInputClass } from "@/components/report/ReportSearchCard";
import ReportView, { rptTd, rptTh, rptTotal } from "@/components/report/ReportView";
import { ProductPicker } from "@/components/report/ReportPickers";
import { reportService, StockQtyReport, StockQtyRow } from "@/services/reportService";

type StoreOption = Option & { company_id: string };

type SearchForm = {
  start_date: string;
  end_date: string;
  company_id: string;
  store_id: string;
  location_id: string;
  category_id: string;
  sub_category_id: string;
  product_id: string;
  barcode: string;
  show: string;
};

type Totals = {
  opening: number;
  stockIn: number;
  stockOut: number;
  closing: number;
  closingAmount: number;
  purchasePrice: number;
  openingAmount: number;
  stockInAmount: number;
  stockOutAmount: number;
};

const SHOW_OPTIONS = [
  { value: "current", label: "Current" },
  { value: "all", label: "Show All" },
];

// the two reports that use this page
const REPORTS = {
  qty: {
    title: "Stock QTY Report",
    reportTitle: "Inventory Stock Report",
    permission: "stock-qty-report.view",
    fileName: "stock-qty-report",
  },
  amount: {
    title: "Inventory Stock Amount Report",
    reportTitle: "Inventory Stock Amount Report",
    permission: "stock-amount-report.view",
    fileName: "stock-amount-report",
  },
};

function emptyForm(): SearchForm {
  return {
    start_date: firstDayOfMonth(),
    end_date: today(),
    company_id: "",
    store_id: "",
    location_id: "",
    category_id: "",
    sub_category_id: "",
    product_id: "",
    barcode: "",
    show: "current",
  };
}

export default function StockReport({ kind }: { kind: "qty" | "amount" }) {
  const config = REPORTS[kind];

  const [form, setForm] = useState<SearchForm>(emptyForm());
  const [formKey, setFormKey] = useState(0); // changing it gives fresh date pickers on reset
  const [productText, setProductText] = useState("");
  const [companies, setCompanies] = useState<Option[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [subCategories, setSubCategories] = useState<Option[]>([]);
  const [report, setReport] = useState<StockQtyReport | null>(null);
  const [searchedForm, setSearchedForm] = useState<SearchForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = `${config.title} | Multibrand POS`;
    loadCompanies();
    loadStores();
    loadOptions("/configure/categories").then(setCategories).catch(() => {});
    loadSubCategories();
  }, [config.title]);

  async function loadCompanies() {
    try {
      const list = await loadOptions("/configure/companies");
      setCompanies(list);

      // a company user has only one company, so pick it (like parts_bazar)
      if (list.length === 1) {
        setForm((old) => ({ ...old, company_id: list[0].value }));
      }
    } catch {
      // the list is only a filter, the page still works without it
    }
  }

  async function loadStores() {
    try {
      const res = await api.get("/configure/stores", { params: { status: 1 } });
      const list: StoreOption[] = [];
      for (const store of res.data.data.data) {
        list.push({ value: String(store.id), label: store.name, company_id: String(store.company_id ?? "") });
      }
      setStores(list);
    } catch {
      // the list is only a filter
    }
  }

  // parts_bazar "Product Type" = sub category here.
  // The same sub category name is under many categories, so the label is "Engine (G)".
  async function loadSubCategories() {
    try {
      const categoryRes = await api.get("/configure/categories", { params: { status: 1 } });
      const subCategoryRes = await api.get("/configure/sub-categories", { params: { status: 1 } });

      const categoryNames: Record<number, string> = {};
      for (const category of categoryRes.data.data.data) {
        categoryNames[category.id] = category.name;
      }

      const list: Option[] = [];
      for (const subCategory of subCategoryRes.data.data.data) {
        const categoryName = categoryNames[subCategory.category_id] || "-";
        list.push({ value: String(subCategory.id), label: `${subCategory.name} (${categoryName})` });
      }
      setSubCategories(list);
    } catch {
      // the list is only a filter
    }
  }

  // load the locations of the picked store
  useEffect(() => {
    setLocations([]);
    if (form.store_id) {
      loadOptions("/configure/locations", { store_id: form.store_id }).then(setLocations).catch(() => {});
    }
  }, [form.store_id]);

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
      setError("Please select a Start & End Date!");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("End Date can not be before Start Date.");
      return;
    }
    setError("");

    setLoading(true);
    try {
      const result = await reportService.stockReport(kind, filledFields(form));
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
    setProductText("");
    setError("");
    setFormKey(formKey + 1);
  }

  // stores of the picked company
  let companyStores = stores;
  if (form.company_id) {
    companyStores = stores.filter((store) => store.company_id === form.company_id);
  }

  // totals of the report
  const rows = report ? report.rows : [];
  const totals: Totals = {
    opening: 0,
    stockIn: 0,
    stockOut: 0,
    closing: 0,
    closingAmount: 0,
    purchasePrice: 0,
    openingAmount: 0,
    stockInAmount: 0,
    stockOutAmount: 0,
  };
  for (const row of rows) {
    totals.opening += row.opening_stock;
    totals.stockIn += row.stock_in;
    totals.stockOut += row.stock_out;
    totals.closing += row.closing_stock;
    totals.closingAmount += row.total_amount;
    totals.purchasePrice += row.purchase_price;
    totals.openingAmount += row.opening_stock * row.purchase_price;
    totals.stockInAmount += row.stock_in * row.purchase_price;
    totals.stockOutAmount += row.stock_out * row.purchase_price;
  }

  // lines under the report title
  const headerLines: string[] = [];
  if (report && searchedForm) {
    headerLines.push(`From: ${formatDate(searchedForm.start_date)} To: ${formatDate(searchedForm.end_date)}`);
    if (report.store && report.location) {
      headerLines.push(`STORE: ${report.store} · LOCATION: ${report.location}`);
    } else if (report.store) {
      headerLines.push(`STORE: ${report.store}`);
    } else {
      headerLines.push("ALL STORES");
    }
  }

  // cards above the table
  let summary;
  if (kind === "qty") {
    summary = [
      { label: "Opening Stock", value: reportQty(totals.opening) },
      { label: "Stock In", value: reportQty(totals.stockIn), tone: "success" as const },
      { label: "Stock Out", value: reportQty(totals.stockOut), tone: "error" as const },
      { label: "Closing Stock", value: reportQty(totals.closing), tone: "brand" as const },
      { label: "Barcodes", value: String(rows.length) },
      { label: "Total Purchase", value: reportMoney(totals.closingAmount), tone: "brand" as const },
    ];
  } else {
    summary = [
      { label: "Opening Amount", value: reportMoney(totals.openingAmount) },
      { label: "Stock In Amount", value: reportMoney(totals.stockInAmount), tone: "success" as const },
      { label: "Stock Out Amount", value: reportMoney(totals.stockOutAmount), tone: "error" as const },
      { label: "Closing Stock", value: reportQty(totals.closing) },
      { label: "Barcodes", value: String(rows.length) },
      { label: "Closing Amount", value: reportMoney(totals.closingAmount), tone: "brand" as const },
    ];
  }

  return (
    <AccessRoute requiredPermissions={[config.permission]}>
      <div>
        <PageBreadcrumb items={[{ title: "Inventory" }, { title: "Report" }, { title: config.title }]} />

        <ReportSearchCard title={config.title} onSearch={search} onReset={reset} loading={loading} error={error}>
          <ReportField label="Start Date" required>
            <DatePicker key={`start${formKey}`} id="rpt_start_date" defaultDate={form.start_date} onChange={changeStartDate} placeholder="Start date" />
          </ReportField>
          <ReportField label="End Date" required>
            <DatePicker key={`end${formKey}`} id="rpt_end_date" defaultDate={form.end_date} onChange={changeEndDate} placeholder="End date" />
          </ReportField>
          <ReportField label="Company">
            <ReactSelect
              options={companies}
              value={form.company_id || null}
              placeholder="All companies"
              isDisabled={companies.length === 1}
              onChange={(value) => {
                // a new company clears the store and location
                setForm((old) => ({ ...old, company_id: value ? String(value) : "", store_id: "", location_id: "" }));
              }}
            />
          </ReportField>
          <ReportField label="Store">
            <ReactSelect
              options={companyStores}
              value={form.store_id || null}
              placeholder="All stores"
              onChange={(value) => {
                // a new store clears the location
                setForm((old) => ({ ...old, store_id: value ? String(value) : "", location_id: "" }));
              }}
            />
          </ReportField>
          <ReportField label="Location">
            <ReactSelect
              options={locations}
              value={form.location_id || null}
              placeholder={form.store_id ? "All locations" : "Select store first"}
              isDisabled={!form.store_id}
              onChange={(value) => setField("location_id", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Show">
            <ReactSelect
              options={SHOW_OPTIONS}
              value={form.show}
              isClearable={false}
              onChange={(value) => setField("show", value ? String(value) : "current")}
            />
          </ReportField>
          <ReportField label="Quality">
            <ReactSelect
              options={categories}
              value={form.category_id || null}
              placeholder="All"
              onChange={(value) => setField("category_id", value ? String(value) : "")}
            />
          </ReportField>
          <ReportField label="Product Type">
            <ReactSelect
              options={subCategories}
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
                setField("product_id", ""); // typing again clears the picked product
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
            title={config.reportTitle}
            lines={headerLines}
            company={report.company}
            fileName={config.fileName}
            rowCount={rows.length}
            summary={summary}
          >
            {kind === "qty" && <QtyTable rows={rows} totals={totals} />}
            {kind === "amount" && <AmountTable rows={rows} totals={totals} />}
          </ReportView>
        )}
      </div>
    </AccessRoute>
  );
}

// grey text for a zero, the colour for any other value
function colorUnlessZero(value: number, color: string) {
  return value ? color : "text-gray-400";
}

const green = "text-success-600 dark:text-success-400";
const red = "text-error-600 dark:text-error-400";
const rowClass = "even:bg-gray-50/60 hover:bg-brand-50/40 dark:even:bg-white/[0.02] dark:hover:bg-white/[0.04]";

function QtyTable({ rows, totals }: { rows: StockQtyRow[]; totals: Totals }) {
  return (
    <table className="rpt-table w-full border-collapse text-xs">
      <thead>
        <tr>
          <th className={`${rptTh} text-left`}>SL</th>
          <th className={`${rptTh} text-left`}>Item Desc.</th>
          <th className={`${rptTh} text-left`}>Part Number</th>
          <th className={`${rptTh} text-left`}>Barcode</th>
          <th className={`${rptTh} text-left`}>Quality</th>
          <th className={`${rptTh} num text-right`}>Opening Stock</th>
          <th className={`${rptTh} num text-right`}>Stock In</th>
          <th className={`${rptTh} num text-right`}>Stock Out</th>
          <th className={`${rptTh} num text-right`}>Closing Stock</th>
          <th className={`${rptTh} num text-right`}>Purchase Price</th>
          <th className={`${rptTh} num text-right`}>Total Purchase</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={11} className={`${rptTd} center py-6 text-center text-gray-400`}>No stock found for these conditions</td>
          </tr>
        )}
        {rows.map((row, index) => (
          <tr key={row.product_id + "-" + row.barcode} className={rowClass}>
            <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
            <td className={`${rptTd} min-w-[140px]`}>{row.product_name}</td>
            <td className={`${rptTd} whitespace-nowrap font-medium`}>{row.part_number}</td>
            <td className={`${rptTd} whitespace-nowrap`}>{row.barcode}</td>
            <td className={`${rptTd} center text-center`}>{row.category_name}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(row.opening_stock)}</td>
            <td className={`${rptTd} num text-right ${colorUnlessZero(row.stock_in, green)}`}>{reportQty(row.stock_in)}</td>
            <td className={`${rptTd} num text-right ${colorUnlessZero(row.stock_out, red)}`}>{reportQty(row.stock_out)}</td>
            <td className={`${rptTd} num text-right font-semibold ${row.closing_stock < 0 ? "text-error-600" : ""}`}>{reportQty(row.closing_stock)}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(row.purchase_price)}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(row.total_amount)}</td>
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className={rptTotal}>
            <td colSpan={5} className={`${rptTd} num text-right`}>Total:</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.opening)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.stockIn)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.stockOut)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.closing)}</td>
            <td className={rptTd}></td>
            <td className={`${rptTd} num text-right`}>{reportMoney(totals.closingAmount)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// like parts_bazar stockAmountReportView: price x qty beside every qty;
// the purchase price total is the sum of the prices
function AmountTable({ rows, totals }: { rows: StockQtyRow[]; totals: Totals }) {
  return (
    <table className="rpt-table w-full border-collapse text-xs">
      <thead>
        <tr>
          <th className={`${rptTh} text-left`}>SL</th>
          <th className={`${rptTh} text-left`}>Item Desc.</th>
          <th className={`${rptTh} text-left`}>Part Number</th>
          <th className={`${rptTh} text-left`}>Barcode</th>
          <th className={`${rptTh} text-left`}>Quality</th>
          <th className={`${rptTh} num text-right`}>Purchase Price</th>
          <th className={`${rptTh} num text-right`}>Opening Stock</th>
          <th className={`${rptTh} num text-right`}>Opening Stock Amount</th>
          <th className={`${rptTh} num text-right`}>Stock In</th>
          <th className={`${rptTh} num text-right`}>Stock In Amount</th>
          <th className={`${rptTh} num text-right`}>Stock Out</th>
          <th className={`${rptTh} num text-right`}>Stock Out Amount</th>
          <th className={`${rptTh} num text-right`}>Closing Stock</th>
          <th className={`${rptTh} num text-right`}>Closing Stock Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={14} className={`${rptTd} center py-6 text-center text-gray-400`}>No stock found for these conditions</td>
          </tr>
        )}
        {rows.map((row, index) => (
          <tr key={row.product_id + "-" + row.barcode} className={rowClass}>
            <td className={`${rptTd} center text-center text-gray-500`}>{index + 1}</td>
            <td className={`${rptTd} min-w-[140px]`}>{row.product_name}</td>
            <td className={`${rptTd} whitespace-nowrap font-medium`}>{row.part_number}</td>
            <td className={`${rptTd} whitespace-nowrap`}>{row.barcode}</td>
            <td className={`${rptTd} center text-center`}>{row.category_name}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(row.purchase_price)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(row.opening_stock)}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(row.opening_stock * row.purchase_price)}</td>
            <td className={`${rptTd} num text-right ${colorUnlessZero(row.stock_in, green)}`}>{reportQty(row.stock_in)}</td>
            <td className={`${rptTd} num text-right ${colorUnlessZero(row.stock_in, green)}`}>{reportMoney(row.stock_in * row.purchase_price)}</td>
            <td className={`${rptTd} num text-right ${colorUnlessZero(row.stock_out, red)}`}>{reportQty(row.stock_out)}</td>
            <td className={`${rptTd} num text-right ${colorUnlessZero(row.stock_out, red)}`}>{reportMoney(row.stock_out * row.purchase_price)}</td>
            <td className={`${rptTd} num text-right font-semibold ${row.closing_stock < 0 ? "text-error-600" : ""}`}>{reportQty(row.closing_stock)}</td>
            <td className={`${rptTd} num text-right font-semibold`}>{reportMoney(row.total_amount)}</td>
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className={rptTotal}>
            <td colSpan={5} className={`${rptTd} num text-right`}>Total:</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(totals.purchasePrice)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.opening)}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(totals.openingAmount)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.stockIn)}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(totals.stockInAmount)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.stockOut)}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(totals.stockOutAmount)}</td>
            <td className={`${rptTd} num text-right`}>{reportQty(totals.closing)}</td>
            <td className={`${rptTd} num text-right`}>{reportMoney(totals.closingAmount)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
