/**
 * Data Quality Report - تقرير جودة البيانات
 * تحليل الأخطاء والمشاكل في البيانات
 */

import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, Download, Shield } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber } from '../../utils/trialBalanceUtils';

const QUALITY_COLORS = {
    excellent: 'from-green-500 to-emerald-600',
    good: 'from-blue-500 to-cyan-600',
    fair: 'from-yellow-500 to-orange-500',
    poor: 'from-red-500 to-rose-600',
};

function getQualityLevel(score) {
    if (score >= 90) return { level: 'excellent', label: 'ممتاز', color: QUALITY_COLORS.excellent };
    if (score >= 70) return { level: 'good', label: 'جيد', color: QUALITY_COLORS.good };
    if (score >= 50) return { level: 'fair', label: 'متوسط', color: QUALITY_COLORS.fair };
    return { level: 'poor', label: 'ضعيف', color: QUALITY_COLORS.poor };
}

function IssueCard({ title, icon: Icon, count, items, color, warningLevel }) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    if (count === 0) {
        return (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="text-green-500" size={20} />
                <span className="text-green-700 font-medium">{title}: لا توجد مشاكل</span>
            </div>
        );
    }

    return (
        <div className={`bg-white border ${warningLevel === 'high' ? 'border-red-200' : 'border-orange-200'} rounded-xl overflow-hidden`}>
            <div
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${warningLevel === 'high' ? 'bg-red-50' : 'bg-orange-50'
                    }`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                        <Icon className="text-white" size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">{title}</h4>
                        <p className="text-sm text-gray-500">{count} مشكلة</p>
                    </div>
                </div>
                <span className={`text-xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </div>

            {isExpanded && items.length > 0 && (
                <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="py-2 px-4 text-right text-gray-600">الصف</th>
                                <th className="py-2 px-4 text-right text-gray-600">الكود</th>
                                <th className="py-2 px-4 text-right text-gray-600">الحساب</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.slice(0, 20).map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50">
                                    <td className="py-2 px-4 text-gray-500">{item.row}</td>
                                    <td className="py-2 px-4 font-mono text-xs">{item.code || '—'}</td>
                                    <td className="py-2 px-4 text-gray-700">{item.name || '—'}</td>
                                </tr>
                            ))}
                            {items.length > 20 && (
                                <tr className="bg-yellow-50">
                                    <td colSpan={3} className="py-2 px-4 text-center text-yellow-700">
                                        + {items.length - 20} سجل آخر
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function DataQualityReport({ qualityReport }) {
    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // Missing Codes
        if (qualityReport.issues.missingCodes.length > 0) {
            const ws1 = XLSX.utils.json_to_sheet(
                qualityReport.issues.missingCodes.map((item) => ({
                    'الصف': item.row,
                    'اسم الحساب': item.name,
                    'مدين': item.debit,
                    'دائن': item.credit,
                }))
            );
            XLSX.utils.book_append_sheet(wb, ws1, 'أكواد ناقصة');
        }

        // Invalid Codes
        if (qualityReport.issues.invalidCodes.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(
                qualityReport.issues.invalidCodes.map((item) => ({
                    'الصف': item.row,
                    'الكود': item.code,
                    'اسم الحساب': item.name,
                }))
            );
            XLSX.utils.book_append_sheet(wb, ws2, 'أكواد خاطئة');
        }

        // Duplicates
        if (qualityReport.issues.duplicates.length > 0) {
            const ws3 = XLSX.utils.json_to_sheet(
                qualityReport.issues.duplicates.map((item) => ({
                    'الكود': item.code,
                    'عدد التكرارات': item.count,
                    'الصفوف': item.rows.join(', '),
                }))
            );
            XLSX.utils.book_append_sheet(wb, ws3, 'تكرارات');
        }

        // Summary
        const summaryData = [
            { 'المؤشر': 'إجمالي السجلات', 'القيمة': qualityReport.totalRecords },
            { 'المؤشر': 'إجمالي المشاكل', 'القيمة': qualityReport.totalIssues },
            { 'المؤشر': 'نسبة الجودة', 'القيمة': qualityReport.qualityScore + '%' },
            { 'المؤشر': 'أكواد ناقصة', 'القيمة': qualityReport.summary.missingCodes },
            { 'المؤشر': 'أكواد خاطئة', 'القيمة': qualityReport.summary.invalidCodes },
            { 'المؤشر': 'غير مصنفة', 'القيمة': qualityReport.summary.unclassified },
            { 'المؤشر': 'تكرارات', 'القيمة': qualityReport.summary.duplicates },
        ];
        const ws4 = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws4, 'ملخص الجودة');

        XLSX.writeFile(wb, 'data-quality-report.xlsx');
    };

    if (!qualityReport) {
        return (
            <div className="text-center py-16 text-gray-400">
                <Shield size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات لتحليلها. قم برفع ملف ميزان المراجعة أولاً.</p>
            </div>
        );
    }

    const quality = getQualityLevel(parseFloat(qualityReport.qualityScore));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="text-blue-600" size={24} />
                    <h3 className="text-xl font-bold text-gray-800">تقرير جودة البيانات</h3>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Download size={16} />
                    تصدير Excel
                </button>
            </div>

            {/* Quality Score */}
            <div className={`bg-gradient-to-r ${quality.color} rounded-2xl p-8 text-white`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-lg opacity-80 mb-1">نسبة جودة البيانات</h4>
                        <div className="flex items-baseline gap-3">
                            <span className="text-5xl font-bold">{qualityReport.qualityScore}%</span>
                            <span className="text-xl bg-white/20 px-3 py-1 rounded-full">{quality.label}</span>
                        </div>
                    </div>

                    <div className="flex gap-8 text-center">
                        <div>
                            <p className="text-white/70 text-sm">إجمالي السجلات</p>
                            <p className="text-3xl font-bold">{qualityReport.totalRecords}</p>
                        </div>
                        <div>
                            <p className="text-white/70 text-sm">المشاكل المكتشفة</p>
                            <p className="text-3xl font-bold">{qualityReport.totalIssues}</p>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${qualityReport.qualityScore}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'أكواد ناقصة', value: qualityReport.summary.missingCodes, color: 'text-red-600' },
                    { label: 'أكواد خاطئة', value: qualityReport.summary.invalidCodes, color: 'text-orange-600' },
                    { label: 'غير مصنفة', value: qualityReport.summary.unclassified, color: 'text-yellow-600' },
                    { label: 'تكرارات', value: qualityReport.summary.duplicates, color: 'text-purple-600' },
                ].map((item) => (
                    <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                        <p className="text-gray-500 text-sm mb-1">{item.label}</p>
                        <p className={`text-3xl font-bold ${item.value > 0 ? item.color : 'text-green-600'}`}>
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Issue Details */}
            <div className="space-y-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    تفاصيل المشاكل
                </h4>

                <IssueCard
                    title="حسابات بدون كود"
                    icon={XCircle}
                    count={qualityReport.summary.missingCodes}
                    items={qualityReport.issues.missingCodes}
                    color="bg-red-500"
                    warningLevel="high"
                />

                <IssueCard
                    title="أكواد غير صحيحة"
                    icon={AlertCircle}
                    count={qualityReport.summary.invalidCodes}
                    items={qualityReport.issues.invalidCodes}
                    color="bg-orange-500"
                    warningLevel="medium"
                />

                <IssueCard
                    title="حسابات غير مصنفة"
                    icon={AlertTriangle}
                    count={qualityReport.summary.unclassified}
                    items={qualityReport.issues.unclassified}
                    color="bg-yellow-500"
                    warningLevel="medium"
                />

                <IssueCard
                    title="حسابات بلا أب هرمي"
                    icon={AlertTriangle}
                    count={qualityReport.summary.missingParents}
                    items={qualityReport.issues.missingParents.map((item) => ({
                        row: item.row || '—',
                        code: item.code,
                        name: item.name,
                    }))}
                    color="bg-amber-500"
                    warningLevel="medium"
                />

                <IssueCard
                    title="اختلافات في التجميع"
                    icon={AlertCircle}
                    count={qualityReport.summary.aggregationMismatches}
                    items={qualityReport.issues.aggregationMismatches.map((item) => ({
                        row: item.code,
                        code: item.code,
                        name: item.name,
                    }))}
                    color="bg-orange-500"
                    warningLevel="high"
                />

                {qualityReport.issues.imbalance.length > 0 && (
                    <div className="bg-white border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={20} />
                        <div>
                            <h4 className="font-bold text-gray-800">الميزان غير متوازن</h4>
                            <p className="text-sm text-gray-600">
                                الفرق: {formatNumber(qualityReport.issues.imbalance[0].difference)}
                            </p>
                        </div>
                    </div>
                )}

                {qualityReport.issues.duplicates.length > 0 && (
                    <div className="bg-white border border-purple-200 rounded-xl overflow-hidden">
                        <div className="p-4 bg-purple-50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                                <span className="text-white">🔄</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">أكواد مكررة</h4>
                                <p className="text-sm text-gray-500">{qualityReport.issues.duplicates.length} كود مكرر</p>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="space-y-2">
                                {qualityReport.issues.duplicates.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                        <span className="font-mono text-sm">{item.code}</span>
                                        <span className="text-purple-600">مكرر {item.count} مرات في الصفوف: {item.rows.join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
