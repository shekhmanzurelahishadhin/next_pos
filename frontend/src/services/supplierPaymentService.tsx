import { api } from "@/lib/api";

// "Create Supplier Payment" row
export interface SpSupplierRow {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  due: number;
}

// One due PO in the form (purchase_id null = opening balance)
export interface SpFormLine {
  purchase_id: number | null;
  po_no: string;
  supplier_bill_no?: string | null;
  po_date?: string | null;
  bill_amount: number;
  prev_paid: number;
  due: number;
}

export interface SpForm {
  supplier_id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  total_due: number;
  advance_balance: number; // what an Adjustment payment can still use
  banks: string[];
  lines: SpFormLine[];
}

export interface SpPayload {
  supplier_id: number;
  payment_date: string;
  payment_type: string;
  lot_amount: number;
  supplier_mr_no?: string;
  bank_name?: string;
  cheque_no?: string;
  cheque_date?: string;
  remarks?: string;
  lines: { purchase_id: number | null; amount: number; discount: number }[];
}

// "Manage Supplier Payment" row: one PR no
export interface SpRow {
  id: number;
  sl_no: string;
  payment_date: string;
  supplier_id: number;
  supplier_name: string;
  payment_type: string;
  po_nos: string;
  lot_amount: string;
  paid_amount: string;
  discount: string;
  total_amount: string;
}

const BASE = "/purchase/supplier-payments";

const clean = (filters: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));

class SupplierPaymentService {
  async getSuppliers(filters: Record<string, string | number> = {}) {
    const res = await api.get(`${BASE}/suppliers`, { params: clean(filters) });
    return res.data.data as { data: SpSupplierRow[]; total: number };
  }

  async getForm(supplierId: number): Promise<SpForm> {
    const res = await api.get(`${BASE}/form/${supplierId}`);
    return res.data.data;
  }

  async createPayment(data: SpPayload): Promise<{ sl_no: string }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async getPayments(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: clean(filters) });
    return res.data.data as { data: SpRow[]; total: number };
  }

  async getPayment(slNo: string) {
    const res = await api.get(`${BASE}/${encodeURIComponent(slNo)}`);
    return res.data.data;
  }

  async deletePayment(slNo: string) {
    await api.delete(`${BASE}/${encodeURIComponent(slNo)}`);
  }
}

export const supplierPaymentService = new SupplierPaymentService();
