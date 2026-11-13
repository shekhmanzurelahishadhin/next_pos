import { api } from "@/lib/api";
import { pickFilters } from "@/lib/options";

type LookupOption = { value: number; label: string };

// the lookup lists of each type are kept for 5 minutes, so the same list is not asked again and again
const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map<string, { data: LookupOption[]; time: number }>();

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
    async getLookups(filters: LookupFilters = {}): Promise<PaginatedResponse<Lookup>> {
        // only these filters go to the API, and only when they have a value
        const params = pickFilters(filters, ['search', 'page', 'per_page', 'name', 'type', 'code', 'status', 'status_text', 'created_at', 'updated_at']);
        const response = await api.get('/configure/lookups', { params: params });
        return response.data.data;
    }

    async getLookupByType(type: string): Promise<LookupOption[]> {
        const cached = cache.get(type);
        if (cached && Date.now() - cached.time < CACHE_DURATION) {
            return cached.data;
        }

        const response = await api.get(`/configure/get-lookup-list/${type}`);
        cache.set(type, { data: response.data, time: Date.now() });
        return response.data;
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