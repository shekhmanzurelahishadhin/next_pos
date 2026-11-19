import { api } from "@/lib/api";

// one account head of the Chart of Accounts
export interface ChartOfAc {
  id: number;
  code: string;
  manual_code: string | null;
  title: string;
  root: number; // parent head, 0 for a main head
  main_root_id: number;
  account_type: number; // 1 = system head, 2 = deletable
  head_type: number; // 0 = manual, 1 = auto
  dep: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: { id: number; name: string } | null;
  updated_by: { id: number; name: string } | null;
}

export interface ChartOfAcPayload {
  root: number | null;
  code: string;
  manual_code?: string;
  title: string;
  head_type: string; // "" = not picked, "0" = manual, "1" = auto
  dep: string;
}

const BASE = "/accounting/chart-of-acs";

class ChartOfAcService {
  // every head, the page shows them as a tree
  async getAll(): Promise<ChartOfAc[]> {
    const res = await api.get(BASE);
    return res.data.data;
  }

  async nextCode(): Promise<string> {
    const res = await api.get(`${BASE}/next-code`);
    return res.data.data.code;
  }

  async save(data: ChartOfAcPayload, id?: number) {
    if (id) {
      await api.put(`${BASE}/${id}`, data);
    } else {
      await api.post(BASE, data);
    }
  }

  async deleteSelected(ids: number[]) {
    await api.post(`${BASE}/delete-selected`, { ids: ids });
  }
}

export const chartOfAcService = new ChartOfAcService();
