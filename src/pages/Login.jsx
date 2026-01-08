/**
 * Login Page - صفحة تسجيل الدخول
 * Professional login page with modern design and animations
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import CursorAnalyticsParticles from '../components/CursorAnalyticsParticles';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('حدث خطأ، يرجى المحاولة مرة أخرى');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 rtl bg-[#070f1e]" dir="rtl">
            <CursorAnalyticsParticles />
            <div className="absolute inset-0 bg-gradient-to-br from-[#060d1a]/95 via-[#0b1c30]/88 to-[#0a1a2a]/92" />
            {/* Futuristic cityscape data-viz background */}
            <div
                className="absolute inset-0 pointer-events-none mix-blend-screen"
                style={{
                    opacity: 0.6,
                    backgroundImage:
                        'radial-gradient(circle at 20% 25%, rgba(56, 189, 248, 0.18), transparent 45%), radial-gradient(circle at 80% 30%, rgba(59, 130, 246, 0.18), transparent 40%), radial-gradient(circle at 50% 78%, rgba(147, 51, 234, 0.12), transparent 45%)',
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    opacity: 0.28,
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '90px 90px',
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none mix-blend-screen"
                style={{
                    opacity: 0.18,
                    backgroundImage:
                        'linear-gradient(118deg, rgba(56,189,248,0.24) 0%, rgba(56,189,248,0.06) 32%, rgba(99,102,241,0.05) 55%, rgba(99,102,241,0.20) 100%)',
                    backgroundSize: '340px 100%',
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none bg-bottom bg-cover"
                style={{
                    opacity: 0.22,
                    backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%271600%27 height=%27400%27 viewBox=%270 0 1600 400%27 fill=%27none%27><g stroke=%27%235ac8fa%27 stroke-width=%272%27 stroke-opacity=%270.35%27><path d=%27M0 350H1600%27/><path d=%27M60 350V220H130V350%27/><path d=%27M170 350V190H230V350%27/><path d=%27M270 350V240H330V350%27/><path d=%27M380 350V170H470V350%27/><path d=%27M520 350V200H590V350%27/><path d=%27M630 350V150H720V350%27/><path d=%27M760 350V230H820V350%27/><path d=%27M860 350V180H930V350%27/><path d=%27M970 350V210H1030V350%27/><path d=%27M1080 350V190H1170V350%27/><path d=%27M1210 350V160H1290V350%27/><path d=%27M1320 350V240H1390V350%27/><path d=%27M1420 350V200H1490V350%27/><path d=%27M1510 350V170H1580V350%27/></g><g stroke=%27%2338bdf8%27 stroke-width=%271.2%27 stroke-opacity=%270.2%27><path d=%27M90 220V140%27/><path d=%27M200 190V120%27/><path d=%27M410 170V110%27/><path d=%27M650 150V90%27/><path d=%27M880 180V120%27/><path d=%27M1250 160V100%27/><path d=%27M1450 200V130%27/></g></svg>')",
                    backgroundPosition: 'center bottom',
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    opacity: 0.44,
                    backgroundImage:
                        'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 120px), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 120px)',
                    backgroundSize: '220px 220px',
                    animation: 'move-grid 24s linear infinite',
                }}
            />
            <div
                className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none mix-blend-screen"
                style={{
                    opacity: 0.32,
                    backgroundImage:
                        'linear-gradient(to top, rgba(56,189,248,0.32), rgba(56,189,248,0.16), rgba(56,189,248,0.05), transparent), linear-gradient(112deg, rgba(56,189,248,0.18) 0%, rgba(99,102,241,0.14) 52%, rgba(99,102,241,0.04) 82%)',
                    backgroundSize: '100% 100%',
                    animation: 'pulse-beam 9s ease-in-out infinite',
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    opacity: 0.16,
                    backgroundImage:
                        'radial-gradient(circle at 10% 80%, rgba(59,130,246,0.16) 0, rgba(59,130,246,0) 40%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.14) 0, rgba(56,189,248,0) 38%), radial-gradient(circle at 55% 20%, rgba(147,51,234,0.12) 0, rgba(147,51,234,0) 32%)',
                    animation: 'float-dots 18s ease-in-out infinite alternate',
                }}
            />

            {/* Login Container */}
            <div className="relative w-full max-w-md z-10">
                {/* Login Card with brand */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 animate-fade-in-up">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-white mb-1">نظام التحليل المالي</h1>
                        <p className="text-blue-200 text-sm">شركة بنيان للمقاولات</p>
                        <p className="text-blue-100 text-xs mt-1">مرحباً بك، سجّل دخولك للوصول إلى لوحة التحكم</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded-xl mb-6 animate-shake">
                            <p className="text-sm">{error}</p>
                        </div>
                    )}


                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="relative">
                            <label className="block text-white text-sm font-semibold mb-2">
                                البريد الإلكتروني
                            </label>
                            <div className="relative">
                                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                                    placeholder="example@bonyan.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <label className="block text-white text-sm font-semibold mb-2">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>جاري المعالجة...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    <span>تسجيل الدخول</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer note */}
                <div className="text-center mt-6 text-white/80 text-sm font-semibold">
                    تحت إشراف المدير المالي هيثم صقر
                </div>
            </div>

            <style>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-out;
        }

        @keyframes move-grid {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 220px 0, 0 220px; }
        }

        @keyframes pulse-beam {
          0% { opacity: 0.12; transform: translateY(8px); }
          50% { opacity: 0.22; transform: translateY(-6px); }
          100% { opacity: 0.12; transform: translateY(8px); }
        }

        @keyframes float-dots {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(8px, -6px, 0) scale(1.02); }
          100% { transform: translate3d(-6px, 10px, 0) scale(0.98); }
        }
      `}</style>
        </div>
    );
};

export default Login;
