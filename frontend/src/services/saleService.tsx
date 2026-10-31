import { api } from "@/lib/api";

export type Option = { value: string; label: string };

export interface SaleFormOptions {
  cash_due: Option[];
  received_type: Option[];
}

export interface CustomerHit {
  id: number;
  name: string;
  phone?: string | null;
  car_name?: string | null;
  due_limit: number;
  due: number;
}

// Barcode autocomplete result (stock = left after other pending SOs)
export interface BarcodeHit {
  barcode: string;
  product_id: number;
  product_name: string;
  part_number: string;
  unit?: string | null;
  store_id: number;
  store_name: string;
  location_id: number | null;
  location_name?: string | null;
  purchase_price: number;
  stock: number;
}

// One row of the "Added List" grid
export interface SaleItem extends BarcodeHit {
  qty: number;
  sell_price: number;
}

export interface SalePayload {
  company_id: number;
  order_date: string;
  cash_due: string;
  memo_no?: string;
  customer_id: number;
  mobile_no?: string;
  car_name?: string;
  car_no?: string;
  due_limit_exceed_accept: string;
  received_type?: string;
  received_amount?: number | null;
  items: { barcode: string; qty: number; sell_price: number }[];
}

// Sales Manage row: one sold barcode with its SO header
export interface SaleRow {
  id: number;
  sale_id: number;
  so_no: string;
  order_date: string;
  cash_due: string;
  memo_no?: string | null;
  customer_name?: string;
  customer_phone?: string | null;
  store_name?: string;
  location_name?: string;
  brand_name?: string | null;
  product_name: string;
  part_number: string;
  barcode: string;
  unit?: string | null;
  qty: string;
  sell_price: string;
  discount: string;
  total_amount: string;
  closing_stock: string;
  grand_total: string;
  received_amount: string;
  due_amount: string;
  status: number;
  status_name: string;
  can_approve: boolean;
}

export const SALE_STATUS = { PENDING: 0, APPROVED: 1 };

const BASE = "/sales/sales";

class SaleService {
  async getFormOptions(): Promise<SaleFormOptions> {
    const res = await api.get(`${BASE}/form-options`);
    return res.data.data;
  }

  async searchCustomers(term: string): Promise<CustomerHit[]> {
    const res = await api.get(`${BASE}/search-customers`, { params: { term } });
    return res.data.data;
  }

  async searchBarcodes(term: string, companyId?: number | null, saleId?: number | null): Promise<BarcodeHit[]> {
    const res = await api.get(`${BASE}/search-barcodes`, { params: { term, company_id: companyId, sale_id: saleId } });
    return res.data.data;
  }

  async getSales(filters: Record<string, string | number> = {}) {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));
    const res = await api.get(BASE, { params });
    return res.data.data as { data: SaleRow[]; total: number };
  }

  async getSale(id: number) {
    const res = await api.get(`${BASE}/${id}`);
    return res.data.data;
  }

  async createSale(data: SalePayload): Promise<{ id: number; so_no: string }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async updateSale(id: number, data: SalePayload): Promise<{ id: number; so_no: string }> {
    const res = await api.put(`${BASE}/${id}`, data);
    return res.data.data;
  }

  async deleteSale(id: number) {
    await api.delete(`${BASE}/${id}`);
  }

  async deleteSaleItem(detailId: number) {
    await api.delete(`${BASE}/items/${detailId}`);
  }

  async approveSale(id: number) {
    await api.post(`${BASE}/${id}/approve`);
  }
}

export const saleService = new SaleService();
