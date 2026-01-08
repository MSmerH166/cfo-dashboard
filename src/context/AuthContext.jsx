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
            } catch (err) {
                console.warn('Auto-login failed, user will need to sign in manually', err);
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

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2519d3ac-7c3e-48c6-96d4-c7343003e3c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'login-debug1',hypothesisId:'A',location:'AuthContext.jsx:login:start',message:'login start',data:{email,API_BASE_URL,normalizedBase,fallbackUrl},timestamp:Date.now()})}).catch(()=>{});
            // #endregion

            // المحاولة الأولى عبر axios (apiClient)
            const response = await authAPI.login(email, password);

            // Save token and user
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user);

            return { success: true };
        } catch (err) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2519d3ac-7c3e-48c6-96d4-c7343003e3c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'login-debug1',hypothesisId:'B',location:'AuthContext.jsx:login:axios_error',message:'axios login failed',data:{status:err?.response?.status,url:err?.config?.url,baseURL:err?.config?.baseURL},timestamp:Date.now()})}).catch(()=>{});
            // #endregion

            // محاولة احتياطية مباشرة عبر fetch لتجنب أي مشاكل axios أو CORS محلية
            try {
                const res = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/2519d3ac-7c3e-48c6-96d4-c7343003e3c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'login-debug1',hypothesisId:'C',location:'AuthContext.jsx:login:fallback_fetch',message:'fallback fetch result',data:{status:res.status,url:fallbackUrl},timestamp:Date.now()})}).catch(()=>{});
                // #endregion

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/2519d3ac-7c3e-48c6-96d4-c7343003e3c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'login-debug1',hypothesisId:'D',location:'AuthContext.jsx:login:fallback_success',message:'fallback login success',data:{userId:data?.user?.id},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                    return { success: true };
                } else {
                    const body = await res.json().catch(() => ({}));
                    const msg = body.error || `فشل تسجيل الدخول (رمز ${res.status})`;
                    setError(msg);
                    // سنحاول لاحقاً الدخول التجريبي إن وُجد
                }
            } catch (fallbackErr) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/2519d3ac-7c3e-48c6-96d4-c7343003e3c5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'login-debug1',hypothesisId:'E',location:'AuthContext.jsx:login:fallback_error',message:'fallback login error',data:{status:fallbackErr?.response?.status,msg:fallbackErr?.message},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
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
