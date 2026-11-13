import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export interface Supplier {
    id: number;
    name: string;
    slug: string;
    code: string;
    email: string;
    phone: string;
    address: string;
    status: string;
    opening_balance_type: number; // 1 = debit, 2 = credit
    opening_balance: number; // amount
    opening_type: string; // for example 'debit' or 'credit'
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    current_page: number;
    per_page: number;
    total_pages?: number;
}

export interface SupplierFilters {
    page?: number;
    per_page?: number;
    name?: string;
    slug?: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    opening_balance_type?: number;
    opening_balance?: number;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

class SupplierService {
    async getSuppliers(filters: SupplierFilters = {}): Promise<PaginatedResponse<Supplier>> {
        // only the filled filters go to the API
        const response = await api.get('/purchase/suppliers', { params: removeEmpty({ ...filters }) });
        return response.data.data;
    }

    async createSupplier(supplierData: { name: string, code: string, email: string, phone: string, address: string, opening_balance_type: number, opening_balance: number }): Promise<Supplier> {
        const response = await api.post('/purchase/suppliers', supplierData);
        return response.data.data;
    }

    async updateSupplier(id: number, supplierData: { name: string, code: string, email: string, phone: string, address: string, opening_balance_type: number, opening_balance: number, status: string }): Promise<Supplier> {
        const response = await api.put(`/purchase/suppliers/${id}`, supplierData);
        return response.data.data;
    }

    async softDeleteSupplier(id: number): Promise<void> {
        await api.post(`/purchase/suppliers/trash/${id}`);
    }

    async forceDeleteSupplier(id: number): Promise<void> {
        await api.delete(`/purchase/suppliers/${id}`);
    }

    async restoreSupplier(id: number): Promise<void> {
        await api.post(`/purchase/suppliers/restore/${id}`);
    }
}

export const supplierService = new SupplierService();