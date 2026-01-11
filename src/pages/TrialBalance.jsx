/**
 * Trial Balance Page - صفحة ميزان المراجعة المتقدمة
 * نظام ميزان مراجعة احترافي مع 5 مستويات تصنيف و 4 تقارير
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useFinancial } from '../context/FinancialContext';
import { trialBalanceAPI } from '../api/client';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Shield,
  BarChart3,
  Download,
  FolderTree,
  PieChart,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  Filter,
  Search,
  Layers,
  Save,
  ExternalLink,
} from 'lucide-react';

// Import utilities
import {
  parseTrialBalanceData,
  calculateLevelTotalsFromHierarchy,
  calculateFinancialSummaryFromHierarchy,
  calculateFinancialRatios,
  generateDataQualityReport,
  buildHierarchy,
  recalculateHierarchy,
  formatNumber,
} from '../utils/trialBalanceUtils';

// Import template generator
import { downloadTrialBalanceTemplate, generateTemplateArrayBuffer, parseAndValidateTrialBalance } from '../utils/templateGenerator';

// Import report components
import HierarchyReport from '../components/reports/HierarchyReport';
import TrialBalanceSummary from '../components/reports/TrialBalanceSummary';
import DataQualityReport from '../components/reports/DataQualityReport';
const TABS = [
  { id: 'matrix', label: 'جدول الميزان', icon: Layers },
  { id: 'hierarchy', label: 'شجرة الحسابات', icon: FolderTree },
  { id: 'summary', label: 'الملخص المالي', icon: PieChart },
  { id: 'quality', label: 'جودة البيانات', icon: Shield },
];

const LEVEL_COLORS = {
  1: 'bg-blue-600 text-white',
  2: 'bg-blue-500/90 text-white',
  3: 'bg-gray-50 text-gray-800',
  4: 'bg-gray-200 text-gray-800',
  5: 'bg-white text-gray-700 border border-gray-200',
};

// Matrix Row Component مع التوسيع والتحرير للبنود التفصيلية فقط
function MatrixRow({ row, expandedRows, toggleRow, onEdit, depth = 0, setRowRef }) {
  const hasChildren = row.children && row.children.length > 0;
  const isExpanded = expandedRows.has(row.code || row.name);
  const levelColor = LEVEL_COLORS[row.level] || 'bg-white';
  const isPosting = row.isPosting === true;
  const nodeKey = row.code || row.name;

  // Indentation with visual tree lines
  const indentPx = depth * 24;

  // Values to display (للحسابات المجمعة نعرض الرصيد الصافي فقط في جهة واحدة)
  const rawAggDebit = row.aggDebit || 0;
  const rawAggCredit = row.aggCredit || 0;
  const aggBalance = row.aggBalance || 0;
  const balanceVal = isPosting ? (row.debit || 0) - (row.credit || 0) : aggBalance;
  const debitVal = isPosting ? (row.debit || 0) : (aggBalance > 0 ? aggBalance : 0);
  const creditVal = isPosting ? (row.credit || 0) : (aggBalance < 0 ? Math.abs(aggBalance) : 0);

  // Row styling based on type
  const rowBg = hasChildren ? 'bg-gray-50/50' : 'bg-white';
  const rowHover = hasChildren ? 'hover:bg-gray-100/70' : 'hover:bg-blue-50/30';
  const textStyle = hasChildren ? 'font-bold text-gray-900' : 'text-gray-700';

  return (
    <>
      <tr
        ref={(el) => setRowRef && setRowRef(row.code, el)}
        className={`border-b border-gray-100 ${rowBg} ${rowHover} transition-all duration-150`}
      >
        {/* Level & Expand/Collapse */}
        <td className="py-3 px-4" style={{ paddingRight: `${indentPx + 16}px` }}>
          <div className="flex items-center gap-3">
            {/* Tree Lines */}
            {depth > 0 && (
              <div className="flex items-center">
                <div className="w-4 h-px bg-gray-300"></div>
              </div>
            )}

            {/* Expand/Collapse Button */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleRow(nodeKey)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                title={isExpanded ? 'طي' : 'توسيع'}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              </button>
            ) : (
              <div className="w-7"></div>
            )}

            {/* Level Badge */}
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm ${levelColor}`}>
              L{row.level}
            </span>
          </div>
        </td>

        {/* Code */}
        <td className="py-3 px-3">
          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {row.code || '—'}
          </span>
        </td>

        {/* Name */}
        <td className={`py-3 px-3 ${textStyle}`}>
          <div className="flex items-center gap-2">
            {row.name}
            {hasChildren && (
              <span className="text-xs text-gray-400 font-normal">
                ({row.children.length})
              </span>
            )}
          </div>
        </td>

        {/* Debit */}
        <td className="py-3 px-3">
          {isPosting ? (
            <input
              type="text"
              className="w-full text-right border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              defaultValue={debitVal}
              onChange={(e) => onEdit(nodeKey, 'debit', e.target.value)}
              placeholder="0.00"
            />
          ) : (
            <div
              className="text-right font-mono text-sm font-bold text-gray-700 bg-gray-100 px-3 py-2 rounded-lg"
              title="مجموع تلقائي من الحسابات الفرعية"
            >
              {formatNumber(debitVal)}
            </div>
          )}
        </td>

        {/* Credit */}
        <td className="py-3 px-3">
          {isPosting ? (
            <input
              type="text"
              className="w-full text-right border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              defaultValue={creditVal}
              onChange={(e) => onEdit(nodeKey, 'credit', e.target.value)}
              placeholder="0.00"
            />
          ) : (
            <div
              className="text-right font-mono text-sm font-bold text-gray-700 bg-gray-100 px-3 py-2 rounded-lg"
              title="مجموع تلقائي من الحسابات الفرعية"
            >
              {formatNumber(creditVal)}
            </div>
          )}
        </td>

        {/* Balance */}
        <td className="py-3 px-3">
          <div className={`text-right font-mono text-sm font-bold px-3 py-2 rounded-lg ${balanceVal >= 0
            ? 'text-green-700 bg-green-50'
            : 'text-red-700 bg-red-50'
            }`}>
            {formatNumber(balanceVal)}
          </div>
        </td>

        {/* Action */}
        <td className="py-3 px-3 text-center">
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleRow(nodeKey)}
              className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold transition-colors"
              title={isExpanded ? 'طي' : 'توسيع'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </td>
      </tr>

      {/* Children Rows */}
      {hasChildren && isExpanded && row.children.map((child) => (
        <MatrixRow
          key={child.code || child.name}
          row={child}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          onEdit={onEdit}
          setRowRef={setRowRef}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export default function TrialBalance() {
  const navigate = useNavigate();
  const { setTrialBalance, trialBalance, tbError } = useFinancial();
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  // الاعتماد على القالب الأساسي الوحيد
  const templateUrl = useMemo(() => `${base}/templates/Trial_Balance_Template_284_2025_backup.xlsx`, [base]);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [uploadState, setUploadState] = useState({ status: 'idle', message: '' });
  const [templateStatus, setTemplateStatus] = useState({ status: 'idle', message: '' });
  const [activeTab, setActiveTab] = useState('matrix');
  const [expandedRows, setExpandedRows] = useState(new Set(['01', '02', '03', '04', '05', '06', '07']));
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState(0);
  const [showEmpty, setShowEmpty] = useState(false);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastUploadAt, setLastUploadAt] = useState(() => localStorage.getItem('tb_last_upload_at') || '');
  const rowRefs = useRef(new Map());

  // Helper: unified loader for static template with generator fallback
  const loadTemplateBuffer = useCallback(async () => {
    try {
      const resp = await fetch(templateUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.arrayBuffer();
    } catch (err) {
      console.error('Template fetch failed, using generated fallback', err);
      try {
        return generateTemplateArrayBuffer();
      } catch (genErr) {
        console.error('Template generation fallback error', genErr);
        throw genErr;
      }
    }
  }, [templateUrl]);

  // تحليل البيانات
  const processedData = useMemo(() => {
    if (trialBalance.length === 0) return [];
    try {
      const base = parseTrialBalanceData(trialBalance);
      return base.map((row) => {
        const key = row.code || row.name;
        if (edits[key]) {
          const d = edits[key].debit ?? row.debit;
          const c = edits[key].credit ?? row.credit;
          return {
            ...row,
            debit: d,
            credit: c,
            balance: d - c,
          };
        }
        return row;
      });
    } catch (e) {
      console.error('TrialBalance parse error:', e);
      if (e.validationErrors && e.validationErrors.length > 0) {
        setError(e.validationErrors[0].message || 'فشل التحقق من الكود/الاسم لقطاع 06. راجع الملف.');
      } else {
        setError('حدث خطأ أثناء قراءة بيانات ميزان المراجعة المخزّنة. امسح البيانات القديمة وأعد الرفع.');
      }
      return [];
    }
  }, [trialBalance, edits]);

  // بناء الهيكل مع التحذيرات والتجميع
  const hierarchyResult = useMemo(() => {
    if (processedData.length === 0) return { hierarchy: [], warnings: [], totals: null };
    try {
      const result = buildHierarchy(processedData);

      // تطبيق التعديلات على الهرمية
      if (Object.keys(edits).length > 0) {
        result.hierarchy = recalculateHierarchy(result.hierarchy, edits);
      }

      return result;
    } catch (e) {
      console.error('TrialBalance hierarchy error:', e);
      setError('حدث خطأ أثناء بناء الهرمية. يرجى إعادة رفع الملف الرسمي أو مسح البيانات المحفوظة.');
      return { hierarchy: [], warnings: [], totals: null };
    }
  }, [processedData, edits]);

  const hierarchy = hierarchyResult.hierarchy || [];
  const hierarchyWarnings = hierarchyResult.warnings || [];
  const hierarchyNodeIndex = hierarchyResult.nodeIndex || new Map();

  const registerRowRef = useCallback((code, el) => {
    if (!code) return;
    if (el) {
      rowRefs.current.set(code, el);
    }
  }, []);

  const scrollToCode = useCallback(
    (code) => {
      if (!code) return;
      const node = hierarchyNodeIndex.get(code);
      if (!node) return;

      const parents = [];
      let p = node.parentCode;
      while (p) {
        parents.push(p);
        const pn = hierarchyNodeIndex.get(p);
        p = pn?.parentCode;
      }

      setExpandedRows((prev) => {
        const next = new Set(prev);
        parents.forEach((c) => next.add(c));
        next.add(node.code);
        return next;
      });

      setTimeout(() => {
        const el = rowRefs.current.get(code);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-purple-500', 'ring-offset-2');
          setTimeout(() => el.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2'), 1500);
        }
      }, 80);
    },
    [hierarchyNodeIndex]
  );

  const warningMessages = useMemo(() => {
    if (!hierarchyWarnings || hierarchyWarnings.length === 0) return [];
    return hierarchyWarnings.map((w) => {
      if (w.type === 'missing-parent') {
        return `الحساب ${w.code} بلا أب متوقع (${w.parentCode}) – الصف ${w.row}`;
      }
      if (w.type === 'aggregation-mismatch') {
        return `اختلاف تجميع عند ${w.code}: مدين ${formatNumber(w.childrenDebit)} ≠ ${formatNumber(w.expectedDebit)} / دائن ${formatNumber(w.childrenCredit)} ≠ ${formatNumber(w.expectedCredit)}`;
      }
      if (w.type === 'imbalance') {
        return `إجمالي الميزان غير متوازن: الفرق ${formatNumber(w.difference)}`;
      }
      return '';
    }).filter(Boolean);
  }, [hierarchyWarnings]);

  // حساب الإجماليات (تجميعي لمنع التكرار)
  const levelTotals = useMemo(() => {
    if (!hierarchy || hierarchy.length === 0) return null;
    return calculateLevelTotalsFromHierarchy(hierarchy);
  }, [hierarchy]);

  // الملخص المالي
  const financialSummary = useMemo(() => {
    if (!hierarchy || hierarchy.length === 0) return null;
    return calculateFinancialSummaryFromHierarchy(hierarchy);
  }, [hierarchy]);

  // النسب المالية
  const financialRatios = useMemo(() => {
    if (!financialSummary) return null;
    return calculateFinancialRatios(financialSummary);
  }, [financialSummary]);

  // Memoized data drives all tabs, including analysis.

  // تقرير الجودة
  const qualityReport = useMemo(() => {
    if (processedData.length === 0) return null;
    return generateDataQualityReport(processedData, hierarchyResult);
  }, [processedData, hierarchyResult]);
  const qualitySummary = qualityReport?.summary || {};
  const duplicatesCount = qualitySummary.duplicates || 0;
  const missingCodesCount = qualitySummary.missingCodes || 0;
  const invalidCodesCount = qualitySummary.invalidCodes || 0;
  const duplicateItems = qualityReport?.issues?.duplicates || [];

  // البيانات المفلترة
  const filteredData = useMemo(() => {
    let data = processedData;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(row =>
        row.name?.toLowerCase().includes(query) ||
        row.code?.toLowerCase().includes(query)
      );
    }

    if (levelFilter > 0) {
      data = data.filter(row => row.level === levelFilter);
    }

    return data;
  }, [processedData, searchQuery, levelFilter]);

  const zeroBalanceRows = useMemo(() => {
    if (!processedData.length) return [];
    return processedData.filter((row) => (row.debit || 0) === 0 && (row.credit || 0) === 0);
  }, [processedData]);

  // Analysis tab is rendered conditionally via activeTab below.

  const handleEdit = (nodeKey, field, value) => {
    const num = parseFloat(String(value).replace(/,/g, '')) || 0;
    setEdits((prev) => {
      const current = prev[nodeKey] || {};
      return {
        ...prev,
        [nodeKey]: { ...current, [field]: num },
      };
    });
  };

  const expandAll = () => {
    const all = new Set();
    const collect = (nodes) => nodes.forEach((n) => {
      all.add(n.code || n.name);
      if (n.children) collect(n.children);
    });
    collect(hierarchy);
    setExpandedRows(all);
  };

  const collapseAll = () => setExpandedRows(new Set());

  const totalDebitAll = useMemo(
    () => hierarchy.reduce((s, n) => s + (n.aggDebit || 0), 0),
    [hierarchy]
  );
  const totalCreditAll = useMemo(
    () => hierarchy.reduce((s, n) => s + (n.aggCredit || 0), 0),
    [hierarchy]
  );
  const diffAll = totalDebitAll - totalCreditAll;

  const processArrayBuffer = useCallback((arrayBuffer, sourceName = 'ملف Excel') => {
    try {
      const data = new Uint8Array(arrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, blankrows: false });

      // طبيعنة المفاتيح لإزالة المسافات والرموز الخفية من عناوين الأعمدة
      const normalized = json.map((row) => {
        const entries = Object.entries(row).map(([k, v]) => [String(k).trim(), v]);
        return Object.fromEntries(entries);
      });

      const cleaned = normalized.filter((row) =>
        row && Object.values(row).some((v) => String(v ?? '').trim() !== '')
      );

      if (cleaned.length === 0) {
        setUploadState({ status: 'error', message: 'الملف لا يحتوي على بيانات قابلة للقراءة.' });
        return;
      }

      setTrialBalance(cleaned);
      setEdits({});
      setExpandedRows(new Set(['01', '02', '03', '04', '05', '06', '07']));
      const ts = new Date().toISOString();
      localStorage.setItem('tb_last_upload_at', ts);
      setLastUploadAt(ts);
      setError(null);
      setUploadState({ status: 'success', message: `تم التحميل (${cleaned.length} صف) من ${sourceName}` });
    } catch (err) {
      setError('حدث خطأ أثناء قراءة الملف. تأكد من صحة ملف Excel.');
      setUploadState({ status: 'error', message: 'تعذر قراءة الملف. تأكد من الصيغة أو جرّب إعادة الحفظ بصيغة xlsx.' });
      console.error(err);
    }
  }, [setTrialBalance, setExpandedRows]);

  const handleFile = useCallback((file) => {
    if (!file) {
      setUploadState({ status: 'error', message: 'لم يتم اختيار ملف.' });
      return;
    }
    setFileName(file.name);
    setError(null);
    setTemplateStatus({ status: 'idle', message: '' });
    setUploadState({ status: 'reading', message: 'جاري قراءة الملف...' });

    const reader = new FileReader();
    reader.onload = (evt) => processArrayBuffer(evt.target.result, file.name);
    reader.onerror = () => {
      setUploadState({ status: 'error', message: 'تعذر قراءة الملف. حاول مرة أخرى.' });
    };
    reader.readAsArrayBuffer(file);
  }, [processArrayBuffer]);

  const handleFileUpload = (e) => {
    handleFile(e.target.files?.[0]);
    // إعادة ضبط حقل الملف ليسمح برفع نفس الملف مرة أخرى
    if (e.target) e.target.value = '';
  };

  const downloadTemplateFile = useCallback(async () => {
    setTemplateStatus({ status: 'loading', message: 'جاري تنزيل القالب من الرابط الثابت...' });
    try {
      const buffer = await loadTemplateBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Trial_Balance_Template_284_2025.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setTemplateStatus({ status: 'success', message: 'تم تنزيل القالب من الرابط المباشر.' });
    } catch (err) {
      console.error('Template direct download failed, falling back to generator', err);
      try {
        downloadTrialBalanceTemplate(); // يظل متاحاً كخيار توليد مباشر على المتصفح
        setTemplateStatus({ status: 'success', message: 'تم إنشاء القالب محلياً (بديل).' });
      } catch (genErr) {
        console.error('Template generation fallback error', genErr);
        setTemplateStatus({ status: 'error', message: 'تعذر تنزيل القالب حالياً. جرّب لاحقاً أو استخدم رابط بديل.' });
      }
    }
  }, [loadTemplateBuffer]);

  const handleLoadTemplateData = async () => {
    setTemplateStatus({ status: 'idle', message: '' });
    setError(null);
    setUploadState({ status: 'reading', message: 'جاري تحميل القالب الجاهز...' });
    try {
      const buffer = await loadTemplateBuffer();
      processArrayBuffer(buffer, 'القالب الجاهز');
      setFileName('Trial_Balance_Template_284_2025.xlsx');
    } catch (err) {
      console.error('Template fetch error', err);
      setUploadState({ status: 'error', message: 'تعذر تحميل القالب من المسار الثابت. استخدم زر التحميل المباشر أعلاه.' });
    }
  };

  const toggleRow = (code) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleExportTemplate = () => {
    // Generate and download the 284-account template
    try {
      downloadTrialBalanceTemplate();
    } catch (error) {
      console.error('Template generation error:', error);
      alert('حدث خطأ أثناء إنشاء القالب: ' + error.message);
    }
  };

  const handleExportData = () => {
    if (processedData.length === 0) return;

    const exportData = processedData.map(row => ({
      'المستوى': row.level,
      'المستوى 1': row.level1Name,
      'المستوى 2': row.level2Name,
      'المستوى 3': row.level3Name,
      'كود': row.code,
      'اسم الحساب': row.name,
      'مدين': row.debit,
      'دائن': row.credit,
      'الرصيد': row.balance,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ميزان المراجعة');
    XLSX.writeFile(wb, 'trial-balance-export.xlsx');
  };

  // حفظ البيانات في Backend
  const handleSaveToBackend = async () => {
    if (!financialSummary) return;

    setSaving(true);
    try {
      await trialBalanceAPI.upload({
        name: fileName || `ميزان المراجعة ${new Date().toLocaleDateString('ar-EG')}`,
        data: processedData,
        totalDebit: totalDebitAll,
        totalCredit: totalCreditAll,
        isBalanced: Math.abs(diffAll) < 0.01,
        difference: diffAll,
      });
      alert('✅ تم حفظ ميزان المراجعة بنجاح');
    } catch (err) {
      console.error('Save error:', err);
      alert('❌ حدث خطأ أثناء الحفظ: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">ميزان المراجعة المتقدم</h1>
          <p className="text-gray-500 mt-1 text-sm">
            نظام تحليل ميزان المراجعة مع 5 مستويات تصنيف و 4 تقارير احترافية
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {processedData.length > 0 && (
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              <span>تصدير البيانات</span>
            </button>
          )}
        </div>
        {templateStatus.status !== 'idle' && (
          <div
            className={`text-xs text-right mt-1 ${templateStatus.status === 'success'
              ? 'text-green-700'
              : templateStatus.status === 'loading'
                ? 'text-blue-700'
                : 'text-red-700'
              }`}
          >
            {templateStatus.message}
          </div>
        )}
      </div>

      {/* Upload Section & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Upload Area - rebuilt */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">رفع ملف Excel</h2>
              <p className="text-xs text-gray-500 mt-1">
                الأعمدة المطلوبة: Code | Account Name | الرصيد مدين | الرصيد دائن
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="اختر ملف ميزان المراجعة"
              />
              <button className="w-full px-4 py-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                {fileName ? 'تغيير الملف' : 'اختيار ملف'}
        </button>
            </div>

            {fileName && (
              <div className="flex items-center gap-2 text-blue-700 text-xs bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
                <FileSpreadsheet size={16} />
                <span className="font-medium truncate">{fileName}</span>
              </div>
            )}

            {uploadState.status === 'reading' && (
              <div className="flex items-center gap-2 text-blue-600 text-xs">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span>{uploadState.message}</span>
              </div>
            )}

            {uploadState.status === 'success' && (
              <div className="flex items-center gap-2 text-green-600 text-xs bg-green-50 border border-green-100 px-3 py-2 rounded-lg">
                <CheckCircle size={16} />
                <span>{uploadState.message}</span>
              </div>
            )}

            {uploadState.status === 'error' && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                <AlertCircle size={16} />
                <span>{uploadState.message}</span>
              </div>
            )}

            {(error || tbError) && (
              <div className="flex items-start gap-2 text-red-700 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                <AlertCircle size={16} className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-[11px]">تنبيه</div>
                  <div>{error || tbError}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLoadTemplateData}
              className="w-full px-4 py-3 text-sm border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              تحميل القالب من داخل النظام ورفعه تلقائياً
            </button>

            {lastUploadAt && (
              <div className="text-[11px] text-gray-500 bg-gray-50 px-3 py-2 rounded-lg w-full text-center">
                آخر رفع محفوظ: {new Date(lastUploadAt).toLocaleString('ar-EG')}
              </div>
            )}
            <div className="text-[11px] text-gray-500 w-full text-center">
              يتم حفظ البيانات محليًا تلقائياً ولن تختفي بعد التحديث.
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {financialSummary && (
          <>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white">
              <p className="text-blue-100 text-xs mb-1">إجمالي الأصول</p>
              <p className="text-2xl font-bold font-mono">{formatNumber(financialSummary.totalAssets)}</p>
              <div className="mt-2 text-xs text-blue-100">
                متداولة: {formatNumber(financialSummary.currentAssets)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white">
              <p className="text-purple-100 text-xs mb-1">إجمالي الخصوم</p>
              <p className="text-2xl font-bold font-mono">{formatNumber(financialSummary.totalLiabilities)}</p>
              <div className="mt-2 text-xs text-purple-100">
                حقوق الملكية: {formatNumber(financialSummary.equity)}
              </div>
            </div>
            <div className={`p-5 rounded-2xl text-white ${financialSummary.isBalanced
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
              <p className="text-white/80 text-xs mb-1">توازن الميزان</p>
              <p className="text-2xl font-bold">
                {financialSummary.isBalanced ? 'متوازن ✓' : 'غير متوازن ⚠'}
              </p>
              <div className="mt-2 text-xs text-white/80">
                الفرق: {formatNumber(financialSummary.difference)}
              </div>
            </div>
          </>
        )}

        {!financialSummary && (
          <>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs mb-1">إجمالي الأصول</p>
              <p className="text-2xl font-bold text-gray-300">—</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs mb-1">إجمالي الخصوم</p>
              <p className="text-2xl font-bold text-gray-300">—</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-xs mb-1">توازن الميزان</p>
              <p className="text-2xl font-bold text-gray-300">—</p>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      {(tbError || processedData.length > 0) && (
        <div className="flex gap-3">
          {tbError && (
            <div className="flex-1 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
              {tbError}
            </div>
          )}
          <button
            onClick={handleSaveToBackend}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>حفظ في قاعدة البيانات</span>
              </>
            )}
          </button>

        </div>
      )}

      {/* Quality Quick Summary */}
      {qualityReport && (
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            الجودة: {qualityReport.qualityScore}%
          </span>
          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
            تكرارات: {duplicatesCount}
          </span>
          <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
            أكواد ناقصة: {missingCodesCount}
          </span>
          <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
            أكواد خاطئة: {invalidCodesCount}
          </span>
        </div>
      )}

      {/* Duplicate details quick glance */}
      {duplicateItems.length > 0 && (
        <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3 text-sm text-purple-900">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs">i</span>
            الأكواد المكررة (للتوضيح السريع)
          </div>
          <div className="flex flex-wrap gap-2">
            {duplicateItems.map((dup, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => scrollToCode(dup.code)}
                className="bg-white border border-purple-100 rounded-lg px-3 py-2 shadow-sm flex flex-col gap-1 text-left hover:border-purple-300 hover:shadow transition"
                title="انقر للانتقال إلى الصف"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-purple-700">{dup.code}</span>
                  <span className="text-xs text-purple-500">مكرر {dup.count} مرة</span>
                </div>
                <div className="text-xs text-gray-500">
                  الصفوف: {dup.rows?.join(', ') || '—'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Matrix Table Tab */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو الكود..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(parseInt(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={0}>كل المستويات</option>
                    <option value={1}>المستوى 1 - رئيسي</option>
                    <option value={2}>المستوى 2 - فرعي</option>
                    <option value={3}>المستوى 3 - تفصيلي</option>
                    <option value={4}>المستوى 4 - أدق</option>
                    <option value={5}>المستوى 5 - نهائي</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmpty((v) => !v)}
                  className={`px-3 py-2 rounded-lg text-sm border ${showEmpty ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  البنود بلا أرصدة ({zeroBalanceRows.length})
                </button>
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  توسيع الكل
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  طي الكل
                </button>
                <span className="text-sm text-gray-500">
                  {filteredData.length} سجل
                </span>
              </div>

              {showEmpty && zeroBalanceRows.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-amber-800">بنود بدون أرصدة</div>
                    <span className="text-xs text-amber-700">إجمالي: {zeroBalanceRows.length}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-amber-700">
                        <tr>
                          <th className="py-1 px-2 text-right">البند</th>
                          <th className="py-1 px-2 text-right">الكود/المعرف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zeroBalanceRows.map((row) => (
                          <tr key={row.id} className="border-b border-amber-100 last:border-0">
                            <td className="py-1 px-2">{row.name}</td>
                            <td className="py-1 px-2 font-mono text-[11px] text-amber-700">{row.code || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Hierarchy Warnings */}
              {warningMessages.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 space-y-2">
                  <div className="font-semibold flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>تنبيهات التجميع الهرمي</span>
                  </div>
                  <ul className="list-disc pr-6 space-y-1 text-sm">
                    {warningMessages.slice(0, 5).map((msg, idx) => (
                      <li key={idx}>{msg}</li>
                    ))}
                    {warningMessages.length > 5 && (
                      <li className="text-amber-600">
                        + {warningMessages.length - 5} تنبيه إضافي
                      </li>
                    )}
        </ul>
                </div>
              )}

              {/* Matrix Table */}
              {processedData.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-b-2 border-gray-200">
                        <th className="py-4 px-4 text-right font-bold w-28">المستوى</th>
                        <th className="py-4 px-3 text-right font-bold w-32">الكود</th>
                        <th className="py-4 px-3 text-right font-bold">اسم الحساب</th>
                        <th className="py-4 px-3 text-right font-bold w-36">مدين</th>
                        <th className="py-4 px-3 text-right font-bold w-36">دائن</th>
                        <th className="py-4 px-3 text-right font-bold w-36">الرصيد</th>
                        <th className="py-4 px-3 text-center font-bold w-16">عرض</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hierarchy.map((node) => (
                        <MatrixRow
                          key={node.code || node.name}
                          row={node}
                          expandedRows={expandedRows}
                          toggleRow={toggleRow}
                          onEdit={handleEdit}
                          setRowRef={registerRowRef}
                        />
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0">
                      <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-inner">
                        <td colSpan={7} className="py-6 px-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Debit Card */}
                            <div className="bg-white rounded-xl p-5 shadow-md border border-blue-100">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <TrendingUp className="text-blue-600" size={20} />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium">إجمالي المدين</p>
                                  <p className="text-2xl font-bold text-blue-900 font-mono">
                                    {formatNumber(totalDebitAll)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Total Credit Card */}
                            <div className="bg-white rounded-xl p-5 shadow-md border border-purple-100">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                  <TrendingDown className="text-purple-600" size={20} />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium">إجمالي الدائن</p>
                                  <p className="text-2xl font-bold text-purple-900 font-mono">
                                    {formatNumber(totalCreditAll)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Balance Status Card */}
                            <div className={`rounded-xl p-5 shadow-md ${Math.abs(diffAll) < 0.01
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                              : 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
                              }`}>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                  {Math.abs(diffAll) < 0.01 ? (
                                    <CheckCircle size={24} />
                                  ) : (
                                    <AlertCircle size={24} />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs text-white/80 font-medium">حالة الميزان</p>
                                  <p className="text-lg font-bold">
                                    {Math.abs(diffAll) < 0.01 ? 'متوازن ✓' : 'غير متوازن ⚠'}
                                  </p>
                                  {Math.abs(diffAll) >= 0.01 && (
                                    <p className="text-sm text-white/90 font-mono mt-1">
                                      الفرق: {formatNumber(diffAll)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <Layers size={48} className="mx-auto mb-4 opacity-50" />
                  <p>لم يتم تحميل أي ملف بعد.</p>
                  <p className="text-sm mt-2">قم برفع ملف ميزان المراجعة لعرض البيانات</p>
                </div>
              )}
            </div>
          )}

          {/* Hierarchy Report Tab */}
          {activeTab === 'hierarchy' && (
            <HierarchyReport hierarchy={hierarchy} rawData={processedData} />
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <TrialBalanceSummary
              levelTotals={levelTotals}
              financialSummary={financialSummary}
              rawData={processedData}
            />
          )}

          {/* Quality Report Tab */}
          {activeTab === 'quality' && (
            <DataQualityReport qualityReport={qualityReport} />
          )}

        </div>
      </div>
    </div>
  );
}
