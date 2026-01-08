import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, LineChart, Shield, LayoutGrid, Sparkles } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import CursorAnalyticsParticles from '../components/CursorAnalyticsParticles';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data2025, historicalIS } = useFinancial();

  const kpis = useMemo(() => {
    const rev2025 = data2025?.is?.revenue || 0;
    const net2025 = data2025?.is?.netIncome || 0;
    const rev2024 = historicalIS?.[2024]?.revenue || 0;
    const net2024 = historicalIS?.[2024]?.netIncome || 0;
    const yoyRev = rev2024 ? ((rev2025 - rev2024) / rev2024) * 100 : 0;
    const yoyNet = net2024 ? ((net2025 - net2024) / net2024) * 100 : 0;
    const netMargin = rev2025 ? (net2025 / rev2025) * 100 : 0;
    return { rev2025, net2025, yoyRev, yoyNet, netMargin };
  }, [data2025, historicalIS]);

  const menuItems = [
    { title: "قائمة الدخل", path: "/income-statement" },
    { title: "قائمة المركز المالي", path: "/balance-sheet" },
    { title: "التدفقات النقدية", path: "/cash-flow" },
    { title: "ميزان المراجعة", path: "/trial-balance" },
    { title: "التقرير التنفيذي", path: "/executive-report" },
    { title: "إدارة المستخدمين", path: "/admin-users" }
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#0d1533] via-[#0c1d46] to-[#0f2555] text-white p-8 md:p-10 shadow-xl border border-white/5">
        <CursorAnalyticsParticles />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white,transparent_25%),radial-gradient(circle_at_80%_0%,white,transparent_25%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              لوحة القيادة الذكية
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">نظام التحليل المالي لشركة بنيان</h1>
              <p className="text-blue-100 text-lg mt-3">مرحباً بعودتك، كل التقارير المالية في مكان واحد مع تنقل سريع بين الصفحات.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/trial-balance')}
                className="px-5 py-3 rounded-xl bg-white text-blue-900 font-semibold hover:-translate-y-0.5 transition shadow-lg shadow-blue-900/20"
              >
                الانتقال لميزان المراجعة
              </button>
              <button
                onClick={() => navigate('/admin-users')}
                className="px-5 py-3 rounded-xl bg-white/10 border border-white/30 text-white font-semibold hover:bg-white/15 transition"
              >
                إدارة المستخدمين
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            {[
              { icon: PieChart, label: 'قوائم جاهزة', value: '6' },
              { icon: LineChart, label: 'مؤشرات أساسية', value: '24' },
              { icon: Shield, label: 'أمان الجلسة', value: 'مفعّل' },
              { icon: LayoutGrid, label: 'قوالب', value: 'COA & TB' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl bg-white/10 border border-white/15 p-4 shadow-lg backdrop-blur-sm">
                <card.icon className="w-5 h-5 text-white/80 mb-2" />
                <p className="text-sm text-blue-100">{card.label}</p>
                <p className="text-xl font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إيرادات 2025', value: kpis.rev2025, suffix: 'ريال', color: 'bg-blue-50 text-blue-800' },
          { label: 'صافي ربح 2025', value: kpis.net2025, suffix: 'ريال', color: 'bg-green-50 text-green-800' },
          { label: 'نمو الإيرادات (YOY)', value: kpis.yoyRev, suffix: '%', color: 'bg-purple-50 text-purple-800' },
          { label: 'هامش صافي الربح', value: kpis.netMargin, suffix: '%', color: 'bg-emerald-50 text-emerald-800' },
        ].map((card) => (
          <div key={card.label} className={`p-4 rounded-2xl border border-gray-100 shadow-sm ${card.color} flex flex-col gap-2`}>
            <span className="text-sm font-medium">{card.label}</span>
            <span className="text-2xl font-bold font-mono">
              {card.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{card.suffix ? ` ${card.suffix}` : ''}
            </span>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {menuItems.map((item) => (
          <div
            key={item.title}
            onClick={() => navigate(item.path)}
            className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-l from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <h3 className="font-bold text-xl text-gray-800 group-hover:text-blue-800 transition-colors">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-2">اضغط للانتقال مباشرة إلى الصفحة</p>
              <div className="mt-5 inline-flex items-center gap-2 text-blue-700 font-semibold">
                <span>فتح الصفحة</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
