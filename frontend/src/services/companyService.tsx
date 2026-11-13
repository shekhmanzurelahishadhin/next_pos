import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

export interface Company {
    id: number;
    name: string;
    slug: string;
    code: string;
    email: string;
    phone: string;
    address: string;
    logo: string;
    default_currency: string;
    timezone: string;
    status: string;
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

export interface CompanyFilters {
    search?: string;
    page?: number;
    per_page?: number;
    name?: string;
    slug?: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

class CompanyService {
    async getCompanies(filters: CompanyFilters = {}): Promise<PaginatedResponse<Company>> {
        // only these filters go to the API, and only when they have a value
        const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'slug', 'code', 'email', 'phone', 'address', 'status', 'created_at', 'updated_at']);
        const response = await api.get('/configure/companies', { params: params });
        return response.data.data;
    }

    async createCompany(companyData: { name: string, code: string, email: string, phone: string, address: string, logo: string }): Promise<Company> {
        const response = await api.post('/configure/companies', companyData);
        return response.data.data;
    }

    async updateCompany(id: number, companyData: { name: string, code: string, email: string, phone: string, address: string, logo: string, status: string }): Promise<Company> {
        const response = await api.post(`/configure/companies/${id}`, companyData, { headers: { "Content-Type": "multipart/form-data" } });
        return response.data.data;
    }

    async softDeleteCompany(id: number): Promise<void> {
        await api.post(`/configure/companies/trash/${id}`);
    }

    async forceDeleteCompany(id: number): Promise<void> {
        await api.delete(`/configure/companies/${id}`);
    }

    async restoreCompany(id: number): Promise<void> {
        await api.post(`/configure/companies/restore/${id}`);
    }
}

export const companyService = new CompanyService();