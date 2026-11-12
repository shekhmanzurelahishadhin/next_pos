import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export const TRANSFER_STATUS = { PENDING: 0, APPROVED: 1 } as const;

// Barcode autocomplete hit: where the barcode is now and how much can move
export interface TransferBarcodeHit {
  barcode: string;
  product_id: number;
  product_name: string;
  part_number: string;
  store_id: number;
  store_name: string;
  location_id: number | null;
  location_name?: string | null;
  stock: number;
}

// One line of the "Added List" grid
export interface TransferItem {
  barcode: string;
  product_name: string;
  part_number: string;
  from_store_name: string;
  from_location_name: string;
  stock_qty: number;
  to_store_id: number;
  to_store_name: string;
  to_location_id: number;
  to_location_name: string;
  transfer_qty: number;
}

export interface TransferPayload {
  transfer_date: string;
  company_id: number;
  remarks?: string;
  items: { barcode: string; to_store_id: number; to_location_id: number; transfer_qty: number }[];
}

// "Stock Transfer Manage" row: one transfer
export interface StockTransferRow {
  id: number;
  max_sl_no: number;
  transfer_no: string;
  transfer_date: string;
  status: number;
  remarks?: string | null;
  created_at: string;
  approved_at?: string | null;
  created_by_name?: string | null;
  approved_by_name?: string | null;
  items: number;
  total_qty: string;
}

const BASE = "/inventory/stock-transfers";

class StockTransferService {
  async searchBarcodes(term: string, companyId: number, exceptId?: number | null): Promise<TransferBarcodeHit[]> {
    const res = await api.get(`${BASE}/search-barcodes`, { params: { term, company_id: companyId, except_id: exceptId || undefined } });
    return res.data.data;
  }

  async createTransfer(data: TransferPayload): Promise<{ id: number }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async updateTransfer(id: number, data: TransferPayload): Promise<{ id: number }> {
    const res = await api.put(`${BASE}/${id}`, data);
    return res.data.data;
  }

  async getRows(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: removeEmpty(filters) });
    return res.data.data as { data: StockTransferRow[]; total: number };
  }

  async getTransfer(id: number) {
    const res = await api.get(`${BASE}/${id}`);
    return res.data.data;
  }

  async approveTransfer(id: number) {
    await api.post(`${BASE}/${id}/approve`);
  }

  async deleteTransfer(id: number) {
    await api.delete(`${BASE}/${id}`);
  }
}

export const stockTransferService = new StockTransferService();
