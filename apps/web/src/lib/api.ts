const API_BASE = '/api';

interface FetchOptions {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
}

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('gymcore_token');
}

export function setToken(token: string) {
    localStorage.setItem('gymcore_token', token);
}

export function removeToken() {
    localStorage.removeItem('gymcore_token');
}

export async function api<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 401) {
        removeToken();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('No autorizado');
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Error del servidor' }));
        throw new Error(error.message || `Error ${res.status}`);
    }

    return res.json();
}

// ===== Auth =====
export const authApi = {
    login: (email: string, password: string) =>
        api<{ accessToken: string; user: { id: string; email: string; name: string; role: string; phone?: string } }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        }),
    profile: () => api<{ id: string; email: string; name: string; role: string }>('/auth/profile'),
};

// ===== Clients =====
export const clientsApi = {
    list: (page = 1, limit = 20, search?: string) =>
        api<{ data: any[]; total: number; page: number; totalPages: number }>(
            `/clients?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`,
        ),
    get: (id: string) => api<any>(`/clients/${id}`),
    create: (data: any) => api<any>('/clients', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/clients/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => api(`/clients/${id}`, { method: 'DELETE' }),
    qr: (id: string) => api<string>(`/clients/${id}/qr`),
};

// ===== Membership Plans =====
export const plansApi = {
    list: () => api<any[]>('/membership-plans'),
    create: (data: any) => api<any>('/membership-plans', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/membership-plans/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => api(`/membership-plans/${id}`, { method: 'DELETE' }),
};

// ===== Memberships =====
export const membershipsApi = {
    assign: (data: { clientId: string; planId: string; amountPaid: number; startDate?: string; mode?: 'replace' | 'queue' }) =>
        api<any>('/memberships', { method: 'POST', body: data }),
    freeze: (id: string) => api<any>(`/memberships/${id}/freeze`, { method: 'PATCH' }),
    unfreeze: (id: string) => api<any>(`/memberships/${id}/unfreeze`, { method: 'PATCH' }),
    cancel: (id: string) => api<any>(`/memberships/${id}/cancel`, { method: 'PATCH' }),
    expiring: (days = 7) => api<any[]>(`/memberships/expiring?days=${days}`),
};

// ===== Attendance =====
export const attendanceApi = {
    checkIn: (qrCode: string) => api<any>('/attendance/check-in', { method: 'POST', body: { qrCode } }),
    checkOut: (clientId: string) => api<any>(`/attendance/check-out/${clientId}`, { method: 'POST' }),
    today: () => api<any[]>('/attendance/today'),
    history: (params?: { date?: string; from?: string; to?: string; page?: number; limit?: number }) => {
        const q = new URLSearchParams();
        if (params?.date) q.set('date', params.date);
        if (params?.from) q.set('from', params.from);
        if (params?.to) q.set('to', params.to);
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        return api<{ data: any[]; total: number; page: number; totalPages: number }>(`/attendance/history?${q.toString()}`);
    },
    autoCheckout: () => api<{ closed: number; message: string }>('/attendance/auto-checkout', { method: 'POST' }),
    clientStats: (clientId: string) => api<any>(`/attendance/client-stats/${clientId}`),
};

// ===== Products =====
export const productsApi = {
    list: (page = 1, limit = 20, search?: string) =>
        api<{ data: any[]; total: number; page: number; totalPages: number }>(
            `/products?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`,
        ),
    get: (id: string) => api<any>(`/products/${id}`),
    create: (data: any) => api<any>('/products', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/products/${id}`, { method: 'PATCH', body: data }),
    adjustStock: (id: string, quantity: number) => api<any>(`/products/${id}/stock`, { method: 'PATCH', body: { quantity } }),
    lowStock: () => api<any[]>('/products/low-stock'),
    delete: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
};

// ===== Assets =====
export const assetsApi = {
    list: (status?: string) => api<any[]>(`/assets${status ? `?status=${status}` : ''}`),
    create: (data: any) => api<any>('/assets', { method: 'POST', body: data }),
    update: (id: string, data: any) => api<any>(`/assets/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => api(`/assets/${id}`, { method: 'DELETE' }),
};

// ===== Sales =====
export const salesApi = {
    create: (data: any) => api<any>('/sales', { method: 'POST', body: data }),
    list: (page = 1, limit = 20) => api<{ data: any[]; total: number; page: number; totalPages: number }>(`/sales?page=${page}&limit=${limit}`),
    get: (id: string) => api<any>(`/sales/${id}`),
};

// ===== Finance =====
export const financeApi = {
    dashboard: () => api<any>('/finance/dashboard'),
    dailyReport: (date?: string) => api<any>(`/finance/daily-report${date ? `?date=${date}` : ''}`),
    incomeChart: (period: 'week' | 'month' | 'year' = 'month') => api<any[]>(`/finance/income-chart?period=${period}`),
    salesReport: (from?: string, to?: string) => {
        const q = new URLSearchParams();
        if (from) q.set('from', from);
        if (to) q.set('to', to);
        return api<any>(`/finance/sales-report?${q.toString()}`);
    },
    openCashRegister: (openingAmount: number) => api<any>('/finance/cash-register/open', { method: 'POST', body: { openingAmount } }),
    closeCashRegister: (id: string, closingAmount: number, notes?: string) => api<any>(`/finance/cash-register/${id}/close`, { method: 'PATCH', body: { closingAmount, notes } }),
};

// ===== Users =====
export const usersApi = {
    list: (page = 1, limit = 20, search?: string) =>
        api<{ data: any[]; total: number; page: number; totalPages: number }>(
            `/users?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`,
        ),
    update: (id: string, data: any) => api<any>(`/users/${id}`, { method: 'PATCH', body: data }),
};

// ===== Audit =====
export const auditApi = {
    list: (params: { page?: number; limit?: number; userId?: string; entityType?: string; dateFrom?: string; dateTo?: string } = {}) => {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        if (params.userId) qs.set('userId', params.userId);
        if (params.entityType) qs.set('entityType', params.entityType);
        if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params.dateTo) qs.set('dateTo', params.dateTo);
        return api<{ data: any[]; total: number; page: number; totalPages: number }>(`/audit-logs?${qs.toString()}`);
    },
};
