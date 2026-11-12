import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export interface AuditName {
  id: number;
  audit_name: string;
  from_date: string;
  to_date: string;
  status?: number;
  audits_count?: number;
}

export interface AuditNamePayload {
  audit_name: string;
  from_date: string;
  to_date: string;
  status: number;
}

// A scanned barcode, or one the ERP has in the location
export interface AuditBarcode {
  barcode: string;
  product_id: number;
  product_name: string;
  part_number: string;
  location_id: number | null;
  location_name?: string | null;
  erp_qty: number;
}

// One line of the count list
export interface AuditLine extends AuditBarcode {
  physical_qty: number;
}

export interface AuditPayload {
  audit_name_id: number;
  store_id: number;
  location_id: number;
  remarks?: string;
  items: { barcode: string; physical_qty: number }[];
}

// "Inventory Audit Manage" row: one audit with its totals
export interface InventoryAuditRow {
  id: number;
  entry_no: string;
  audit_name: string;
  store_name?: string;
  location_name?: string;
  created_by_name?: string;
  created_at: string;
  items: number;
  erp_qty: string;
  physical_qty: string;
  mismatch: string;
}

const NAMES = "/inventory/audit-names";
const BASE = "/inventory/inventory-audits";

class InventoryAuditService {
  // Audit Name Setup
  async getAuditNames(filters: Record<string, string | number> = {}) {
    const res = await api.get(NAMES, { params: removeEmpty(filters) });
    return res.data.data as { data: AuditName[]; total: number };
  }

  async saveAuditName(data: AuditNamePayload, id?: number) {
    if (id) await api.put(`${NAMES}/${id}`, data);
    else await api.post(NAMES, data);
  }

  async deleteAuditName(id: number) {
    await api.delete(`${NAMES}/${id}`);
  }

  // Audit entry
  async activeAuditNames(): Promise<AuditName[]> {
    const res = await api.get(`${BASE}/audit-names`);
    return res.data.data;
  }

  async scan(barcode: string, storeId: number): Promise<AuditBarcode> {
    const res = await api.get(`${BASE}/scan`, { params: { barcode, store_id: storeId } });
    return res.data.data;
  }

  async locationStock(storeId: number, locationId: number): Promise<AuditBarcode[]> {
    const res = await api.get(`${BASE}/location-stock`, { params: { store_id: storeId, location_id: locationId } });
    return res.data.data;
  }

  async createAudit(data: AuditPayload): Promise<{ id: number }> {
    const res = await api.post(BASE, data);
    return res.data.data;
  }

  async updateAudit(id: number, data: AuditPayload): Promise<{ id: number }> {
    const res = await api.put(`${BASE}/${id}`, data);
    return res.data.data;
  }

  async getAudits(filters: Record<string, string | number> = {}) {
    const res = await api.get(BASE, { params: removeEmpty(filters) });
    return res.data.data as { data: InventoryAuditRow[]; total: number };
  }

  async getAudit(id: number) {
    const res = await api.get(`${BASE}/${id}`);
    return res.data.data;
  }

  async deleteAudit(id: number) {
    await api.delete(`${BASE}/${id}`);
  }
}

export const inventoryAuditService = new InventoryAuditService();
