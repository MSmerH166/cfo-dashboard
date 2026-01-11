import React, { useMemo, useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { statementsAPI } from '../api/client';
import { parseTrialBalanceData, buildHierarchy } from '../utils/trialBalanceUtils';

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020];
const COLORS = ['#2563eb', '#22c55e'];

const formatCurrency = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return '';
  const str = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return num < 0 ? `(${str})` : str;
};

// مختصر الأرقام للاستخدام في المحاور/التولتيب
const formatShortNumber = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return '';
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(1);
};

const parseNumber = (val) => {
  if (!val) return 0;
  const hasParens = val.includes('(') || val.includes(')');
  const cleaned = val.replace(/[(),\s]/g, '').replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return hasParens ? -parsed : parsed;
};

const OVERRIDE_BS_KEY = 'bsOverride2025';
const loadOverrideBS2025 = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(OVERRIDE_BS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load BS override 2025', e);
  }
  return {};
};

export default function BalanceSheet() {
  const { historicalBS, updateHistoricalBS, data2025, historicalIS, trialBalance } = useFinancial();
  const [override2025, setOverride2025] = useState(loadOverrideBS2025);
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState({
    assets: true,
    liabilities: true,
  });
  const [saveState, setSaveState] = useState('idle'); // idle | saving | ok | error

  const renderGlCodeCell = (code) => (
    <td className="p-2 text-center text-[11px] sm:text-xs text-gray-700">
      {typeof code === 'string' && code.trim() ? code : '-'}
    </td>
  );

  const tbComputed2025 = useMemo(() => {
    if (!trialBalance || trialBalance.length === 0) return null;
    try {
      const sumByPrefix = (prefix) => {
        const pfx = String(prefix || '').trim();
        if (!pfx) return 0;
        return trialBalance.reduce((sum, row) => {
          const code = (row.glCode || row.code || row.accountCode || '').toString();
          if (!code.startsWith(pfx)) return sum;
          const val =
            Number(row['2025']) ??
            Number(row.amountsByYear?.['2025']) ??
            Number(row.amounts?.[2025]) ??
            Number(row.value) ??
            Number(row.balance) ??
            0;
          return sum + (Number.isFinite(val) ? val : 0);
        }, 0);
      };

      const sumExpr = (expr = []) =>
        expr.reduce((acc, { prefix, sign = 1 }) => acc + sign * sumByPrefix(prefix), 0);

      // 02* - 0402* (مجمع الإهلاك يُطرح كمطلق)
      const propertyEquipment = sumByPrefix('02') - Math.abs(sumByPrefix('0402'));
      const contractAssets = sumExpr([{ prefix: '0103' }, { prefix: '01090201' }]);
      const receivables = sumExpr([{ prefix: '0102' }, { prefix: '010801' }, { prefix: '010802' }, { prefix: '0105' }]);
      const advancesOther = sumExpr([
        { prefix: '0104' },
        { prefix: '010901' },
        { prefix: '010702' },
        { prefix: '010701' },
        { prefix: '010903' },
        { prefix: '0106' },
      ]);
      const cashBank = sumExpr([{ prefix: '010101' }, { prefix: '010102' }]);
      const equityCapital = Math.abs(sumExpr([{ prefix: '0501' }]));
      const equityStatutoryReserve = Math.abs(sumExpr([{ prefix: '0502' }]));
      const retainedEarnings = sumExpr([{ prefix: '050402' }, { prefix: '050403' }]);
      const employeeBenefits = Math.abs(sumExpr([{ prefix: '0401' }]));
      const relatedPartyPayables = Math.abs(sumExpr([{ prefix: '0503' }]));
      const contractLiabilities = Math.abs(sumExpr([{ prefix: '0305' }]));
      const payables = Math.abs(sumExpr([{ prefix: '0301' }, { prefix: '0302' }, { prefix: '0304' }]));
      const otherCurrentLiabilities = Math.abs(sumExpr([{ prefix: '030801' }, { prefix: '0307' }, { prefix: '0308' }, { prefix: '0309' }]));
      const zakatTax = Math.abs(sumExpr([{ prefix: '03080104' }, { prefix: '0306' }]));

      const currentAssets = contractAssets + receivables + advancesOther + cashBank;
      const nonCurrentAssets = propertyEquipment;
      const nonCurrentLiabilities = employeeBenefits;
      const currentLiabilities = relatedPartyPayables + contractLiabilities + payables + otherCurrentLiabilities + zakatTax;
      const totalLiabilities = nonCurrentLiabilities + currentLiabilities;
      const equityTotal = equityCapital + equityStatutoryReserve + retainedEarnings;
      const totalAssets = currentAssets + nonCurrentAssets;
      const totalEquityLiabilities = equityTotal + totalLiabilities;

      return {
        propertyEquipment,
        nonCurrentAssets,
        contractAssets,
        receivables,
        advancesOther,
        cashBank,
        currentAssets,
        totalAssets,
        equityCapital,
        equityStatutoryReserve,
        retainedEarnings,
        equityTotal,
        employeeBenefits,
        nonCurrentLiabilities,
        relatedPartyPayables,
        contractLiabilities,
        payables,
        otherCurrentLiabilities,
        zakatTax,
        currentLiabilities,
        totalLiabilities,
        totalEquityLiabilities,
        workingCapital: currentAssets - currentLiabilities,
      };
    } catch (e) {
      console.warn('Failed to compute BS from trial balance', e);
      return null;
    }
  }, [trialBalance]);
  const sectionStyles = {
    assets: {
      bg: 'bg-gradient-to-l from-blue-50 via-white to-blue-100',
      text: 'text-blue-900',
      badge: 'bg-blue-600',
      border: 'border-blue-200',
    },
    liabilities: {
      bg: 'bg-gradient-to-l from-purple-50 via-white to-purple-100',
      text: 'text-purple-900',
      badge: 'bg-purple-600',
      border: 'border-purple-200',
    },
  };

  const getBS = (year) =>
    year === 2025
      ? { ...((tbComputed2025 || data2025?.bs) || {}), ...override2025 }
      : historicalBS[year] || {};

  // Helper aggregators must be declared before useMemo hooks that call them
  const aggregateCA = (bsYear = {}) => {
    const keys = ['cashBank', 'receivables', 'advancesOther', 'inventory', 'contractAssets'];
    return keys.reduce((sum, k) => sum + (bsYear[k] || 0), 0);
  };

  const aggregateCL = (bsYear = {}) => {
    const keys = ['payables', 'otherCurrentLiabilities', 'zakatTax', 'contractLiabilities', 'relatedPartyPayables'];
    return keys.reduce((sum, k) => sum + (bsYear[k] || 0), 0);
  };

  const getBSRaw = (year) =>
    year === 2025
      ? { ...(data2025?.bs || {}), ...override2025 }
      : historicalBS?.[year] || {};

  const getIS = (year) => (year === 2025 ? data2025?.is || {} : historicalIS?.[year] || {});

  const metricsByYear = useMemo(() => {
    const result = YEARS.reduce((acc, year) => {
      const bsRaw = getBSRaw(year);
      const currentAssets = aggregateCA(bsRaw);
      const currentLiabilities = aggregateCL(bsRaw);
      const accumulatedDepreciation = bsRaw.accumulatedDepreciation ?? bsRaw.accumDep ?? 0;
      const nonCurrentAssets = (bsRaw.propertyEquipment || 0) - (accumulatedDepreciation || 0) + (bsRaw.otherNonCurrentAssets || 0);
      const equityTotal =
        (bsRaw.equityCapital || 0) + (bsRaw.equityStatutoryReserve || 0) + (bsRaw.retainedEarnings || 0);
      // المطلوبات غير المتداولة = التزامات المنافع + أي مطلوبات غير متداولة أخرى
      const nonCurrentLiabilities = (bsRaw.employeeBenefits || 0) + (bsRaw.nonCurrentLiabilities || 0);
      const totalAssets = currentAssets + nonCurrentAssets;
      const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
      const totalEquityLiabilities = equityTotal + totalLiabilities;
      const workingCapital = currentAssets - currentLiabilities;

      acc[year] = {
        ...bsRaw,
        currentAssets,
        currentLiabilities,
        nonCurrentAssets,
        accumulatedDepreciation,
        totalAssets,
        equityTotal,
        nonCurrentLiabilities,
        totalLiabilities,
        totalEquityLiabilities,
        workingCapital,
      };
      return acc;
    }, {});
    return result;
  }, [historicalBS, data2025, override2025]);


  const allYearsData = YEARS.map((year) => ({ year, ...metricsByYear[year] }));
  const ratios = useMemo(() => {
    const y = metricsByYear[2025] || {};
    const wc = (y.currentAssets || 0) - (y.currentLiabilities || 0);
    const currentRatio = y.currentLiabilities ? (y.currentAssets || 0) / y.currentLiabilities : 0;
    const quickRatio = y.currentLiabilities ? ((y.cashBank || 0) + (y.receivables || 0)) / y.currentLiabilities : 0;
    const debtToEquity =
      y.equityTotal && y.equityTotal !== 0 ? (y.totalLiabilities || 0) / y.equityTotal : 0;
    const debtToAssets = y.totalAssets ? (y.totalLiabilities || 0) / y.totalAssets : 0;

    const badge = (val, goodAbove = true, mid = 1) => {
      const ok = goodAbove ? val >= mid : val <= mid;
      return ok ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200';
    };

    const interpret = (label, val) => {
      if (label === 'wc') return val > 0 ? 'السيولة التشغيلية إيجابية' : 'السيولة التشغيلية بحاجة دعم';
      if (label === 'cr')
        return val >= 1.5 ? 'ممتازة' : val >= 1 ? 'مقبولة' : 'دون المستوى المطلوب';
      if (label === 'qr')
        return val >= 1 ? 'جيدة' : val >= 0.8 ? 'مقبولة' : 'منخفضة';
      if (label === 'dte')
        return val <= 1 ? 'مستوى مديونية آمن' : val <= 2 ? 'متوسط المخاطر' : 'مديونية مرتفعة';
      if (label === 'dta')
        return val <= 0.6 ? 'هيكل أصول ممول بإنصاف' : 'اعتماد أعلى على الديون';
      return '';
    };

    return [
      {
        key: 'wc',
        title: 'رأس المال العامل',
        value: wc,
        display: formatCurrency(wc),
        badgeClass: badge(wc, true, 0),
        explain: interpret('wc', wc),
        tooltip: 'Current Assets – Current Liabilities',
      },
      {
        key: 'cr',
        title: 'نسبة التداول',
        value: currentRatio,
        display: currentRatio ? currentRatio.toFixed(2) : '0.00',
        badgeClass: badge(currentRatio, true, 1.2),
        explain: interpret('cr', currentRatio),
        tooltip: 'Current Assets / Current Liabilities',
      },
      {
        key: 'qr',
        title: 'نسبة السداد السريع',
        value: quickRatio,
        display: quickRatio ? quickRatio.toFixed(2) : '0.00',
        badgeClass: badge(quickRatio, true, 0.9),
        explain: interpret('qr', quickRatio),
        tooltip: '(Cash + Receivables) / Current Liabilities',
      },
      {
        key: 'dte',
        title: 'الديون إلى حقوق الملكية',
        value: debtToEquity,
        display: debtToEquity ? debtToEquity.toFixed(2) : '0.00',
        badgeClass: badge(debtToEquity, false, 1.5),
        explain: interpret('dte', debtToEquity),
        tooltip: 'Total Liabilities / Total Equity',
      },
      {
        key: 'dta',
        title: 'الديون إلى الأصول',
        value: debtToAssets,
        display: debtToAssets ? (debtToAssets * 100).toFixed(1) + '%' : '0.0%',
        badgeClass: badge(debtToAssets, false, 0.6),
        explain: interpret('dta', debtToAssets),
        tooltip: 'Total Liabilities / Total Assets',
      },
    ];
  }, [metricsByYear]);

  const bs2025 = metricsByYear[2025] || {};

  // تم حذف تحليل رأس المال العامل والجداول/المخططات الخاصة به

  const handleChange = (year, field, textValue, el) => {
    const parsed = parseNumber(textValue);
    if (year === 2025) {
      setOverride2025((prev) => {
        const next = { ...prev, [field]: parsed };
        try {
          localStorage.setItem(OVERRIDE_BS_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to store BS override 2025', e);
        }
        return next;
      });
    } else {
      updateHistoricalBS(year, field, parsed);
    }
    if (el) el.innerText = formatCurrency(parsed) || '–';
  };

  const renderEditableCell = (year, field) => {
    const val = metricsByYear[year][field] || 0;
    const display = formatCurrency(val) || '–';
    return (
      <td key={`${field}-${year}`} className="p-1 text-center align-middle">
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => handleChange(year, field, e.currentTarget.textContent, e.currentTarget)}
          className="min-w-[130px] px-2 py-1 rounded-md bg-gray-50 border border-transparent hover:border-blue-200 focus:border-blue-400 focus:outline-none text-right font-mono text-xs text-gray-800"
        >
          {display}
        </div>
      </td>
    );
  };

  const renderNoteInput = (key) => (
    <td className="p-2 text-center">
      <input
        className="w-full text-center border border-transparent focus:border-blue-400 rounded px-2 py-1 bg-gray-50 text-xs"
        placeholder="إيضاح"
        value={notes[key] || ''}
        onChange={(e) => setNotes((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </td>
  );

  const handleSaveSnapshot = async () => {
    try {
      setSaveState('saving');
      await statementsAPI.save({
        statementType: 'balance_sheet',
        year: 2025,
        data: {
          metricsByYear,
          override2025,
          notes,
        },
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e) {
      console.error('Save balance sheet error', e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  };

  const renderComputedCell = (year, value, keyName) => {
    const display = formatCurrency(value) || '–';
    return (
      <td key={`${keyName}-${year}`} className="p-2 text-center align-middle">
        <span className="font-mono text-xs font-semibold text-gray-900">{display}</span>
      </td>
    );
  };

  // تم إزالة التولتيب الخاص بمخطط رأس المال العامل بعد حذف المخطط

  const exportPDF = () => {
    const input = document.getElementById('bs-page');
    if (!input) return;
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('balance_sheet.pdf');
    });
  };

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const clearOverride2025 = () => {
    setOverride2025({});
    try {
      localStorage.removeItem(OVERRIDE_BS_KEY);
    } catch (e) {
      console.warn('Failed to clear BS override 2025', e);
    }
  };

  const renderSectionHeader = (label, key, accent) => {
    const isOpen = expanded[key];
    return (
      <tr>
        <td colSpan={8} className="p-0">
          <button
            type="button"
            onClick={() => toggle(key)}
            className={`w-full flex items-center justify-between px-4 py-3 font-bold text-sm sm:text-base transition-all border-b ${accent.bg} ${accent.text} ${accent.border}`}
          >
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-white ${accent.badge}`}>
                {label.slice(0, 1)}
              </span>
              <span className="tracking-wide">{label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-normal text-gray-600">{isOpen ? 'اضغط للإخفاء' : 'اضغط للإظهار'}</span>
              <span
                className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
              >
                <ChevronDown size={18} />
              </span>
            </div>
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div id="bs-page" className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">قائمة المركز المالي</h1>
          <p className="text-gray-600 text-xs mt-1">Haitham Saqr – CFO, Bonyan</p>
          <p className="text-gray-500 text-sm mt-1">البيانات التاريخية والتقديرية (2020 - 2025)</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={handleSaveSnapshot}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'جاري الحفظ...' : 'حفظ في قاعدة البيانات'}
          </button>
          {saveState === 'ok' && <span className="text-sm text-emerald-600">تم الحفظ</span>}
          {saveState === 'error' && <span className="text-sm text-red-600">تعذر الحفظ</span>}
          <button onClick={clearOverride2025} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 border border-gray-200">
            مسح تعديلات 2025
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download size={18} />
            <span>تصدير PDF</span>
          </button>
        </div>
      </div>

      {/* نسب مالية مختصرة */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {ratios.map((r) => (
          <div key={r.key} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800" title={r.tooltip}>{r.title}</span>
              <span className={`text-[11px] px-2 py-1 rounded-full border ${r.badgeClass}`}>{r.explain}</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{r.display}</p>
            <p className="text-xs text-gray-500 mt-1">{r.tooltip}</p>
          </div>
        ))}
      </div>

      {/* تحليلات هيكلية سريعة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-3">تحليل الهيكل التمويلي</h3>
          <table className="w-full text-xs text-right border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-2 text-gray-600">الالتزامات</td>
                <td className="py-2 font-semibold text-blue-700 text-left">
                  {formatCurrency(bs2025.totalLiabilities || 0)}
                </td>
                <td className="py-2 text-gray-500 text-left">
                  {bs2025.totalEquityLiabilities
                    ? ((bs2025.totalLiabilities / bs2025.totalEquityLiabilities) * 100).toFixed(1) + '%'
                    : '—'}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-600">حقوق الملكية</td>
                <td className="py-2 font-semibold text-emerald-700 text-left">
                  {formatCurrency(bs2025.equityTotal || 0)}
                </td>
                <td className="py-2 text-gray-500 text-left">
                  {bs2025.totalEquityLiabilities
                    ? ((bs2025.equityTotal / bs2025.totalEquityLiabilities) * 100).toFixed(1) + '%'
                    : '—'}
                </td>
              </tr>
              <tr className="font-bold">
                <td className="py-2 text-gray-800">إجمالي التمويل</td>
                <td className="py-2 text-gray-900 text-left">
                  {formatCurrency(bs2025.totalEquityLiabilities || 0)}
                </td>
                <td className="py-2 text-gray-700 text-left">100%</td>
              </tr>
              <tr className="border-t">
                <td className="py-2 text-gray-600">ديون / حقوق ملكية</td>
                <td className="py-2 text-gray-900 text-left">
                  {bs2025.equityTotal
                    ? (bs2025.totalLiabilities / bs2025.equityTotal).toFixed(2)
                    : '—'}
                </td>
                <td className="py-2 text-[11px] text-gray-500 text-left">
                  نسبة الرافعة المالية (كلما اقتربت من 1 كان التوازن أفضل)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-3">هيكل الأصول</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ label: '2025', ca: bs2025.currentAssets || 0, nca: bs2025.nonCurrentAssets || 0 }]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={formatShortNumber} />
                <YAxis type="category" dataKey="label" width={50} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
                <Bar dataKey="ca" stackId="assets" name="أصول متداولة" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="nca" stackId="assets" name="أصول غير متداولة" fill="#22c55e" radius={[0, 0, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 text-right mt-2">توزيع الأصول بين متداولة وغير متداولة</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-3">مخاطر الدين</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { label: 'قدرة التغطية', value: bs2025.currentLiabilities ? ((bs2025.currentAssets || 0) / bs2025.currentLiabilities) : 0 },
                { label: 'ديون/حقوق ملكية', value: bs2025.equityTotal ? ((bs2025.totalLiabilities || 0) / bs2025.equityTotal) : 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v)=>v.toFixed(1)} width={50} />
                <Tooltip formatter={(v)=>Number(v).toFixed(2)} />
                <Bar dataKey="value" radius={[6,6,0,0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 text-right mt-2">مؤشرات أولية لقياس ضغط الديون والقدرة على السداد</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="bs-table w-full text-xs text-right border-collapse">
          <thead className="text-gray-800">
            <tr className="bg-gray-50">
              <th className="p-3 min-w-[180px] text-center text-sm bs-sticky bs-col-1 bg-gray-50 z-20">البند</th>
              <th className="p-3 min-w-[110px] text-center text-sm bs-sticky bs-col-2 bg-gray-50 z-20">إيضاح</th>
              {YEARS.map((y) => (
                <th key={`hdr-${y}`} className="p-3 min-w-[140px] text-center font-semibold text-sm">
                  31-Dec {y}
                </th>
              ))}
            </tr>
            <tr className="border-b bg-white text-gray-600">
              <th className="p-2 text-center bs-sticky bs-col-1 bg-white z-10">—</th>
              <th className="p-2 text-center bs-sticky bs-col-2 bg-white z-10">—</th>
              {YEARS.map((y) => (
                <th key={`cur-${y}`} className="p-2 text-center">
                  ريال سعودي
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y bs-tbody">
            {/* الموجودات */}
            {renderSectionHeader('الموجودات', 'assets', sectionStyles.assets)}
            {expanded.assets && (
              <>
                <tr className="font-bold text-gray-900">
                  <td className="p-3">الموجودات غير المتداولة</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].nonCurrentAssets, 'nonCurrentAssets'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">ممتلكات ومعدات</td>
                  {renderNoteInput('propertyEquipmentNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'propertyEquipment'))}
                </tr>

                <tr className="font-bold text-gray-900">
                  <td className="p-3">الموجودات المتداولة</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].currentAssets, 'currentAssets'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">موجودات عقد</td>
                  {renderNoteInput('contractAssetsNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'contractAssets'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">ذمم مدينة</td>
                  {renderNoteInput('receivablesNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'receivables'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">دفعات مقدمة وموجودات متداولة أخرى</td>
                  {renderNoteInput('advancesOtherNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'advancesOther'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">نقد لدى البنوك</td>
                  {renderNoteInput('cashBankNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'cashBank'))}
                </tr>

                <tr className="bg-blue-50 font-bold text-blue-900">
                  <td className="p-3">مجموع الموجودات المتداولة</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].currentAssets, 'totalCurrentAssets'))}
                </tr>

                <tr className="bg-blue-100 font-bold text-blue-900">
                  <td className="p-3">مجموع الموجودات</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].totalAssets, 'totalAssets'))}
                </tr>
              </>
            )}

            {/* حقوق الملكية والمطلوبات */}
            {renderSectionHeader('حقوق الملكية والمطلوبات', 'liabilities', sectionStyles.liabilities)}
            {expanded.liabilities && (
              <>
                <tr className="font-bold text-gray-900">
                  <td className="p-3">حقوق الملكية</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].equityTotal, 'equityTotal'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">رأس المال</td>
                  {renderNoteInput('equityCapitalNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'equityCapital'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">الاحتياطي النظامي</td>
                  {renderNoteInput('equityStatutoryReserveNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'equityStatutoryReserve'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">الأرباح المبقاة</td>
                  {renderNoteInput('retainedEarningsNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'retainedEarnings'))}
                </tr>
                <tr className="bg-blue-50 font-bold text-blue-900">
                  <td className="p-3">مجموع حقوق الملكية</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].equityTotal, 'equityTotalSummary'))}
                </tr>

                <tr className="font-bold text-gray-900">
                  <td className="p-3">المطلوبات غير المتداولة</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].nonCurrentLiabilities, 'nonCurrentLiabilities'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">التزامات منافع الموظفين</td>
                  {renderNoteInput('employeeBenefitsNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'employeeBenefits'))}
                </tr>
                <tr className="bg-blue-50 font-bold text-blue-900">
                  <td className="p-3">مجموع المطلوبات غير المتداولة</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].nonCurrentLiabilities, 'nonCurrentLiabilitiesTotal'))}
                </tr>

                <tr className="font-bold text-gray-900">
                  <td className="p-3">المطلوبات المتداولة</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].currentLiabilities, 'currentLiabilities'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">مطلوبات إلى أطراف ذات العلاقة</td>
                  {renderNoteInput('relatedPartyPayablesNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'relatedPartyPayables'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">مطلوبات العقود</td>
                  {renderNoteInput('contractLiabilitiesNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'contractLiabilities'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">ذمم دائنة</td>
                  {renderNoteInput('payablesNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'payables'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">مستحقات ومطلوبات متداولة أخرى</td>
                  {renderNoteInput('otherCurrentLiabilitiesNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'otherCurrentLiabilities'))}
                </tr>
                <tr>
                  <td className="p-3 pr-8 text-gray-900">زكاة وضريبة الدخل</td>
                  {renderNoteInput('zakatTaxNote')}
                  {YEARS.map((y) => renderEditableCell(y, 'zakatTax'))}
                </tr>
                <tr className="bg-blue-50 font-bold text-blue-900">
                  <td className="p-3">مجموع المطلوبات المتداولة</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].currentLiabilities, 'currentLiabilitiesTotal'))}
                </tr>

                <tr className="bg-blue-100 font-bold text-blue-900">
                  <td className="p-3">مجموع المطلوبات</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].totalLiabilities, 'totalLiabilities'))}
                </tr>

                <tr className="bg-green-100 font-bold text-green-900">
                  <td className="p-3">مجموع حقوق الملكية والمطلوبات</td>
                  <td className="p-2 text-center">—</td>
                  {YEARS.map((y) => renderComputedCell(y, metricsByYear[y].totalEquityLiabilities, 'totalEquityLiabilities'))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* تم حذف قسم تطور رأس المال العامل */}
    </div>
  );
}
