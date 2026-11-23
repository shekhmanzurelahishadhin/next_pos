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

// ---------- Cost Category / Cost Center ----------

// status of a cost category / cost center, like parts_bazar
export const COST_STATUS: Option[] = [
  { value: "1", label: "Active" },
  { value: "2", label: "Inactive" },
];

export interface CostCategory {
  id: number;
  title: string;
  status: number;
  created_at: string | null;
  updated_at: string | null;
  created_by: UserName;
  updated_by: UserName;
}

export interface CostCenter {
  id: number;
  cost_category_id: number;
  cost_category: { id: number; title: string } | null;
  title: string;
  code: string | null;
  status: number;
  created_at: string | null;
  updated_at: string | null;
  created_by: UserName;
  updated_by: UserName;
}

export interface CostCenterPayload {
  cost_category_id: string;
  title: string;
  code: string;
  status: string;
}

const COST_CATEGORY = "/accounting/cost-categories";
const COST_CENTER = "/accounting/cost-centers";
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

  async getCostCategories(filters: Record<string, string | number> = {}): Promise<CostCategory[]> {
    const res = await api.get(COST_CATEGORY, { params: removeEmpty(filters) });
    return res.data.data;
  }

  // status goes only on update, a new category is always Active
  async saveCostCategory(data: { title: string; status: string }, id?: number) {
    if (id) {
      await api.put(`${COST_CATEGORY}/${id}`, data);
    } else {
      await api.post(COST_CATEGORY, { title: data.title });
    }
  }

  async getCostCenters(filters: Record<string, string | number> = {}) {
    const res = await api.get(COST_CENTER, { params: removeEmpty(filters) });
    return res.data.data as { data: CostCenter[]; categories: Option[] };
  }

  async saveCostCenter(data: CostCenterPayload, id?: number) {
    if (id) {
      await api.put(`${COST_CENTER}/${id}`, data);
    } else {
      await api.post(COST_CENTER, { cost_category_id: data.cost_category_id, title: data.title, code: data.code });
    }
  }

  // active cost centers as "title (code)", for the voucher line
  async costCenterOptions(): Promise<{ value: number; label: string }[]> {
    const res = await api.get(`${COST_CENTER}/options`);
    return res.data.data;
  }
}

export const accountingSetupService = new AccountingSetupService();
