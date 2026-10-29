import { api } from "@/lib/api";

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
    private getCacheKey(filters: CompanyFilters): string {
        return `companies_${JSON.stringify(filters)}`;
    }

    private setCache(key: string, data: any): void {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    private getCache(key: string): any {
        const cached = cache.get(key);
        // check expiration
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            return cached.data;
        }
        cache.delete(key); // expired → delete it
        return null;
    }

    async getCompanies(filters: CompanyFilters = {}): Promise<PaginatedResponse<Company>> {
        // Don't cache searches
        // if (!filters.search) {
        //   const cacheKey = this.getCacheKey(filters);
        //   const cached = this.getCache(cacheKey);
        //   console.log('RoleService.getRoles - cacheKey:', cacheKey, 'cached:', cached);
        //   if (cached) return cached;
        // }

        const params = new URLSearchParams();

        // Common filter fields
        if (filters.search) params.append('search', filters.search);
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
        if (filters.created_at) params.append('created_at', filters.created_at);
        if (filters.updated_at) params.append('updated_at', filters.updated_at);

        const response = await api.get(`/configure/companies?${params}`);
        const result = response.data.data;

        return result;
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