import { api } from "@/lib/api";
import { removeEmpty } from "@/lib/options";

export interface Customer {
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
    fax?: string;
    website?: string;
    car_name?: string;
    customer_type_id?: number | null;
    customer_type_name?: string;
    store_id?: number | null;
    store_name?: string;
    credit_limit?: number;
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

export interface CustomerFilters {
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

class CustomerService {
    async getCustomers(filters: CustomerFilters = {}): Promise<PaginatedResponse<Customer>> {
        // only the filled filters go to the API
        const response = await api.get('/sales/customers', { params: removeEmpty({ ...filters }) });
        return response.data.data;
    }

    async createCustomer(customerData: { name: string, code: string, email: string, phone: string, address: string, opening_balance_type: number, opening_balance: number }): Promise<Customer> {
        const response = await api.post('/sales/customers', customerData);
        return response.data.data;
    }

    async updateCustomer(id: number, customerData: { name: string, code: string, email: string, phone: string, address: string, opening_balance_type: number, opening_balance: number, status: string }): Promise<Customer> {
        const response = await api.put(`/sales/customers/${id}`, customerData);
        return response.data.data;
    }

    async softDeleteCustomer(id: number): Promise<void> {
        await api.post(`/sales/customers/trash/${id}`);
    }

    async forceDeleteCustomer(id: number): Promise<void> {
        await api.delete(`/sales/customers/${id}`);
    }

    async restoreCustomer(id: number): Promise<void> {
        await api.post(`/sales/customers/restore/${id}`);
    }
}

export const customerService = new CustomerService();