/**
 * Trial Balance Summary Report - تقرير ميزان المراجعة الملخص
 * ملخص الميزان مع التجميع حسب المستويات
 */

import React, { useMemo } from 'react';
import { FileSpreadsheet, Download, TrendingUp, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber } from '../../utils/trialBalanceUtils';

const CATEGORY_ICONS = {
    'الأصول المتداولة': { color: 'bg-emerald-500', icon: '📦' },
    'الأصول الثابتة': { color: 'bg-blue-500', icon: '🏢' },
    'الخصوم المتداولة': { color: 'bg-orange-500', icon: '📋' },
    'خصوم طويلة الأجل': { color: 'bg-red-500', icon: '📊' },
    'حقوق الملكية': { color: 'bg-purple-500', icon: '💎' },
    'التكاليف': { color: 'bg-rose-500', icon: '💸' },
    'الإيرادات': { color: 'bg-green-500', icon: '💰' },
};

export default function TrialBalanceSummary({ levelTotals, financialSummary, rawData }) {
    const topLevel2 = useMemo(() => {
        if (!levelTotals?.level2) return [];
        return Object.values(levelTotals.level2)
            .slice()
            .sort((a, b) => Math.abs(b.balance || 0) - Math.abs(a.balance || 0))
            .slice(0, 6);
    }, [levelTotals]);

    const handleExport = () => {
        // تصدير ملخص المستوى الأول
        const level1Data = Object.entries(levelTotals.level1).map(([name, values]) => ({
            'التصنيف الرئيسي': name,
            'الكود': values.code,
            'إجمالي مدين': values.debit,
            'إجمالي دائن': values.credit,
            'صافي الرصيد': values.balance,
        }));

        // تصدير ملخص المستوى الثاني
        const level2Data = Object.entries(levelTotals.level2).map(([key, values]) => ({
            'التصنيف الرئيسي': values.l1,
            'التصنيف الفرعي': values.l2,
            'الكود': values.code,
            'إجمالي مدين': values.debit,
            'إجمالي دائن': values.credit,
            'صافي الرصيد': values.balance,
        }));

        const wb = XLSX.utils.book_new();

        const ws1 = XLSX.utils.json_to_sheet(level1Data);
        XLSX.utils.book_append_sheet(wb, ws1, 'ملخص المستوى الأول');

        const ws2 = XLSX.utils.json_to_sheet(level2Data);
        XLSX.utils.book_append_sheet(wb, ws2, 'ملخص المستوى الثاني');

        XLSX.writeFile(wb, 'trial-balance-summary.xlsx');
    };

    if (!levelTotals || !levelTotals.level1) {
        return (
            <div className="text-center py-16 text-gray-400">
                <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات لعرضها. قم برفع ملف ميزان المراجعة أولاً.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-blue-600" size={24} />
                    <h3 className="text-xl font-bold text-gray-800">ميزان المراجعة الملخص</h3>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Download size={16} />
                    تصدير Excel
                </button>
            </div>

            {/* Balance Verification */}
            <div className={`p-6 rounded-2xl ${financialSummary.isBalanced
                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-gradient-to-r from-red-500 to-rose-600'} text-white`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {financialSummary.isBalanced ? (
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl">✓</span>
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl">⚠</span>
                            </div>
                        )}
                        <div>
                            <h4 className="text-lg font-bold">
                                {financialSummary.isBalanced ? 'ميزان المراجعة متوازن' : 'يوجد فرق في الميزان'}
                            </h4>
                            <p className="text-white/80 text-sm">
                                {financialSummary.isBalanced
                                    ? 'إجمالي المدين يساوي إجمالي الدائن'
                                    : `الفرق: ${formatNumber(financialSummary.difference)}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-8">
                        <div className="text-center">
                            <p className="text-white/70 text-xs">إجمالي المدين</p>
                            <p className="text-2xl font-bold font-mono">{formatNumber(financialSummary.totalDebit)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-white/70 text-xs">إجمالي الدائن</p>
                            <p className="text-2xl font-bold font-mono">{formatNumber(financialSummary.totalCredit)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Level 1 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(levelTotals.level1).map(([name, values]) => {
                    const config = CATEGORY_ICONS[name] || { color: 'bg-gray-500', icon: '📁' };
                    return (
                        <div
                            key={name}
                            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-white`}>
                                    <span>{config.icon}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{name}</h4>
                                    <span className="text-xs text-gray-400 font-mono">{values.code}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">مدين</span>
                                    <span className="font-mono text-gray-700">{formatNumber(values.debit)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">دائن</span>
                                    <span className="font-mono text-gray-700">{formatNumber(values.credit)}</span>
                                </div>
                                <div className="h-px bg-gray-100 my-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 font-medium">الرصيد</span>
                                    <span className={`font-mono font-bold ${values.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatNumber(values.balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                    {/* لوحة الملخص المالي المختصر */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800">لوحة الملخص المالي</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-4">
                                <p className="text-xs text-white/80 mb-1">إجمالي الأصول</p>
                                <p className="text-xl font-bold font-mono">{formatNumber(financialSummary.totalAssets)}</p>
                            </div>
                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4">
                                <p className="text-xs text-white/80 mb-1">إجمالي الخصوم</p>
                                <p className="text-xl font-bold font-mono">{formatNumber(financialSummary.totalLiabilities)}</p>
                            </div>
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4">
                                <p className="text-xs text-white/80 mb-1">حقوق الملكية</p>
                                <p className="text-xl font-bold font-mono">{formatNumber(financialSummary.equity)}</p>
                            </div>
                            <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl p-4">
                                <p className="text-xs text-white/80 mb-1">التكاليف</p>
                                <p className="text-xl font-bold font-mono">{formatNumber(financialSummary.costs)}</p>
                            </div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4">
                                <p className="text-xs text-white/80 mb-1">الإيرادات</p>
                                <p className="text-xl font-bold font-mono">{formatNumber(financialSummary.revenue)}</p>
                            </div>
                            <div className={`rounded-xl p-4 ${financialSummary.isBalanced ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'}`}>
                                <p className="text-xs text-white/80 mb-1">حالة الميزان</p>
                                <p className="text-lg font-bold">
                                    {financialSummary.isBalanced ? 'متوازن ✓' : 'غير متوازن ⚠'}
                                </p>
                                <p className="text-sm text-white/80 mt-1">
                                    الفرق: {formatNumber(financialSummary.difference)}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">إجمالي المدين</span>
                                <span className="font-mono font-semibold text-gray-800">{formatNumber(financialSummary.totalDebit)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">إجمالي الدائن</span>
                                <span className="font-mono font-semibold text-gray-800">{formatNumber(financialSummary.totalCredit)}</span>
                            </div>
                        </div>
                    </div>

                    {/* أكبر بنود المستوى الثاني حسب الرصيد */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800">أكبر البنود (المستوى الثاني) حسب الرصيد</h4>
                        {topLevel2.length === 0 ? (
                            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                لا توجد بيانات مستوى ثانٍ للعرض.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topLevel2.map((item) => (
                                    <div key={item.code} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                                                <div className="text-sm font-semibold text-gray-800">{item.l2 || item.name}</div>
                                                {item.l1 && <div className="text-xs text-gray-500">{item.l1}</div>}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500">الرصيد</div>
                                                <div className={`font-mono font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatNumber(item.balance)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-xs text-gray-500 mt-2">
                                            <span>مدين: <span className="font-mono text-gray-700">{formatNumber(item.debit)}</span></span>
                                            <span>دائن: <span className="font-mono text-gray-700">{formatNumber(item.credit)}</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
