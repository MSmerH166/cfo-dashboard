/**
 * API Client for CFO System
 * Handles all HTTP requests to backend server
 */

import axios from 'axios';

// تحديد عنوان الـ API مع معالجة الفراغات والاحتمالات المختلفة
const rawEnv = (import.meta.env.VITE_API_URL || '').trim();
const fallbackLocal = 'http://localhost:3001/api';
// إذا لم يحدد المتغير، نُفضّل الخادم المحلي 3001 أولاً، ثم نفس الدومين، لتجنّب 404 من dev server
const resolvedBase =
    rawEnv ||
    fallbackLocal ||
    (typeof window !== 'undefined' ? `${window.location.origin}/api` : '');
// إزالة الشرطة المائلة الأخيرة لتجنب // مزدوج
export const API_BASE_URL = resolvedBase.replace(/\/$/, '');

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors (بدون تسجيل خروج تلقائي لتجنب طرد المستخدم عند 401 في صفحات خاصة)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // كان هنا تسجيل خروج تلقائي عند 401؛ تم تعطيله لأن بعض الاستجابات (مثل استعلام الصلاحيات) قد تعطي 401 لمستخدم غير مخوّل
        // ووقتها كنا نطرد المستخدم بالكامل من الجلسة.
        return Promise.reject(error);
    }
);

// ==================== AUTH APIs ====================

export const authAPI = {
    login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (email, password, name) => {
        const response = await apiClient.post('/auth/register', { email, password, name });
        return response.data;
    },

    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
};

// ==================== TRIAL BALANCE APIs ====================

export const trialBalanceAPI = {
    upload: async (data) => {
        const response = await apiClient.post('/trial-balance/upload', data);
        return response.data;
    },

    getAll: async () => {
        const response = await apiClient.get('/trial-balance');
        return response.data;
    },

    getById: async (id) => {
        const response = await apiClient.get(`/trial-balance/${id}`);
        return response.data;
    },

    delete: async (id) => {
        const response = await apiClient.delete(`/trial-balance/${id}`);
        return response.data;
    },
};

// ==================== STATEMENT SNAPSHOTS ====================

export const statementsAPI = {
    save: async ({ statementType, year, data }) => {
        const response = await apiClient.post('/statements/save', { statementType, year, data });
        return response.data;
    },
    latest: async (type) => {
        const response = await apiClient.get(`/statements/${type}/latest`);
        return response.data;
    },
};

// ==================== USERS (Admin / Self) ====================

export const usersAPI = {
    create: async ({ email, username, password, name, role = 'user', department, jobTitle, phone, status }) => {
        const response = await apiClient.post('/users/create', { email, username, password, name, role, department, jobTitle, phone, status });
        return response.data;
    },
    changePassword: async ({ userId, currentPassword, newPassword }) => {
        const response = await apiClient.post('/users/change-password', { userId, currentPassword, newPassword });
        return response.data;
    },
    list: async (params = {}) => {
        const response = await apiClient.get('/users', { params });
        return response.data;
    },
    updatePermissions: async (userId, { allowedPages }) => {
        const response = await apiClient.put(`/users/${userId}/permissions`, { allowedPages });
        return response.data;
    },
    updateUser: async (userId, payload) => {
        const response = await apiClient.put(`/users/${userId}`, payload);
        return response.data;
    },
    updateStatus: async (userId, { status, reason }) => {
        const response = await apiClient.post(`/users/${userId}/status`, { status, reason });
        return response.data;
    },
    resetPasswordAdmin: async (userId, { newPassword, forceChange }) => {
        const response = await apiClient.post(`/users/${userId}/reset-password`, { newPassword, forceChange });
        return response.data;
    },
    logoutAll: async (userId) => {
        const response = await apiClient.post(`/users/${userId}/logout-all`);
        return response.data;
    },
    getPermissions: async (userId) => {
        const response = await apiClient.get(`/users/${userId}/permissions`);
        return response.data;
    },
    setCustomPermissions: async (userId, payload) => {
        const response = await apiClient.put(`/users/${userId}/custom-permissions`, payload);
        return response.data;
    },
};

export const auditAPI = {
    list: async (params = {}) => {
        const response = await apiClient.get('/audit-logs', { params });
        return response.data;
    },
};

// ==================== HEALTH CHECK ====================

export const healthAPI = {
    check: async () => {
        const response = await apiClient.get('/health');
        return response.data;
    },
};

export default apiClient;
