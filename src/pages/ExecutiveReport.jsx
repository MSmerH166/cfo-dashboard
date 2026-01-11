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

      {/* التحليل المالي (رقمي بدون رسوم) */}
      {(() => {
        const toneBadge = (tone, text) => {
          const map = {
            green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            yellow: 'bg-amber-50 text-amber-700 border border-amber-200',
            red: 'bg-rose-50 text-rose-700 border border-rose-200',
            gray: 'bg-gray-50 text-gray-700 border border-gray-200',
          };
          return <span className={`px-2 py-1 rounded text-xs font-semibold ${map[tone] || map.gray}`}>{text}</span>;
        };
        const pctChange = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : 0);
        const dir = (v) => (v > 0 ? '↑' : v < 0 ? '↓' : '↔');
        const fmtPct = (v) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;
        const fmt = (v) => format(v);

        const curGross = curIS?.grossProfit ?? (curIS?.revenue ?? curRevenue) - (curIS?.cogs ?? costOps);
        const prevGross = prevIS?.grossProfit ?? (prevIS?.revenue ?? prevRevenue) - (prevIS?.cogs ?? prevIS?.cogs ?? 0);
        const curOp = curIS?.mainOpsProfit ?? (curGross - (curIS?.expenses ?? costAdmin) - (curIS?.depreciation ?? costDep) - (curIS?.zakat ?? costZakat));
        const prevOp = prevIS?.mainOpsProfit ?? ((prevIS?.grossProfit ?? prevGross) - (prevIS?.expenses ?? 0) - (prevIS?.depreciation ?? 0) - (prevIS?.zakat ?? 0));

        const summaryRows = [
          { label: 'الإيرادات', cur: curRevenue, prev: prevRevenue },
          { label: 'مجمل الربح', cur: curGross, prev: prevGross },
          { label: 'الربح التشغيلي', cur: curOp, prev: prevOp },
          { label: 'صافي الربح / الخسارة', cur: curNetIncome, prev: prevNetIncomeCalc },
        ].map((r) => {
          const change = pctChange(r.cur, r.prev);
          const tone = r.cur < 0 ? 'red' : change >= 0 ? 'green' : 'yellow';
          const comment = (() => {
            if (!Number.isFinite(change)) return 'لا توجد بيانات مقارنة كافية.';
            if (r.label.includes('صافي الربح') && change < 0) {
              return `صافي الربح انخفض بنسبة ${fmtPct(change)} بسبب ضغط التكاليف أو المصاريف التشغيلية.`;
            }
            return change >= 0 ? 'اتجاه إيجابي' : 'اتجاه يحتاج متابعة';
          })();
          return { ...r, change, tone, dir: dir(change), comment };
        });

        const marginRows = [
          {
            label: 'Gross Margin',
            value: curRevenue ? (curGross / curRevenue) * 100 : 0,
            eval: (v) => (v < 0 ? 'red' : v < 10 ? 'yellow' : 'green'),
            meaning: 'كفاءة التسعير والتنفيذ',
          },
          {
            label: 'Operating Margin',
            value: curRevenue ? (curOp / curRevenue) * 100 : 0,
            eval: (v) => (v < 0 ? 'red' : v < 10 ? 'yellow' : 'green'),
            meaning: 'كفاءة التشغيل',
          },
          {
            label: 'Net Profit Margin',
            value: curRevenue ? (curNetIncome / curRevenue) * 100 : 0,
            eval: (v) => (v < 0 ? 'red' : v < 10 ? 'yellow' : 'green'),
            meaning: 'الربحية النهائية',
          },
        ];

        const costToRevenue = curRevenue ? (costTotalTB / curRevenue) * 100 : 0;
        const adminToRevenuePct = curRevenue ? (costAdmin / curRevenue) * 100 : 0;
        const adminToGrossPct = curGross ? (costAdmin / curGross) * 100 : 0;

        const currentAssets = curBS?.currentAssets ?? 0;
        const currentLiabilities = curBS?.currentLiabilities ?? 0;
        const quickAssets = (curBS?.cashBank ?? 0) + (curBS?.receivables ?? 0);
        const totalLiabilities = curBS?.totalLiabilities ?? (curBS?.currentLiabilities ?? 0) + (curBS?.nonCurrentLiabilities ?? 0);
        const equityTotal = curBS?.equityTotal ?? curBS?.equity ?? 0;
        const totalAssets = curBS?.totalAssets ?? (equityTotal + totalLiabilities);
        const workingCapital = currentAssets - currentLiabilities;

        const liquidityRows = [
          {
            label: 'Current Ratio',
            value: currentLiabilities ? currentAssets / currentLiabilities : 0,
            eval: (v) => (v < 1 ? 'red' : v < 1.5 ? 'yellow' : v >= 2 ? 'green' : 'yellow'),
            note: 'قدرة السداد قصيرة الأجل',
          },
          {
            label: 'Quick Ratio',
            value: currentLiabilities ? quickAssets / currentLiabilities : 0,
            eval: (v) => (v < 1 ? 'red' : v < 1.5 ? 'yellow' : v >= 2 ? 'green' : 'yellow'),
            note: 'سيولة فعلية (نقد + عملاء)',
          },
          {
            label: 'Working Capital',
            value: workingCapital,
            eval: (v) => (v < 0 ? 'red' : 'green'),
            note: 'الأصول المتداولة – الخصوم المتداولة',
          },
        ];

        const solvencyRows = [
          {
            label: 'Debt to Equity',
            value: equityTotal ? (totalLiabilities / equityTotal) : 0,
            eval: (v) => (v > 1.5 ? 'red' : v > 1 ? 'yellow' : 'green'),
            note: 'اعتماد على الديون',
          },
          {
            label: 'Debt Ratio',
            value: totalAssets ? (totalLiabilities / totalAssets) : 0,
            eval: (v) => (v > 0.6 ? 'red' : v > 0.45 ? 'yellow' : 'green'),
            note: 'إجمالي الخصوم ÷ إجمالي الأصول',
          },
        ];

        const retained = curBS?.retainedEarnings ?? 0;
        const capital = curBS?.equityCapital ?? 0;
        const reserves = curBS?.equityStatutoryReserve ?? 0;
        const roe = equityTotal ? (curNetIncome / equityTotal) * 100 : 0;

        // Trial balance checks
        let totalDebit = 0;
        let totalCredit = 0;
        const debitAccounts = [];
        const creditAccounts = [];
        nodeIndex?.forEach((node) => {
          const d = node?.aggDebit ?? node?.debit ?? 0;
          const c = node?.aggCredit ?? node?.credit ?? 0;
          const bal = node?.aggBalance ?? node?.balance ?? 0;
          totalDebit += d;
          totalCredit += c;
          if (bal > 0) debitAccounts.push({ code: node.code, name: node.name, val: bal });
          if (bal < 0) creditAccounts.push({ code: node.code, name: node.name, val: bal });
        });
        debitAccounts.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
        creditAccounts.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

        const tbDiff = Math.abs(totalDebit - totalCredit);

        const cashConversion = curNetIncome ? (operatingCF / curNetIncome) * 100 : 0;
        const equityChange = (equityTotal - (prevBS?.equityTotal ?? prevBS?.equity ?? 0));
        const profitVsEquity = equityChange - curNetIncome;

        const finalComment = (() => {
          const parts = [];
          if (curNetIncome < 0) parts.push('الشركة حققت خسارة صافية خلال السنة الحالية.');
          if (costToRevenue > 100) parts.push('تكلفة الإيرادات تتجاوز الإيرادات مما يضغط الربحية.');
          if (operatingMargin < 0) parts.push('الهامش التشغيلي سلبي نتيجة ارتفاع المصاريف.');
          if (liquidityRows[0].value < 1) parts.push('مؤشر السيولة الحالي أقل من 1 مما يعكس ضغط سيولة.');
          if (parts.length === 0) return 'النتائج مستقرة إجمالاً مع هوامش مقبولة.';
          return parts.join(' ');
        })();

        const renderTable = (title, rows, isPct = false, hasPrev = true) => (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">{title}</h3>
              <span className="text-xs text-gray-500">تقييم رقمي بدون رسوم</span>
          </div>
            <div className="overflow-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="py-2 text-right">المؤشر</th>
                    <th className="py-2 text-center">السنة الحالية</th>
                    {hasPrev && <th className="py-2 text-center">السنة السابقة</th>}
                    {hasPrev && <th className="py-2 text-center">التغير %</th>}
                    <th className="py-2 text-center">التقييم</th>
                    <th className="py-2 text-left">تعليق مختصر</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const change = hasPrev ? pctChange(r.cur ?? r.value, r.prev ?? 0) : null;
                    const val = r.cur ?? r.value ?? 0;
                    const tone = typeof r.eval === 'function' ? r.eval(val) : r.tone || 'gray';
                    const comment = r.comment || r.note || '';
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 font-medium text-gray-800">{r.label}</td>
                        <td className="py-2 text-center font-mono">{isPct || r.isPct ? fmtPct(val) : fmt(val)}</td>
                        {hasPrev && <td className="py-2 text-center font-mono">{r.prev !== undefined ? (isPct || r.isPct ? fmtPct(r.prev) : fmt(r.prev)) : '—'}</td>}
                        {hasPrev && <td className="py-2 text-center font-mono">{Number.isFinite(change) ? fmtPct(change) : '—'}</td>}
                        <td className="py-2 text-center">{toneBadge(tone, tone === 'green' ? '🟢' : tone === 'yellow' ? '🟡' : tone === 'red' ? '🔴' : '—')}</td>
                        <td className="py-2 text-left text-xs text-gray-700">{comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                </div>
          </div>
        );

        return (
          <div className="space-y-6">
            {renderTable('ملخص الإدارة (60 ثانية)', summaryRows.map(r => ({
              label: r.label,
              cur: r.cur,
              prev: r.prev,
              comment: r.comment,
              eval: () => r.tone,
            })), false, true)}

            {renderTable('مؤشرات الربحية الأساسية', marginRows.map(m => ({
              label: m.label,
              cur: m.value,
              prev: prevRevenue ? (m.label === 'Gross Margin' ? ((prevGross / (prevRevenue || 1)) * 100) : m.label === 'Operating Margin' ? ((prevOp / (prevRevenue || 1)) * 100) : ((prevNetIncomeCalc / (prevRevenue || 1)) * 100)) : 0,
              comment: m.label.includes('Net') && m.value < 0 ? 'خسائر تشغيلية/نهائية' : m.label.includes('Gross') && m.value < 10 ? 'ضغط تكاليف' : m.meaning,
              eval: m.eval,
              isPct: true,
            })), true, true)}

            {renderTable('تحليل التكلفة والمصاريف', [
              {
                label: 'Cost to Revenue Ratio',
                cur: costToRevenue,
                prev: prevRevenue ? ((prevIS?.cogs ?? 0) / (prevRevenue || 1)) * 100 : 0,
                comment: `كل 1 ريال إيراد يكلف الشركة ${(costToRevenue / 100).toFixed(2)} ريال تنفيذ.`,
                eval: (v) => (v > 100 ? 'red' : v > 80 ? 'yellow' : 'green'),
                isPct: true,
              },
              {
                label: 'المصاريف الإدارية ÷ الإيرادات',
                cur: adminToRevenuePct,
                prev: prevRevenue ? ((prevIS?.expenses ?? 0) / (prevRevenue || 1)) * 100 : 0,
                comment: adminToRevenuePct > 20 ? 'المصاريف تلتهم جزءًا كبيرًا من الربح' : 'مستوى مقبول',
                eval: (v) => (v > 25 ? 'red' : v > 15 ? 'yellow' : 'green'),
                isPct: true,
              },
              {
                label: 'المصاريف الإدارية ÷ مجمل الربح',
                cur: adminToGrossPct,
                prev: prevGross ? ((prevIS?.expenses ?? 0) / prevGross) * 100 : 0,
                comment: adminToGrossPct > 40 ? 'مصروفات مرتفعة مقابل مجمل الربح' : 'مقبول',
                eval: (v) => (v > 50 ? 'red' : v > 35 ? 'yellow' : 'green'),
                isPct: true,
              },
            ], true, true)}

            {renderTable('السيولة ورأس المال العامل', liquidityRows.map(r => ({
              label: r.label,
              cur: r.value,
              prev: null,
              comment: r.note,
              eval: r.eval,
              isPct: r.label !== 'Working Capital',
            })), false, false)}

            {renderTable('الملاءة المالية', solvencyRows.map(r => ({
              label: r.label,
              cur: r.value * 100,
              prev: null,
              comment: r.note,
              eval: r.eval,
              isPct: true,
            })), true, false)}

            {renderTable('حقوق الملكية', [
              { label: 'صافي الربح المرحل', cur: retained, prev: prevBS?.retainedEarnings ?? 0, comment: 'أرباح/خسائر متراكمة', eval: (v) => (v < 0 ? 'red' : 'green') },
              { label: 'رأس المال', cur: capital, prev: prevBS?.equityCapital ?? 0, comment: 'هيكل رأس المال', eval: () => 'gray' },
              { label: 'الاحتياطيات', cur: reserves, prev: prevBS?.equityStatutoryReserve ?? 0, comment: 'احتياطي نظامي / اختياري', eval: () => 'gray' },
              { label: 'ROE', cur: roe, prev: prevIS?.netIncome && (prevBS?.equityTotal ?? prevBS?.equity ?? 0) ? (prevIS?.netIncome / (prevBS?.equityTotal ?? prevBS?.equity ?? 1)) * 100 : 0, comment: 'عائد حقوق الملكية', eval: (v) => (v < 0 ? 'red' : v < 10 ? 'yellow' : 'green'), isPct: true },
            ], false, true)}

            {renderTable('صحة ميزان المراجعة', [
              { label: 'إجمالي المدين', cur: totalDebit, prev: null, comment: 'يجب أن يساوي الدائن', eval: () => (tbDiff === 0 ? 'green' : 'red') },
              { label: 'إجمالي الدائن', cur: totalCredit, prev: null, comment: 'يجب أن يساوي المدين', eval: () => (tbDiff === 0 ? 'green' : 'red') },
              { label: 'فرق المدين/الدائن', cur: tbDiff, prev: null, comment: tbDiff === 0 ? 'مطابق' : 'يحتاج تسوية', eval: () => (tbDiff === 0 ? 'green' : 'red') },
            ], false, false)}

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">تركّز الأرصدة (أعلى 5)</h3>
                <span className="text-xs text-gray-500">بدون رسوم بيانية</span>
          </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">أكبر حسابات مدينة</h4>
                  <ul className="space-y-1">
                    {debitAccounts.slice(0, 5).map((a) => (
                      <li key={a.code} className="flex justify-between">
                        <span className="text-gray-700">{a.code} - {a.name}</span>
                        <span className="font-mono text-gray-800">{fmt(Math.abs(a.val))}</span>
                      </li>
                    ))}
                    {debitAccounts.length === 0 && <li className="text-gray-500 text-xs">لا توجد بيانات</li>}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">أكبر حسابات دائنة</h4>
                  <ul className="space-y-1">
                    {creditAccounts.slice(0, 5).map((a) => (
                      <li key={a.code} className="flex justify-between">
                        <span className="text-gray-700">{a.code} - {a.name}</span>
                        <span className="font-mono text-gray-800">{fmt(Math.abs(a.val))}</span>
                  </li>
                ))}
                    {creditAccounts.length === 0 && <li className="text-gray-500 text-xs">لا توجد بيانات</li>}
              </ul>
          </div>
        </div>
      </div>

            {renderTable('الربط بين القوائم', [
              { label: 'Cash Conversion (OCF ÷ Net Income)', cur: cashConversion, prev: null, comment: cashConversion < 0 ? 'ربح ورقي/ضغط سيولة' : 'تحول نقدي جيد', eval: (v) => (v < 0 ? 'red' : v < 80 ? 'yellow' : 'green'), isPct: true },
              { label: 'التغير في حقوق الملكية – صافي الربح', cur: profitVsEquity, prev: null, comment: profitVsEquity < 0 ? 'حقوق الملكية لا تعكس الربح (توزيعات/خسائر)' : 'متوافق مع الربح', eval: (v) => (v < 0 ? 'yellow' : 'green') },
            ], false, false)}

            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm leading-6">
              <div className="font-bold mb-1">تفسير نهائي آلي</div>
              <p>{finalComment}</p>
              <div className="mt-2">
                🔧 اقتراح تنفيذي: خفّض تكلفة الإيرادات والمصاريف التشغيلية لتحسين الهوامش، وراقب السيولة عبر رفع Current Ratio لأعلى من 1.5.
              </div>
            </div>
        </div>
        );
      })()}

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
