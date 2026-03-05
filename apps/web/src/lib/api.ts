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

function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('gymcore_refresh_token');
}

export function setToken(token: string) {
    localStorage.setItem('gymcore_token', token);
}

export function setRefreshToken(token: string) {
    localStorage.setItem('gymcore_refresh_token', token);
}

export function removeToken() {
    localStorage.removeItem('gymcore_token');
    localStorage.removeItem('gymcore_refresh_token');
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return true;
    } catch {
        return false;
    }
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

    let res = await fetch(`${API_BASE}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Auto-refresh on 401
    if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = tryRefresh().finally(() => { isRefreshing = false; });
        }
        const refreshed = await refreshPromise;
        if (refreshed) {
            // Retry original request with new token
            const newToken = getToken();
            if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(`${API_BASE}${endpoint}`, {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined,
            });
        }
    }

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
        api<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string; role: string; phone?: string } }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        }),
    profile: () => api<{ id: string; email: string; name: string; role: string }>('/auth/profile'),
    changePassword: (currentPassword: string, newPassword: string) =>
        api<{ message: string }>('/auth/change-password', { method: 'PATCH', body: { currentPassword, newPassword } }),
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
    searchByDni: (dni: string) => api<any>(`/clients/search-dni/${encodeURIComponent(dni)}`),
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
    assign: (data: { clientId: string; planId: string; amountPaid: number; paymentMethod?: string; receiptUrl?: string; startDate?: string; endDate?: string; mode?: 'replace' | 'queue' }) =>
        api<any>('/memberships', { method: 'POST', body: data }),
    dailyPass: (data: { clientId: string; amountPaid: number; paymentMethod?: string; receiptUrl?: string }) =>
        api<any>('/memberships/daily-pass', { method: 'POST', body: data }),
    addPayment: (id: string, data: { amountPaid: number; paymentMethod: string; receiptUrl?: string }) =>
        api<any>(`/memberships/${id}/payments`, { method: 'POST', body: data }),
    getPayments: (id: string) => api<any[]>(`/memberships/${id}/payments`),
    freeze: (id: string) => api<any>(`/memberships/${id}/freeze`, { method: 'PATCH' }),
    unfreeze: (id: string) => api<any>(`/memberships/${id}/unfreeze`, { method: 'PATCH' }),
    cancel: (id: string) => api<any>(`/memberships/${id}/cancel`, { method: 'PATCH' }),
    delete: (id: string) => api(`/memberships/${id}`, { method: 'DELETE' }),
    expiring: (days = 7) => api<any[]>(`/memberships/expiring?days=${days}`),
};

// ===== Attendance =====
export const attendanceApi = {
    checkIn: (qrCode: string, method?: 'QR' | 'MANUAL') => api<any>('/attendance/check-in', { method: 'POST', body: { qrCode, method } }),
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
    register: (data: { email: string; password: string; name: string; role?: string; phone?: string }) =>
        api<any>('/auth/register', { method: 'POST', body: data }),
    deactivate: (id: string) => api<any>(`/users/${id}`, { method: 'PATCH', body: { isActive: false } }),
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
