import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

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
  remarks?: string | null;
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
  { value: "sale", label: "Sale" },
  { value: "sale_return", label: "Sales Return" },
  { value: "stock_transfer", label: "Stock Transfer" },
  { value: "manual", label: "Manual" },
];

export const entryPointName = (value: string) => ENTRY_POINTS.find((e) => e.value === value)?.label ?? value;

// part number hit of a manual stock in
export interface ManualProductHit {
  id: number;
  part_number: string;
  name: string;
  unit: string | null;
  purchase_price: number;
  sell_price: number;
  stock: number;
}

// barcode hit of a manual stock out
export interface ManualBarcodeHit {
  barcode: string;
  product_name: string | null;
  part_number: string | null;
  store_name: string | null;
  location_name: string | null;
  stock: number;
  purchase_price: number;
}

export interface ManualStockPayload {
  type: "in" | "out";
  transaction_date: string;
  qty: string;
  remarks: string;
  store_id?: string;
  location_id?: string;
  product_id?: number;
  purchase_price?: string;
  barcode?: string;
}

const MANUAL = "/inventory/manual-stock";

class InventoryService {
  async searchManualProducts(term: string, storeId: string, locationId: string): Promise<ManualProductHit[]> {
    const res = await api.get(`${MANUAL}/search-products`, { params: removeEmpty({ term: term, store_id: storeId, location_id: locationId }) });
    return res.data.data;
  }

  async searchManualBarcodes(term: string): Promise<ManualBarcodeHit[]> {
    const res = await api.get(`${MANUAL}/search-barcodes`, { params: { term: term } });
    return res.data.data;
  }

  async saveManualStock(data: ManualStockPayload) {
    await api.post(MANUAL, data);
  }

  async deleteManualStock(id: number) {
    await api.delete(`${MANUAL}/${id}`);
  }

  async getStock(filters: Record<string, string | number> = {}) {
    const res = await api.get("/inventory/stock", { params: removeEmpty(filters) });
    return res.data.data as { data: StockRow[]; total: number };
  }

  async getBarcodes(filters: Record<string, string | number> = {}) {
    const res = await api.get("/inventory/barcodes", { params: removeEmpty(filters) });
    return res.data.data as { data: BarcodeRow[]; total: number };
  }
}

export const inventoryService = new InventoryService();
