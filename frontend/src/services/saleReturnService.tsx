import { api } from "@/lib/api";

// "Sales Return" page row: one sold barcode of an approved SO
export interface SaleReturnableRow {
  id: number;
  sale_id: number;
  so_no: string;
  order_date: string;
  memo_no?: string | null;
  customer_name?: string;
  store_name?: string;
  location_name?: string;
  product_name: string;
  part_number: string;
  barcode?: string | null;
  unit?: string;
  qty: string;
  sell_price: string;
  returned_qty: string;
}

// One line of the return form
export interface SaleReturnFormItem {
  sale_detail_id: number;
  store_name?: string;
  location_name?: string;
  product_name: string;
  part_number: string;
  barcode?: string | null;
  unit?: string | null;
  sold_qty: number;
  returned_qty: number;
  sell_price: number;
}

export interface SaleReturnForm {
  sale_id: number;
  so_no: string;
  order_date: string;
  memo_no?: string | null;
  customer_id: number;
  customer_name: string;
  items: SaleReturnFormItem[];
}

export interface SaleReturnPayload {
  sale_id: number;
  return_date: string;
  is_refund: boolean;
  remarks?: string;
  items: { sale_detail_id: number; return_qty: number }[];
}

// "Sales Return Manage" row: one returned barcode with its return header
export interface SaleReturnRow {
  id: number;
  sale_return_id: number;
  return_no: string;
  return_date: string;
  so_no: string;
  memo_no?: string | null;
  customer_name?: string;
  store_name?: string;
  location_name?: string;
  product_name: string;
  part_number: string;
  barcode?: string | null;
  return_qty: string;
  return_price: string;
  total_price: string;
  total_amount: string;
  is_refund: number;
  refund_amount: string;
}

const BASE = "/sales/sale-returns";

const clean = (filters: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));

class SaleReturnService {
  async getReturnable(filters: Record<string, string | number> = {}) {
    const res = await api.get(`${BASE}/returnable`, { params: clean(filters) });
    return res.data.data as { data: SaleReturnableRow[]; total: number };
  }

  async getForm(saleId: number): Promise<SaleReturnForm> {
    const res = await api.get(`${BASE}/form/${saleId}`);
    return res.data.data;
  }

  async createReturn(data: SaleReturnPayload): Promise<{ id: number; return_no: string }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async getReturns(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: clean(filters) });
    return res.data.data as { data: SaleReturnRow[]; total: number };
  }

  async getReturn(id: number) {
    const res = await api.get(`${BASE}/${id}`);
    return res.data.data;
  }

  async deleteReturn(id: number) {
    await api.delete(`${BASE}/${id}`);
  }
}

export const saleReturnService = new SaleReturnService();
