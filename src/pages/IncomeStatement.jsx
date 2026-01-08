import React, { useMemo, useState, useRef } from 'react';
import { useFinancial } from '../context/FinancialContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area
} from 'recharts';
import { Download, RotateCw, FileSpreadsheet } from 'lucide-react';
import { statementsAPI } from '../api/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const EMPTY_IS = {
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  expenses: 0,
  depreciation: 0,
  otherIncome: 0,
  zakat: 0,
  ociRemeasurement: 0,
  netIncome: 0,
  mainOpsProfit: 0,
  netBeforeZakat: 0,
  comprehensiveIncome: 0,
};

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

const formatCurrency = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return '';
  const str = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return num < 0 ? `(${str})` : str;
};

const parseNumber = (val) => {
  if (!val) return 0;
  const hasParens = val.includes('(') || val.includes(')');
  const cleaned = val.replace(/[(),\s]/g, '').replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return hasParens ? -parsed : parsed;
};

const formatPercent = (val) => `${(Number(val) || 0).toFixed(1)}%`;

const formatShortNumber = (num) => {
  const n = Number(num || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(1);
};

const formatShortCurrency = (num) => {
  const n = Number(num || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}${formatShortNumber(Math.abs(n))}`;
};

const pctChange = (curr, prev) => {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
};

const pickNumber = (obj, keys, fallback = null) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (Number.isFinite(val)) return val;
    if (val !== undefined && val !== null && !Number.isNaN(Number(val))) return Number(val);
  }
  return fallback;
};

const OVERRIDE_KEY = 'isOverride2025';
const loadOverride2025 = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(OVERRIDE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load 2025 override', e);
  }
  return {};
};

const linearTrend = (arr, key) => {
  const n = arr.length;
  if (n < 2) return arr.map(() => 0);
  // x as index 0..n-1
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  arr.forEach((d, i) => {
    const y = Number(d[key] || 0);
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumX2 += i * i;
  });
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return arr.map((_, i) => intercept + slope * i);
};

const svgToPngDataUrl = (svgEl) => {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
};

const replaceChartsWithImages = async (container) => {
  if (!container) return () => {};
  const originals = [];
  const imgs = [];

  const replaceNode = (node, dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    img.className = 'chart-print-img';
    const parent = node.parentNode;
    const next = node.nextSibling;
    originals.push({ parent, node, next });
    parent.replaceChild(img, node);
    imgs.push(img);
  };

  const svgList = Array.from(container.querySelectorAll('svg'));
  for (const svg of svgList) {
    const dataUrl = await svgToPngDataUrl(svg);
    replaceNode(svg, dataUrl);
  }

  const canvasList = Array.from(container.querySelectorAll('canvas'));
  canvasList.forEach((c) => {
    try {
      const dataUrl = c.toDataURL('image/png');
      replaceNode(c, dataUrl);
    } catch (e) {
      // ignore
    }
  });

  return () => {
    originals.forEach(({ parent, node, next }) => {
      const current = parent.querySelector('.chart-print-img');
      if (current) current.remove();
      if (parent) parent.insertBefore(node, next || null);
    });
  };
};

export default function IncomeStatement() {
  const { historicalIS, updateHistoricalIS, data2025, resetAllData } = useFinancial();
  const [override2025, setOverride2025] = useState(loadOverride2025);
  const [noteRefs, setNoteRefs] = useState({});
  const [saveState, setSaveState] = useState('idle'); // idle | saving | ok | error
  const [expanded, setExpanded] = useState({
    main: true,
    oci_section: true,
  });
  const [compareYear1, setCompareYear1] = useState(2024);
  const [compareYear2, setCompareYear2] = useState(2025);
  const compareRef = useRef(null);

  const getIS = (year) =>
    year === 2025
      ? { ...(data2025?.is || EMPTY_IS), ...override2025 }
      : (historicalIS?.[year] || EMPTY_IS);

  const buildMetrics = (base) => {
    // التقاط الحقول حتى لو اختلف اسمها في القوائم
    const revenue = pickNumber(base, ['revenue', 'sales', 'totalRevenue'], 0);
    const cogs = pickNumber(base, ['cogs', 'costOfSales'], 0);
    const expenses = pickNumber(base, ['expenses', 'operatingExpenses'], 0);
    const depreciation = pickNumber(base, ['depreciation', 'dep'], 0);
    const otherIncome = pickNumber(base, ['otherIncome', 'other', 'otherRevenue'], 0);
    const zakat = pickNumber(base, ['zakat', 'tax', 'zakatTax', 'incomeTax'], 0);
    const ociRemeasurement = pickNumber(base, ['ociRemeasurement', 'oci'], 0);

    const grossProfit = Number.isFinite(revenue) && Number.isFinite(cogs)
      ? revenue - cogs
      : pickNumber(base, ['grossProfit'], 0);

    const mainOpsProfit = Number.isFinite(grossProfit)
      ? grossProfit - (Number.isFinite(expenses) ? expenses : 0) - (Number.isFinite(depreciation) ? depreciation : 0)
      : pickNumber(base, ['mainOpsProfit', 'operatingProfit'], 0);

    const netBeforeZakat = Number.isFinite(mainOpsProfit)
      ? mainOpsProfit + (Number.isFinite(otherIncome) ? otherIncome : 0)
      : pickNumber(base, ['netBeforeZakat', 'profitBeforeTax'], 0);

    const netIncomeRaw = pickNumber(base, ['netIncome', 'netProfit', 'profitAfterTax', 'pat', 'profit'], null);
    const zakatVal = Number.isFinite(zakat) ? zakat : 0;
    // إلزامي: صافي الربح = الربح قبل الزكاة - الزكاة
    let netIncome = Number.isFinite(netBeforeZakat)
      ? netBeforeZakat - zakatVal
      : (Number.isFinite(netIncomeRaw) ? netIncomeRaw : 0);
    // تحقق آلي على الإشارة: لا يجوز ربح قبل الزكاة موجب وصافي صفر/سالب والعكس
    if (Number.isFinite(netBeforeZakat) && netBeforeZakat > 0 && netIncome <= 0) {
      netIncome = netBeforeZakat - zakatVal;
    }
    if (Number.isFinite(netBeforeZakat) && netBeforeZakat < 0 && netIncome >= 0) {
      netIncome = netBeforeZakat - zakatVal;
    }

    const comprehensiveIncome = Number.isFinite(netIncome)
      ? netIncome + (Number.isFinite(ociRemeasurement) ? ociRemeasurement : 0)
      : pickNumber(base, ['comprehensiveIncome'], 0);

    return {
      revenue,
      cogs,
      expenses,
      depreciation,
      otherIncome,
      zakat,
      ociRemeasurement,
      grossProfit,
      mainOpsProfit,
      netBeforeZakat,
      netIncome,
      comprehensiveIncome,
    };
  };

  const metricsByYear = useMemo(() => {
    return YEARS.reduce((acc, year) => {
      const base = getIS(year);
      acc[year] = buildMetrics(base);
      return acc;
    }, {});
  }, [historicalIS, data2025, override2025]);

  const allYearsData = YEARS.map((year) => ({ year, ...metricsByYear[year] }));
  const getMetrics = (year) => metricsByYear[year] || EMPTY_IS;

  const handleValueChange = (year, field, textValue, el, asExpense = false) => {
    const parsed = parseNumber(textValue);
    if (year === 2025) {
      setOverride2025((prev) => {
        const next = { ...prev, [field]: parsed };
        try {
          localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to store 2025 override', e);
        }
        return next;
      });
    } else {
      updateHistoricalIS(year, field, parsed);
    }
    if (el) {
      const display = formatCurrency(asExpense ? -parsed : parsed) || '–';
      el.innerText = display;
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      setSaveState('saving');
      await statementsAPI.save({
        statementType: 'income_statement',
        year: 2025,
        data: {
          metricsByYear,
          override2025,
        },
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e) {
      console.error('Save income statement error', e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  };

  const renderEditableCell = (year, field, { asExpense = false } = {}) => {
    const val = metricsByYear[year][field] || 0;
    const display = formatCurrency(asExpense ? -val : val) || '–';

    return (
      <td className="p-1 text-center align-middle">
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => handleValueChange(year, field, e.currentTarget.textContent)}
          className="min-w-[130px] px-2 py-1 rounded-md bg-gray-50 border border-transparent hover:border-blue-200 focus:border-blue-400 focus:outline-none text-right font-mono text-xs text-gray-800"
        >
          {display}
        </div>
      </td>
    );
  };

  const renderComputedCell = (year, value, opts = {}) => {
    const display = formatCurrency(opts.asExpense ? -value : value) || '–';
    return (
      <td className="p-2 text-center align-middle">
        <span className="font-mono text-xs font-semibold text-gray-900">
          {display}
        </span>
      </td>
    );
  };

  const renderNetIncomeCell = (year) => {
    const val = metricsByYear[year]?.netIncome ?? 0;
    const display = formatCurrency(val) || '–';
    const isProfit = Number.isFinite(val) && val > 0;
    const badge = isProfit ? 'صافي ربح السنة' : 'صافي خسارة السنة';
    const color = isProfit ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700';
    return (
      <td className="p-2 text-center align-middle">
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-xs font-semibold text-gray-900">{display}</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{badge}</span>
        </div>
      </td>
    );
  };

const calculateGrowth = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

  const calculateCAGR = (endValue, startValue, periods) => {
    if (startValue <= 0 || endValue <= 0) return 0;
    return ((Math.pow(endValue / startValue, 1 / periods) - 1) * 100).toFixed(2);
  };

  const revenueCAGR = calculateCAGR(
    getMetrics(2025).revenue,
    getMetrics(2020).revenue,
    5
  );
  // CAGR لصافي الربح مع fallback في حال كانت سنة الأساس صفرية/سالبة
  const computeSafeCAGR = (key) => {
    const start = getMetrics(2020)[key];
    const end = getMetrics(2025)[key];
    if (start > 0 && end > 0) {
      return calculateCAGR(end, start, 5);
    }
    // جرّب إيجاد أول سنة أساس موجبة وأحدث سنة نهاية موجبة
    let firstYear = null;
    let lastYear = null;
    for (let i = YEARS.length - 1; i >= 0; i--) {
      const y = YEARS[i];
      const val = getMetrics(y)[key];
      if (val > 0) {
        lastYear = lastYear ?? y;
        firstYear = y;
      }
    }
    if (firstYear && lastYear && lastYear !== firstYear) {
      const periods = YEARS.indexOf(firstYear) - YEARS.indexOf(lastYear);
      const startVal = getMetrics(firstYear)[key];
      const endVal = getMetrics(lastYear)[key];
      if (startVal > 0 && endVal > 0 && periods > 0) {
        return calculateCAGR(endVal, startVal, periods);
      }
    }
    return null;
  };

  const netCAGRRaw = computeSafeCAGR('netIncome');
  const avgNetYOY = (() => {
    const arr = [];
    for (let i = 0; i < YEARS.length - 1; i++) {
      const cur = getMetrics(YEARS[i]).netIncome;
      const prev = getMetrics(YEARS[i + 1]).netIncome;
      if (prev !== 0) arr.push(((cur - prev) / Math.abs(prev || 1)) * 100);
    }
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })();
  const netCAGR = netCAGRRaw ?? (avgNetYOY !== null ? avgNetYOY.toFixed(2) : 0);
  const netCAGRNote = netCAGRRaw === null
    ? 'تعذر حساب CAGR لصافي الربح بسبب قيم صفرية/سالبة في سنة الأساس، عُرض متوسط نمو YOY.'
    : 'تم الحساب باستخدام أول وآخر سنة موجبة.';

  const [showDefinitions, setShowDefinitions] = useState(true);

  // بيانات مخطط الاتجاه مع خطوط ترند و YOY
  const chartData = useMemo(() => {
    const trendRev = linearTrend(allYearsData, 'revenue');
    const trendNet = linearTrend(allYearsData, 'netIncome');
    return allYearsData.map((d, idx) => {
      const prev = allYearsData[idx + 1];
      const revYOY = prev ? ((d.revenue - prev.revenue) / Math.abs(prev.revenue || 1)) * 100 : null;
      const netYOY = prev ? ((d.netIncome - prev.netIncome) / Math.abs(prev.netIncome || 1)) * 100 : null;
      return {
        ...d,
        revTrend: trendRev[idx],
        netTrend: trendNet[idx],
        revYOY,
        netYOY,
      };
    });
  }, [allYearsData]);

  const yoyMetrics = ['revenue', 'grossProfit', 'netIncome', 'mainOpsProfit'];
  const yoyData = YEARS.slice(0, YEARS.length - 1).map((year, idx) => {
    const prevYear = YEARS[idx + 1]; // السنة السابقة في الترتيب
    const curMetrics = getMetrics(year);
    const prevMetrics = getMetrics(prevYear);
    const entry = { year, prevYear };
    yoyMetrics.forEach((m) => {
      entry[m] = calculateGrowth(curMetrics[m], prevMetrics[m]);
    });
    return entry;
  });

  const margins = YEARS.map((y) => {
    const m = getMetrics(y);
    const revenue = Number.isFinite(m.revenue) ? m.revenue : 0;
    const gp = Number.isFinite(m.grossProfit) ? m.grossProfit : 0;
    const op = Number.isFinite(m.mainOpsProfit) ? m.mainOpsProfit : 0;
    const net = Number.isFinite(m.netIncome) ? m.netIncome : 0;
    return {
      year: y,
      gross: revenue !== 0 ? (gp / revenue) * 100 : null,
      operating: revenue !== 0 ? (op / revenue) * 100 : null,
      net: revenue !== 0 ? (net / revenue) * 100 : null,
    };
  });
  const marginMap = margins.reduce((acc, m) => {
    acc[m.year] = m;
    return acc;
  }, {});

  // ملخص تنفيذي مختصر (3 نقاط)
  const revenueTrendNote = (() => {
    const r2020 = getMetrics(2020).revenue;
    const r2025 = getMetrics(2025).revenue;
    const growth = pctChange(r2025, r2020);
    if (Number.isFinite(growth)) return `الإيرادات نمت ${growth.toFixed(1)}% بين 2020 و 2025 (مع تباطؤ في السنتين الأخيرتين).`;
    return 'الإيرادات نمت عبر الفترة مع تباطؤ في السنتين الأخيرتين.';
  })();
  const profitabilityNote = (() => {
    const nm2024 = marginMap[2024]?.net;
    const nm2025 = marginMap[2025]?.net;
    if (Number.isFinite(nm2024) && Number.isFinite(nm2025)) {
      return `هامش صافي الربح كان ${nm2024.toFixed(1)}% في 2024 وتحول إلى ${nm2025.toFixed(1)}% في 2025.`;
    }
    return 'هامش الربحية مستقر حتى 2024 ثم تراجع في 2025.';
  })();
  const lossNote2025 = 'الخسارة في 2025 ناتجة عن تجاوز تكلفة الإيرادات لحجم الإيرادات (خسارة تشغيلية).';

  // تحليل التحول ربح/خسارة بين 2024 و 2025
  const net2025 = getMetrics(2025).netIncome;
  const net2024 = getMetrics(2024).netIncome;
  const rev2025 = getMetrics(2025).revenue;
  const rev2024 = getMetrics(2024).revenue;
  const gp2025 = getMetrics(2025).grossProfit;
  const gp2024 = getMetrics(2024).grossProfit;
  const exp2025 = getMetrics(2025).expenses;
  const exp2024 = getMetrics(2024).expenses;

  const turnedToLoss = Number.isFinite(net2025) && Number.isFinite(net2024) && net2025 < 0 && net2024 > 0;
  const turnedToProfit = Number.isFinite(net2025) && Number.isFinite(net2024) && net2025 > 0 && net2024 < 0;

  const flipInsights = [];
  if (turnedToLoss || turnedToProfit) {
    const dir = turnedToLoss ? 'تحول من ربح إلى خسارة في 2025' : 'تحسن من خسارة إلى ربح في 2025';
    const revPct = pctChange(rev2025, rev2024);
    const gpPct = pctChange(gp2025, gp2024);
    const expPct = pctChange(exp2025, exp2024);
    const netPct = pctChange(net2025, net2024);
    flipInsights.push(dir);
    if (Number.isFinite(revPct)) flipInsights.push(`الإيرادات تغيرت بنسبة ${revPct.toFixed(1)}%.`);
    if (Number.isFinite(gpPct)) flipInsights.push(`مجمل الربح تغير بنسبة ${gpPct.toFixed(1)}%.`);
    if (Number.isFinite(expPct)) flipInsights.push(`المصاريف تغيرت بنسبة ${expPct.toFixed(1)}%.`);
    if (Number.isFinite(netPct)) flipInsights.push(`صافي الربح تغير بنسبة ${netPct.toFixed(1)}%.`);
  }

  const prepareChartsForPrint = () => {
    const charts = document.querySelectorAll('canvas');
    charts.forEach((chart) => {
      const img = document.createElement('img');
      img.src = chart.toDataURL('image/png');
      img.className = 'chart-print-img';
      chart.replaceWith(img);
    });
  };

  const handleExportReport = async () => {
    if (!compareRef.current) return;
    prepareChartsForPrint();
    const element = compareRef.current;
    const canvas = await html2canvas(element, { scale: 3 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.setFontSize(12);
    pdf.text('تقرير مقارنة قائمة الدخل', margin, 12, { align: 'left' });
    pdf.text(`السنة ${compareYear1} مقابل ${compareYear2}`, margin, 18, { align: 'left' });
    pdf.addImage(imgData, 'PNG', margin, 24, imgWidth, imgHeight);
    pdf.save(`comparison-${compareYear1}-vs-${compareYear2}.pdf`);
  };

  const handlePrintReport = () => {
    prepareChartsForPrint();
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleNoteChange = (key, value) => {
    setNoteRefs((prev) => ({ ...prev, [key]: value }));
  };

  const clearOverride2025 = () => {
    setOverride2025({});
    try {
      localStorage.removeItem(OVERRIDE_KEY);
    } catch (e) {
      console.warn('Failed to clear 2025 override', e);
    }
  };

  const toggleNode = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderNode = (node, depth = 0) => {
    const isSection = node.type === 'section';
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = expanded[node.key] !== false;
    const rowClass =
      (node.highlight === 'green' ? 'bg-green-50 text-green-900' : '') ||
      (node.highlight === 'blue' ? 'bg-blue-50 text-blue-900' : '');

    return (
      <React.Fragment key={node.key}>
        <tr className={`${node.bold ? 'font-bold' : ''} ${rowClass}`}>
          <td
            className="p-3 text-gray-900"
            style={{ paddingRight: depth * 16 + 12 }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.key)}
                className="mr-2 text-blue-700 font-bold"
              >
                {isExpanded ? '−' : '+'}
              </button>
            ) : (
              <span className="mr-6" />
            )}
            {node.label}
          </td>
          <td className="p-2 text-center">
            <input
              className="w-full text-center border border-transparent focus:border-blue-400 rounded px-2 py-1 bg-gray-50"
              value={noteRefs[node.key] || ''}
              onChange={(e) => handleNoteChange(node.key, e.target.value)}
              placeholder="—"
            />
          </td>
          {YEARS.map((y) =>
            node.type === 'calc'
              ? renderComputedCell(y, metricsByYear[y][node.key], { asExpense: node.asExpense })
              : node.type === 'input'
              ? renderEditableCell(y, node.key, { asExpense: node.asExpense })
              : renderComputedCell(y, 0, {})
          )}
        </tr>
        {hasChildren && isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  const isNetLoss2025 = getMetrics(2025).netIncome < 0;
  const netLabel = 'صافي ربح / (خسارة) السنة';
  const compLabel = 'صافي الدخل الشامل';

  return (
    <div id="is-page" className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body, html { background: white !important; }
          nav, header, footer, button, .no-print, .bg-gray-50, .bg-gray-100 { display: none !important; }
          .print-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; }
          .print-table th, .print-table td { padding: 6px 8px; border: 1px solid #ccc; font-size: 12px; white-space: nowrap; }
          .print-table { width: 100%; border-collapse: collapse; }
          .chart-print-img { width: 100% !important; height: auto !important; }
          .print-highlight-diff { background: #fefce8 !important; }
          .print-highlight-pct { background: #eef2ff !important; }
        }
      `}</style>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">قائمة الدخل</h1>
          <p className="text-gray-500 text-sm mt-1">البيانات التاريخية والتقديرية (2020 - 2025)</p>
          <p className="text-gray-600 text-xs mt-1">Haitham Saqr – CFO, Bonyan</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isNetLoss2025 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-800'}`}>
              {isNetLoss2025 ? 'يوجد صافي خسارة في 2025' : 'صافي ربح في 2025'}
            </span>
            {(turnedToLoss || turnedToProfit) && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {turnedToLoss ? 'تحول من ربح إلى خسارة' : 'تحول من خسارة إلى ربح'}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSaveSnapshot}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving' ? 'جاري الحفظ...' : 'حفظ في قاعدة البيانات'}
          </button>
          {saveState === 'ok' && <span className="text-sm text-emerald-600">تم الحفظ</span>}
          {saveState === 'error' && <span className="text-sm text-red-600">تعذر الحفظ</span>}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <label className="text-sm text-gray-600">السنة 1</label>
            <select
              className="border border-gray-200 rounded px-2 py-1 text-sm"
              value={compareYear1}
              onChange={(e) => setCompareYear1(Number(e.target.value))}
            >
              {YEARS.slice().reverse().map((y) => (
                <option key={`y1-${y}`} value={y}>{y}</option>
              ))}
            </select>
            <label className="text-sm text-gray-600">السنة 2</label>
            <select
              className="border border-gray-200 rounded px-2 py-1 text-sm"
              value={compareYear2}
              onChange={(e) => setCompareYear2(Number(e.target.value))}
            >
              {YEARS.slice().reverse().map((y) => (
                <option key={`y2-${y}`} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={resetAllData}
            className="flex items-center gap-2 bg-amber-500 text-white px-3 py-2 rounded-lg hover:bg-amber-600"
          >
            <RotateCw size={16} />
            <span>مسح البيانات المخزنة</span>
          </button>
          <button
            onClick={clearOverride2025}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 border border-gray-200"
          >
            <span>إزالة تعديلات 2025</span>
          </button>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Download size={18} />
            <span>تصدير تقرير المقارنة</span>
          </button>
        </div>
      </div>

      {/* ملخص تنفيذي سريع */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-gray-100 rounded-xl p-4">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">اتجاه الإيرادات</div>
          <div className="text-sm text-gray-800 font-semibold">{revenueTrendNote}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">تطور الربحية</div>
          <div className="text-sm text-gray-800 font-semibold">{profitabilityNote}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">سبب الانعكاس في 2025</div>
          <div className="text-sm text-amber-700 font-semibold">{lossNote2025}</div>
        </div>
      </div>

      {(turnedToLoss || turnedToProfit) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 space-y-1">
          <div className="font-bold text-sm">{turnedToLoss ? 'تنبيه: تحول من ربح إلى خسارة في 2025' : 'تحسن: تحول من خسارة إلى ربح في 2025'}</div>
          <ul className="list-disc pr-5 text-xs space-y-1">
            {flipInsights.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full text-xs text-right border border-gray-200 rounded-xl">
          <thead className="text-gray-800">
            <tr className="bg-gray-50">
              <th className="p-3 min-w-[140px] text-center text-sm">البيان</th>
              <th className="p-3 min-w-[80px] text-center text-sm">إيضاح</th>
              {YEARS.map((y) => (
                <th key={`date-${y}`} className={`p-3 min-w-[140px] text-center font-semibold text-sm ${y === 2025 ? 'bg-amber-50 text-amber-800' : ''}`}>
                  31-Dec {y}
                </th>
              ))}
            </tr>
            <tr className="border-b bg-white text-gray-600">
              <th className="p-2 text-center">—</th>
              <th className="p-2 text-center">—</th>
              {YEARS.map((y) => (
                <th key={`currency-${y}`} className="p-2 text-center">
                  ريال سعودي
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* رأس قسم البنود الرئيسية */}
            <tr className="bg-gray-100">
              <td colSpan={8} className="px-4 py-2 font-bold text-gray-800">
                البنود الرئيسية
              </td>
            </tr>

            {/* البنود الأساسية */}
          {[
            { key: 'revenue', label: 'الإيرادات' },
            { key: 'cogs', label: 'تكلفة الإيرادات', asExpense: true },
            { key: 'grossProfit', label: 'مجمل الربح / (الخسارة)', isTotal: true, rowClass: 'bg-blue-50 font-bold text-blue-900' },
            { key: 'expenses', label: 'المصاريف العمومية والإدارية', asExpense: true },
            { key: 'mainOpsProfit', label: 'الربح التشغيلي / (الخسارة التشغيلية)', isTotal: true, rowClass: 'bg-blue-50 font-bold text-blue-900' },
            { key: 'otherIncome', label: 'الإيرادات الأخرى / المصروفات الأخرى' },
            { key: 'netBeforeZakat', label: 'الربح قبل الزكاة', isTotal: true, rowClass: 'bg-blue-50 font-bold text-blue-900' },
            { key: 'zakat', label: 'الزكاة الشرعية وضريبة الدخل', asExpense: true },
            {
              key: 'netIncome',
              label: netLabel,
              isTotal: true,
              rowClass: `font-bold ${getMetrics(2025).netIncome < 0 ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-900'}`,
            },
            // البنود التي لن يتم إعادة تصنيفها إلى ربح أو خسارة
            {
              key: 'ociRemeasurement',
              label: 'إعادة قياس التزام منافع الموظفين',
              asExpense: false,
            },
            {
              key: 'comprehensiveIncome',
              label: compLabel,
              isTotal: true,
              rowClass: `font-bold ${getMetrics(2025).netIncome < 0 ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-900'}`,
            },
            ].map((row) => (
              <tr key={row.key} className={row.rowClass || ''}>
                <td className="p-3 text-gray-900">{row.label}</td>
                <td className="p-2 text-center">
                  <input
                    className="w-full text-center border border-transparent focus:border-blue-400 rounded px-2 py-1 bg-gray-50"
                    value={noteRefs[row.key] || ''}
                    onChange={(e) => handleNoteChange(row.key, e.target.value)}
                    placeholder="—"
                  />
                </td>
                {YEARS.map((y) =>
                  row.isTotal
                    ? row.key === 'netIncome'
                      ? renderNetIncomeCell(y)
                      : renderComputedCell(y, metricsByYear[y][row.key], { asExpense: row.asExpense })
                    : renderEditableCell(y, row.key, { asExpense: row.asExpense })
                )}
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      {/* مؤشرات سريعة (هوامش) خارج الجدول */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-gray-800 mb-1">المؤشرات السريعة (هوامش %)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {YEARS.map((y) => {
            const m = marginMap[y] || {};
            const badge = (val, color) => (
              <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${color}`}>
                {Number.isFinite(val) ? `${val.toFixed(1)}%` : '—'}
              </span>
            );
            return (
              <div key={`margins-box-${y}`} className={`p-3 rounded-lg border ${y === 2025 ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>31-Dec {y}</span>
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-600">مجمل:</span>
                    {badge(m.gross, 'bg-blue-50 text-blue-700')}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-600">تشغيلي:</span>
                    {badge(m.operating, 'bg-purple-50 text-purple-700')}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-600">صافي:</span>
                    {badge(m.net, 'bg-green-50 text-green-700')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {turnedToLoss && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-sm">
          الخسارة في 2025 ناتجة عن تجاوز تكلفة الإيرادات لحجم الإيرادات (خسارة تشغيلية).
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-6 text-gray-800">اتجاه الإيرادات وصافي الربح</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="netArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="year"
                  angle={chartData.length > 6 ? -25 : 0}
                  textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                  height={chartData.length > 6 ? 50 : 30}
                />
                <YAxis
                  tickFormatter={(v) => formatShortNumber(v)}
                  domain={[
                    (dataMin) => dataMin * 0.9,
                    (dataMax) => dataMax * 1.1,
                  ]}
                />
                <Tooltip
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  formatter={(value, name, props) => {
                    const label = name === 'الإيرادات' ? 'الإيرادات' : 'صافي الربح';
                    return [formatShortCurrency(value), label];
                  }}
                  labelFormatter={(label, payload) => {
                    if (!payload || !payload.length) return `السنة ${label}`;
                    const item = payload[0].payload;
                    const revChange = item.revYOY !== null && item.revYOY !== undefined ? ` | تغير الإيرادات: ${item.revYOY.toFixed(1)}%` : '';
                    const netChange = item.netYOY !== null && item.netYOY !== undefined ? ` | تغير صافي الربح: ${item.netYOY.toFixed(1)}%` : '';
                    return `السنة ${label}${revChange}${netChange}`;
                  }}
                  separator=" "
                  isAnimationActive
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '10px',
                  }}
                />
                {/* ظلال تحت الخطوط */}
                <Area type="monotone" dataKey="revenue" stroke="none" fill="url(#revArea)" isAnimationActive={false} />
                <Area type="monotone" dataKey="netIncome" stroke="none" fill="url(#netArea)" isAnimationActive={false} />
                {/* خطوط الاتجاه */}
                <Line
                  type="monotone"
                  dataKey="revTrend"
                  stroke="#2563eb"
                  strokeDasharray="4 4"
                  dot={false}
                  name="اتجاه الإيرادات"
                  isAnimationActive={false}
                  strokeOpacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="netTrend"
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  dot={false}
                  name="اتجاه صافي الربح"
                  isAnimationActive={false}
                  strokeOpacity={0.5}
                />
                {/* السلاسل الرئيسية */}
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="الإيرادات"
                  stroke="#1d4ed8"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 1, stroke: '#1d4ed8', fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#1d4ed8', fill: '#bfdbfe' }}
                  animationBegin={200}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                />
                <Line
                  type="monotone"
                  dataKey="netIncome"
                  name="صافي الربح"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 1, stroke: '#059669', fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#059669', fill: '#bbf7d0' }}
                  animationBegin={200}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">ملخص الأداء</h3>
              <button
                onClick={() => setShowDefinitions((prev) => !prev)}
                className="text-xs px-3 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                {showDefinitions ? 'إخفاء التعريفات' : 'إظهار التعريفات'}
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">معدل النمو السنوي المركب للإيرادات (CAGR)</span>
                  <span className="font-bold text-blue-700 text-xl">{revenueCAGR || 0}%</span>
                </div>
                {showDefinitions && (
                  <p className="text-xs text-blue-800/70 leading-5">
                    يُحسب كجذر لنسبة (إيرادات 2025 ÷ إيرادات 2020) مطروحاً منه 1. يقيس النمو المركب عبر الفترة.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3 bg-purple-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">CAGR لصافي الربح</span>
                  <span className="font-bold text-purple-700 text-xl">{netCAGR || 0}%</span>
                </div>
                {showDefinitions && (
                  <p className="text-xs text-purple-800/70 leading-5">
                    يُحسب كجذر لنسبة (صافي ربح 2025 ÷ صافي ربح 2020) مطروحاً منه 1. {netCAGRNote}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">هامش صافي الربح (2025)</span>
                  <span className={`font-bold text-xl ${isNetLoss2025 ? 'text-rose-700' : 'text-green-700'}`}>
                    {metricsByYear[2025].revenue
                      ? ((metricsByYear[2025].netIncome / metricsByYear[2025].revenue) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                {showDefinitions && (
                  <p className="text-xs text-green-800/70 leading-5">
                    صافي الربح ÷ الإيرادات لعام 2025 لقياس الربحية النهائية.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="font-bold mb-4">تحليل النمو السنوي (YOY)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="pb-2 text-right">السنة</th>
                    <th className="pb-2 text-left">نمو الإيرادات</th>
                    <th className="pb-2 text-left">نمو مجمل الربح</th>
                    <th className="pb-2 text-left">نمو صافي الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {yoyData.map((row) => (
                    <tr key={row.year} className="border-b last:border-0">
                      <td className="py-2 font-medium">{row.year}</td>
                      <td className="py-2 ltr text-left" dir="ltr">
                        {Number.isFinite(row.revenue) ? `${row.revenue.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 ltr text-left" dir="ltr">
                        {Number.isFinite(row.grossProfit) ? `${row.grossProfit.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 ltr text-left" dir="ltr">
                        {Number.isFinite(row.netIncome) ? `${row.netIncome.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-4 text-gray-800">هوامش الربحية</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip
                  formatter={(v, name) => [`${Number.isFinite(v) ? v.toFixed(1) : '—'}%`, name]}
                  labelFormatter={(label) => `السنة ${label}`}
                />
                <Legend />
                <Bar dataKey="gross" name="هامش مجمل الربح" fill="#2563eb" />
                <Bar dataKey="operating" name="هامش الربح التشغيلي" fill="#f59e0b" />
                <Bar dataKey="net" name="هامش صافي الربح" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="py-2 text-right">السنة</th>
                  <th className="py-2 text-left">هامش مجمل الربح</th>
                  <th className="py-2 text-left">هامش الربح التشغيلي</th>
                  <th className="py-2 text-left">هامش صافي الربح</th>
                </tr>
              </thead>
              <tbody>
                {margins.map((m) => (
                  <tr key={m.year} className="border-b last:border-0">
                    <td className="py-2 font-medium">{m.year}</td>
                    <td className="py-2 ltr text-left" dir="ltr">{Number.isFinite(m.gross) ? `${m.gross.toFixed(1)}%` : '—'}</td>
                    <td className="py-2 ltr text-left" dir="ltr">{Number.isFinite(m.operating) ? `${m.operating.toFixed(1)}%` : '—'}</td>
                    <td className="py-2 ltr text-left" dir="ltr">{Number.isFinite(m.net) ? `${m.net.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-4 text-gray-800">تحليل البنود الرئيسية</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span>اتجاه الإيرادات</span>
              <span className="font-mono">{formatCurrency(metricsByYear[2025].revenue)}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span>تكلفة الإيرادات (2025)</span>
              <span className="font-mono">{formatCurrency(metricsByYear[2025].cogs)}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span>المصاريف العمومية والإدارية (2025)</span>
              <span className="font-mono">{formatCurrency(metricsByYear[2025].expenses)}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span>صافي الربح (2025)</span>
              <span className="font-mono">{formatCurrency(metricsByYear[2025].netIncome)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* مقارنة بين سنتين */}
      <div ref={compareRef} className="space-y-6 bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="text-blue-600" size={18} />
          <h3 className="text-lg font-bold text-gray-900">المقارنة بين سنتين</h3>
        </div>

        {/* جدول المقارنة */}
        {(() => {
          const y1 = compareYear1;
          const y2 = compareYear2;
          const m1 = getMetrics(y1);
          const m2 = getMetrics(y2);
          const rows = [
            { key: 'revenue', label: 'الإيرادات' },
            { key: 'cogs', label: 'تكلفة الإيرادات', asExpense: true },
            { key: 'grossProfit', label: 'مجمل الربح' },
            { key: 'expenses', label: 'المصاريف العمومية والإدارية', asExpense: true },
            { key: 'mainOpsProfit', label: 'الربح التشغيلي' },
            { key: 'netIncome', label: 'صافي الربح' },
          ];
          const compareRows = rows.map((r) => {
            const v1 = m1[r.key] || 0;
            const v2 = m2[r.key] || 0;
            const diff = v2 - v1;
            const pct = v1 ? (diff / v1) * 100 : 0;
            return { ...r, v1, v2, diff, pct };
          });

          const margin = (num) => `${(num || 0).toFixed(1)}%`;
          const marginTable = [
            { label: 'هامش مجمل الربح', v1: m1.revenue ? (m1.grossProfit / m1.revenue) * 100 : 0, v2: m2.revenue ? (m2.grossProfit / m2.revenue) * 100 : 0 },
            { label: 'هامش الربح التشغيلي', v1: m1.revenue ? (m1.mainOpsProfit / m1.revenue) * 100 : 0, v2: m2.revenue ? (m2.mainOpsProfit / m2.revenue) * 100 : 0 },
            { label: 'هامش صافي الربح', v1: m1.revenue ? (m1.netIncome / m1.revenue) * 100 : 0, v2: m2.revenue ? (m2.netIncome / m2.revenue) * 100 : 0 },
            { label: 'معدل نمو الإيرادات', v1: 0, v2: compareYear1 ? calculateGrowth(m2.revenue, m1.revenue) : 0 },
          ].map((r) => ({ ...r, diff: r.v2 - r.v1 }));

          // Insights بسيطة
          const insights = [];
          const revenuePct = compareRows[0]?.pct || 0;
          const netPct = compareRows[compareRows.length - 1]?.pct || 0;
          const gpPct = compareRows.find(r => r.key === 'grossProfit')?.pct || 0;
          if (revenuePct > 0) insights.push(`الإيرادات ارتفعت بنسبة ${revenuePct.toFixed(1)}%، مما يشير إلى توسع النشاط.`);
          if (netPct < 0) insights.push(`صافي الربح انخفض بنسبة ${Math.abs(netPct).toFixed(1)}%، راجع المصاريف أو الهوامش.`);
          if (gpPct > 0) insights.push(`تحسن مجمل الربح بنسبة ${gpPct.toFixed(1)}% يعكس تحسن تكلفة الإيرادات.`);
          if (insights.length === 0) insights.push('لا توجد فروق جوهرية بين السنتين المختارتين.');

          const barData = [
            { name: 'الإيرادات', [y1]: m1.revenue, [y2]: m2.revenue },
            { name: 'صافي الربح', [y1]: m1.netIncome, [y2]: m2.netIncome },
          ];
          const marginData = [
            { name: 'هامش مجمل الربح', [y1]: marginTable[0].v1, [y2]: marginTable[0].v2 },
            { name: 'هامش الربح التشغيلي', [y1]: marginTable[1].v1, [y2]: marginTable[1].v2 },
            { name: 'هامش صافي الربح', [y1]: marginTable[2].v1, [y2]: marginTable[2].v2 },
          ];

          const badge = (pct) => (
            <span className={`px-2 py-1 rounded text-xs font-bold ${pct >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {pct >= 0 ? '↑' : '↓'} {pct.toFixed(1)}%
            </span>
          );

          const handleExportCompare = () => {
            if (!compareRef.current) return;
            html2canvas(compareRef.current).then((canvas) => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save(`comparison-${y1}-vs-${y2}.pdf`);
            });
          };

          return (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 print-section">
                <div className="text-sm text-gray-600">
                  مقارنة بين {y1} و {y2}
                </div>
                <button
                  onClick={handleExportCompare}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700"
                >
                  <Download size={16} />
                  <span>تصدير المقارنة PDF</span>
                </button>
              </div>

              <div className="overflow-auto border border-gray-100 rounded-xl print-section">
                <table className="w-full text-sm text-right print-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">البند</th>
                      <th className="p-3 text-center">{y1}</th>
                      <th className="p-3 text-center">{y2}</th>
                      <th className="p-3 text-center">الفرق</th>
                      <th className="p-3 text-center">نسبة التغير %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {compareRows.map((row) => (
                      <tr key={row.key}>
                        <td className="p-3 font-medium text-gray-800">{row.label}</td>
                        <td className="p-3 text-center font-mono text-xs">{formatCurrency(row.v1)}</td>
                        <td className="p-3 text-center font-mono text-xs">{formatCurrency(row.v2)}</td>
                        <td className={`p-3 text-center font-mono text-xs ${row.diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(row.diff)}
                        </td>
                        <td className="p-3 text-center">
                          {badge(row.pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 print-section chart-printable">
                  <h4 className="font-bold mb-3 text-gray-800">مقارنة الإيرادات وصافي الربح</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(v, n) => [formatCurrency(v), n]} />
                        <Legend />
                        <Bar dataKey={y1} name={`${y1}`} fill="#2563eb" />
                        <Bar dataKey={y2} name={`${y2}`} fill="#16a34a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 print-section chart-printable">
                  <h4 className="font-bold mb-3 text-gray-800">هوامش الربحية</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marginData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(v, n) => [`${(Number(v) || 0).toFixed(1)}%`, n]} />
                        <Legend />
                        <Bar dataKey={y1} name={`${y1}`} fill="#f59e0b" />
                        <Bar dataKey={y2} name={`${y2}`} fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="overflow-auto border border-gray-100 rounded-xl print-section">
                <table className="w-full text-sm text-right print-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">النسبة</th>
                      <th className="p-3 text-center">{y1}</th>
                      <th className="p-3 text-center">{y2}</th>
                      <th className="p-3 text-center">الفرق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {marginTable.map((r, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium text-gray-800">{r.label}</td>
                        <td className="p-3 text-center font-mono text-xs">{margin(r.v1)}</td>
                        <td className="p-3 text-center font-mono text-xs">{margin(r.v2)}</td>
                        <td className={`p-3 text-center font-mono text-xs ${r.diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {margin(r.diff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl p-4 space-y-2 print-section">
                <h4 className="font-bold">ملاحظات تحليلية</h4>
                <ul className="list-disc pr-4 space-y-1 text-sm">
                  {insights.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

