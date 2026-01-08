/**
 * Hierarchy Report - تقرير شجرة الحسابات
 * عرض الحسابات بشكل شجري مع 5 مستويات
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, FolderTree, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber } from '../../utils/trialBalanceUtils';

const LEVEL_COLORS = {
    1: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white',
    2: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
    3: 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white',
    4: 'bg-blue-50 text-blue-800 border-l-4 border-blue-400',
    5: 'bg-gray-50 text-gray-700 border-l-4 border-gray-300',
};

function HierarchyNode({ node, depth = 0, expandedNodes, toggleNode }) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.code);
    const levelColor = LEVEL_COLORS[node.level] || 'bg-white';
    const isPosting = node.isPosting === true;
    const debitVal = isPosting ? (node.debit || 0) : (node.aggDebit || 0);
    const creditVal = isPosting ? (node.credit || 0) : (node.aggCredit || 0);
    const balanceVal = isPosting
        ? (node.debit || 0) - (node.credit || 0)
        : (node.aggBalance ?? ((node.aggDebit || 0) - (node.aggCredit || 0)));

    return (
        <div className="select-none">
            <div
                className={`flex items-center justify-between py-3 px-4 rounded-lg mb-1 cursor-pointer
          hover:shadow-md transition-all duration-200 ${levelColor}`}
                style={{ marginRight: `${depth * 20}px` }}
                onClick={() => hasChildren && toggleNode(node.code)}
            >
                <div className="flex items-center gap-3 flex-1">
                    {hasChildren ? (
                        <span className="transition-transform duration-200">
                            {isExpanded ? (
                                <ChevronDown size={18} />
                            ) : (
                                <ChevronLeft size={18} />
                            )}
                        </span>
                    ) : (
                        <span className="w-[18px]" />
                    )}

                    <span className="font-mono text-xs opacity-75 min-w-[80px]">
                        {node.code}
                    </span>

                    <span className={`font-medium ${node.level <= 2 ? 'text-base' : 'text-sm'}`}>
                        {node.name}
                    </span>

                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 opacity-75">
                        المستوى {node.level}
                    </span>
                </div>

                <div className="flex items-center gap-6 text-sm">
                    <div className="text-left min-w-[100px]">
                        <span className="opacity-60 text-xs block">مدين</span>
                        <span className="font-mono">{formatNumber(debitVal)}</span>
                    </div>
                    <div className="text-left min-w-[100px]">
                        <span className="opacity-60 text-xs block">دائن</span>
                        <span className="font-mono">{formatNumber(creditVal)}</span>
                    </div>
                    <div className="text-left min-w-[100px]">
                        <span className="opacity-60 text-xs block">الرصيد</span>
                        <span className={`font-mono font-bold ${balanceVal >= 0 ? '' : 'text-red-300'}`}>
                            {formatNumber(balanceVal)}
                        </span>
                    </div>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="transition-all duration-300">
                    {node.children.map((child) => (
                        <HierarchyNode
                            key={child.code}
                            node={child}
                            depth={depth + 1}
                            expandedNodes={expandedNodes}
                            toggleNode={toggleNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function HierarchyReport({ hierarchy, rawData }) {
    const [expandedNodes, setExpandedNodes] = useState(new Set(['01', '02', '03', '04', '05', '06', '07']));
    const [expandAll, setExpandAll] = useState(false);

    const toggleNode = (code) => {
        setExpandedNodes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(code)) {
                newSet.delete(code);
            } else {
                newSet.add(code);
            }
            return newSet;
        });
    };

    const handleExpandAll = () => {
        if (expandAll) {
            setExpandedNodes(new Set(['01', '02', '03', '04', '05', '06', '07']));
        } else {
            const allCodes = new Set();
            const collectCodes = (nodes) => {
                nodes.forEach((node) => {
                    allCodes.add(node.code);
                    if (node.children) collectCodes(node.children);
                });
            };
            collectCodes(hierarchy);
            setExpandedNodes(allCodes);
        }
        setExpandAll(!expandAll);
    };

    const handleExport = () => {
        const exportData = rawData.map((row) => ({
            'المستوى 1': row.level1Name,
            'المستوى 2': row.level2Name,
            'المستوى 3': row.level3Name,
            'المستوى 4': row.level4Name,
            'الكود': row.code,
            'اسم الحساب': row.name,
            'مدين': row.debit,
            'دائن': row.credit,
            'الرصيد': row.balance,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'شجرة الحسابات');
        XLSX.writeFile(wb, 'hierarchy-report.xlsx');
    };

    if (!hierarchy || hierarchy.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <FolderTree size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات لعرضها. قم برفع ملف ميزان المراجعة أولاً.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FolderTree className="text-blue-600" size={24} />
                    <h3 className="text-xl font-bold text-gray-800">تقرير شجرة الحسابات</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExpandAll}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        {expandAll ? 'طي الكل' : 'توسيع الكل'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download size={16} />
                        تصدير Excel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
                {hierarchy.map((node) => (
                    <HierarchyNode
                        key={node.code}
                        node={node}
                        expandedNodes={expandedNodes}
                        toggleNode={toggleNode}
                    />
                ))}
            </div>
        </div>
    );
}
