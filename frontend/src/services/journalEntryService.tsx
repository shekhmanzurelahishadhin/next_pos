import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export const DEBIT = 3;
export const CREDIT = 4;

// the voucher types on the Voucher Entry tabs (same ids as parts_bazar), in tab order
export const VOUCHER_TABS = [
  { id: 3, label: "Cash Payment", hint: "Money paid in cash" },
  { id: 4, label: "Cash Receive", hint: "Money received in cash" },
  { id: 5, label: "Bank Payment", hint: "Money paid from a bank account" },
  { id: 6, label: "Bank Receive", hint: "Money received in a bank account" },
  { id: 2, label: "Contra", hint: "Cash to bank, bank to cash or bank to bank" },
  { id: 1, label: "Journal", hint: "Adjustment between heads, no cash or bank" },
];

// Bill No and Chalan No are on Journal, Cash Payment and Bank Payment
export const BILL_TYPES = [1, 3, 5];
// the cheque fields are on Contra and Bank Payment
export const CHEQUE_TYPES = [2, 5];

export const PAYMENT_TYPES = [
  { value: "1", label: "Cash" },
  { value: "2", label: "A/C Payment" },
  { value: "3", label: "Others" },
];

export interface VoucherLine {
  ca_id: number;
  title: string;
  transaction_type: number;
  amount: string;
  cost_center_id: number | null;
  cost_center: string;
}

export interface VoucherPayload {
  company_id: string;
  voucher_type: number;
  entry_date: string;
  currency_id: string;
  narration: string;
  bill_no: string;
  chalan_no: string;
  cheque_no: string;
  cheque_date: string;
  payment_type: string;
  pay_to: string;
  cheque_id: number | null; // a leaf of the Cheque Book
  lines: { ca_id: number; transaction_type: number; amount: string; cost_center_id: number | null }[];
}

type UserName = { id: number; name: string } | null;
type Account = { id: number; code: string; title: string } | null;
type CostCenterName = { id: number; title: string; code: string | null } | null;

// "title (code)" of a cost center, like parts_bazar nameOfThisWithCode
export function costCenterName(center: CostCenterName) {
  if (!center) {
    return "";
  }
  if (center.code) {
    return center.title + " (" + center.code + ")";
  }
  return center.title;
}

// one line of a voucher in the Voucher Manage list
export interface JournalRow {
  id: number;
  voucher_type: number;
  entry_no: string;
  voucher_no: string;
  voucher_key: string;
  entry_date: string;
  transaction_type: number;
  amount: string;
  narration: string | null;
  cheque_no: string | null;
  entry_source_type: number;
  entry_source_no: string | null;
  is_locked: boolean | number;
  created_at: string | null;
  account: Account;
  cost_center: CostCenterName;
  created_by: UserName;
}

export interface VoucherDetail {
  voucher_type: number;
  voucher_type_name: string;
  voucher_no: string;
  entry_no: string;
  entry_date: string;
  company: { id: number; name: string; address: string | null } | null;
  currency_id: number;
  currency_conversion_rate: string;
  narration: string | null;
  cheque_no: string | null;
  cheque_date: string | null;
  cheque_id: number | null;
  cheque_book_no: string | null;
  pay_to: string | null;
  payment_type: number | null;
  company_id: number | null;
  entry_source_type: number;
  is_locked: boolean;
  bill_no: string | null;
  chalan_no: string | null;
  created_by: UserName;
  created_at: string | null;
  lines: { id: number; transaction_type: number; amount: string; amount_in_foreign_currency: string; cost_center_id: number | null; account: Account; cost_center: CostCenterName }[];
}

// where an entry comes from, only manual vouchers for now
export const ENTRY_SOURCES: Record<number, string> = { 1: "Manual" };

const URL = "/accounting/journal-entries";

class JournalEntryService {
  async heads(voucherType: number) {
    const res = await api.get(`${URL}/heads`, { params: { voucher_type: voucherType } });
    return res.data.data as {
      heads: { value: number; label: string }[];
      voucher_type: { id: number; name: string; type_format: string };
    };
  }

  async nextNo(voucherType: number, entryDate: string): Promise<string> {
    const res = await api.get(`${URL}/next-no`, { params: { voucher_type: voucherType, entry_date: entryDate } });
    return res.data.data.voucher_no;
  }

  async save(data: VoucherPayload): Promise<{ entry_no: string; voucher_no: string }> {
    const res = await api.post(URL, data);
    return res.data.data;
  }

  async getList(filters: Record<string, string | number>) {
    const res = await api.get(URL, { params: removeEmpty(filters) });
    return res.data.data as { data: JournalRow[]; total: number };
  }

  async getVoucher(voucherType: number, entryNo: string): Promise<VoucherDetail> {
    const res = await api.get(`${URL}/${voucherType}/${entryNo}`);
    return res.data.data;
  }

  async updateVoucher(voucherType: number, entryNo: string, data: VoucherPayload): Promise<{ entry_no: string; voucher_no: string }> {
    const res = await api.put(`${URL}/${voucherType}/${entryNo}`, data);
    return res.data.data;
  }

  // lock a voucher, or unlock a locked one; returns the message
  async toggleLock(voucherType: number, entryNo: string): Promise<string> {
    const res = await api.post(`${URL}/${voucherType}/${entryNo}/lock`);
    return res.data.message;
  }

  async deleteVoucher(voucherType: number, entryNo: string): Promise<string> {
    const res = await api.delete(`${URL}/${voucherType}/${entryNo}`);
    return res.data.message;
  }
}

export const journalEntryService = new JournalEntryService();
