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

  async stockQty(filters: Record<string, string>): Promise<StockQtyReport> {
    const res = await api.get("/reports/inventory/stock-qty", { params: filters });
    return res.data.data;
  }
}

export const reportService = new ReportService();
