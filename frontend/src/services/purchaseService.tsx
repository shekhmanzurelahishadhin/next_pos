import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export type Option = { value: string; label: string };

export interface PurchaseFormOptions {
  cash_due: Option[];
  purchase_type: Option[];
  payment_type: Option[];
  ship_by: Option[];
}

// Part number autocomplete result
export interface ProductHit {
  id: number;
  part_number: string;
  name: string;
  unit?: string | null;
  weight: number;
  purchase_price: number;
  sell_price: number;
  stock: number;
}

export interface SupplierHit {
  id: number;
  name: string;
  phone?: string | null;
  due: number;
}

// One row of the "Added List" grid (same columns as parts_bazar)
export interface PurchaseItem {
  product_id: number;
  part_number: string;
  product_name: string;
  unit?: string | null;
  location_id: number;
  location_name: string;
  qty: number;
  unit_price: number;
  per_kg: number;
  sell_price: number;
  weight_unit: number;
  total_unit_price: number;
  total_product_price: number;
  total_weight: number;
  total_weight_amount: number;
  total_purchase_price: number;
}

export interface PurchasePayload {
  purchase_date: string;
  cash_due: string;
  purchase_type: string;
  store_id: number;
  ship_by?: string;
  supplier_id: number;
  payment_type?: string;
  payment_amount?: number | null;
  supplier_bill_no?: string;
  items: Pick<PurchaseItem, "product_id" | "location_id" | "qty" | "unit_price" | "per_kg" | "sell_price" | "weight_unit">[];
}

// Purchase Manage row: one purchased item with its PO header
export interface PurchaseRow {
  id: number;
  purchase_id: number;
  po_no: string;
  store_id: number;
  purchase_date: string;
  cash_due: string;
  purchase_type: string;
  supplier_bill_no?: string;
  supplier_name?: string;
  store_name?: string;
  location_name?: string;
  product_name: string;
  part_number: string;
  unit?: string;
  qty: number;
  unit_price: string;
  total_product_price: string;
  total_weight_amount: string;
  total_purchase_price: string;
  grand_total: string;
  payment_amount: string;
  due_amount: string;
  status: number;
  status_name: string;
}

export const PURCHASE_STATUS = { PENDING: 0, APPROVED: 1, CANCELLED: 3 };

// round to 2 decimals and keep it a number
function round2(value: number): number {
  return Number(value.toFixed(2));
}

// Same sums as the parts_bazar purchase grid
export function calcLine(qty: number, unitPrice: number, perKg: number, weightUnit: number) {
  const productPrice = qty * unitPrice;
  const weightAmount = qty * weightUnit * perKg; // weight cost
  const total = productPrice + weightAmount;

  let totalUnitPrice = 0;
  if (qty > 0) {
    totalUnitPrice = round2(total / qty);
  }

  return {
    total_product_price: round2(productPrice),
    total_weight: round2(qty * weightUnit),
    total_weight_amount: round2(weightAmount),
    total_purchase_price: round2(total),
    total_unit_price: totalUnitPrice,
  };
}

const BASE = "/purchase/purchases";

class PurchaseService {
  async getFormOptions(): Promise<PurchaseFormOptions> {
    const res = await api.get(`${BASE}/form-options`);
    return res.data.data;
  }

  async searchProducts(term: string, storeId?: number | null, locationId?: number | null): Promise<ProductHit[]> {
    const res = await api.get(`${BASE}/search-products`, { params: { term, store_id: storeId, location_id: locationId } });
    return res.data.data;
  }

  async searchSuppliers(term: string): Promise<SupplierHit[]> {
    const res = await api.get(`${BASE}/search-suppliers`, { params: { term } });
    return res.data.data;
  }

  async getPurchases(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: removeEmpty(filters) });
    return res.data.data as { data: PurchaseRow[]; total: number };
  }

  async getPurchase(id: number) {
    const res = await api.get(`${BASE}/${id}`);
    return res.data.data;
  }

  async createPurchase(data: PurchasePayload): Promise<{ id: number; po_no: string }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async updatePurchase(id: number, data: PurchasePayload): Promise<{ id: number; po_no: string }> {
    const res = await api.put(`${BASE}/${id}`, data);
    return res.data.data;
  }

  async deletePurchase(id: number) {
    await api.delete(`${BASE}/${id}`);
  }

  async approvePurchase(id: number) {
    await api.post(`${BASE}/${id}/approve`);
  }

  async cancelPurchase(id: number) {
    await api.post(`${BASE}/${id}/cancel`);
  }

  async undoCancelPurchase(id: number) {
    await api.post(`${BASE}/${id}/undo-cancel`);
  }
}

export const purchaseService = new PurchaseService();
