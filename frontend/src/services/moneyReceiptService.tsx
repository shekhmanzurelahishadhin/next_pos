import { api } from "@/lib/api";

// "Create Money Receipt" row
export interface MrCustomerRow {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  due: number;
}

// One due invoice in the form (sale_id null = opening balance)
export interface MrFormLine {
  sale_id: number | null;
  order_no: string;
  memo_no?: string | null;
  order_date?: string | null;
  bill_amount: number;
  prev_received: number;
  due: number;
}

export interface MrForm {
  customer_id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  total_due: number;
  advance_balance: number; // what an Adjustment MR can still use
  banks: string[];
  lines: MrFormLine[];
}

export interface MrPayload {
  customer_id: number;
  receipt_date: string;
  received_type: string;
  lot_amount: number;
  bank_name?: string;
  customer_bank_name?: string;
  cheque_no?: string;
  cheque_date?: string;
  remarks?: string;
  lines: { sale_id: number | null; amount: number; discount: number; vds: number; tds: number }[];
}

// "Manage Money Receipt" row: one MR no
export interface MrRow {
  id: number;
  mr_no: string;
  receipt_date: string;
  customer_id: number;
  customer_name: string;
  received_type: string;
  order_nos: string;
  lot_amount: string;
  received_amount: string;
  discount: string;
  vds: string;
  tds: string;
  total_amount: string;
}

const BASE = "/sales/money-receipts";

const clean = (filters: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));

class MoneyReceiptService {
  async getCustomers(filters: Record<string, string | number> = {}) {
    const res = await api.get(`${BASE}/customers`, { params: clean(filters) });
    return res.data.data as { data: MrCustomerRow[]; total: number };
  }

  async getForm(customerId: number): Promise<MrForm> {
    const res = await api.get(`${BASE}/form/${customerId}`);
    return res.data.data;
  }

  async createReceipt(data: MrPayload): Promise<{ mr_no: string }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async getReceipts(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: clean(filters) });
    return res.data.data as { data: MrRow[]; total: number };
  }

  async getReceipt(mrNo: string) {
    const res = await api.get(`${BASE}/${encodeURIComponent(mrNo)}`);
    return res.data.data;
  }

  async deleteReceipt(mrNo: string) {
    await api.delete(`${BASE}/${encodeURIComponent(mrNo)}`);
  }
}

export const moneyReceiptService = new MoneyReceiptService();
