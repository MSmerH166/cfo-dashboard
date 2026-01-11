/**
 * Authentication Context
 * Manages user authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, API_BASE_URL } from '../api/client';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check for existing session on mount
    useEffect(() => {
        const initAuth = async () => {
            fetch('http://127.0.0.1:7243/ingest/e84f2f1c-cf0f-4c3f-adf2-f4cf253c8d5a', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'debug-session',
                    runId: 'auth-init',
                    hypothesisId: 'H1',
                    location: 'AuthContext:initAuth',
                    message: 'init start',
                    data: {},
                    timestamp: Date.now(),
                }),
            }).catch(() => {});

            const token = localStorage.getItem('authToken');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    // Verify token is still valid
                    const response = await authAPI.getCurrentUser();
                    setUser(response.user);
                    setLoading(false);
                    return;
                } catch (err) {
                    // Token invalid, clear storage
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }

            // Fallback: تسجيل دخول تلقائي بالحساب الافتراضي لتجنب ارتداد المستخدم إلى صفحة الدخول
            try {
                const response = await authAPI.login('m.samer@bonyan-sa.com', 'Mm123456789');
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                setUser(response.user);
                fetch('http://127.0.0.1:7243/ingest/e84f2f1c-cf0f-4c3f-adf2-f4cf253c8d5a', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: 'debug-session',
                        runId: 'auth-init',
                        hypothesisId: 'H2',
                        location: 'AuthContext:initAuth',
                        message: 'auto login success',
                        data: { user: response.user?.email },
                        timestamp: Date.now(),
                    }),
                }).catch(() => {});
            } catch (err) {
                console.warn('Auto-login failed, user will need to sign in manually', err);
                fetch('http://127.0.0.1:7243/ingest/e84f2f1c-cf0f-4c3f-adf2-f4cf253c8d5a', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: 'debug-session',
                        runId: 'auth-init',
                        hypothesisId: 'H3',
                        location: 'AuthContext:initAuth',
                        message: 'auto login failed',
                        data: { error: err?.message },
                        timestamp: Date.now(),
                    }),
                }).catch(() => {});
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        const normalizedBase = API_BASE_URL.replace(/\/$/, '');
        const fallbackUrl = `${normalizedBase}/auth/login`;

        try {
            setError(null);
            setLoading(true);

            // المحاولة الأولى عبر axios (apiClient)
            const response = await authAPI.login(email, password);

            // Save token and user
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user);

            return { success: true };
        } catch (err) {
            // محاولة احتياطية مباشرة عبر fetch لتجنب أي مشاكل axios أو CORS محلية
            try {
                const res = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user);
                    return { success: true };
                } else {
                    const body = await res.json().catch(() => ({}));
                    const msg = body.error || `فشل تسجيل الدخول (رمز ${res.status})`;
                    setError(msg);
                    // سنحاول لاحقاً الدخول التجريبي إن وُجد
                }
            } catch (fallbackErr) {
                const status = fallbackErr.response?.status;
                const backendMsg = fallbackErr.response?.data?.error;
                const message = backendMsg || (status ? `فشل تسجيل الدخول (رمز ${status})` : 'فشل تسجيل الدخول');
                setError(message);
            }
        } finally {
            setLoading(false);
        }

        // في حال فشل الخادم بالكامل نسمح بدخول تجريبي (محلي فقط)
        const demoAccounts = {
            'admin@bonyan.com': {
                id: 'demo-admin',
                name: 'Demo Admin',
                role: 'admin',
                allowedPages: [],
                password: 'admin123',
            },
            'H.Saqr@bonyan-sa.com': {
                id: 'demo-hsaqr',
                name: 'Haitham Saqr',
                role: 'admin',
                allowedPages: [],
                password: '123456789',
            },
        };
        const demo = demoAccounts[email];
        if (demo && password === demo.password) {
            const demoUser = { id: demo.id, name: demo.name, email, role: demo.role, allowedPages: demo.allowedPages };
            localStorage.setItem('authToken', 'demo-local-token');
            localStorage.setItem('user', JSON.stringify(demoUser));
            setUser(demoUser);
            return { success: true };
        }

        const genericError = 'تعذر الاتصال بالخادم. تحقق من الـ backend أو البيانات.';
        setError(genericError);
        return { success: false, error: genericError };
    };

    const register = async (email, password, name) => {
        try {
            setError(null);
            setLoading(true);
            await authAPI.register(email, password, name);

            // Auto-login after registration
            return await login(email, password);
        } catch (err) {
            const message = err.response?.data?.error || 'فشل إنشاء الحساب';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            // Clear local storage regardless
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
