import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI, auditAPI } from '../api/client';

const PAGE_SIZE = 8;

const pagePermissions = [
  { key: 'dashboard', label: 'الرئيسية' },
  { key: 'income', label: 'قائمة الدخل' },
  { key: 'balance', label: 'المركز المالي' },
  { key: 'cash', label: 'التدفقات النقدية' },
  { key: 'trial', label: 'ميزان المراجعة' },
  { key: 'executive', label: 'التقرير التنفيذي' },
  { key: 'admin', label: 'إدارة المستخدمين' },
];

const roleDefaults = {
  admin: pagePermissions.map((p) => p.key),
  manager: ['dashboard', 'income', 'balance', 'cash', 'trial', 'executive'],
  user: ['dashboard', 'income', 'balance', 'cash', 'trial'],
  custom: [],
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // إظهار المفعّل افتراضياً
  const [filterDept, setFilterDept] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const [createForm, setCreateForm] = useState({
    email: '',
    username: '',
    name: '',
    password: '',
    role: 'user',
  });
  const [editingId, setEditingId] = useState(null);
  const [createStatus, setCreateStatus] = useState('idle');
  const [createError, setCreateError] = useState('');

  const [pwForm, setPwForm] = useState({ userId: '', newPassword: '', confirmPassword: '', forceLogout: true });
  const [pwStatus, setPwStatus] = useState('idle');
  const [pwError, setPwError] = useState('');

  const [permUser, setPermUser] = useState(null);
  const [permRole, setPermRole] = useState('custom');
  const [permChecked, setPermChecked] = useState([]);
  const [permStatus, setPermStatus] = useState('idle');

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [authExpired, setAuthExpired] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  const filteredUsers = useMemo(() => {
    const list = (users || []).filter((u) => {
      if (filterRole && u.role !== filterRole) return false;
      if (filterStatus && u.status !== filterStatus) return false;
      if (filterDept && (u.department || '').toLowerCase() !== filterDept.toLowerCase()) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
      );
    });
    const sorted = [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'lastLogin') {
        return dir * ((new Date(a.lastLogin || 0)) - (new Date(b.lastLogin || 0)));
      }
      if (sortKey === 'createdAt') {
        return dir * ((new Date(a.createdAt || 0)) - (new Date(b.createdAt || 0)));
      }
      return dir * String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
    });
    return sorted;
  }, [users, search, filterRole, filterStatus, filterDept]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAuthError = (err) => {
    if (err?.response?.status === 401) {
      setAuthExpired(true);
      setAuthErrorMsg('انتهت صلاحية الجلسة، فضلاً سجّل الدخول مرة أخرى');
      return true;
    }
    return false;
  };

  const loadUsers = async (returnList = false) => {
    try {
      setUsersLoading(true);
      const res = await usersAPI.list({
        search,
        role: filterRole || undefined,
        status: filterStatus || undefined,
        department: filterDept || undefined,
      });
      const normalized = (res.users || []).map((u) => ({
        ...u,
        allowAll: !u.allowedPages || u.allowedPages.length === 0,
        allowedPages: Array.isArray(u.allowedPages) ? u.allowedPages : [],
        lastLogin: u.lastLogin || null,
        mfaEnabled: u.mfaEnabled ?? false,
      }));
      setUsers(normalized);
      if (returnList) return normalized;
    } catch (err) {
      if (handleAuthError(err)) return;
      setUsers([]);
      if (returnList) return [];
    } finally {
      setUsersLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await auditAPI.list({ limit: 100 });
      setLogs(res.logs || []);
    } catch (e) {
      if (handleAuthError(e)) return;
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCreateForm = () => {
    setCreateForm({
      email: '',
      username: '',
      name: '',
      password: '',
      role: 'user',
    });
    setEditingId(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setCreateError('');
      setCreateStatus('saving');
      const name = createForm.name.trim();
      const email = createForm.email.trim();
      const username = (createForm.username || '').trim() || email;
      const password = createForm.password;

      // تحقق مبكر: الاسم + البريد (اسم المستخدم) + كلمة المرور (للمستخدم الجديد) + الدور
      if (!name || !username || !email) {
        setCreateError('الاسم والبريد مطلوبة');
        setCreateStatus('error');
        setTimeout(() => setCreateStatus('idle'), 2000);
        return;
      }
      if (!editingId && !password) {
        setCreateError('الرجاء إدخال كلمة مرور للمستخدم الجديد');
        setCreateStatus('error');
        setTimeout(() => setCreateStatus('idle'), 2000);
        return;
      }
      if (editingId) {
        await usersAPI.updateUser(editingId, {
          name,
          email,
          username,
          role: createForm.role,
        });
      } else {
        await usersAPI.create({
          email,
          username,
          name,
          password,
          role: createForm.role,
          status: 'active',
        });
      }
      setCreateStatus('ok');
      resetCreateForm();
      const latest = await loadUsers(true);
      // فرض تغيير كلمة المرور عند أول دخول (محاولة لاحقة)
      const created = (latest || []).find((u) => u.email === email);
      if (created) {
        try {
          await usersAPI.resetPasswordAdmin(created.id, { newPassword: password, forceChange: true });
        } catch (e) {
          // تجاهل لو فشل
        }
      }
      setTimeout(() => setCreateStatus('idle'), 1200);
    } catch (err) {
      if (handleAuthError(err)) return;
      const msg = err?.response?.data?.error || err?.message || 'تعذر الحفظ';
      setCreateError(msg);
      setCreateStatus('error');
      setTimeout(() => setCreateStatus('idle'), 2500);
    }
  };

  const handleEditUser = (u) => {
    setActiveTab('create');
    setEditingId(u.id);
    setCreateForm((p) => ({
      ...p,
      email: u.email || '',
      username: u.username || '',
      name: u.name || '',
      password: '',
      role: u.role || 'user',
    }));
  };

  const handleToggleStatus = async (u) => {
    const next = u.status === 'active' ? 'inactive' : 'active';
    const reason = next === 'inactive' ? window.prompt('سبب الإيقاف (إجباري):', 'إيقاف مؤقت') : '';
    if (next === 'inactive' && !reason) return;
    try {
      setTogglingId(u.id);
      await usersAPI.updateStatus(u.id, { status: next, reason });
      await loadUsers();
    } catch (err) {
      if (handleAuthError(err)) return;
      alert('تعذر تحديث الحالة');
    } finally {
      setTogglingId(null);
    }
  };

  const handleResetPasswordAdmin = async (u) => {
    const pwd = window.prompt('أدخل كلمة مرور مؤقتة جديدة:', '');
    if (!pwd) return;
    try {
      setResettingId(u.id);
      await usersAPI.resetPasswordAdmin(u.id, { newPassword: pwd, forceChange: true });
      await usersAPI.logoutAll(u.id);
      await loadUsers();
    } catch (err) {
      if (handleAuthError(err)) return;
      alert('تعذر تغيير كلمة المرور');
    } finally {
      setResettingId(null);
    }
  };

  const handleActivateAndSetPassword = async (u) => {
    const pwd = window.prompt('أدخل كلمة مرور جديدة لهذا الحساب:', '');
    if (!pwd) return;
    try {
      setActivatingId(u.id);
      await usersAPI.updateStatus(u.id, { status: 'active', reason: null });
      await usersAPI.resetPasswordAdmin(u.id, { newPassword: pwd, forceChange: true });
      await usersAPI.updatePermissions(u.id, { allowedPages: [] }); // كل الصفحات
      await loadUsers();
      alert('تم تفعيل الحساب وتعيين كلمة المرور ومنح جميع الصفحات.');
    } catch (err) {
      if (handleAuthError(err)) return;
      alert('تعذر تفعيل الحساب أو تعيين كلمة المرور');
    } finally {
      setActivatingId(null);
    }
  };

  const handleSetMfaEnabled = async (u) => {
    try {
      setSavingId(u.id);
      await usersAPI.updateUser(u.id, { mfaEnabled: true });
      await loadUsers();
      alert('تم تفعيل المصادقة الثنائية لهذا المستخدم.');
    } catch (err) {
      if (handleAuthError(err)) return;
      alert('تعذر تفعيل المصادقة الثنائية');
    } finally {
      setSavingId(null);
    }
  };

  const handlePermissionsOpen = (u) => {
    setPermUser(u);
    setActiveTab('permissions');
    const base = roleDefaults[u.role] || [];
    const merged = new Set([...(u.allowedPages || []), ...base]);
    setPermRole(u.role || 'custom');
    setPermChecked(Array.from(merged));
  };

  const handlePermissionsSave = async () => {
    if (!permUser) return;
    try {
      setPermStatus('saving');
      // تحديث الدور إن تغيّر
      if (permRole && permRole !== permUser.role) {
        await usersAPI.updateUser(permUser.id, { role: permRole });
      }
      // تحديث الصفحات المسموحة
      await usersAPI.updatePermissions(permUser.id, { allowedPages: permChecked });
      await loadUsers();
      setPermStatus('ok');
      setTimeout(() => setPermStatus('idle'), 1200);
    } catch (err) {
      if (handleAuthError(err)) return;
      setPermStatus('error');
      setTimeout(() => setPermStatus('idle'), 2000);
    }
  };

  const handleAllowAllPages = async () => {
    if (!permUser) return;
    try {
      setPermStatus('saving');
      // إرسال قائمة فارغة يعني السماح بكل الصفحات
      await usersAPI.updatePermissions(permUser.id, { allowedPages: [] });
      await loadUsers();
      setPermStatus('ok');
      setTimeout(() => setPermStatus('idle'), 1200);
    } catch (err) {
      setPermStatus('error');
      setTimeout(() => setPermStatus('idle'), 2000);
    }
  };

  const handlePermissionsSelectAll = () => {
    const all = pagePermissions.map((p) => p.key);
    setPermChecked(all);
  };

  const handlePermissionsClear = () => {
    setPermChecked([]);
  };

  const handlePermissionsToggle = (key) => {
    setPermChecked((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return Array.from(s);
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.userId || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('تحقق من اختيار المستخدم ومطابقة كلمة المرور');
      return;
    }
    try {
      setPwError('');
      setPwStatus('saving');
      await usersAPI.resetPasswordAdmin(pwForm.userId, { newPassword: pwForm.newPassword, forceChange: true });
      if (pwForm.forceLogout) await usersAPI.logoutAll(pwForm.userId);
      setPwStatus('ok');
      setPwForm({ userId: '', newPassword: '', confirmPassword: '', forceLogout: true });
      setTimeout(() => setPwStatus('idle'), 1200);
    } catch (err) {
      const msg = err?.response?.data?.error || 'تعذر التحديث';
      setPwError(msg);
      setPwStatus('error');
      setTimeout(() => setPwStatus('idle'), 2500);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    await loadLogs();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const rows = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        allowedPages: u.allowAll ? 'ALL' : (u.allowedPages || []).join('|'),
        lastLogin: u.lastLogin || '',
      }));
      const header = 'id,name,email,role,status,allowedPages,lastLogin';
      const csv = [header, ...rows.map((r) => `${r.id},${r.name},${r.email},${r.role},${r.status},"${r.allowedPages}",${r.lastLogin}`)].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users-export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const inactive = users.filter((u) => u.status !== 'active').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const managers = users.filter((u) => u.role === 'manager').length;
    const custom = users.filter((u) => u.role === 'custom').length;
    return { total, active, inactive, admins, managers, custom };
  }, [users]);

  const formatDate = (dt) => {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleString('ar-EG');
    } catch {
      return dt;
    }
  };

  const renderUsersTable = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 font-semibold">إجمالي: {stats.total}</div>
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 font-semibold">نشط: {stats.active}</div>
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 font-semibold">موقوف: {stats.inactive}</div>
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-purple-800 font-semibold">Admins: {stats.admins}</div>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 font-semibold">Managers: {stats.managers}</div>
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 font-semibold">Custom: {stats.custom}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="بحث بالاسم أو البريد"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">كل الأدوار</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
          <option value="custom">Custom</option>
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">موقوف</option>
        </select>
        <input
          type="text"
          placeholder="القسم"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          value={filterDept}
          onChange={(e) => {
            setFilterDept(e.target.value);
            setPage(1);
          }}
        />
        <button
          onClick={handleRefresh}
          className="text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-200 transition disabled:opacity-60"
          disabled={refreshing}
        >
          {refreshing ? 'تحديث...' : 'تحديث'}
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-700">
              <th className="px-3 py-2 text-right font-semibold">معرّف المستخدم</th>
              <th className="px-3 py-2 text-right font-semibold">الاسم الكامل</th>
              <th className="px-3 py-2 text-right font-semibold">اسم المستخدم (البريد)</th>
              <th className="px-3 py-2 text-right font-semibold">القسم</th>
              <th className="px-3 py-2 text-right font-semibold">الدور</th>
              <th className="px-3 py-2 text-right font-semibold">الصلاحيات</th>
              <th className="px-3 py-2 text-right font-semibold">MFA</th>
              <th className="px-3 py-2 text-right font-semibold">الحالة</th>
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                <button onClick={() => {
                  setSortKey('lastLogin');
                  setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                }} className="flex items-center gap-1">
                  آخر تسجيل دخول
                </button>
              </th>
              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              <tr><td colSpan={8} className="px-3 py-3 text-center text-gray-500">جاري التحميل...</td></tr>
            ) : pageUsers.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-3 text-center text-gray-500">لا توجد بيانات</td></tr>
            ) : pageUsers.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{u.id}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-700">{u.email}</td>
                <td className="px-3 py-2 text-gray-700">{u.department || '—'}</td>
                <td className="px-3 py-2 text-gray-700">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : u.role === 'manager' ? 'bg-amber-50 text-amber-700' : u.role === 'custom' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {u.allowAll ? 'كل الصفحات' : `${u.allowedPages.length} صفحة مسموحة`}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.mfaEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.mfaEnabled ? 'مفعل' : 'غير مفعل'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  {u.status !== 'active' && u.disableReason && (
                    <div className="text-[11px] text-gray-500 mt-1">سبب: {u.disableReason}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(u.lastLogin)}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button onClick={() => handleEditUser(u)} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100">تعديل</button>
                    <button onClick={() => handleResetPasswordAdmin(u)} disabled={resettingId === u.id} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100">{resettingId === u.id ? '...' : 'إعادة تعيين'}</button>
                    <button onClick={() => handleToggleStatus(u)} disabled={togglingId === u.id} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-100 hover:bg-amber-100">
                      {u.status === 'active' ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button onClick={() => handlePermissionsOpen(u)} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100 hover:bg-purple-100">الصلاحيات</button>
                    <button onClick={() => handleActivateAndSetPassword(u)} disabled={activatingId === u.id} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100">
                      {activatingId === u.id ? '...' : 'تفعيل + كلمة مرور + كل الصفحات'}
                    </button>
                    <button onClick={() => handleSetMfaEnabled(u)} disabled={savingId === u.id} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg border border-teal-100 hover:bg-teal-100">
                      {savingId === u.id ? '...' : 'تفعيل MFA'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>إجمالي: {filteredUsers.length}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-50">السابق</button>
          <span>صفحة {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 border rounded disabled:opacity-50">التالي</button>
        </div>
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{editingId ? 'تعديل مستخدم' : 'إنشاء مستخدم جديد'}</h2>
          <p className="text-sm text-gray-500">الحقول المطلوبة: الاسم، البريد (اسم الدخول)، كلمة المرور، الصلاحية</p>
        </div>
        {editingId && (
          <button onClick={resetCreateForm} className="text-sm text-blue-600 hover:text-blue-700">إلغاء التعديل</button>
        )}
      </div>
      <form className="space-y-3" onSubmit={handleCreate}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">الاسم الكامل</label>
            <input type="text" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm text-gray-700">اسم المستخدم (البريد) *</label>
            <input type="email" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-100" value={createForm.username} onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))} required disabled={!!editingId} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">البريد الإلكتروني</label>
            <input
              type="email"
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              value={createForm.email}
              onChange={(e) => {
                const val = e.target.value;
                setCreateForm((p) => ({ ...p, email: val, username: p.username || val }));
              }}
              required
            />
          </div>
        </div>
        {!editingId && (
          <div>
            <label className="text-sm text-gray-700">كلمة المرور</label>
            <input type="password" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} required />
          </div>
        )}
        <div>
          <label className="text-sm text-gray-700">الصلاحية (الدور)</label>
          <select className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={createStatus === 'saving'} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
            {createStatus === 'saving' ? 'جاري الحفظ...' : editingId ? 'تحديث المستخدم' : 'إنشاء المستخدم'}
          </button>
          {createStatus === 'ok' && <p className="text-sm text-green-600 mt-1">تم الحفظ</p>}
          {createStatus === 'error' && <p className="text-sm text-red-600 mt-1">{createError || 'تعذر الحفظ'}</p>}
        </div>
      </form>
    </div>
  );

  const renderPasswordForm = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">تغيير كلمة المرور</h2>
          <p className="text-sm text-gray-500">اختيار مستخدم وتعيين كلمة مرور جديدة مع خيار تسجيل الخروج من جميع الجلسات</p>
      </div>
      <form className="space-y-3" onSubmit={handleChangePassword}>
        <div>
          <label className="text-sm text-gray-700">اختر المستخدم</label>
          <select className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" value={pwForm.userId} onChange={(e) => setPwForm((p) => ({ ...p, userId: e.target.value }))}>
            <option value="">اختر...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-700">كلمة المرور الجديدة</label>
            <input type="password" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm text-gray-700">تأكيد كلمة المرور</label>
            <input type="password" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" value={pwForm.confirmPassword} onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} required />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="h-4 w-4" checked={pwForm.forceLogout} onChange={(e) => setPwForm((p) => ({ ...p, forceLogout: e.target.checked }))} />
          تسجيل خروج من كل الجلسات
        </label>
        <div className="pt-2">
          <button type="submit" disabled={pwStatus === 'saving'} className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-60">
            {pwStatus === 'saving' ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </button>
          {pwStatus === 'ok' && <p className="text-sm text-emerald-600 mt-1">تم تحديث كلمة المرور</p>}
          {pwStatus === 'error' && <p className="text-sm text-red-600 mt-1">{pwError || 'تعذر التحديث'}</p>}
        </div>
      </form>
    </div>
  );

  const renderPermissions = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">الصلاحيات</h2>
          <p className="text-sm text-gray-500">اختر مستخدماً واضبط صلاحياته أو اختر دوراً افتراضياً</p>
        </div>
        {permUser && <span className="text-sm text-gray-600">المستخدم: {permUser.name}</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-700">اختر مستخدم</label>
          <select className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" value={permUser?.id || ''} onChange={(e) => {
            const u = users.find((x) => String(x.id) === e.target.value);
            if (u) handlePermissionsOpen(u);
          }}>
            <option value="">اختر...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">الدور</label>
          <select className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" value={permRole} onChange={(e) => {
            const newRole = e.target.value;
            setPermRole(newRole);
            if (newRole !== 'custom') {
              setPermChecked(roleDefaults[newRole] || []);
            } else if (permUser) {
              setPermChecked(permUser.permissions || []);
            }
          }}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button onClick={handlePermissionsSelectAll} className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">تحديد الكل</button>
        <button onClick={handlePermissionsClear} className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">مسح الكل</button>
        <button onClick={handleAllowAllPages} disabled={!permUser || permStatus === 'saving'} className="px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-60">
          منح كل الصفحات (Full Access)
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pagePermissions.map((p) => (
          <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2">
            <input type="checkbox" className="h-4 w-4" checked={permChecked.includes(p.key)} onChange={() => handlePermissionsToggle(p.key)} />
            <span>{p.label}</span>
          </label>
        ))}
      </div>
      <div className="pt-2">
        <button disabled={!permUser || permStatus === 'saving'} onClick={handlePermissionsSave} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-60">
          {permStatus === 'saving' ? 'حفظ الصلاحيات...' : 'حفظ الصلاحيات'}
        </button>
        {permStatus === 'ok' && <p className="text-sm text-green-600 mt-1">تم الحفظ</p>}
        {permStatus === 'error' && <p className="text-sm text-red-600 mt-1">تعذر الحفظ</p>}
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
        <div>
            <h2 className="text-lg font-semibold text-gray-800">سجل التدقيق</h2>
            <p className="text-sm text-gray-500">تسجيل لكل العمليات (إنشاء، تعديل، صلاحيات، كلمات مرور، إيقاف/تفعيل)</p>
        </div>
        <button onClick={loadLogs} className="text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-200 transition disabled:opacity-60" disabled={logsLoading}>
          {logsLoading ? 'جاري التحميل...' : 'تحديث'}
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-700">
              <th className="px-3 py-2 text-right font-semibold">العملية</th>
              <th className="px-3 py-2 text-right font-semibold">المستخدم المستهدف</th>
              <th className="px-3 py-2 text-right font-semibold">تم بواسطة</th>
              <th className="px-3 py-2 text-right font-semibold">التاريخ والوقت</th>
            </tr>
          </thead>
          <tbody>
            {logsLoading ? (
              <tr><td colSpan={4} className="px-3 py-3 text-center text-gray-500">جاري التحميل...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-3 text-center text-gray-500">لا توجد سجلات</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700">{log.action}</td>
                  <td className="px-3 py-2 text-gray-700">{log.target_user_id || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{log.actor_id || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{log.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const tabs = [
    { key: 'users', label: 'قائمة المستخدمين' },
    { key: 'create', label: 'إنشاء / تعديل مستخدم' },
    { key: 'password', label: 'تغيير كلمة المرور' },
    { key: 'permissions', label: 'الصلاحيات' },
    { key: 'audit', label: 'سجل التدقيق' },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
      {authExpired && authErrorMsg && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {authErrorMsg} — الرجاء إعادة تسجيل الدخول من صفحة تسجيل الدخول.
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">إدارة المستخدمين</h1>
          <p className="text-sm text-gray-600 mt-1">الصفحة متاحة للأدمن فقط</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-2 rounded-lg text-sm border bg-white text-gray-700 border-gray-200 hover:bg-blue-50 disabled:opacity-60"
          >
            {exporting ? 'جارٍ التصدير...' : 'تصدير المستخدمين (CSV)'}
          </button>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 rounded-lg text-sm border ${activeTab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && renderUsersTable()}
      {activeTab === 'create' && renderCreateForm()}
      {activeTab === 'password' && renderPasswordForm()}
      {activeTab === 'permissions' && renderPermissions()}
      {activeTab === 'audit' && renderAudit()}

    </div>
  );
}
