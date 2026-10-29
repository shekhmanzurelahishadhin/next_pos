import { api } from "@/lib/api";

// One product with its active purchase / sell price (Purchase Price and Sale Price pages)
export interface ProductPriceRow {
  id: number;
  name: string;
  part_number: string;
  category_id: number | null;
  sub_category_id: number | null;
  category_name?: string | null;
  sub_category_name?: string | null;
  unit_name?: string | null;
  purchase_price: number | null;
  purchase_price_date: string | null;
  sell_price: number | null;
  discount: number | null;
}

export interface PurchasePricePayload {
  original_price: number;
  vat_percent: number;
  purchase_price: number;
  date: string;
  is_active: boolean;
}

export interface SellPricePayload {
  sell_price: number;
  market_price: number;
  discount: number;
  is_active: boolean;
}

export interface SellPriceHistory {
  id: number;
  sell_price: string;
  market_price: string;
  discount: string;
  ideal_qty: number | null;
  warn_qty: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

const BASE = "/configure/product-prices";

class ProductPriceService {
  async getRows(filters: Record<string, string | number> = {}) {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));
    const res = await api.get(BASE, { params });
    return res.data.data as { data: ProductPriceRow[]; total: number };
  }

  async addPurchasePrice(productId: number, data: PurchasePricePayload) {
    await api.post(`${BASE}/${productId}/purchase-price`, data);
  }

  async addSellPrice(productId: number, data: SellPricePayload) {
    await api.post(`${BASE}/${productId}/sell-price`, data);
  }

  async getSellPriceHistory(productId: number): Promise<SellPriceHistory[]> {
    const res = await api.get(`${BASE}/${productId}/sell-price-history`);
    return res.data.data;
  }
}

export const productPriceService = new ProductPriceService();
