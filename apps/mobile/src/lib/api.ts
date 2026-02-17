import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_URL = '@gymcore_api_url';
const DEFAULT_URL = 'http://192.168.18.28:3001/api';

let _baseUrl = DEFAULT_URL;
let _token: string | null = null;

export const api = {
    async init() {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_URL);
        if (saved) _baseUrl = saved;
        const token = await AsyncStorage.getItem('@gymcore_token');
        if (token) _token = token;
    },

    getBaseUrl() { return _baseUrl; },

    async setBaseUrl(url: string) {
        _baseUrl = url.replace(/\/+$/, '');
        await AsyncStorage.setItem(STORAGE_KEY_URL, _baseUrl);
    },

    setToken(token: string | null) {
        _token = token;
        if (token) AsyncStorage.setItem('@gymcore_token', token);
        else AsyncStorage.removeItem('@gymcore_token');
    },

    getToken() { return _token; },

    async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
        const headers: any = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (_token) headers['Authorization'] = `Bearer ${_token}`;

        const res = await fetch(`${_baseUrl}${path}`, { ...options, headers });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `Error ${res.status}`);
        }

        return res.json();
    },

    // Auth
    login(email: string, password: string) {
        return this.request<{ accessToken: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    // Attendance
    scanQr(qrCode: string, registerCheckIn = true) {
        return this.request('/attendance/scan', {
            method: 'POST',
            body: JSON.stringify({ qrCode, registerCheckIn }),
        });
    },

    getTodayAttendance() {
        return this.request<any[]>('/attendance/today-public');
    },

    getHistory(params?: { date?: string; from?: string; to?: string; page?: number; limit?: number }) {
        const q = new URLSearchParams();
        if (params?.date) q.set('date', params.date);
        if (params?.from) q.set('from', params.from);
        if (params?.to) q.set('to', params.to);
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        return this.request<{ data: any[]; total: number; page: number; totalPages: number }>(`/attendance/history-public?${q.toString()}`);
    },

    checkOut(clientId: string) {
        return this.request(`/attendance/check-out-public/${clientId}`, {
            method: 'POST',
        });
    },

    updateMedicalNotes(clientId: string, medicalNotes: string) {
        return this.request(`/attendance/update-medical-notes/${clientId}`, {
            method: 'PATCH',
            body: JSON.stringify({ medicalNotes }),
        });
    },

    // Dashboard
    getDashboardStats() {
        return this.request<any>('/finance/dashboard');
    },

    // Clients
    searchClients(query: string) {
        return this.request<{ data: any[]; total: number }>(`/clients?page=1&limit=10&search=${encodeURIComponent(query)}`);
    },

    getClientProfile(id: string) {
        return this.request<any>(`/clients/${id}`);
    },

    getClientAttendanceStats(id: string) {
        return this.request<any>(`/attendance/client-stats/${id}`);
    },
};
