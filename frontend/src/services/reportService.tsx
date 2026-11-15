import { api } from "@/lib/api";

export interface ReportCompany {
  name: string;
  address?: string | null;
  phone?: string | null;
  logo?: string | null;
}

export interface StockQtyRow {
  product_id: number;
  barcode: string;
  product_name: string;
  part_number: string;
  category_name: string | null;
  brand_name: string | null;
  opening_stock: number;
  stock_in: number;
  stock_out: number;
  closing_stock: number;
  purchase_price: number;
  total_amount: number;
}

export interface StockQtyReport {
  rows: StockQtyRow[];
  company: ReportCompany | null;
  store: string | null;
  location: string | null;
}

export interface ProductStockRow {
  id: number;
  product_name: string;
  part_number: string;
  sub_category_name: string | null;
  brand_name: string | null;
  closing_stock?: number;
  alert_qty?: number;
}

export interface ProductStockReport {
  rows: ProductStockRow[];
  company: ReportCompany | null;
}

export interface ProductReportRow {
  id: number;
  category_name: string | null;
  sub_category_name: string | null;
  product_name: string;
  part_number: string;
  unit_name: string | null;
  unit_weight: string | null;
  alert_qty: number | null;
  vehicle_brand_name: string | null;
  supported_models: string | null;
  engine: string | null;
  chassis: string | null;
}

export interface ProductReport {
  rows: ProductReportRow[];
  company: ReportCompany | null;
}

export interface SalesReportRow {
  id: number;
  sale_id: number;
  so_no: string;
  order_date: string;
  grand_total: number;
  customer_name: string | null;
  product_name: string;
  part_number: string;
  barcode: string;
  qty: number;
  sell_price: number;
  discount: number;
  total_amount: number;
}

export interface SalesReport {
  rows: SalesReportRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | []; // picked filters by name, for the header
}

export interface SalesSummaryRow {
  id: number;
  so_no: string;
  order_date: string;
  grand_total: number;
  customer_name: string;
  customer_type: string | null;
  company_name: string | null;
  received_amount: number;
  due_amount: number;
  paid: boolean;
}

export interface SalesSummaryReport {
  rows: SalesSummaryRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface SalesReturnRow {
  id: number;
  return_id: number;
  return_no: string;
  return_date: string;
  so_no: string;
  customer_name: string | null;
  product_name: string;
  part_number: string;
  barcode: string | null;
  sale_qty: number;
  sell_price: number;
  sale_amount: number;
  return_qty: number;
  return_amount: number;
}

export interface SalesReturnReport {
  rows: SalesReturnRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface CollectionRow {
  mr_no: string;
  receipt_date: string;
  received_type: string | null;
  bank_name: string | null;
  customer_name: string | null;
  received_amount: number;
  discount: number;
  vds: number;
  tds: number;
  total_amount: number;
}

export interface CollectionReport {
  rows: CollectionRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface InvoiceCollectionRow {
  id: number;
  mr_no: string;
  receipt_date: string;
  received_type: string | null;
  invoice_no: string | null;
  memo_no: string | null;
  customer_name: string | null;
  received_amount: number;
  discount: number;
  vds: number;
  tds: number;
  mr_total: number;
}

export interface InvoiceCollectionReport {
  rows: InvoiceCollectionRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface CustomerDueRow {
  id: number;
  customer_name: string;
  phone: string | null;
  code: string | null;
  due_amount: number;
  bill_qty: number;
  due_days: number;
}

export interface CustomerDueReport {
  rows: CustomerDueRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface CustomerLedgerRow {
  id: number;
  date: string;
  type: "Sale" | "Return" | "Refund" | "Receipt";
  head: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CustomerLedgerReport {
  rows: CustomerLedgerRow[];
  opening: number;
  customer: { id: number; name: string; code: string | null; phone: string | null; address: string | null };
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface CustomerLedgerSummaryRow {
  id: number;
  customer_name: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

export interface CustomerLedgerSummaryReport {
  rows: CustomerLedgerSummaryRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface CustomerInfoRow {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  car_name: string | null;
  car_no: string | null;
  email: string | null;
}

export interface CustomerInfoReport {
  rows: CustomerInfoRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface ReportSupplier {
  id: number;
  name: string;
  phone: string | null;
  code: string | null;
}

export interface PurchaseReportRow {
  id: number;
  purchase_id: number;
  po_no: string;
  purchase_date: string;
  grand_total: number;
  supplier_name: string | null;
  store_name: string | null;
  product_name: string;
  part_number: string;
  unit_name: string | null;
  barcode: string | null;
  qty: number;
  weight_unit: number;
  total_weight: number;
  per_kg: number;
  total_weight_amount: number;
  unit_price: number;
  total_unit_price: number;
  total_product_price: number;
  total_purchase_price: number;
}

export interface PurchaseReport {
  rows: PurchaseReportRow[];
  company: ReportCompany | null;
  labels: Record<string, string> | [];
}

export interface ReportCustomer {
  id: number;
  name: string;
  phone: string | null;
  code: string | null;
}

export interface ReportProduct {
  id: number;
  name: string;
  part_number: string;
}

class ReportService {
  async searchProducts(term: string): Promise<ReportProduct[]> {
    const res = await api.get("/reports/search-products", { params: { term } });
    return res.data.data;
  }

  async searchSuppliers(term: string): Promise<ReportSupplier[]> {
    const res = await api.get("/reports/search-suppliers", { params: { term } });
    return res.data.data;
  }

  async purchase(filters: Record<string, string>): Promise<PurchaseReport> {
    const res = await api.get("/reports/purchase/purchase", { params: filters });
    return res.data.data;
  }

  async searchCustomers(term: string): Promise<ReportCustomer[]> {
    const res = await api.get("/reports/search-customers", { params: { term } });
    return res.data.data;
  }

  async sales(filters: Record<string, string>): Promise<SalesReport> {
    const res = await api.get("/reports/sales/sales", { params: filters });
    return res.data.data;
  }

  async salesSummary(filters: Record<string, string>): Promise<SalesSummaryReport> {
    const res = await api.get("/reports/sales/sales-summary", { params: filters });
    return res.data.data;
  }

  async salesReturn(filters: Record<string, string>): Promise<SalesReturnReport> {
    const res = await api.get("/reports/sales/sales-return", { params: filters });
    return res.data.data;
  }

  async collection(filters: Record<string, string>): Promise<CollectionReport> {
    const res = await api.get("/reports/sales/collection", { params: filters });
    return res.data.data;
  }

  async invoiceCollection(filters: Record<string, string>): Promise<InvoiceCollectionReport> {
    const res = await api.get("/reports/sales/invoice-collection", { params: filters });
    return res.data.data;
  }

  async customerDue(filters: Record<string, string>): Promise<CustomerDueReport> {
    const res = await api.get("/reports/sales/customer-due", { params: filters });
    return res.data.data;
  }

  async customerLedger(filters: Record<string, string>): Promise<CustomerLedgerReport> {
    const res = await api.get("/reports/sales/customer-ledger", { params: filters });
    return res.data.data;
  }

  async customerLedgerSummary(filters: Record<string, string>): Promise<CustomerLedgerSummaryReport> {
    const res = await api.get("/reports/sales/customer-ledger-summary", { params: filters });
    return res.data.data;
  }

  async customerInfo(filters: Record<string, string>): Promise<CustomerInfoReport> {
    const res = await api.get("/reports/sales/customer-info", { params: filters });
    return res.data.data;
  }

  // Car Name & Model or Car No values for the Customer Info Report pickers
  async searchCarValues(type: "car_name" | "car_no", term: string): Promise<string[]> {
    const res = await api.get("/reports/sales/customer-info/cars", { params: { type, term } });
    return res.data.data;
  }

  // Stock QTY Report and Inventory Stock Amount Report share one query
  async stockReport(kind: "qty" | "amount", filters: Record<string, string>): Promise<StockQtyReport> {
    const res = await api.get(`/reports/inventory/stock-${kind}`, { params: filters });
    return res.data.data;
  }

  // Alert Quantity Report and Out Of Stock Report
  async productStockReport(kind: "alert-qty" | "out-of-stock", filters: Record<string, string>): Promise<ProductStockReport> {
    const res = await api.get(`/reports/inventory/${kind}`, { params: filters });
    return res.data.data;
  }

  async productReport(filters: Record<string, string>): Promise<ProductReport> {
    const res = await api.get("/reports/configure/products", { params: filters });
    return res.data.data;
  }
}

export const reportService = new ReportService();
