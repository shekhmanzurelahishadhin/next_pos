import { api } from "@/lib/api";

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
        const params = new URLSearchParams();

        // Common filter fields
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.per_page) params.append('per_page', filters.per_page.toString());

        // Specific filter fields
        if (filters.name) params.append('name', filters.name);
        if (filters.slug) params.append('slug', filters.slug);
        if (filters.code) params.append('code', filters.code);
        if (filters.email) params.append('email', filters.email);
        if (filters.phone) params.append('phone', filters.phone);
        if (filters.address) params.append('address', filters.address);
        if (filters.status) params.append('status', filters.status);
        if (filters.opening_balance_type) params.append('opening_balance_type', filters.opening_balance_type.toString());
        if (filters.opening_balance) params.append('opening_balance', filters.opening_balance.toString());
        if (filters.created_at) params.append('created_at', filters.created_at);
        if (filters.updated_at) params.append('updated_at', filters.updated_at);

        const response = await api.get(`/purchase/suppliers?${params}`);
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