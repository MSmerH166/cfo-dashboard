import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import IncomeStatement from './pages/IncomeStatement';
import BalanceSheet from './pages/BalanceSheet';
import CashFlow from './pages/CashFlow';
import TrialBalance from './pages/TrialBalance';
import ExecutiveReport from './pages/ExecutiveReport';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import { LogOut, Home, FileText, Building2, Wallet, Scale, Briefcase, ShieldCheck } from 'lucide-react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    fetch('http://127.0.0.1:7243/ingest/e84f2f1c-cf0f-4c3f-adf2-f4cf253c8d5a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'app-render',
        hypothesisId: 'H1',
        location: 'App.jsx:ErrorBoundary',
        message: 'render error',
        data: { error: error?.message, stack: error?.stack?.split('\n')?.slice(0, 3), componentStack: info?.componentStack },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24, fontFamily: 'sans-serif' }}>حدث خطأ في التحميل. الرجاء تحديث الصفحة.</div>;
    }
    return this.props.children;
  }
}

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false, permissionKey }) {
  const { isAuthenticated, loading, user } = useAuth();

  const hasPagePermission = () => {
    if (!permissionKey) return true;
    if (user?.role === 'admin') return true;
    const allowed = user?.allowedPages;
    if (!allowed || allowed.length === 0) return true; // null/empty => full access
    return allowed.includes(permissionKey);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!hasPagePermission()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isLoginPage = location.pathname === '/login';
  const allowedPages = user?.allowedPages;

  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/e84f2f1c-cf0f-4c3f-adf2-f4cf253c8d5a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'app-render',
        hypothesisId: 'H2',
        location: 'App.jsx:Layout',
        message: 'layout render',
        data: { path: location.pathname, hasUser: !!user, loading: false },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [location.pathname, user]);

  const navLinks = [
    { key: 'dashboard', label: 'الرئيسية', to: '/', icon: <Home className="w-4 h-4" /> },
    { key: 'income', label: 'قائمة الدخل', to: '/income-statement', icon: <FileText className="w-4 h-4" /> },
    { key: 'balance', label: 'المركز المالي', to: '/balance-sheet', icon: <Building2 className="w-4 h-4" /> },
    { key: 'cash', label: 'التدفقات', to: '/cash-flow', icon: <Wallet className="w-4 h-4" /> },
    { key: 'trial', label: 'ميزان المراجعة', to: '/trial-balance', icon: <Scale className="w-4 h-4" /> },
    { key: 'executive', label: 'التقرير التنفيذي', to: '/executive-report', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'admin', label: 'إدارة المستخدمين', to: '/admin-users', adminOnly: true, icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const canAccessLink = (link) => {
    if (link.adminOnly && user?.role !== 'admin') return false;
    if (user?.role === 'admin') return true;
    if (!link.key) return true;
    if (!allowedPages || allowedPages.length === 0) return true;
    return allowedPages.includes(link.key);
  };

  if (isLoginPage) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-right font-sans" dir="rtl">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-8 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-4 pr-3 md:pr-6">
          {/* Brand block */}
          <div className="shrink-0">
            <div className="bg-gradient-to-l from-[#0f1b3d] via-[#15386b] to-[#1b4b82] text-white px-5 md:px-6 py-3 rounded-2xl shadow-md border border-white/20">
              <div className="flex flex-col leading-tight text-right space-y-0.5">
                <span className="text-base md:text-lg font-bold">Bonyan Construction Company</span>
                <span className="text-[12px] md:text-xs text-white/85 uppercase tracking-[0.26em] text-center">Analytics</span>
              </div>
            </div>
          </div>

          {/* Navigation links (icon-first) */}
          <div className="flex-1 flex items-center justify-start gap-2 md:gap-3 flex-wrap">
            {navLinks.map((link) => {
              if (!canAccessLink(link)) return null;
              const isActive = location.pathname === link.to;
              const activeClass = 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100 scale-[1.01]';
              const normalClass = 'bg-white text-gray-700 border-gray-200 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/60';
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-full border whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 ${isActive ? activeClass : normalClass}`}
                  aria-label={link.label}
                  title={link.label}
                >
                  {link.icon}
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User card */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {user && (() => {
              const isCfo = (user.name || '').trim().toLowerCase() === 'haitham saqr';
              const avatarText = isCfo ? 'CFO' : (user.name?.[0] || 'م');
              const roleLabel = user.role === 'admin' ? 'Administrator' : '';
              return (
                <div className="flex items-center gap-2 pl-3 border-s border-gray-200">
                  <div className="flex items-center gap-3 bg-white border border-gray-200 px-3 py-2 rounded-full shadow-sm">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white flex items-center justify-center text-[11px] font-bold tracking-wide">
                      {avatarText}
                    </div>
                    <div className="flex flex-col leading-tight text-right whitespace-nowrap">
                      <span className="text-[11px] text-gray-500">مرحباً بك</span>
                      <span className="text-sm font-semibold text-gray-800">{user.name || 'المستخدم'}</span>
                      {roleLabel && <span className="text-[11px] text-gray-500">{roleLabel}</span>}
                    </div>
                    <button
                      onClick={logout}
                      className="ml-1 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded-full hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>خروج</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 pb-10 pt-6">
        {children}
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm bg-gray-50 border-t border-gray-200 mt-auto">
        نظام التحليل المالي لشركة بنيان © 2026 | تم التطوير بواسطة محمد سمير - بنيان
      </footer>
    </div>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute permissionKey="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/income-statement" element={<ProtectedRoute permissionKey="income"><IncomeStatement /></ProtectedRoute>} />
            <Route path="/balance-sheet" element={<ProtectedRoute permissionKey="balance"><BalanceSheet /></ProtectedRoute>} />
            <Route path="/cash-flow" element={<ProtectedRoute permissionKey="cash"><CashFlow /></ProtectedRoute>} />
            <Route path="/trial-balance" element={<ProtectedRoute permissionKey="trial"><TrialBalance /></ProtectedRoute>} />
            <Route path="/executive-report" element={<ProtectedRoute permissionKey="executive"><ExecutiveReport /></ProtectedRoute>} />
            <Route path="/admin-users" element={<ProtectedRoute adminOnly permissionKey="admin"><AdminUsers /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
