import React, { useEffect, useMemo, useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine,
  LabelList,
  Cell,
} from 'recharts';
import { Download, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { statementsAPI } from '../api/client';

export default function CashFlow() {
  const { historicalIS, historicalBS, data2025 } = useFinancial();

  const years = [2020, 2021, 2022, 2023, 2024, 2025];

  // تخزين التعديلات اليدوية (لا تؤثر على IS/BS)
  const STORAGE_KEY = 'cf_overrides';
  const [overrides, setOverrides] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch (e) {
      // ignore
    }
  }, [overrides]);

  // طي/فتح الأقسام
  const [expanded, setExpanded] = useState({
    op: true,
    inv: true,
    fin: true,
  });
  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const [saveState, setSaveState] = useState('idle');

  // Combine data
  const getIS = (year) => year === 2025 ? data2025.is : historicalIS[year];
  const getBS = (year) => year === 2025 ? data2025.bs : historicalBS[year];

  const setOverride = (year, key, value) => {
    setOverrides((prev) => {
      const next = { ...prev };
      next[year] = { ...(next[year] || {}), [key]: value };
      return next;
    });
  };

  const getVal = (year, key, base) => {
    const o = overrides?.[year]?.[key];
    if (o === undefined || o === null || o === '') return base;
    return o;
  };

  const parseInput = (txt) => {
    if (txt === null || txt === undefined) return null;
    const cleaned = String(txt).replace(/[,\s]/g, '');
    const v = parseFloat(cleaned);
    return Number.isFinite(v) ? v : null;
  };

  const formatShortNumber = (num) => {
    if (!Number.isFinite(num)) return '';
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(1);
  };

  const EditableCell = ({ year, baseValue, ovKey }) => {
    const display = getVal(year, ovKey, baseValue);
    const userAdjusted = overrides?.[year]?.[ovKey] !== undefined && overrides?.[year]?.[ovKey] !== null;
    return (
      <td className="p-2 text-center align-middle">
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const v = parseInput(e.currentTarget.textContent);
            if (v === null) return;
            setOverride(year, ovKey, v);
            e.currentTarget.innerText = v.toLocaleString();
          }}
          className={`min-w-[110px] px-2 py-1 rounded-md bg-gray-50 border border-transparent hover:border-blue-200 focus:border-blue-400 focus:outline-none text-right font-mono text-xs ${userAdjusted ? 'text-blue-700' : 'text-gray-800'}`}
        >
          {Number(display).toLocaleString()}
        </div>
        {userAdjusted && <div className="text-[11px] text-blue-600 mt-1">قيمة مخصّصة</div>}
      </td>
    );
  };

  const calculateCashFlow = () => {
    return years.map((year, index) => {
      if (index === 0) return { year, operating: 0, investing: 0, financing: 0, netChange: 0 }; // No prior year for 2020

      const prevYear = years[index - 1];
      const is = getIS(year);
      const bs = getBS(year);
      const prevBs = getBS(prevYear);

      // Operating Activities
      const calculatedNetIncome =
        (is.revenue || 0) -
        (is.cogs || 0) -
        (is.expenses || 0) -
        (is.depreciation || 0) +
        (is.otherIncome || 0) -
        (is.zakat || 0);

      const netIncome = getVal(year, 'netIncome', calculatedNetIncome);
      const depreciation = getVal(year, 'depreciation', is.depreciation || 0);

      const changeAR = getVal(
        year,
        'changeAR',
        (bs.currentAssets || 0) - (prevBs.currentAssets || 0)
      );
      const changeAP = getVal(
        year,
        'changeAP',
        (bs.currentLiabilities || 0) - (prevBs.currentLiabilities || 0)
      );

      // Increase in Assets consumes cash (-)
      // Increase in Liabilities generates cash (+)
      const operatingCash = calculatedNetIncome + depreciation - changeAR + changeAP;

      // Investing Activities
      // Change in Fixed Assets
      const changeFixedAssets = getVal(
        year,
        'changeFixedAssets',
        (bs.fixedAssets || 0) - (prevBs.fixedAssets || 0)
      );
      const investingCash = -changeFixedAssets; // Increase is outflow

      // Financing Activities
      // Change in Long Term Debt + Equity Changes (excluding Net Income)
      const changeLTD = getVal(
        year,
        'changeLTD',
        (bs.longTermLiabilities || 0) - (prevBs.longTermLiabilities || 0)
      );
      const changeEquity = getVal(
        year,
        'changeEquity',
        (bs.equity || 0) - (prevBs.equity || 0)
      );
      // Equity Change = Net Income + Capital/Dividends. 
      // Financing part is just Capital/Dividends = Total Change - Net Income
      const financingCashFromEquity = changeEquity - calculatedNetIncome; 
      
      const financingCash = changeLTD + financingCashFromEquity;

      const openingCash = prevBs?.cashBank || 0;
      const closingCash = bs?.cashBank || 0;
      const netChangeCash = closingCash - openingCash;

      return {
        year,
        netIncome,
        depreciation,
        changeAR,
        changeAP,
        changeFixedAssets,
        changeLTD,
        changeEquity,
        operating: operatingCash,
        investing: investingCash,
        financing: financingCash,
        netChange: operatingCash + investingCash + financingCash,
        openingCash,
        closingCash,
        netChangeCash,
        systemNetIncome: calculatedNetIncome,
      };
    });
  };

  const cashFlowData = useMemo(() => calculateCashFlow(), [historicalIS, historicalBS, data2025, overrides]);

  const exportPDF = () => {
    const input = document.getElementById('cf-page');
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save("cash_flow.pdf");
    });
  };

  const yoyByKey = (key, idx) => {
    if (idx === 0) return { abs: null, pct: null };
    const cur = cashFlowData[idx][key];
    const prev = cashFlowData[idx - 1][key];
    const abs = cur - prev;
    const pct = prev !== 0 ? (abs / Math.abs(prev)) * 100 : null;
    return { abs, pct };
  };

  const ocfNetIncomeRatio = useMemo(() => {
    const d = cashFlowData.find((x) => x.year === 2025);
    if (!d || !d.netIncome) return null;
    return d.operating / d.netIncome;
  }, [cashFlowData]);

  const financingDependency = useMemo(() => {
    const d = cashFlowData.find((x) => x.year === 2025);
    if (!d) return null;
    const inflows = Math.max(0, d.operating) + Math.max(0, d.financing);
    return inflows ? (d.financing / inflows) : null;
  }, [cashFlowData]);

  const waterfallData = useMemo(() => {
    const d = cashFlowData.find((x) => x.year === 2025) || {};
    const steps = [
      { name: 'Opening', value: d.openingCash || 0 },
      { name: 'Operating', value: d.operating || 0 },
      { name: 'Investing', value: d.investing || 0 },
      { name: 'Financing', value: d.financing || 0 },
      { name: 'Closing', value: d.closingCash || 0 },
    ];
    let cum = 0;
    const mapped = steps.map((s, idx) => {
      if (idx === 0) cum = s.value;
      else if (idx < steps.length - 1) cum += s.value;
      else cum = s.value; // closing
      const type = s.name.toLowerCase();
      const sign = s.value >= 0 ? 'positive' : 'negative';
      const color =
        type === 'opening' || type === 'closing'
          ? '#9ca3af'
          : sign === 'positive'
            ? (type === 'operating' ? '#16a34a' : type === 'investing' ? '#22c55e' : '#0ea5e9')
            : (type === 'operating' ? '#ef4444' : type === 'investing' ? '#f97316' : '#3b82f6');
      const tag =
        type === 'operating'
          ? (sign === 'positive' ? 'Operating Contribution' : 'Operating Loss Impact')
          : type === 'investing'
            ? (sign === 'positive' ? 'Asset Release / Proceeds' : 'Capex / Asset Movement')
            : type === 'financing'
              ? (sign === 'positive' ? 'Financing Support' : 'Financing Outflow')
              : (type === 'opening' ? 'Opening Cash' : 'Closing Cash');
      return { ...s, cum, type, sign, color, tag };
    });
    return mapped;
  }, [cashFlowData]);


  const insightText = useMemo(() => {
    const d = cashFlowData.find((x) => x.year === 2025);
    if (!d) return 'لا يوجد بيانات كافية للتحليل.';
    const ocf = d.operating;
    const ni = d.netIncome;
    const ratio = ocfNetIncomeRatio;
    if (ratio !== null && ratio < 0 && ni > 0) {
      return 'التدفق التشغيلي سلبي رغم الأرباح، ما يشير إلى ضغط رأس مال عامل واعتماد أكبر على السيولة غير التشغيلية.';
    }
    if (ratio !== null && ratio > 1) {
      return 'التدفق التشغيلي يغطي صافي الربح بشكل مريح، ما يعكس جودة أرباح نقدية جيدة.';
    }
    if (ocf < 0 && d.financing > 0) {
      return 'السيولة مدعومة بالتمويل لتعويض التدفق التشغيلي السلبي؛ يحتاج مراقبة الاعتماد على التمويل.';
    }
    return 'التدفقات التشغيلية متماشية إجمالاً مع الربحية، مع مراقبة التغيرات في رأس المال العامل.';
  }, [cashFlowData, ocfNetIncomeRatio]);

  const badge = useMemo(() => {
    const d = cashFlowData.find((x) => x.year === 2025);
    if (!d) return null;
    const result =
      d.operating < 0 && d.financing > 0
        ? { text: 'Financing-Driven Liquidity', tone: 'blue' }
        : d.operating < 0
          ? { text: 'Operating Cash Negative', tone: 'amber' }
          : { text: 'Healthy Operating Cash', tone: 'green' };
    return result;
  }, [cashFlowData]);

  const handleSaveSnapshot = async () => {
    try {
      setSaveState('saving');
      await statementsAPI.save({
        statementType: 'cash_flow',
        year: 2025,
        data: {
          overrides,
          cashFlowData,
          wcSummary,
          insightText,
          badge,
        },
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e) {
      console.error('Save cash flow error', e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  };

  return (
    <div id="cf-page" className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">قائمة التدفقات النقدية</h1>
          <p className="text-gray-500 text-sm mt-1">محسوبة بالطريقة غير المباشرة مع إمكانية التعديل اليدوي (ما-إذا)</p>
          <p className="text-gray-600 text-xs mt-1">Haitham Saqr – CFO, Bonyan</p>
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
          <button onClick={exportPDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download size={18} />
            <span>تصدير PDF</span>
          </button>
        </div>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-white border border-gray-100 rounded-xl p-4">
        <div>
          <div className="text-xs text-gray-500">التدفق التشغيلي (2025)</div>
          <div className={`text-xl font-bold ${cashFlowData[5]?.operating >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {cashFlowData[5]?.operating?.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Cash Flow ÷ Net Income</div>
          <div className="text-xl font-bold text-gray-800">
            {ocfNetIncomeRatio !== null ? ocfNetIncomeRatio.toFixed(2) : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">صافي التغير في النقدية (2025)</div>
          <div className={`text-xl font-bold ${cashFlowData[5]?.netChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {cashFlowData[5]?.netChange?.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">اعتماد على التمويل</div>
          <div className="text-xl font-bold text-gray-800">
            {financingDependency !== null ? `${(financingDependency * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>


      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-4 min-w-[150px]">البند (بالريال)</th>
              {cashFlowData.slice(1).map(d => (
                <th key={d.year} className={`p-4 min-w-[100px] ${d.year === 2025 ? 'bg-blue-50 text-blue-800' : ''}`}>
                  {d.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* Operating */}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={7} className="p-2 text-gray-600 flex items-center justify-between">
                <span>الأنشطة التشغيلية</span>
                <button onClick={() => toggle('op')} className="flex items-center gap-2 text-xs text-gray-600">
                  <ChevronDown className={`transition-transform ${expanded.op ? 'rotate-0' : '-rotate-90'}`} size={14} /> {expanded.op ? 'إخفاء' : 'إظهار'}
                </button>
              </td>
            </tr>
            {expanded.op && (
              <>
            <tr>
              <td className="p-4">صافي الربح</td>
              {cashFlowData.slice(1).map(d => (
                <EditableCell key={d.year} year={d.year} baseValue={d.systemNetIncome} ovKey="netIncome" />
              ))}
            </tr>
            <tr>
              <td className="p-4">الإهلاك</td>
              {cashFlowData.slice(1).map(d => (
                <EditableCell key={d.year} year={d.year} baseValue={d.depreciation} ovKey="depreciation" />
              ))}
            </tr>
            <tr>
              <td className="p-4">التغير في الذمم/الأصول المتداولة</td>
              {cashFlowData.slice(1).map(d => (
                <EditableCell key={d.year} year={d.year} baseValue={d.changeAR} ovKey="changeAR" />
              ))}
            </tr>
            <tr>
              <td className="p-4">التغير في الخصوم المتداولة</td>
              {cashFlowData.slice(1).map(d => (
                <EditableCell key={d.year} year={d.year} baseValue={d.changeAP} ovKey="changeAP" />
              ))}
            </tr>
            <tr className="bg-blue-50 font-bold text-blue-900">
              <td className="p-4">صافي التدفق من الأنشطة التشغيلية</td>
              {cashFlowData.slice(1).map(d => <td key={d.year} className="p-4 text-center">{d.operating.toLocaleString()}</td>)}
            </tr>
            <tr className="text-xs text-gray-500 bg-gray-50">
              <td className="p-3">التغير السنوي (YOY) - تشغيلي</td>
              {cashFlowData.slice(1).map((d, idx) => {
                const { abs, pct } = yoyByKey('operating', idx + 1);
                return (
                  <td key={`yoy-op-${d.year}`} className="p-3 text-center">
                    {abs !== null ? abs.toLocaleString() : '—'} {pct !== null ? `(${pct.toFixed(1)}%)` : ''}
                  </td>
                );
              })}
            </tr>
              </>
            )}

            {/* Investing */}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={7} className="p-2 text-gray-600 flex items-center justify-between">
                <span>الأنشطة الاستثمارية</span>
                <button onClick={() => toggle('inv')} className="flex items-center gap-2 text-xs text-gray-600">
                  <ChevronDown className={`transition-transform ${expanded.inv ? 'rotate-0' : '-rotate-90'}`} size={14} /> {expanded.inv ? 'إخفاء' : 'إظهار'}
                </button>
              </td>
            </tr>
            {expanded.inv && (
              <>
            <tr>
              <td className="p-4">التغير في الموجودات الثابتة</td>
              {cashFlowData.slice(1).map(d => (
                <EditableCell key={d.year} year={d.year} baseValue={d.changeFixedAssets} ovKey="changeFixedAssets" />
              ))}
            </tr>
            <tr className="bg-blue-50 font-bold text-blue-900">
              <td className="p-4">صافي التدفق من الأنشطة الاستثمارية</td>
              {cashFlowData.slice(1).map(d => <td key={d.year} className="p-4 text-center text-red-600" dir="ltr">{d.investing.toLocaleString()}</td>)}
            </tr>
            <tr className="text-xs text-gray-500 bg-gray-50">
              <td className="p-3">التغير السنوي (YOY) - استثماري</td>
              {cashFlowData.slice(1).map((d, idx) => {
                const { abs, pct } = yoyByKey('investing', idx + 1);
                return (
                  <td key={`yoy-inv-${d.year}`} className="p-3 text-center">
                    {abs !== null ? abs.toLocaleString() : '—'} {pct !== null ? `(${pct.toFixed(1)}%)` : ''}
                  </td>
                );
              })}
            </tr>
              </>
            )}

            {/* Financing */}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={7} className="p-2 text-gray-600 flex items-center justify-between">
                <span>الأنشطة التمويلية</span>
                <button onClick={() => toggle('fin')} className="flex items-center gap-2 text-xs text-gray-600">
                  <ChevronDown className={`transition-transform ${expanded.fin ? 'rotate-0' : '-rotate-90'}`} size={14} /> {expanded.fin ? 'إخفاء' : 'إظهار'}
                </button>
              </td>
            </tr>
            {expanded.fin && (
              <>
            <tr>
              <td className="p-4">التغير في الخصوم الطويلة الأجل</td>
              {cashFlowData.slice(1).map(d => (
                <EditableCell key={d.year} year={d.year} baseValue={d.changeLTD} ovKey="changeLTD" />
              ))}
            </tr>
            <tr>
              <td className="p-4">التغير في حقوق الملكية (باستبعاد صافي الربح)</td>
              {cashFlowData.slice(1).map(d => (
                <EditableCell key={d.year} year={d.year} baseValue={d.changeEquity} ovKey="changeEquity" />
              ))}
            </tr>
            <tr className="bg-blue-50 font-bold text-blue-900">
              <td className="p-4">صافي التدفق من الأنشطة التمويلية</td>
              {cashFlowData.slice(1).map(d => <td key={d.year} className="p-4 text-center">{d.financing.toLocaleString()}</td>)}
            </tr>
            <tr className="text-xs text-gray-500 bg-gray-50">
              <td className="p-3">التغير السنوي (YOY) - تمويلي</td>
              {cashFlowData.slice(1).map((d, idx) => {
                const { abs, pct } = yoyByKey('financing', idx + 1);
                return (
                  <td key={`yoy-fin-${d.year}`} className="p-3 text-center">
                    {abs !== null ? abs.toLocaleString() : '—'} {pct !== null ? `(${pct.toFixed(1)}%)` : ''}
                  </td>
                );
              })}
            </tr>
              </>
            )}

            {/* Net Change */}
            <tr className="bg-gray-800 text-white font-bold text-lg">
              <td className="p-4">صافي التغير في النقدية</td>
              {cashFlowData.slice(1).map(d => <td key={d.year} className="p-4 text-center" dir="ltr">{d.netChange.toLocaleString()}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* تم حذف الرسوم: تحليل التدفقات النقدية، نقد تشغيلي مقابل صافي الربح، وWaterfall لصافي التغير في النقدية (2025) بناءً على طلب المستخدم */}

    </div>
  );
}
