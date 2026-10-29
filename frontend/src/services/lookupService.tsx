import { api } from "@/lib/api";

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface Lookup {
    id: number;
    name: string;
    type: string;
    code: string;
    status: number;
    is_new: string;
    type_write: string;
    type_select: string;
    status_label: string;
    status_text: string;
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

export interface LookupFilters {
    search?: string;
    page?: number;
    per_page?: number;
    name?: string;
    type?: string;
    code?: string;
    status?: string;
    status_text?: string;
    created_at?: string;
    updated_at?: string;
}

class LookupService {
    private getCacheKey(filters: LookupFilters): string {
        return `lookups_${JSON.stringify(filters)}`;
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

    async getLookups(filters: LookupFilters = {}): Promise<PaginatedResponse<Lookup>> {
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
        if (filters.type) params.append('type', filters.type);
        if (filters.code) params.append('code', filters.code);
        if (filters.status) params.append('status', filters.status);
        if (filters.status_text) params.append('status_text', filters.status_text);
        if (filters.created_at) params.append('created_at', filters.created_at);
        if (filters.updated_at) params.append('updated_at', filters.updated_at);

        const response = await api.get(`/configure/lookups?${params}`);
        const result = response.data.data;

        return result;
    }

    async getLookupByType(type: string): Promise<{value: number; label: string}[]> {
    const cacheKey = this.getCacheKey({ type });
    const cached = this.getCache(cacheKey);
    if (cached) {
        return cached;
    }
    const data = await api.get(`/configure/get-lookup-list/${type}`).then(res => res.data);
    this.setCache(cacheKey, data);
    return data;
}

    async createLookup(lookupData: { name: string}): Promise<Lookup> {

        const response = await api.post('/configure/lookups', lookupData);
        return response.data.data;
    }

    async updateLookup(id: number, lookupData: { name: string }): Promise<Lookup> {

        const response = await api.put(`/configure/lookups/${id}`, lookupData);
        return response.data.data;
    }

    async softDeleteLookup(id: number): Promise<void> {
        await api.post(`/configure/lookups/trash/${id}`);
    }

    async forceDeleteLookup(id: number): Promise<void> {
        await api.delete(`/configure/lookups/${id}`);
    }

    async restoreLookup(id: number): Promise<void> {
        await api.post(`/configure/lookups/restore/${id}`);
    }
}

export const lookupService = new LookupService();