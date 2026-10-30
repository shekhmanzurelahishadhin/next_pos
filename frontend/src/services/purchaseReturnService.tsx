import { api } from "@/lib/api";

// "Purchase Return" page row: one item of an approved PO
export interface ReturnableRow {
  id: number;
  purchase_id: number;
  po_no: string;
  purchase_date: string;
  supplier_bill_no?: string | null;
  supplier_name?: string;
  store_name?: string;
  location_name?: string;
  product_name: string;
  part_number: string;
  unit?: string;
  qty: number;
  returned_qty: string;
}

// One line of the return form
export interface ReturnFormItem {
  purchase_detail_id: number;
  product_name: string;
  part_number: string;
  location_name?: string;
  barcode?: string | null;
  received_qty: number;
  returned_qty: number;
  closing_stock: number;
  unit_price: number;
}

export interface ReturnForm {
  purchase_id: number;
  po_no: string;
  purchase_date: string;
  supplier_id: number;
  supplier_name: string;
  store_name: string;
  items: ReturnFormItem[];
}

export interface ReturnPayload {
  purchase_id: number;
  return_date: string;
  is_refund: boolean;
  remarks?: string;
  items: { purchase_detail_id: number; return_qty: number }[];
}

// "Purchase Return Manage" row: one returned item with its return header
export interface ReturnRow {
  id: number;
  purchase_return_id: number;
  return_no: string;
  return_date: string;
  po_no: string;
  supplier_bill_no?: string | null;
  supplier_name?: string;
  store_id: number;
  store_name?: string;
  location_name?: string;
  product_name: string;
  part_number: string;
  return_qty: string;
  unit_price: string;
  total_price: string;
  total_amount: string;
  is_refund: number;
  refund_amount: string;
}

const BASE = "/purchase/purchase-returns";

const clean = (filters: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));

class PurchaseReturnService {
  async getReturnable(filters: Record<string, string | number> = {}) {
    const res = await api.get(`${BASE}/returnable`, { params: clean(filters) });
    return res.data.data as { data: ReturnableRow[]; total: number };
  }

  async getForm(purchaseId: number): Promise<ReturnForm> {
    const res = await api.get(`${BASE}/form/${purchaseId}`);
    return res.data.data;
  }

  async createReturn(data: ReturnPayload): Promise<{ id: number; return_no: string }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async getReturns(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: clean(filters) });
    return res.data.data as { data: ReturnRow[]; total: number };
  }

  async getReturn(id: number) {
    const res = await api.get(`${BASE}/${id}`);
    return res.data.data;
  }

  async deleteReturn(id: number) {
    await api.delete(`${BASE}/${id}`);
  }
}

export const purchaseReturnService = new PurchaseReturnService();
