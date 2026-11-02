import { api } from "@/lib/api";
import { ProductHit } from "@/services/purchaseService";

// One line of the "Added List" grid
export interface ShortListItem {
  store_id: number;
  store_name: string;
  product_id: number;
  product_name: string;
  code: string;
  stock_qty: number;
  purchase_price: number;
  order_qty: number;
}

// "Manage Short List Order" row: one product line, rows of one list share max_sl_no
export interface ShortListRow {
  id: number;
  max_sl_no: number;
  store_id: number;
  store_name?: string;
  product_name: string;
  code?: string | null;
  stock_qty: string;
  purchase_price: string;
  order_qty: string;
  created_at: string;
}

const BASE = "/inventory/short-list-orders";

const clean = (filters: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined && v !== null));

class ShortListOrderService {
  async searchProducts(term: string, storeId?: number | null): Promise<ProductHit[]> {
    const res = await api.get(`${BASE}/search-products`, { params: { term, store_id: storeId } });
    return res.data.data;
  }

  async createList(items: ShortListItem[]): Promise<{ max_sl_no: number }> {
    const res = await api.post(BASE, {
      items: items.map(({ store_id, product_id, code, stock_qty, purchase_price, order_qty }) => ({
        store_id, product_id, code, stock_qty, purchase_price, order_qty,
      })),
    });
    return res.data.data;
  }

  async getRows(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: clean(filters) });
    return res.data.data as { data: ShortListRow[]; total: number };
  }

  async getList(maxSlNo: number) {
    const res = await api.get(`${BASE}/${maxSlNo}`);
    return res.data.data;
  }

  async deleteList(maxSlNo: number) {
    await api.delete(`${BASE}/${maxSlNo}`);
  }
}

export const shortListOrderService = new ShortListOrderService();
