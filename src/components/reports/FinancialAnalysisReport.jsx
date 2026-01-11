/**
 * Financial Analysis Report - صفحة التحليل المالي الشامل
 * جدول نسب ديناميكي + رسوم بيانية عبر السنوات (2020–2025)
 */

import React, { useMemo, useState } from 'react';
import {
    TrendingUp,
    DollarSign,
    PieChart,
    BarChart3,
    Download,
    Activity,
    Info,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RTooltip,
    Legend as RLegend,
    ResponsiveContainer,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import { formatNumber } from '../../utils/trialBalanceUtils';

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

const METRICS_META = [
    {
        key: 'workingCapital',
        label: 'رأس المال العامل',
        formula: 'الأصول المتداولة - الخصوم المتداولة',
        format: 'currency',
    },
    {
        key: 'grossMargin',
        label: 'هامش مجمل الربح',
        formula: '(مجمل الربح ÷ الإيرادات) × 100',
        format: 'percent',
    },
    {
        key: 'operatingMargin',
        label: 'هامش التشغيل',
        formula: '(صافي التشغيل ÷ الإيرادات) × 100',
        format: 'percent',
    },
    {
        key: 'netMargin',
        label: 'هامش صافي الربح',
        formula: '(صافي الربح ÷ الإيرادات) × 100',
        format: 'percent',
    },
    {
        key: 'roa',
        label: 'العائد على الأصول (ROA)',
        formula: 'صافي الربح ÷ إجمالي الأصول',
        format: 'percent',
    },
    {
        key: 'roe',
        label: 'العائد على حقوق الملكية (ROE)',
        formula: 'صافي الربح ÷ حقوق الملكية',
        format: 'percent',
    },
    {
        key: 'currentRatio',
        label: 'نسبة التداول',
        formula: 'الأصول المتداولة ÷ الخصوم المتداولة',
        format: 'ratio',
    },
    {
        key: 'quickRatio',
        label: 'النسبة السريعة',
        formula: '(الأصول المتداولة - المخزون) ÷ الخصوم المتداولة',
        format: 'ratio',
    },
    {
        key: 'cashRatio',
        label: 'نسبة النقدية',
        formula: 'النقد وما في حكمه ÷ الخصوم المتداولة',
        format: 'ratio',
    },
    {
        key: 'debtToAssets',
        label: 'نسبة الدين إلى الأصول',
        formula: 'إجمالي الخصوم ÷ إجمالي الأصول',
        format: 'percent',
    },
    {
        key: 'debtToEquity',
        label: 'الدين إلى حقوق الملكية',
        formula: 'إجمالي الخصوم ÷ حقوق الملكية',
        format: 'ratio',
    },
    {
        key: 'equityRatio',
        label: 'نسبة حقوق الملكية',
        formula: 'حقوق الملكية ÷ إجمالي الأصول × 100',
        format: 'percent',
    },
    {
        key: 'assetTurnover',
        label: 'معدل دوران الأصول',
        formula: 'الإيرادات ÷ إجمالي الأصول',
        format: 'ratio',
    },
];

const RATIO_CONFIGS = {
    currentRatio: {
        label: 'نسبة السيولة الجارية',
        labelEn: 'Current Ratio',
        description: 'قدرة الشركة على سداد التزاماتها قصيرة الأجل',
        formula: 'الأصول المتداولة ÷ الخصوم المتداولة',
        goodRange: '>= 2',
        icon: Activity,
        format: 'ratio',
    },
    workingCapital: {
        label: 'رأس المال العامل',
        labelEn: 'Working Capital',
        description: 'الأصول المتداولة مطروحًا منها الخصوم المتداولة',
        formula: 'الأصول المتداولة - الخصوم المتداولة',
        goodRange: '> 0',
        icon: DollarSign,
        format: 'currency',
    },
    debtRatio: {
        label: 'نسبة المديونية',
        labelEn: 'Debt Ratio',
        description: 'نسبة الالتزامات من إجمالي الأصول',
        formula: 'إجمالي الخصوم ÷ إجمالي الأصول × 100',
        goodRange: '<= 50%',
        icon: PieChart,
        format: 'percent',
    },
    solvencyRatio: {
        label: 'نسبة الملاءة',
        labelEn: 'Solvency Ratio',
        description: 'قدرة الشركة على الوفاء بالتزاماتها طويلة الأجل',
        formula: '(الأصول - الخصوم) ÷ الأصول × 100',
        goodRange: '>= 30%',
        icon: TrendingUp,
        format: 'percent',
    },
    equityRatio: {
        label: 'نسبة حقوق الملكية',
        labelEn: 'Equity Ratio',
        description: 'نسبة حقوق الملكية من إجمالي الأصول',
        formula: 'حقوق الملكية ÷ إجمالي الأصول × 100',
        goodRange: '>= 40%',
        icon: BarChart3,
        format: 'percent',
    },
    debtToEquity: {
        label: 'الدين إلى حقوق الملكية',
        labelEn: 'Debt to Equity',
        description: 'نسبة الديون مقارنة بحقوق الملاك',
        formula: 'إجمالي الخصوم ÷ حقوق الملكية',
        goodRange: '<= 1',
        icon: BarChart3,
        format: 'ratio',
    },
    profitMargin: {
        label: 'هامش الربح',
        labelEn: 'Profit Margin',
        description: 'نسبة الربح من الإيرادات',
        formula: '(الإيرادات - التكاليف) ÷ الإيرادات × 100',
        goodRange: '>= 20%',
        icon: TrendingUp,
        format: 'percent',
    },
};

const formatValue = (val, type = 'percent') => {
    if (!Number.isFinite(val)) return 'غير متوفر';
    if (type === 'currency') return formatNumber(val);
    if (type === 'ratio') return val.toFixed(2);
    return `${val.toFixed(1)}%`;
};

function RatioCard({ name, value, evaluation, config }) {
    const Icon = config.icon;

    const getEvaluationColor = (eval_) => {
        switch (eval_) {
            case 'ممتاز': return 'bg-green-100 text-green-700';
            case 'جيد': return 'bg-blue-100 text-blue-700';
            case 'إيجابي': return 'bg-green-100 text-green-700';
            case 'منخفض': return 'bg-green-100 text-green-700';
            case 'متوسط': return 'bg-yellow-100 text-yellow-700';
            case 'ضعيف': return 'bg-red-100 text-red-700';
            case 'سلبي': return 'bg-red-100 text-red-700';
            case 'مرتفع': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Icon className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">{config.label}</h4>
                        <p className="text-xs text-gray-400">{config.labelEn}</p>
                    </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEvaluationColor(evaluation)}`}>
                    {evaluation}
                </span>
            </div>

            <div className="mb-4">
                <p className="text-3xl font-bold text-gray-800">{formatValue(value, config.format)}</p>
            </div>

            <div className="space-y-2 text-xs">
                <p className="text-gray-500">{config.description}</p>
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-medium">المعادلة:</span>
                    <span className="font-mono bg-gray-50 px-2 py-0.5 rounded">{config.formula}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-medium">المعيار:</span>
                    <span className="text-green-600">{config.goodRange}</span>
                </div>
            </div>
        </div>
    );
}

function YoYBadge({ curr, prev }) {
    if (!Number.isFinite(curr) || !Number.isFinite(prev)) return <span className="text-xs text-gray-400">N/A</span>;
    const diff = curr - prev;
    const pct = prev === 0 ? null : (diff / Math.abs(prev)) * 100;
    const positive = diff >= 0;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {pct !== null ? `${pct.toFixed(1)}%` : formatNumber(diff)}
        </span>
    );
}

function evaluateStatus(key, value) {
    if (!Number.isFinite(value)) return 'غير متوفر';
    switch (key) {
        case 'workingCapital':
            return value > 0 ? 'جيد' : 'خطر';
        case 'currentRatio':
        case 'quickRatio':
        case 'cashRatio':
            if (value >= 2) return 'جيد';
            if (value >= 1) return 'تحذير';
            return 'خطر';
        case 'grossMargin':
        case 'operatingMargin':
        case 'netMargin':
            if (value > 20) return 'جيد';
            if (value > 5) return 'تحذير';
            return 'خطر';
        case 'roa':
        case 'roe':
            if (value > 15) return 'جيد';
            if (value > 5) return 'تحذير';
            return 'خطر';
        case 'debtToAssets':
            if (value <= 40) return 'جيد';
            if (value <= 60) return 'تحذير';
            return 'خطر';
        case 'debtToEquity':
            if (value <= 1) return 'جيد';
            if (value <= 2) return 'تحذير';
            return 'خطر';
        case 'equityRatio':
            if (value >= 50) return 'جيد';
            if (value >= 30) return 'تحذير';
            return 'خطر';
        case 'assetTurnover':
            if (value >= 1) return 'جيد';
            if (value >= 0.5) return 'تحذير';
            return 'خطر';
        default:
            return 'تحذير';
    }
}

function liquidityNote(key, value) {
    if (!Number.isFinite(value)) return 'غير متوفر';
    const base = {
        currentRatio: ['ضغط سيولة محتمل', 'مقبول', 'ممتاز'],
        quickRatio: ['اعتماد على المخزون', 'مقبول', 'ممتاز'],
        cashRatio: ['اعتماد مرتفع على التحصيل', 'توازن نقدي', 'وفرة نقدية'],
    }[key] || ['ضعيف', 'مقبول', 'جيد'];

    if (key === 'cashRatio') {
        if (value >= 0.8) return base[2];
        if (value >= 0.3) return base[1];
        return base[0];
    }
    if (key === 'quickRatio') {
        if (value >= 1) return base[2];
        if (value >= 0.7) return base[1];
        return base[0];
    }
    if (key === 'currentRatio') {
        if (value >= 2) return base[2];
        if (value >= 1) return base[1];
        return base[0];
    }
    return base[1];
}

function workingCapitalNote(wc, ca, cl, yearLabel) {
    if (!Number.isFinite(wc) || !Number.isFinite(ca) || !Number.isFinite(cl)) return 'غير متوفر';
    if (wc < 0) return `رأس المال العامل في ${yearLabel} سالب؛ الالتزامات المتداولة تتجاوز الأصول المتداولة.`;
    if (wc < ca * 0.1) return `رأس المال العامل في ${yearLabel} منخفض؛ هامش الأمان النقدي محدود.`;
    return `رأس المال العامل في ${yearLabel} إيجابي ويوفر غطاء للالتزامات القصيرة.`;
}

export default function FinancialAnalysisReport({ financialSummary, financialRatios }) {
    const { historicalIS, historicalBS, data2025 } = useFinancial();
    const [range, setRange] = useState('all'); // all | last2 | last5
    const [ratioYear, setRatioYear] = useState(2025);
    const [showKpiExplain, setShowKpiExplain] = useState(false);

    const yearData = useMemo(() => {
        try {
            const map = {};
            const sumKeys = (obj, keys = []) => keys.reduce((sum, k) => sum + (Number(obj?.[k]) || 0), 0);

            YEARS.forEach((y) => {
                const isData = y === 2025 ? data2025?.is : historicalIS?.[y];
                const bsData = y === 2025 ? data2025?.bs : historicalBS?.[y];
                // نبني السنة حتى لو كانت بيانات الدخل غير متوفرة، طالما الميزانية موجودة
                if (!bsData) return;
                const safeIS = isData || {};

                // مرونة في أسماء الحقول لتفادي "غير متوفر" عند اختلاف التسمية
                const revenue = safeIS.revenue ?? safeIS.sales ?? safeIS.totalRevenue ?? null;
                const cogs = safeIS.cogs ?? safeIS.costOfSales ?? null;
                const expenses = safeIS.expenses ?? safeIS.operatingExpenses ?? 0;
                const depreciation = safeIS.depreciation ?? safeIS.dep ?? 0;
                const netIncomeRaw = safeIS.netIncome ?? safeIS.netProfit ?? safeIS.profitAfterTax ?? safeIS.pat ?? safeIS.profit ?? null;
                const netIncome = Number.isFinite(netIncomeRaw)
                    ? netIncomeRaw
                    : (Number.isFinite(revenue) && Number.isFinite(cogs)
                        ? (revenue - cogs - (Number.isFinite(expenses) ? expenses : 0) - (Number.isFinite(depreciation) ? depreciation : 0) - (isData.zakat ?? 0))
                        : null);

                // تجميع تلقائي للأصول/الخصوم المتداولة إذا لم تتوفر الإجماليات
                const autoCurrentAssets = sumKeys(bsData, ['cashBank', 'receivables', 'advancesOther', 'inventory', 'contractAssets']);
                const autoCurrentLiabilities = sumKeys(bsData, [
                    'payables',
                    'otherCurrentLiabilities',
                    'zakatTax',
                    'contractLiabilities',
                    'relatedPartyPayables',
                ]);

                const accumulatedDep = bsData.accumulatedDepreciation ?? bsData.accumDep ?? 0;
                const nonCurrentAssets =
                    (Number(bsData.propertyEquipment) || 0) - (accumulatedDep || 0) + (Number(bsData.otherNonCurrentAssets) || 0);
                const nonCurrentLiabilities = (Number(bsData.employeeBenefits) || 0) + (Number(bsData.nonCurrentLiabilities) || 0);

            const currentAssets =
                bsData.currentAssets ??
                bsData.currentAssetsTotal ??
                (autoCurrentAssets !== 0 ? autoCurrentAssets : 0);
            const currentLiabilities =
                bsData.currentLiabilities ??
                bsData.currentLiabilitiesTotal ??
                (autoCurrentLiabilities !== 0 ? autoCurrentLiabilities : 0);

            const totalAssets =
                bsData.totalAssets ??
                bsData.assetsTotal ??
                bsData.assets ??
                (Number.isFinite(currentAssets) ? currentAssets + nonCurrentAssets : 0);

            const totalLiabilities =
                bsData.totalLiabilities ??
                bsData.liabilitiesTotal ??
                (Number.isFinite(currentLiabilities) ? currentLiabilities + nonCurrentLiabilities : 0);

                const assets = totalAssets;
                const liabilities = totalLiabilities;

            const equity =
                bsData.equityTotal ??
                bsData.equity ??
                bsData.totalEquity ??
                ((Number(bsData.equityCapital) || 0) +
                    (Number(bsData.equityStatutoryReserve) || 0) +
                    (Number(bsData.retainedEarnings) || 0));

                const inventory = bsData.inventory ?? bsData.stocks ?? null;
                const cashBank =
                    bsData.cashBank ??
                    bsData.cash ??
                    bsData.cashAndCashEquivalents ??
                    (autoCurrentAssets ? sumKeys(bsData, ['cashBank', 'cash', 'cashAndCashEquivalents']) : null);
                const grossProfit = Number.isFinite(revenue) && Number.isFinite(cogs) ? revenue - cogs : null;

                const grossMargin = Number.isFinite(grossProfit) && revenue ? (grossProfit / revenue) * 100 : null;
                const operatingIncome = Number.isFinite(revenue) && Number.isFinite(cogs)
                    ? revenue - cogs - (Number.isFinite(expenses) ? expenses : 0)
                    : null;
                const operatingMargin = Number.isFinite(operatingIncome) && revenue ? (operatingIncome / revenue) * 100 : null;
                const netMargin = Number.isFinite(netIncome) && revenue ? (netIncome / revenue) * 100 : null;
                const roa = Number.isFinite(netIncome) && assets ? (netIncome / assets) * 100 : null;
                const roe = Number.isFinite(netIncome) && equity ? (netIncome / equity) * 100 : null;
                const currentRatio = Number.isFinite(currentAssets) && Number.isFinite(currentLiabilities) && currentLiabilities !== 0
                    ? currentAssets / currentLiabilities
                    : null;
                const quickNumerator = Number.isFinite(currentAssets)
                    ? currentAssets - (Number.isFinite(inventory) ? inventory : 0)
                    : null;
                const quickRatio = Number.isFinite(quickNumerator) && Number.isFinite(currentLiabilities) && currentLiabilities !== 0
                    ? quickNumerator / currentLiabilities
                    : null;
                const cashRatio = Number.isFinite(cashBank) && Number.isFinite(currentLiabilities) && currentLiabilities !== 0
                    ? cashBank / currentLiabilities
                    : null;
                const debtToAssets = Number.isFinite(liabilities) && Number.isFinite(assets) && assets !== 0
                    ? (liabilities / assets) * 100
                    : null;
                const debtToEquity = Number.isFinite(liabilities) && Number.isFinite(equity) && equity !== 0
                    ? liabilities / equity
                    : null;
                const equityRatio = Number.isFinite(equity) && Number.isFinite(assets) && assets !== 0
                    ? (equity / assets) * 100
                    : null;
                const assetTurnover = Number.isFinite(revenue) && Number.isFinite(assets) && assets !== 0 ? revenue / assets : null;
            const workingCapital = Number.isFinite(currentAssets) && Number.isFinite(currentLiabilities)
                ? currentAssets - currentLiabilities
                : 0;

                map[y] = {
                    year: y,
                    revenue,
                    netIncome,
                    assets,
                    equity,
                    currentAssets,
                    currentLiabilities,
                    totalLiabilities,
                    inventory,
                    cashBank,
                    grossMargin,
                    operatingMargin,
                    netMargin,
                    roa,
                    roe,
                    currentRatio,
                    quickRatio,
                    cashRatio,
                    debtToAssets,
                    debtToEquity,
                    equityRatio,
                    assetTurnover,
                    workingCapital,
                };
            });
            return map;
        } catch (err) {
            console.error('FinancialAnalysis yearData error', err);
            return {};
        }
    }, [historicalIS, historicalBS, data2025]);

    const availableYears = useMemo(() =>
        YEARS.filter((y) => {
            const d = yearData[y];
            if (!d) return false;
            // سنة مقبولة إذا لديها أي رقم جوهري (إيراد، أصول، حقوق ملكية، أو مؤشر واحد على الأقل)
            return [
                d.revenue, d.assets, d.equity, d.workingCapital,
                d.grossMargin, d.operatingMargin, d.netMargin,
                d.roa, d.roe, d.currentRatio, d.quickRatio, d.cashRatio,
                d.debtToAssets, d.debtToEquity, d.equityRatio, d.assetTurnover,
            ]
                .some((v) => Number.isFinite(v));
        }), [yearData]);

    const tableRows = useMemo(() => METRICS_META.map((m) => ({
        key: m.key,
        label: m.label,
        formula: m.formula,
        format: m.format,
        values: availableYears.map((y) => yearData[y]?.[m.key] ?? null),
    })), [yearData, availableYears]);

    const filteredYears = useMemo(() => {
        const base = (() => {
            if (range === 'last2') return availableYears.slice(-2);
            if (range === 'last5') return availableYears.slice(-5);
            return availableYears;
        })();
        return base;
    }, [range, availableYears]);

    const latestYear = filteredYears.length > 0 ? filteredYears[filteredYears.length - 1] : null;
    const prevYear = filteredYears.length > 1 ? filteredYears[filteredYears.length - 2] : null;
    const latestData = latestYear ? yearData[latestYear] : null;
    const prevData = prevYear ? yearData[prevYear] : null;

    const historicalLeverageAvg = useMemo(() => {
        const yrs = availableYears.filter((y) => y !== latestYear);
        if (yrs.length === 0) return { debtToAssets: null, debtToEquity: null, equityRatio: null };
        const sum = yrs.reduce((acc, y) => {
            const d = yearData[y];
            return {
                debtToAssets: acc.debtToAssets + (Number.isFinite(d?.debtToAssets) ? d.debtToAssets : 0),
                debtToEquity: acc.debtToEquity + (Number.isFinite(d?.debtToEquity) ? d.debtToEquity : 0),
                equityRatio: acc.equityRatio + (Number.isFinite(d?.equityRatio) ? d.equityRatio : 0),
                countDA: acc.countDA + (Number.isFinite(d?.debtToAssets) ? 1 : 0),
                countDE: acc.countDE + (Number.isFinite(d?.debtToEquity) ? 1 : 0),
                countER: acc.countER + (Number.isFinite(d?.equityRatio) ? 1 : 0),
            };
        }, { debtToAssets: 0, debtToEquity: 0, equityRatio: 0, countDA: 0, countDE: 0, countER: 0 });

        return {
            debtToAssets: sum.countDA ? sum.debtToAssets / sum.countDA : null,
            debtToEquity: sum.countDE ? sum.debtToEquity / sum.countDE : null,
            equityRatio: sum.countER ? sum.equityRatio / sum.countER : null,
        };
    }, [availableYears, latestYear, yearData]);

    const chartData = filteredYears
        .map((y) => ({
            year: y,
            grossMargin: yearData[y]?.grossMargin,
            operatingMargin: yearData[y]?.operatingMargin,
            netMargin: yearData[y]?.netMargin,
            roe: yearData[y]?.roe,
            currentRatio: yearData[y]?.currentRatio,
            quickRatio: yearData[y]?.quickRatio,
            cashRatio: yearData[y]?.cashRatio,
            debtToAssets: yearData[y]?.debtToAssets,
            debtToEquity: yearData[y]?.debtToEquity,
            equityRatio: yearData[y]?.equityRatio,
            assetTurnover: yearData[y]?.assetTurnover,
            workingCapital: yearData[y]?.workingCapital,
        }))
        .filter((d) => d && Object.values(d).some((v, idx) => idx !== 0 && Number.isFinite(v)));

    const insights = useMemo(() => {
        const list = [];
        if (!latestData) return list;
        if (Number.isFinite(latestData.workingCapital) && Number.isFinite(latestData.currentAssets) && Number.isFinite(latestData.currentLiabilities)) {
            if (latestData.workingCapital < 0) {
                list.push(`رأس المال العامل في ${latestYear} سالب (${formatNumber(latestData.workingCapital)}) مما يشير لضغط سيولة قصير الأجل.`);
            } else {
                list.push(`رأس المال العامل في ${latestYear} إيجابي ويوفر غطاء للالتزامات القصيرة (${formatNumber(latestData.workingCapital)}).`);
            }
        }
        if (Number.isFinite(latestData.currentRatio)) {
            if (latestData.currentRatio < 1) list.push('نسبة التداول أقل من 1 → التزامات قصيرة تفوق الأصول المتداولة.');
            else if (latestData.currentRatio < 1.5) list.push('نسبة التداول بين 1 و1.5 → هامش أمان محدود، راقب التحصيل والمخزون.');
        }
        if (Number.isFinite(latestData.quickRatio) && latestData.quickRatio < 1) {
            list.push('النسبة السريعة أقل من 1 → الاعتماد على المخزون لتغطية الالتزامات القصيرة.');
        }
        if (Number.isFinite(latestData.debtToAssets)) {
            const avg = historicalLeverageAvg.debtToAssets;
            if (avg !== null && latestData.debtToAssets > avg + 5) list.push(`ارتفاع المديونية مقابل المتوسط التاريخي (حاليًا ${latestData.debtToAssets.toFixed(1)}%).`);
        }
        if (Number.isFinite(latestData.debtToEquity)) {
            if (latestData.debtToEquity > 2) list.push('نسبة الدين إلى حقوق الملكية مرتفعة >2، المخاطر التمويلية مرتفعة.');
        }
        if (Number.isFinite(latestData.netMargin)) {
            if (latestData.netMargin < 0) list.push(`هامش صافي الربح سلبي في ${latestYear} (${latestData.netMargin.toFixed(1)}%). راجع COGS والمصاريف.`); 
            else if (prevData?.netMargin !== undefined && Number.isFinite(prevData?.netMargin)) {
                const diff = latestData.netMargin - prevData.netMargin;
                if (diff < -3) list.push(`تدهور هامش صافي الربح بمقدار ${diff.toFixed(1)} نقطة مئوية عن ${prevYear}.`);
            }
        }
        if (Number.isFinite(latestData.roe) && latestData.roe < 0) list.push('ROE سلبي؛ العائد على حقوق الملكية متدهور.');
        if (Number.isFinite(latestData.roa) && latestData.roa < 3) list.push('ROA منخفض <3%؛ كفاءة الأصول محدودة.');
        return list;
    }, [latestData, latestYear, prevData, prevYear, historicalLeverageAvg]);

    const actionPlan = useMemo(() => {
        const cfo = [];
        const ceo = [];
        const y = latestData || {};

        // سيولة ورأس مال عامل
        if (Number.isFinite(y.currentRatio) && y.currentRatio < 1.2) {
            cfo.push('رفع السيولة: خطة تحصيل مكثفة وتقليص آجال التحصيل + تمديد آجال الموردين دون كلفة عالية.');
        }
        if (Number.isFinite(y.quickRatio) && y.quickRatio < 1) {
            cfo.push('تحسين النسبة السريعة: خفّض المخزون، وقيّد الشراء البطيء الدوران، وادعم النقدية/الذمم السريعة.');
        }
        if (Number.isFinite(y.workingCapital) && y.workingCapital < 0) {
            cfo.push('رأس المال العامل سالب: أعد جدولة جزء من المطلوبات القصيرة إلى متوسطة الأجل فوراً.');
        }

        // ربحية وهوامش
        if (Number.isFinite(y.netMargin) && y.netMargin < 0) {
            cfo.push('هامش صافي الربح سلبي: راجع التسعير وخفّض بنود التكاليف الأعلى مساهمة خلال 30 يوم.');
            ceo.push('اعتمد إعادة تسعير/إيقاف المشاريع أو المنتجات الخاسرة والتركيز على المزيج الأعلى ربحية.');
        }
        if (Number.isFinite(y.grossMargin) && y.grossMargin < 15) {
            cfo.push('الهامش الإجمالي ضعيف: تفاوض على كلف الموردين وحدد سقف خصومات المبيعات.');
        }

        // هيكل التمويل والرفع
        if (Number.isFinite(y.debtToEquity) && y.debtToEquity > 2) {
            cfo.push('الرفع المالي مرتفع (>2×): أعد جدولة الديون القصيرة، وقلّل الاقتراض الجديد حتى تحسن الهوامش.');
            ceo.push('ادعم مفاوضات إعادة الجدولة/تمويل بديل أقل كلفة لتقليل الضغط المالي.');
        }
        if (Number.isFinite(y.debtToAssets) && y.debtToAssets > 60) {
            cfo.push('نسبة الديون إلى الأصول مرتفعة: راقب تدفقات السداد شهريًا وامنع التمويل القصير غير الضروري.');
        }

        // كفاءة الأصول والعائد
        if (Number.isFinite(y.roa) && y.roa < 3) {
            ceo.push('كفاءة الأصول منخفضة: ركّز الإنتاج/المبيعات على الأصول الأعلى عائداً، وقلّل الأصول غير المستغلة.');
        }
        if (Number.isFinite(y.assetTurnover) && y.assetTurnover < 0.5) {
            ceo.push('معدل دوران الأصول ضعيف: زد الاستغلال التشغيلي أو تخلّ عن الأصول غير المستخدمة.');
        }

        // حوكمة البيانات والمتابعة
        cfo.push('ثبّت لوحة متابعة شهرية: سيولة (WC, CR, QR)، مديونية (D/E, D/A)، هوامش (GP, OP, NP) مع حدود تنبيه.');
        ceo.push('اعتمد اجتماع أداء شهري (CEO/CFO/عمليات) لقياس التقدم في التحصيل، خفض التكاليف، وتحسن الهوامش.');

        return { cfo, ceo };
    }, [latestData]);

    const handleExportExcel = () => {
        const tableExport = tableRows.map((row) => {
            const obj = { المؤشر: row.label, المعادلة: row.formula };
            filteredYears.forEach((y) => {
                const val = row.values[availableYears.indexOf(y)];
                obj[y] = Number.isFinite(val) ? val.toFixed(row.format === 'percent' ? 1 : 2) : 'غير متوفر';
            });
            return obj;
        });
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(tableExport);
        XLSX.utils.book_append_sheet(wb, ws1, 'المؤشرات');
        XLSX.writeFile(wb, 'financial-analysis.xlsx');
    };

    const handleExportPDF = () => {
        // إبقاء التصدير على مستوى الصفحة الأعلى (مثلاً من ExecutiveReport)؛ هنا placeholder
        alert('للتصدير إلى PDF، استخدم زر التصدير في التقرير التنفيذي.');
    };

    const smartRangeButtons = (
        <div className="flex flex-wrap gap-2">
            <button onClick={() => setRange('all')} className={`px-3 py-1 rounded-lg border text-sm ${range === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>كل السنوات</button>
            <button onClick={() => setRange('last5')} className={`px-3 py-1 rounded-lg border text-sm ${range === 'last5' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>آخر 5 سنوات</button>
            <button onClick={() => setRange('last2')} className={`px-3 py-1 rounded-lg border text-sm ${range === 'last2' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>آخر سنتين</button>
        </div>
    );

    const noData = availableYears.length === 0;

    const ratioData = useMemo(() => {
        const y = yearData[ratioYear] || {};
        const revenue = y.revenue || 0;
        const netIncome = y.netIncome || 0;
        const gp = Number.isFinite(y.grossMargin) ? (y.grossMargin / 100) * revenue : (revenue - (y.cogs || 0));
        const opMargin = y.operatingMargin;
        const assets = y.assets || 0;
        const equity = y.equity || 0;
        const liabs = y.totalLiabilities || 0;
        const currentAssets = y.currentAssets || 0;
        const currentLiabilities = y.currentLiabilities || 0;
        const inventory = y.inventory || 0;
        const interestExpense = null; // غير متوفر من البيانات الحالية

        return {
            grossMargin: y.grossMargin ?? (revenue ? ((gp / revenue) * 100) : null),
            operatingMargin: opMargin ?? null,
            netMargin: y.netMargin ?? (revenue ? (netIncome / revenue) * 100 : null),
            roa: y.roa ?? (assets ? (netIncome / assets) * 100 : null),
            roe: y.roe ?? (equity ? (netIncome / equity) * 100 : null),
            currentRatio: y.currentRatio ?? (currentLiabilities ? currentAssets / currentLiabilities : null),
            quickRatio: y.quickRatio ?? (currentLiabilities ? ((currentAssets - inventory) / currentLiabilities) : null),
            debtRatio: y.debtToAssets ?? (assets ? (liabs / assets) * 100 : null),
            equityRatio: y.equityRatio ?? (assets ? (equity / assets) * 100 : null),
            interestCoverage: interestExpense ? (y.operatingMargin ? (opMargin / interestExpense) : null) : null,
        };
    }, [yearData, ratioYear]);

    return (
        <div className="space-y-6">
            {noData && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-600">
                    لا توجد بيانات مالية كافية لعرض التحليل. يرجى التأكد من تحميل ميزان المراجعة، قائمة الدخل، والمركز المالي.
                </div>
            )}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp className="text-blue-600" size={24} />
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">التحليل المالي الشامل</h3>
                        <p className="text-gray-500 text-sm">نسب مالية، اتجاهات، وتحليل ذكي (2020–2025)</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {smartRangeButtons}
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Download size={14} /> تصدير Excel
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
                        PDF
                    </button>
                </div>
            </div>

            {availableYears.length === 1 && availableYears[0] === 2025 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                    تنبيه: البيانات المتاحة لسنة 2025 فقط (قد تكون سنة جزئية/انتقالية). التحليل والرسوم ستعكس هذه السنة وحدها.
                </div>
            )}

            {/* رأس المال العامل والسيولة السريعة */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    {
                        key: 'workingCapital',
                        title: 'رأس المال العامل',
                        value: latestData?.workingCapital,
                        note: workingCapitalNote(latestData?.workingCapital, latestData?.currentAssets, latestData?.currentLiabilities, latestYear),
                        format: 'currency',
                    },
                    {
                        key: 'currentRatio',
                        title: 'نسبة التداول',
                        value: latestData?.currentRatio,
                        note: liquidityNote('currentRatio', latestData?.currentRatio),
                        format: 'ratio',
                    },
                    {
                        key: 'quickRatio',
                        title: 'النسبة السريعة',
                        value: latestData?.quickRatio,
                        note: liquidityNote('quickRatio', latestData?.quickRatio),
                        format: 'ratio',
                    },
                    {
                        key: 'cashRatio',
                        title: 'نسبة النقدية',
                        value: latestData?.cashRatio,
                        note: liquidityNote('cashRatio', latestData?.cashRatio),
                        format: 'ratio',
                    },
                ].map((card) => {
                    const status = evaluateStatus(card.key, card.value);
                    const color =
                        status === 'جيد' ? 'border-green-200 bg-green-50 text-green-700' :
                            status === 'تحذير' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                status === 'خطر' ? 'border-red-200 bg-red-50 text-red-700' :
                                    'border-gray-200 bg-gray-50 text-gray-600';
                    return (
                        <div key={card.key} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-800">{card.title}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{status}</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                                {formatValue(card.value, card.format)}
                            </div>
                            <p className="text-xs text-gray-500 min-h-[32px]">{card.note}</p>
                        </div>
                    );
                })}
            </div>

            {/* توصيات تنفيذية (CFO / CEO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-semibold">CFO</div>
                        <h3 className="text-base font-semibold text-gray-800">توصيات للمدير المالي</h3>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 leading-relaxed">
                        {actionPlan.cfo.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-semibold">CEO</div>
                        <h3 className="text-base font-semibold text-gray-800">توصيات للمدير التنفيذي</h3>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 leading-relaxed">
                        {actionPlan.ceo.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* المديونية 2025 مقارنة بالمتوسط التاريخي */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-gray-800">المديونية والهيكل التمويلي ({latestYear || 'أحدث سنة'}) مقابل المتوسط التاريخي</div>
                    <span className="text-xs text-gray-500">المصدر: المركز المالي</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { key: 'debtToAssets', label: 'الدين إلى الأصول', format: 'percent' },
                        { key: 'debtToEquity', label: 'الدين إلى حقوق الملكية', format: 'ratio' },
                        { key: 'equityRatio', label: 'نسبة حقوق الملكية', format: 'percent' },
                    ].map((item) => {
                        const curr = latestData?.[item.key];
                        const avg = historicalLeverageAvg[item.key];
                        const status = evaluateStatus(item.key, curr);
                        const color =
                            status === 'جيد' ? 'text-green-700 bg-green-50 border-green-100' :
                                status === 'تحذير' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                                    status === 'خطر' ? 'text-red-700 bg-red-50 border-red-100' :
                                        'text-gray-600 bg-gray-50 border-gray-100';
                        return (
                            <div key={item.key} className={`rounded-xl border p-3 ${color}`}>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">{item.label}</span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/60">{status}</span>
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-gray-900">{formatValue(curr, item.format)}</span>
                                    <span className="text-xs text-gray-600">الحالي</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">متوسط تاريخي: {formatValue(avg, item.format)}</div>
                                {Number.isFinite(curr) && Number.isFinite(avg) && (
                                    <div className="text-xs mt-1 text-gray-700">
                                        {curr > avg ? 'الاعتماد على الديون أعلى من المعتاد.' : 'الاعتماد على الديون ضمن أو أقل من المتوسط.'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* جدول المؤشرات عبر السنوات */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-right">المؤشر</th>
                            <th className="px-4 py-3 text-right">المعادلة</th>
                            {filteredYears.map((y) => (
                                <th key={y} className="px-4 py-3 text-center">{y}</th>
                            ))}
                            <th className="px-4 py-3 text-center">Trend</th>
                            <th className="px-4 py-3 text-center">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableRows.map((row) => {
                            const rowValues = filteredYears.map((y) => {
                                const v = row.values[availableYears.indexOf(y)];
                                return Number.isFinite(v) ? v : null;
                            });
                            const currVal = rowValues[rowValues.length - 1];
                            const prevVal = rowValues.length > 1 ? rowValues[rowValues.length - 2] : null;
                            const status = evaluateStatus(row.key, currVal);
                            return (
                                <tr key={row.key} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                                        {row.label}
                                        <span title={row.formula} className="text-gray-400 hover:text-gray-600">
                                            <Info size={14} />
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{row.formula}</td>
                                    {rowValues.map((val, idx) => (
                                        <td key={idx} className="px-4 py-3 text-center font-mono">
                                            {val === null ? 'غير متوفر' : formatValue(val, row.format)}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center">
                                        <YoYBadge curr={currVal} prev={prevVal} />
                                    </td>
                                    <td className="px-4 py-3 text-center text-xs">
                                        <span className={`px-2 py-1 rounded-full ${
                                            status === 'جيد' ? 'bg-green-100 text-green-700'
                                                : status === 'تحذير' ? 'bg-amber-100 text-amber-700'
                                                    : status === 'خطر' ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-gray-800 font-semibold">
                            <Line className="text-blue-600" size={16} />
                            اتجاه الربحية (خطّي)
                        </div>
                        <span className="text-xs text-gray-500">المصدر: قائمة الدخل</span>
                    </div>
                    <div className="h-72">
                        {chartData.length < 2 ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">لا توجد بيانات كافية للرسم (يحتاج سنتين فأكثر).</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis tickFormatter={(v) => `${v}%`} />
                                    <RTooltip formatter={(val) => `${Number(val).toFixed(1)}%`} />
                                    <RLegend />
                                    <Line type="monotone" dataKey="grossMargin" stroke="#2563eb" name="هامش مجمل" connectNulls dot />
                                <Line type="monotone" dataKey="operatingMargin" stroke="#8b5cf6" name="هامش التشغيل" connectNulls dot />
                                    <Line type="monotone" dataKey="netMargin" stroke="#16a34a" name="هامش صافي" connectNulls dot />
                                    <Line type="monotone" dataKey="roe" stroke="#f97316" name="ROE" connectNulls dot />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-gray-800 font-semibold">
                            <BarChart3 className="text-purple-600" size={16} />
                            السيولة والمديونية (أعمدة + خط)
                        </div>
                        <span className="text-xs text-gray-500">المصدر: المركز المالي</span>
                    </div>
                    <div className="h-72">
                        {chartData.length < 2 ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">لا توجد بيانات كافية للرسم (يحتاج سنتين فأكثر).</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis />
                                    <RTooltip />
                                    <RLegend />
                                    <Bar dataKey="debtToAssets" fill="#f97316" name="دين/أصول" />
                                    <Bar dataKey="debtToEquity" fill="#a855f7" name="دين/حقوق" />
                                    <Line type="monotone" dataKey="equityRatio" stroke="#0ea5e9" name="حقوق/أصول" connectNulls dot />
                                    <Line type="monotone" dataKey="currentRatio" stroke="#2563eb" name="نسبة التداول" connectNulls dot />
                                    <Line type="monotone" dataKey="quickRatio" stroke="#16a34a" name="النسبة السريعة" connectNulls dot />
                                    <Line type="monotone" dataKey="cashRatio" stroke="#f43f5e" name="نسبة النقدية" connectNulls dot />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-gray-800 font-semibold">
                        <Activity className="text-emerald-600" size={16} />
                        كفاءة الأصول (معدل دوران الأصول)
                    </div>
                    <span className="text-xs text-gray-500">المصدر: قائمة الدخل + المركز المالي</span>
                </div>
                <div className="h-64">
                    {chartData.length < 2 ? (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">لا توجد بيانات كافية للرسم (يحتاج سنتين فأكثر).</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <RTooltip />
                                <RLegend />
                                <Line type="monotone" dataKey="assetTurnover" stroke="#0ea5e9" name="دوران الأصول" connectNulls dot />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* التحليل التفسيري التلقائي */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                    <AlertTriangle className="text-amber-500" size={16} />
                    التحليل التفسيري التلقائي
                </div>
                {insights.length === 0 ? (
                    <p className="text-sm text-gray-500">لا توجد ملاحظات بارزة بناءً على البيانات الحالية.</p>
                ) : (
                    <ul className="space-y-2 text-sm text-gray-700">
                        {insights.map((i, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="w-2 h-2 mt-2 rounded-full bg-amber-500" />
                                <span>{i}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="text-xs text-gray-500">
                    التحليل يتغير ديناميكيًا بحسب آخر سنة متوفرة واتجاهات السنوات السابقة.
                </div>
            </div>

            {/* لوحة النسب الرئيسية (داخل صفحة التحليل المالي) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-gray-800">النسب المالية الرئيسية</div>
                    <select
                        className="text-sm border border-gray-200 rounded px-3 py-1"
                        value={ratioYear}
                        onChange={(e) => setRatioYear(Number(e.target.value))}
                    >
                        {availableYears.map((y) => (
                            <option key={`ratio-${y}`} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        { label: 'هامش الربح الإجمالي', value: ratioData.grossMargin, format: 'percent', purpose: 'قياس كفاءة الإنتاج والتسعير' },
                        { label: 'هامش التشغيل', value: ratioData.operatingMargin, format: 'percent', purpose: 'قياس الأداء التشغيلي' },
                        { label: 'هامش صافي الربح', value: ratioData.netMargin, format: 'percent', purpose: 'قياس الربحية النهائية' },
                        { label: 'العائد على الأصول (ROA)', value: ratioData.roa, format: 'percent', purpose: 'قياس كفاءة استخدام الأصول' },
                        { label: 'العائد على حقوق الملكية (ROE)', value: ratioData.roe, format: 'percent', purpose: 'قياس العائد للمساهمين' },
                        { label: 'نسبة السيولة الجارية', value: ratioData.currentRatio, format: 'ratio', purpose: 'قياس قدرة السداد القصيرة' },
                        { label: 'النسبة السريعة', value: ratioData.quickRatio, format: 'ratio', purpose: 'قياس السيولة الفورية' },
                        { label: 'نسبة المديونية', value: ratioData.debtRatio, format: 'percent', purpose: 'قياس درجة الاعتماد على الديون' },
                        { label: 'نسبة حقوق الملكية', value: ratioData.equityRatio, format: 'percent', purpose: 'قياس قوة الهيكل الرأسمالي' },
                        { label: 'نسبة تغطية الفوائد', value: ratioData.interestCoverage, format: 'ratio', purpose: 'قياس قدرة تغطية الفوائد' },
                    ].map((r) => (
                        <div key={r.label} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                            <div className="text-sm font-semibold text-gray-800">{r.label}</div>
                            <div className={`text-xl font-bold ${Number.isFinite(r.value) && r.value < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                                {formatValue(r.value, r.format)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{r.purpose}</div>
                        </div>
                    ))}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right mt-2 border-t border-gray-100">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-2">القائمة</th>
                                <th className="p-2">النسبة المالية</th>
                                <th className="p-2">المعادلة</th>
                                <th className="p-2">الغرض</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr><td className="p-2">قائمة الدخل</td><td className="p-2">هامش الربح الإجمالي</td><td className="p-2">(الإيراد - التكلفة) ÷ الإيراد</td><td className="p-2">قياس كفاءة الإنتاج والتسعير</td></tr>
                            <tr><td className="p-2">قائمة الدخل</td><td className="p-2">هامش التشغيل</td><td className="p-2">الربح التشغيلي ÷ الإيراد</td><td className="p-2">قياس الأداء التشغيلي</td></tr>
                            <tr><td className="p-2">قائمة الدخل</td><td className="p-2">هامش صافي الربح</td><td className="p-2">صافي الربح ÷ الإيراد</td><td className="p-2">قياس الربحية النهائية</td></tr>
                            <tr><td className="p-2">قائمة الدخل</td><td className="p-2">العائد على الأصول (ROA)</td><td className="p-2">صافي الربح ÷ إجمالي الأصول</td><td className="p-2">قياس كفاءة استخدام الأصول</td></tr>
                            <tr><td className="p-2">قائمة الدخل</td><td className="p-2">العائد على حقوق الملكية (ROE)</td><td className="p-2">صافي الربح ÷ حقوق الملكية</td><td className="p-2">قياس العائد للمساهمين</td></tr>
                            <tr><td className="p-2">المركز المالي</td><td className="p-2">نسبة السيولة الجارية</td><td className="p-2">الأصول المتداولة ÷ الخصوم المتداولة</td><td className="p-2">قياس قدرة السداد القصيرة</td></tr>
                            <tr><td className="p-2">المركز المالي</td><td className="p-2">النسبة السريعة</td><td className="p-2">(الأصول المتداولة - المخزون) ÷ الخصوم المتداولة</td><td className="p-2">قياس السيولة الفورية</td></tr>
                            <tr><td className="p-2">المركز المالي</td><td className="p-2">نسبة المديونية</td><td className="p-2">إجمالي الخصوم ÷ إجمالي الأصول</td><td className="p-2">قياس درجة الاعتماد على الديون</td></tr>
                            <tr><td className="p-2">المركز المالي</td><td className="p-2">نسبة حقوق الملكية</td><td className="p-2">حقوق الملكية ÷ إجمالي الأصول</td><td className="p-2">قياس قوة الهيكل الرأسمالي</td></tr>
                            <tr><td className="p-2">المركز المالي</td><td className="p-2">نسبة تغطية الفوائد</td><td className="p-2">الربح التشغيلي ÷ مصروف الفوائد</td><td className="p-2">قياس قدرة تغطية الفوائد</td></tr>
                        </tbody>
                    </table>
                </div>
                <div className="pt-2">
                    <button
                        onClick={() => setShowKpiExplain((v) => !v)}
                        className="px-3 py-1 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                        {showKpiExplain ? 'إخفاء تفسير النسب' : 'إظهار تفسير النسب'}
                    </button>
                    {showKpiExplain && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 space-y-1">
                            <p>تنفيذي: النسب تظهر قوة الربحية إذا ظلت الهوامش فوق 10%، وقوة السيولة إذا الجارية ≥1 والسريعة ≥0.8، ومديونية آمنة إذا الدين/الأصول ≤60% وحقوق الملكية/الأصول ≥40%.</p>
                            <p>مالي (CFO): مراقبة Gross/Operating/Net Margin لتتبع التسعير/التنفيذ، مع ROA/ROE لقياس العائد على الأصول وحقوق المساهمين، ومع نسب السيولة والديون لقراءة قدرة السداد وهيكل التمويل.</p>
                            <p>تدقيقي: أي تدهور متزامن في الهوامش وسيولة الجارية أو ارتفاع الدين/الأصول يشير إلى ضغط تشغيلي وتمويلي، ويستلزم ربط النسب بحركة رأس المال العامل وتدفقات النقد.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
