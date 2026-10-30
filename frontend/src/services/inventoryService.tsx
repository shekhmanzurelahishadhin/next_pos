import { api } from "@/lib/api";

// One stock in / out row (Inventory Stock page)
export interface StockRow {
  id: number;
  transaction_date: string;
  entry_point: string;
  entry_no: string | null;
  store_id: number;
  store_name?: string;
  location_name?: string;
  product_name: string;
  part_number: string;
  unit_name?: string | null;
  barcode: string | null;
  stock_in: string;
  stock_out: string;
  purchase_price: string;
  created_by_name?: string | null;
  created_at: string;
}

// One barcode (Inventory Barcode page)
export interface BarcodeRow {
  id: number;
  transaction_date: string;
  barcode: string;
  entry_point: string;
  entry_no: string | null;
  store_id: number;
  store_name?: string;
  location_name?: string;
  category_name?: string | null;
  brand_name?: string | null;
  product_name: string;
  part_number: string;
  purchase_price: string;
  sell_price: string;
  stock_in: string;
  stock_out: string;
  closing_stock: string;
}

// Where a stock row came from
export const ENTRY_POINTS = [
  { value: "purchase", label: "Purchase" },
  { value: "purchase_return", label: "Purchase Return" },
];

export const entryPointName = (value: string) => ENTRY_POINTS.find((e) => e.value === value)?.label ?? value;

const clean = (filters: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));

class InventoryService {
  async getStock(filters: Record<string, string | number> = {}) {
    const res = await api.get("/inventory/stock", { params: clean(filters) });
    return res.data.data as { data: StockRow[]; total: number };
  }

  async getBarcodes(filters: Record<string, string | number> = {}) {
    const res = await api.get("/inventory/barcodes", { params: clean(filters) });
    return res.data.data as { data: BarcodeRow[]; total: number };
  }
}

export const inventoryService = new InventoryService();
