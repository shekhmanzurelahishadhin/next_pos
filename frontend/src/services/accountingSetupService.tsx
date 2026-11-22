import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

type UserName = { id: number; name: string } | null;

export type Option = { value: string; label: string };

// ---------- Currency (conversion rate in BDT) ----------

export interface CurrencyConversion {
  id: number;
  currency_id: number;
  date_from: string;
  date_to: string;
  amount_in_bdt: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: UserName;
  updated_by: UserName;
}

export interface CurrencyConversionPayload {
  currency_id: string;
  date_from: string;
  date_to: string;
  amount_in_bdt: string;
}

// ---------- Chart Of AC Opening ----------

export const DEBIT = 3;
export const CREDIT = 4;

export interface ChartOfAcOpening {
  id: number;
  ca_id: number;
  transaction_type: number; // 3 = Dr, 4 = Cr
  opening_amount_date: string;
  currency_id: number;
  conversion_rate: string;
  amount_in_foreign_currency: string;
  opening_amount: string;
  created_at: string | null;
  updated_at: string | null;
  account: { id: number; code: string; title: string } | null;
  created_by: UserName;
  updated_by: UserName;
}

export interface ChartOfAcOpeningPayload {
  ca_id: number | null;
  opening_amount_date: string;
  currency_id: string;
  transaction_type: string;
  amount_in_foreign_currency: string;
}

// ---------- Voucher Type (number format) ----------

export interface VoucherType {
  id: number;
  name: string;
  type_format: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: UserName;
  updated_by: UserName;
}

// voucher number shown on a voucher, like parts_bazar: "JV# 12"
export function voucherNo(format: string, entryNo: number | string) {
  return format + "# " + entryNo;
}

const VOUCHER_TYPE = "/accounting/voucher-types";
const CURRENCY = "/accounting/currency-conversions";
const OPENING = "/accounting/chart-of-ac-openings";

class AccountingSetupService {
  async getVoucherTypes(filters: Record<string, string | number> = {}): Promise<VoucherType[]> {
    const res = await api.get(VOUCHER_TYPE, { params: removeEmpty(filters) });
    return res.data.data;
  }

  async updateVoucherType(id: number, typeFormat: string) {
    await api.put(`${VOUCHER_TYPE}/${id}`, { type_format: typeFormat });
  }

  async getCurrencyRates(filters: Record<string, string | number> = {}) {
    const res = await api.get(CURRENCY, { params: removeEmpty(filters) });
    return res.data.data as { data: CurrencyConversion[]; currencies: Option[] };
  }

  async saveCurrencyRate(data: CurrencyConversionPayload, id?: number) {
    if (id) {
      await api.put(`${CURRENCY}/${id}`, data);
    } else {
      await api.post(CURRENCY, data);
    }
  }

  async deleteCurrencyRate(id: number) {
    await api.delete(`${CURRENCY}/${id}`);
  }

  async currencies(): Promise<Option[]> {
    const res = await api.get(`${CURRENCY}/currencies`);
    return res.data.data;
  }

  // rate of the currency on the date, 0 when no rate is set
  async rateOn(currencyId: string, date: string): Promise<number> {
    const res = await api.get(`${CURRENCY}/rate`, { params: { currency_id: currencyId, date: date } });
    return Number(res.data.data.rate);
  }

  async getOpenings(filters: Record<string, string | number> = {}) {
    const res = await api.get(OPENING, { params: removeEmpty(filters) });
    return res.data.data as { data: ChartOfAcOpening[]; total: number; total_dr: number; total_cr: number };
  }

  // CA Heads that can have an opening (no child head, no main head)
  async openingHeads(): Promise<{ value: number; label: string }[]> {
    const res = await api.get(`${OPENING}/heads`);
    return res.data.data;
  }

  async saveOpening(data: ChartOfAcOpeningPayload, id?: number) {
    if (id) {
      await api.put(`${OPENING}/${id}`, data);
    } else {
      await api.post(OPENING, data);
    }
  }

  async deleteOpening(id: number) {
    await api.delete(`${OPENING}/${id}`);
  }
}

export const accountingSetupService = new AccountingSetupService();
