import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

type Option = { value: string; label: string };
type Named = { id: number; title?: string; name?: string } | null;

// status of a leaf, like parts_bazar ChequeBook
export const CHEQUE_ACTIVE = 1;
export const CHEQUE_USED = 2;
export const CHEQUE_CANCELED = 3;

export const CHEQUE_STATUS: Option[] = [
  { value: "1", label: "ACTIVE" },
  { value: "2", label: "USED" },
  { value: "3", label: "CANCELED" },
];

export const USED_TYPES: Option[] = [
  { value: "2", label: "SUPPLIER PAYMENT" },
  { value: "1", label: "JOURNAL" },
  { value: "3", label: "DISTRIBUTOR REFUND" },
];

export function chequeStatusName(status: number | null) {
  for (const option of CHEQUE_STATUS) {
    if (option.value === String(status)) {
      return option.label;
    }
  }
  return "";
}

export function usedTypeName(usedType: number | null) {
  for (const option of USED_TYPES) {
    if (option.value === String(usedType)) {
      return option.label;
    }
  }
  return "";
}

export interface ChequeLeaf {
  id: number;
  book_no: string;
  bank_id: number;
  branch_name: string | null;
  cheque_no: string;
  status: number;
  used_date: string | null;
  used_type: number | null;
  amount: string | null;
  bank: Named;
  used_by: Named;
}

export interface ChequeHistory extends ChequeLeaf {
  remarks: string;
  created_at: string | null;
  created_by: Named;
}

export interface ChequeBookPayload {
  book_no: string;
  bank_id: string;
  branch_name: string;
  prefix: string;
  first_number: string;
  second_number: string;
}

export interface ActiveCheque {
  id: number;
  cheque_no: string;
  book_no: string;
  bank_id: number;
  bank_name: string;
}

// ---------- Cheque Entry (register of the cheques written by vouchers) ----------

export interface ChequeEntry {
  id: number;
  max_sl: number;
  entry_date: string;
  cb_bank_id: number;
  payment_type: number | null;
  payment_name: string | null;
  cheque_no: string;
  cheque_book_no: string;
  cheque_date: string | null;
  clearance_date: string | null;
  amount: string;
  note: string | null;
  voucher_type: number | null;
  entry_no: string | null;
  bank: Named;
}

const ENTRY_URL = "/accounting/cheque-entries";

class ChequeEntryService {
  async getList(filters: Record<string, string | number>) {
    const res = await api.get(ENTRY_URL, { params: removeEmpty(filters) });
    return res.data.data as { data: ChequeEntry[]; total: number };
  }

  async getOne(id: number): Promise<ChequeEntry> {
    const res = await api.get(`${ENTRY_URL}/${id}`);
    return res.data.data;
  }

  async setClearance(id: number, date: string) {
    await api.post(`${ENTRY_URL}/${id}/clearance`, { clearance_date: date });
  }
}

export const chequeEntryService = new ChequeEntryService();

const URL = "/accounting/cheque-books";

class ChequeBookService {
  async getList(filters: Record<string, string | number>) {
    const res = await api.get(URL, { params: removeEmpty(filters) });
    return res.data.data as { data: ChequeLeaf[]; total: number };
  }

  async getHistory(filters: Record<string, string | number>) {
    const res = await api.get(`${URL}/delete-history`, { params: removeEmpty(filters) });
    return res.data.data as { data: ChequeHistory[]; total: number };
  }

  async banks(): Promise<Option[]> {
    const res = await api.get(`${URL}/banks`);
    return res.data.data;
  }

  // book nos of the bank that still have an active leaf
  async books(bankId: string): Promise<string[]> {
    const res = await api.get(`${URL}/books`, { params: { bank_id: bankId } });
    return res.data.data;
  }

  async activeCheques(filters: Record<string, string | number>): Promise<ActiveCheque[]> {
    const res = await api.get(`${URL}/active`, { params: removeEmpty(filters) });
    return res.data.data;
  }

  async createBook(data: ChequeBookPayload): Promise<string> {
    const res = await api.post(URL, data);
    return res.data.message;
  }

  async updateLeaf(id: number, data: { book_no: string; bank_id: string; branch_name: string; cheque_no: string }) {
    await api.put(`${URL}/${id}`, data);
  }

  async cancelLeaf(id: number) {
    await api.post(`${URL}/${id}/cancel`);
  }

  async deleteBook(bookNo: string, bankId: string, remarks: string): Promise<string> {
    const res = await api.post(`${URL}/delete-book`, { book_no: bookNo, bank_id: bankId, remarks: remarks });
    return res.data.message;
  }
}

export const chequeBookService = new ChequeBookService();
