import React, { useMemo, useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { statementsAPI } from '../api/client';

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
  const { historicalBS, updateHistoricalBS, data2025, historicalIS } = useFinancial();
  const [override2025, setOverride2025] = useState(loadOverrideBS2025);
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState({
    assets: true,
    liabilities: true,
  });
  const [showWcExplain, setShowWcExplain] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | ok | error
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
      ? { ...(data2025?.bs || {}), ...override2025 }
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

  const wcChartData = useMemo(() => {
    const getCA = (year) => (metricsByYear[year]?.currentAssets ?? aggregateCA(getBSRaw(year)));
    const getCL = (year) => (metricsByYear[year]?.currentLiabilities ?? aggregateCL(getBSRaw(year)));

    const base = YEARS.map((year, idx) => {
      const ca = getCA(year);
      const cl = getCL(year);
      const incomplete = ca === 0 && cl === 0;
      const wc = incomplete ? null : ca - cl;

      const prevYear = YEARS[idx + 1];
      const prevCa = prevYear !== undefined ? getCA(prevYear) : null;
      const prevCl = prevYear !== undefined ? getCL(prevYear) : null;
      const prevIncomplete = prevCa === 0 && prevCl === 0;
      const prevWc = prevIncomplete ? null : prevCa - prevCl;

      const yoyAbs = prevWc !== null && wc !== null ? wc - prevWc : null;
      const yoyPct = prevWc !== null && prevWc !== 0 && wc !== null ? (yoyAbs / Math.abs(prevWc)) * 100 : null;
      const insight =
        wc === null
          ? 'بيانات غير مكتملة'
          : wc > 0
          ? 'سيولة جيدة'
          : wc < 0
          ? 'مخاطرة سيولة مرتفعة'
          : 'تعادل سيولة';
      return { year, wc, yoyAbs, yoyPct, insight, index: idx, incomplete };
    });
    const filtered = base.filter((d) => d.wc !== null);
    const n = filtered.length;
    if (n < 2) return base.map((d) => ({ ...d, trend: d.wc }));
    const sumX = filtered.reduce((s, d) => s + d.index, 0);
    const sumY = filtered.reduce((s, d) => s + d.wc, 0);
    const sumXY = filtered.reduce((s, d) => s + d.index * d.wc, 0);
    const sumX2 = filtered.reduce((s, d) => s + d.index * d.index, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    return base.map((d) => ({
      ...d,
      trend: d.wc !== null ? intercept + slope * d.index : null,
    }));
  }, [metricsByYear, data2025, historicalBS]);

  // اجعل بيانات الشارت آمنة حتى لو كانت بعض القيم null
  const wcChartSafe = useMemo(
    () =>
      (wcChartData || []).map((d) => ({
        ...d,
        wc: d.wc ?? 0,
        trend: d.trend ?? 0,
        yoyAbs: d.yoyAbs ?? 0,
        yoyPct: d.yoyPct ?? 0,
      })),
    [wcChartData]
  );

  const wcExplanation = useMemo(() => {
    const series = (wcChartData || [])
      .filter((d) => d.wc !== null && d.wc !== undefined)
      .sort((a, b) => a.year - b.year);
    if (series.length < 2) {
      return 'يظهر اتجاه رأس المال العامل دون تفسير إضافي لعدم توفر سلسلة زمنية كافية.';
    }
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const diff = last.wc - prev.wc;
    const dropPct = prev.wc !== 0 ? (diff / Math.abs(prev.wc)) * 100 : null;
    const sharpDecline = dropPct !== null && dropPct < -15;
    if (sharpDecline) {
      const stillPositive = last.wc > 0;
      return `الانخفاض الحاد في رأس المال العامل في ${last.year} يعكس خسارة تشغيلية خلال السنة مع ارتفاع الالتزامات القصيرة وتباطؤ نمو الأصول المتداولة. ${stillPositive ? 'رغم ذلك يبقى رأس المال العامل موجباً لكنه يشير إلى سيولة أضيق مقارنةً بالسنوات السابقة.' : 'الرصيد يوضح ضيق السيولة ويستدعي متابعة لصيقـة للالتزامات القصيرة.'}`;
    }
    if (diff > 0) {
      return 'اتجاه رأس المال العامل صاعد، ما يعكس تحسناً في السيولة التشغيلية ونمو الأصول المتداولة مقابل الالتزامات القصيرة.';
    }
    return 'اتجاه رأس المال العامل مستقر مع تغير محدود بين الأصول المتداولة والالتزامات القصيرة.';
  }, [wcChartData]);

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

  const computeWC = (year) => {
    const bsYear = getBSRaw(year) || {};
    const ca = aggregateCA(bsYear);
    const cl = aggregateCL(bsYear);
    const hasAsset = ca !== 0;
    const hasLiab = cl !== 0;
    if (!hasAsset && !hasLiab) {
      return { ca: 0, cl: 0, wc: null, hasAsset, hasLiab };
    }
    return { ca, cl, wc: ca - cl, hasAsset, hasLiab };
  };

  const wcAnalysis = useMemo(() => {
    const getCA = (year) => {
      const m = metricsByYear[year] || {};
      if (m.currentAssets !== undefined) return m.currentAssets;
      const bsYear = getBSRaw(year) || {};
      return aggregateCA(bsYear);
    };
    const getCL = (year) => {
      const m = metricsByYear[year] || {};
      if (m.currentLiabilities !== undefined) return m.currentLiabilities;
      const bsYear = getBSRaw(year) || {};
      return aggregateCL(bsYear);
    };

    const rows = YEARS.map((year, idx) => {
      const ca = getCA(year);
      const cl = getCL(year);
      const incomplete = ca === 0 && cl === 0;
      const wc = incomplete ? null : ca - cl;

      const prevYear = YEARS[idx + 1];
      const prevCa = prevYear !== undefined ? getCA(prevYear) : null;
      const prevCl = prevYear !== undefined ? getCL(prevYear) : null;
      const prevIncomplete = prevCa === 0 && prevCl === 0;
      const prevWc = prevIncomplete ? null : prevCa - prevCl;

      const yoy = prevWc !== null && wc !== null ? wc - prevWc : null;
      const yoyPct = prevWc !== null && prevWc !== 0 && wc !== null ? (yoy / Math.abs(prevWc)) * 100 : null;
      const explain =
        wc === null
          ? 'بيانات غير مكتملة'
          : wc > 0
          ? 'سيولة جيدة'
          : wc < 0
          ? 'مخاطرة سيولة مرتفعة'
          : 'تعادل سيولة';

      return { year, wc, yoy, yoyPct, explain, incomplete };
    });

    const valid = rows.filter((r) => r.wc !== null && !Number.isNaN(r.wc));
    const best = valid.reduce((acc, r) => (acc && acc.wc > r.wc ? acc : r), null);
    const worst = valid.reduce((acc, r) => (acc && acc.wc < r.wc ? acc : r), null);

    const first = valid[valid.length - 1];
    const last = valid[0];
    const trend =
      first && last
        ? last.wc > first.wc
          ? 'اتجاه عام صاعد للسيولة التشغيلية'
          : last.wc < first.wc
          ? 'اتجاه عام هابط للسيولة التشغيلية'
          : 'الاتجاه مستقر'
        : 'الاتجاه غير متاح';

    const coverage =
      bs2025.currentLiabilities && bs2025.currentLiabilities !== 0
        ? (bs2025.currentAssets || 0) / bs2025.currentLiabilities
        : null;

    // Advanced KPIs
    const bs2025Data = getBS(2025) || {};
    const isByYear = (year) => getIS(year) || {};
    const revenue = isByYear(2025).revenue || 0;
    const cogs = isByYear(2025).cogs || 0;
    const ar = bs2025Data.receivables || 0;
    const ap = bs2025Data.payables || 0;
    const inventory = bs2025Data.inventory || 0; // fallback إن لم تتوفر قيمة

    const dso = revenue > 0 ? (ar / revenue) * 365 : null;
    const dpo = cogs > 0 ? (ap / cogs) * 365 : null;
    const dio = cogs > 0 ? (inventory / cogs) * 365 : null;
    const wcc = (dso || 0) + (dio || 0) - (dpo || 0);
    const ccc = wcc;

    // Liquidity Risk Score (تجميعي بسيط)
    const cr = coverage;
    const qr = bs2025.currentLiabilities ? ((bs2025.cashBank || 0) + (bs2025.receivables || 0)) / bs2025.currentLiabilities : null;
    const dta = bs2025.totalAssets ? (bs2025.totalLiabilities || 0) / bs2025.totalAssets : null;
    const cccScore = ccc !== null ? Math.max(0, Math.min(1, 1 - ccc / 365)) : 0.5;
    const crScore = cr !== null ? Math.max(0, Math.min(1, cr / 2)) : 0.5;
    const qrScore = qr !== null ? Math.max(0, Math.min(1, qr / 2)) : 0.5;
    const dtaScore = dta !== null ? Math.max(0, Math.min(1, 1 - dta)) : 0.5;
    const wcScore = valid.length ? Math.max(0, Math.min(1, (last?.wc || 0) / Math.max(Math.abs(last?.wc || 1), 1))) : 0.5;
    const lrs = Math.round(((cccScore + crScore + qrScore + dtaScore + wcScore) / 5) * 100);

    return {
      rows,
      best,
      worst,
      trend,
      coverage,
      kpis: { dso, dpo, dio, wcc, ccc, lrs },
    };
  }, [data2025, historicalBS, bs2025]);

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

  const CustomWCTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const wcVal = payload.find((p) => p.dataKey === 'wc')?.value ?? null;
    const row = wcChartData.find((d) => `${d.year}` === `${label}`);
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-right">
        <p className="text-xs font-semibold text-gray-800 mb-1">رأس المال العامل - {label}</p>
        <p className="text-sm font-bold text-blue-700">القيمة: {wcVal !== null ? formatCurrency(wcVal) : '—'}</p>
        {row?.yoyAbs !== null && (
          <p className="text-xs text-gray-600">
            التغير السنوي: <span className={row.yoyAbs >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(row.yoyAbs)}</span>
          </p>
        )}
        {row?.yoyPct !== null && (
          <p className="text-xs text-gray-600">
            % التغير: <span className={row.yoyPct >= 0 ? 'text-green-600' : 'text-red-600'}>{row.yoyPct.toFixed(1)}%</span>
          </p>
        )}
        {row?.insight && <p className="text-[11px] text-gray-500 mt-1">{row.insight}</p>}
      </div>
    );
  };

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

      {/* Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Working Capital Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">تطور رأس المال العامل</h3>
            <button
              type="button"
              onClick={() => setShowWcExplain((v) => !v)}
              className="text-sm px-3 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {showWcExplain ? 'إخفاء التفسير' : 'إظهار التفسير'}
            </button>
          </div>
          {showWcExplain && (
            <div className="mb-4 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {wcExplanation}
            </div>
          )}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wcChartData}>
                <defs>
                  <linearGradient id="wcGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                  </linearGradient>
                  <filter id="wcShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1d4ed8" floodOpacity="0.15" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="wc"
                  tickFormatter={formatShortNumber}
                  tick={{ fontSize: 12 }}
                  domain={['auto', 'auto']}
                  width={70}
                />
                <YAxis yAxisId="pct" orientation="right" hide domain={['auto', 'auto']} />
                <Tooltip content={<CustomWCTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="wc"
                  dataKey="wc"
                  name="صافي رأس المال العامل"
                  fill="url(#wcGradient)"
                  radius={[8, 8, 4, 4]}
                  style={{ filter: 'url(#wcShadow)' }}
                />
                <Line
                  yAxisId="wc"
                  type="monotone"
                  dataKey="trend"
                  name="خط الاتجاه"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 1, stroke: '#0f766e', fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#0ea5e9' }}
                />
                <Line yAxisId="pct" dataKey="yoy" name="التغير % YoY" stroke="#f59e0b" strokeDasharray="4 4" dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Liquidity Ratios */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">مؤشرات السيولة (2025)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-gray-500 mb-1">نسبة التداول (Current Ratio)</p>
                <p className="text-2xl font-bold text-blue-700">
                  {metricsByYear[2025].currentLiabilities
                    ? (metricsByYear[2025].currentAssets / metricsByYear[2025].currentLiabilities).toFixed(2)
                    : '0.00'}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <p className="text-sm text-gray-500 mb-1">الديون / الأصول</p>
                <p className="text-2xl font-bold text-purple-700">
                  {metricsByYear[2025].totalAssets
                    ? ((metricsByYear[2025].totalLiabilities / metricsByYear[2025].totalAssets) * 100).toFixed(1) + '%'
                    : '0.0%'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">هيكل التمويل (2025)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ label: '2025', liabilities: metricsByYear[2025].totalLiabilities || 0, equity: metricsByYear[2025].equityTotal || 0 }]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={formatShortNumber} />
                  <YAxis type="category" dataKey="label" width={50} />
                  <Tooltip formatter={(val) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey="liabilities" stackId="fin" name="الالتزامات" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="equity" stackId="fin" name="حقوق الملكية" fill="#22c55e" radius={[0, 0, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
           </div>
        </div>

          {/* Horizontal Working Capital Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">تحليل أفقي لرأس المال العامل</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700">
                    <th className="p-2">السنة</th>
                    <th className="p-2">رأس المال العامل</th>
                    <th className="p-2">التغير السنوي</th>
                    <th className="p-2">% التغير</th>
                    <th className="p-2">تفسير</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {wcAnalysis.rows.map((r) => (
                    <tr key={r.year} className="hover:bg-gray-50">
                      <td className="p-2 font-semibold text-gray-800">{r.year}</td>
                      <td className="p-2 font-mono text-blue-800">{r.wc !== null ? formatCurrency(r.wc) : '—'}</td>
                      <td className="p-2 font-mono text-gray-700">{r.yoy !== null ? formatCurrency(r.yoy) : '—'}</td>
                      <td className="p-2 font-mono text-gray-700">
                        {r.yoyPct !== null ? `${r.yoyPct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="p-2 text-xs text-gray-600">
                        {r.wc === null
                          ? 'بيانات غير مكتملة'
                          : r.wc > 0
                          ? 'سيولة جيدة'
                          : r.wc < 0
                          ? 'مخاطرة عالية'
                          : 'متعادل'}{' '}
                        {r.yoyPct !== null && r.yoyPct < -15 ? '(انخفاض حاد)' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...wcChartSafe].reverse()} layout="vertical" margin={{ left: 60, right: 16 }}>
                  <defs>
                    <linearGradient id="wcHGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={formatShortNumber} />
                  <YAxis
                    type="category"
                    dataKey="year"
                    tick={{ fontSize: 12, dx: -8 }}
                    width={70}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomWCTooltip />} />
                <Bar
                  dataKey="wc"
                  name="رأس المال العامل"
                  fill="url(#wcHGrad)"
                  radius={[6, 6, 6, 6]}
                  label={{
                    position: 'insideRight',
                    formatter: (v) => formatShortNumber(v),
                    fill: '#fff',
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="خط الاتجاه"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1, stroke: '#0f766e', fill: '#10b981' }}
                  activeDot={{ r: 5, fill: '#0ea5e9' }}
                />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold text-gray-900">أفضل سنة:</span>{' '}
                {wcAnalysis.best ? `${wcAnalysis.best.year} (${formatCurrency(wcAnalysis.best.wc)})` : '—'}
              </p>
              <p>
                <span className="font-semibold text-gray-900">أسوأ سنة:</span>{' '}
                {wcAnalysis.worst ? `${wcAnalysis.worst.year} (${formatCurrency(wcAnalysis.worst.wc)})` : '—'}
              </p>
              <p>
                <span className="font-semibold text-gray-900">الاتجاه العام:</span> {wcAnalysis.trend}
              </p>
              <p>
                <span className="font-semibold text-gray-900">تغطية الالتزامات قصيرة الأجل (2025):</span>{' '}
                {wcAnalysis.coverage !== null ? wcAnalysis.coverage.toFixed(2) : '—'}
              </p>
            </div>

          {/* Advanced KPIs */}
          <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">مؤشرات تشغيلية متقدمة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'wcc', label: 'Working Capital Cycle (أيام)', value: wcAnalysis.kpis.wcc },
                { key: 'dso', label: 'DSO (أيام تحصيل)', value: wcAnalysis.kpis.dso },
                { key: 'dpo', label: 'DPO (أيام سداد)', value: wcAnalysis.kpis.dpo },
                { key: 'dio', label: 'DIO (دوران المخزون)', value: wcAnalysis.kpis.dio },
                { key: 'ccc', label: 'Cash Conversion Cycle', value: wcAnalysis.kpis.ccc },
                { key: 'lrs', label: 'Liquidity Risk Score', value: wcAnalysis.kpis.lrs },
              ].map((kpi) => (
                <div key={kpi.key} className="p-4 rounded-lg border border-gray-100 bg-gradient-to-br from-white via-blue-50 to-white shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {kpi.value !== null && kpi.value !== undefined
                      ? typeof kpi.value === 'number'
                        ? kpi.key === 'lrs'
                          ? `${kpi.value.toFixed(0)} / 100`
                          : kpi.value.toFixed(1)
                        : kpi.value
                      : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          </div>
      </div>
    </div>
  );
}
