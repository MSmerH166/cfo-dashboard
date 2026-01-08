import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import {
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { parseTrialBalanceData, buildHierarchy } from '../utils/trialBalanceUtils';
import { statementsAPI } from '../api/client';

const format = (v) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—');
const formatPct = (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—');

export default function ExecutiveReport() {
  const navigate = useNavigate();
  const { historicalIS, historicalBS, data2025, trialBalance } = useFinancial();
  const [saveState, setSaveState] = useState('idle');

  const currentYear = 2025;
  const prevYear = 2024;

  // Build hierarchy from trial balance (single source of truth when available)
  const { hierarchy, nodeIndex } = useMemo(() => {
    try {
      if (!trialBalance || trialBalance.length === 0) return { hierarchy: [], nodeIndex: new Map() };
      const parsed = parseTrialBalanceData(trialBalance);
      return buildHierarchy(parsed);
    } catch (e) {
      console.error('Hierarchy build failed in ExecutiveReport:', e);
      return { hierarchy: [], nodeIndex: new Map() };
    }
  }, [trialBalance]);

  const getAgg = (code) => {
    if (!nodeIndex?.get) return { debit: 0, credit: 0, balance: 0 };
    const n = nodeIndex.get(code);
    if (!n) return { debit: 0, credit: 0, balance: 0 };
    return {
      debit: n.aggDebit ?? n.debit ?? 0,
      credit: n.aggCredit ?? n.credit ?? 0,
      balance: n.aggBalance ?? n.balance ?? 0,
    };
  };
  const bal = (code) => getAgg(code).balance || 0;

  // Revenue breakdown (projects / other / capital gains) and totals
  const revenueProjects = Math.abs(bal('07001'));
  const revenueOther = Math.abs(bal('07002'));
  const revenueCapital = Math.abs(bal('07003'));
  const revenueTotalTB = Math.abs(bal('07'));

  // Costs breakdown
  const costOps = Math.abs(bal('0601'));
  const costAdmin = Math.abs(bal('0602'));
  const costDep = Math.abs(bal('0604'));
  const costZakat = Math.abs(bal('0605'));
  const costTotalTB = Math.abs(bal('06')) || (costOps + costAdmin + costDep + costZakat);

  // IS / BS current & previous
  const curIS = data2025?.is || {};
  const prevIS = historicalIS?.[prevYear] || {};
  const curBS = data2025?.bs || {};
  const prevBS = historicalBS?.[prevYear] || {};

  const curRevenue = revenueTotalTB || curIS.revenue || 0;
  const prevRevenue = prevIS.revenue || 0;
  const revenueGrowth = prevRevenue ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const curNetIncome = curIS.netIncome ?? (curRevenue - costTotalTB);
  const prevNetIncomeCalc = (prevIS.revenue || 0) - (prevIS.cogs || 0) - (prevIS.expenses || 0) - (prevIS.depreciation || 0) - (prevIS.zakat || 0);
  const netIncomeGrowth = prevNetIncomeCalc ? ((curNetIncome - prevNetIncomeCalc) / prevNetIncomeCalc) * 100 : 0;
  const netMargin = curRevenue ? (curNetIncome / curRevenue) * 100 : 0;

  // Operating margin approximation: (Revenue - COGS - Opex) / Revenue
  const grossProfit = curRevenue - costOps;
  const operatingProfit = grossProfit - costAdmin - costDep - costZakat;
  const operatingMargin = curRevenue ? (operatingProfit / curRevenue) * 100 : 0;

  // Cash flow approximation from BS deltas (indicative only)
  const cashCurrent = curBS.cashBank || 0;
  const cashPrev = prevBS.cashBank || 0;
  const cashChange = cashCurrent - cashPrev;
  const wcCur = (curBS.currentAssets || 0) - (curBS.currentLiabilities || 0);
  const wcPrev = (prevBS.currentAssets || 0) - (prevBS.currentLiabilities || 0);
  const wcChange = wcCur - wcPrev;
  const operatingCF = curNetIncome + (curIS.depreciation || costDep) - wcChange - (curIS.zakat || costZakat);
  const investingCF = -1 * ((curBS.propertyEquipment || 0) - (prevBS.propertyEquipment || 0));
  const financingCF = cashChange - operatingCF - investingCF;

  // Ratios
  const adminToRevenue = curRevenue ? (costAdmin / curRevenue) * 100 : 0;
  const costToRevenue = curRevenue ? (costTotalTB / curRevenue) * 100 : 0;
  const cashBurn = curRevenue ? (operatingCF / curRevenue) * 100 : 0;

  // Top 5 cost items (level >=3 under 06)
  const topCosts = useMemo(() => {
    if (!hierarchy || hierarchy.length === 0) return [];
    const items = [];
    nodeIndex?.forEach((node) => {
      if (!node?.code?.startsWith?.('06')) return;
      if (node.level < 3) return;
      const val = node.aggBalance ?? node.balance ?? 0;
      const abs = Math.abs(val);
      if (abs > 0) {
        items.push({ code: node.code, name: node.name, value: val, abs });
      }
    });
    return items.sort((a, b) => b.abs - a.abs).slice(0, 5);
  }, [hierarchy, nodeIndex]);

  // Insights & recommendations
  const insights = [];
  if (revenueGrowth > 0 && netMargin < 0) insights.push('نمو الإيرادات مع انخفاض الربحية يتطلب مراجعة التكاليف.');
  if (netMargin >= 15) insights.push('هامش صافي ربح قوي يدعم التوسع.');
  if (adminToRevenue > 15) insights.push('المصروفات الإدارية مرتفعة كنسبة من الإيراد (>15%).');
  if (operatingCF < 0) insights.push('التدفق التشغيلي سلبي، تحقق من رأس المال العامل والتحصيلات.');

  const recommendations = [];
  if (costOps > costAdmin && revenueGrowth < 0) recommendations.push('مراجعة عقود المشاريع والموردين لخفض تكلفة العمليات.');
  if (adminToRevenue > 12) recommendations.push('إعادة هيكلة المصروفات الإدارية بهدف خفضها 10-15%.');
  if (operatingCF < 0) recommendations.push('تحسين دورة التحصيل وتقليل المخزون لرفع التدفق التشغيلي.');
  if (topCosts.length > 0) recommendations.push(`مراجعة البنود الأعلى تكلفة: ${topCosts.slice(0, 3).map(i => i.code).join(', ')}`);

  const exportPDF = () => {
    const input = document.getElementById('exec-page');
    if (!input) return;
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save("executive_report.pdf");
    });
  };

  const go = (path) => () => navigate(path);

  return (
    <div id="exec-page" className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">التقرير التنفيذي</h1>
          <p className="text-gray-500 text-sm mt-1">تحليل مالي عميق مرتبط بميزان المراجعة (2025)</p>
          <p className="text-gray-600 text-xs mt-1">Haitham Saqr – CFO, Bonyan</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={async () => {
              try {
                setSaveState('saving');
                await statementsAPI.save({
                  statementType: 'executive_report',
                  year: 2025,
                  data: {
                    summary: {
                      revenue: curRevenue,
                      netIncome: curNetIncome,
                      netMargin,
                      revenueGrowth,
                      netIncomeGrowth,
                      cashChange,
                      operatingCF,
                      investingCF,
                      financingCF,
                    },
                    revenueBreakdown,
                    costBreakdown,
                    kpis,
                    weaknesses,
                    strengths,
                    recommendations,
                  },
                });
                setSaveState('ok');
                setTimeout(() => setSaveState('idle'), 3000);
              } catch (e) {
                console.error('Save executive report error', e);
                setSaveState('error');
                setTimeout(() => setSaveState('idle'), 4000);
              }
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'جاري الحفظ...' : 'حفظ في قاعدة البيانات'}
          </button>
          {saveState === 'ok' && <span className="text-sm text-emerald-600">تم الحفظ</span>}
          {saveState === 'error' && <span className="text-sm text-red-600">تعذر الحفظ</span>}
          <button onClick={exportPDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download size={18} />
            <span>تصدير PDF</span>
          </button>
          <button onClick={go('/trial-balance')} className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
            <BarChart3 size={16} />
            <span>ميزان المراجعة</span>
          </button>
          <button onClick={go('/analysis')} className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
            <Activity size={16} />
            <span>التحليل المالي</span>
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-blue-500">
          <div className="text-gray-500 mb-2">الإيرادات</div>
          <div className="text-3xl font-bold text-gray-800">{format(curRevenue)}</div>
          <div className={`text-sm mt-1 flex items-center gap-1 ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {revenueGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatPct(revenueGrowth)} عن العام السابق
          </div>
          <div className="mt-3 text-xs text-gray-500">
            المشاريع: {format(revenueProjects)} • أخرى: {format(revenueOther)} • رأسمالية: {format(revenueCapital)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-green-500">
          <div className="text-gray-500 mb-2">صافي الربح</div>
          <div className="text-3xl font-bold text-gray-800">{format(curNetIncome)}</div>
          <div className="text-sm mt-1 text-gray-600">هامش صافي: {formatPct(netMargin)}</div>
          <div className={`text-sm mt-1 flex items-center gap-1 ${netIncomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netIncomeGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatPct(netIncomeGrowth)} عن العام السابق
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-purple-500">
          <div className="text-gray-500 mb-2">صافي التدفق النقدي (تقديري)</div>
          <div className="text-3xl font-bold text-gray-800">{format(cashChange)}</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span>تشغيلي</span><span className={operatingCF >= 0 ? 'text-green-600' : 'text-red-600'}>{format(operatingCF)}</span></div>
            <div className="flex justify-between"><span>استثماري</span><span className={investingCF >= 0 ? 'text-green-600' : 'text-red-600'}>{format(investingCF)}</span></div>
            <div className="flex justify-between"><span>تمويلي</span><span className={financingCF >= 0 ? 'text-green-600' : 'text-red-600'}>{format(financingCF)}</span></div>
          </div>
        </div>
      </div>

      {/* Cost and revenue distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">توزيع الإيرادات</h3>
            <span className="text-xs text-gray-500">مصدر واحد للبيانات: ميزان المراجعة (07)</span>
          </div>
          <div className="space-y-2">
            {[{ label: 'المشاريع', val: revenueProjects, color: 'bg-blue-500' },
              { label: 'إيرادات أخرى', val: revenueOther, color: 'bg-emerald-500' },
              { label: 'أرباح رأسمالية', val: revenueCapital, color: 'bg-purple-500' }].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{item.label}</span><span className="font-mono">{format(item.val)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded">
                    <div className={`h-2 rounded ${item.color}`} style={{ width: `${curRevenue ? Math.min((item.val / curRevenue) * 100, 100) : 0}%` }} />
                  </div>
                </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">توزيع التكاليف</h3>
            <span className="text-xs text-gray-500">مصدر: ميزان المراجعة (06)</span>
          </div>
          <div className="space-y-2">
            {[{ label: 'تشغيلية (0601)', val: costOps, color: 'bg-rose-500' },
              { label: 'إدارية (0602)', val: costAdmin, color: 'bg-orange-500' },
              { label: 'إهلاك (0604)', val: costDep, color: 'bg-indigo-500' },
              { label: 'زكاة/ضريبة (0605)', val: costZakat, color: 'bg-amber-500' }].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{item.label}</span><span className="font-mono">{format(item.val)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded">
                    <div className={`h-2 rounded ${item.color}`} style={{ width: `${costTotalTB ? Math.min((item.val / costTotalTB) * 100, 100) : 0}%` }} />
                  </div>
                </div>
            ))}
          </div>
          <div className="mt-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">أعلى 5 بنود تكلفة</h4>
            {topCosts.length === 0 ? (
              <div className="text-xs text-gray-500">لا توجد بيانات مفصلة كافية.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {topCosts.map((c) => (
                  <li key={c.code} className="flex justify-between">
                    <span className="text-gray-700">{c.code} - {c.name}</span>
                    <span className={`font-mono ${c.value >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{format(c.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Ratios */}
      <div className="bg-white p-5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">المؤشرات المالية</h3>
          <span className="text-xs text-gray-500">المصدر: IS + BS + TB</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'هامش صافي الربح', value: netMargin, good: netMargin >= 10 },
            { label: 'هامش تشغيلي', value: operatingMargin, good: operatingMargin >= 12 },
            { label: 'مصروفات إدارية / إيرادات', value: adminToRevenue, good: adminToRevenue <= 12 },
            { label: 'التكاليف / الإيرادات', value: costToRevenue, good: costToRevenue <= 70 },
            { label: 'حرق/توليد نقد تشغيلي', value: cashBurn, good: cashBurn >= 0 },
            { label: 'نمو الإيرادات', value: revenueGrowth, good: revenueGrowth >= 0 },
          ].map((r) => (
            <div key={r.label} className={`p-4 rounded-lg border ${r.good ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
              <div className="text-sm text-gray-600">{r.label}</div>
              <div className="text-xl font-bold text-gray-800 mt-1">{formatPct(r.value)}</div>
              <div className="text-xs mt-1 text-gray-500">
                {r.good ? 'ضمن النطاق المقبول' : 'يحتاج إلى تحسّن'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights & recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-green-700">
            <TrendingUp />
            <h3 className="font-bold text-lg">نقاط القوة / الضعف</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {insights.length === 0 ? (
              <li className="text-gray-500">لا توجد نقاط بارزة حتى الآن.</li>
            ) : insights.map((i, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                <span className="text-gray-700">{i}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border-blue-100 border">
          <div className="flex items-center gap-2 mb-3 text-blue-800">
            <Target />
            <h3 className="font-bold text-lg">التوصيات الإدارية</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {recommendations.length === 0 ? (
              <li className="text-gray-500">لا توجد توصيات محددة.</li>
            ) : recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold mt-0.5 shrink-0">{idx + 1}</span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-gray-500">
            كل التوصيات تعتمد على أرقام ميزان المراجعة وقائمة الدخل لعام {currentYear}.
          </div>
        </div>
      </div>
    </div>
  );
}
