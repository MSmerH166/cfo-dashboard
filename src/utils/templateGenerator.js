import * as XLSX from 'xlsx';
import { ACCOUNTS_284 } from '../data/accountsTemplate284.js';

/**
 * Generate a 284-account trial balance template in Excel format
 * Returns a workbook that can be downloaded
 */
export function generateTrialBalanceTemplate() {
    // Prepare data for Excel
    const excelData = [];

    // Add header row
    excelData.push([
        'رقم الحساب',
        'اسم الحساب',
        'المستوى',
        'مدين (Debit)',
        'دائن (Credit)',
        'الرصيد (Balance)',
        'حساب ترحيل؟'
    ]);

    // Add all accounts with proper indentation
    ACCOUNTS_284.forEach((account, index) => {
        const code = (index + 1).toString().padStart(4, '0');
        const indent = '  '.repeat(account.level - 1);
        const displayName = indent + account.name;

        excelData.push([
            code,                              // Account Code
            displayName,                       // Account Name (with indentation)
            account.level,                     // Level
            account.isPosting ? '' : '—',     // Debit (editable for posting, locked for parents)
            account.isPosting ? '' : '—',     // Credit (editable for posting, locked for parents)
            '',                                // Balance (calculated)
            account.isPosting ? 'نعم' : 'لا'  // Is posting account?
        ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
        { wch: 12 },  // Code
        { wch: 45 },  // Name
        { wch: 10 },  // Level
        { wch: 15 },  // Debit
        { wch: 15 },  // Credit
        { wch: 15 },  // Balance
        { wch: 12 },  // Is Posting
    ];

    // Style header row (bold, centered, background color)
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;

        ws[cellAddress].s = {
            font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "2563EB" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            }
        };
    }

    // Protect non-posting account cells (prevent editing)
    ACCOUNTS_284.forEach((account, index) => {
        const rowIndex = index + 1; // +1 for header row

        if (!account.isPosting) {
            // Lock debit/credit cells for parent accounts
            const debitCell = XLSX.utils.encode_cell({ r: rowIndex, c: 3 });
            const creditCell = XLSX.utils.encode_cell({ r: rowIndex, c: 4 });

            // Initialize cells if they don't exist
            if (!ws[debitCell]) ws[debitCell] = { v: '—', t: 's' };
            if (!ws[creditCell]) ws[creditCell] = { v: '—', t: 's' };

            ws[debitCell].s = {
                fill: { fgColor: { rgb: "F3F4F6" } },
                font: { color: { rgb: "9CA3AF" }, italic: true },
                alignment: { horizontal: "center", vertical: "center" }
            };
            ws[creditCell].s = {
                fill: { fgColor: { rgb: "F3F4F6" } },
                font: { color: { rgb: "9CA3AF" }, italic: true },
                alignment: { horizontal: "center", vertical: "center" }
            };
        }

        // Highlight level based on depth
        const nameCell = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
        if (ws[nameCell]) {
            const levelColors = {
                1: "DBEAFE", // Level 1: Light blue
                2: "E0E7FF", // Level 2: Light indigo
                3: "F3F4F6", // Level 3: Light gray
                4: "FFFFFF", // Level 4: White
                5: "FFFFFF"  // Level 5: White
            };

            ws[nameCell].s = {
                fill: { fgColor: { rgb: levelColors[account.level] || "FFFFFF" } },
                font: { bold: account.level <= 2, sz: account.level <= 2 ? 11 : 10 },
                alignment: { horizontal: "right", vertical: "center" }
            };
        }
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ميزان المراجعة');

    // Add metadata
    wb.Props = {
        Title: "ميزان المراجعة - 284 حساب",
        Subject: "Trial Balance Template",
        Author: "CFO System",
        CreatedDate: new Date()
    };

    return wb;
}

/**
 * Download the template as an Excel file
 */
export function downloadTrialBalanceTemplate() {
    const wb = generateTrialBalanceTemplate();
    const fileName = `Trial_Balance_Template_284_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Return the template as an ArrayBuffer (for in-memory upload/fallbacks)
 */
export function generateTemplateArrayBuffer() {
    const wb = generateTrialBalanceTemplate();
    // type: 'array' returns an ArrayBuffer suitable for Blob/processing
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

/**
 * Parse uploaded trial balance file and validate against 284-account structure
 * @param {File} file - The uploaded Excel file
 * @returns {Promise<Object>} Parsed and validated data
 */
export async function parseAndValidateTrialBalance(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                // Skip header row
                const dataRows = jsonData.slice(1);

                // Parse accounts
                const accounts = [];
                const errors = [];
                let totalDebit = 0;
                let totalCredit = 0;

                dataRows.forEach((row, index) => {
                    if (!row || row.length === 0) return;

                    const [code, name, level, debit, credit, balance, isPosting] = row;

                    // Clean account name (remove indentation)
                    const cleanName = (name || '').trim();

                    // Find corresponding account in template
                    const templateAccount = ACCOUNTS_284.find(acc =>
                        acc.name.trim() === cleanName
                    );

                    if (!templateAccount) {
                        errors.push({
                            row: index + 2,
                            type: 'missing_account',
                            message: `الحساب "${cleanName}" غير موجود في القالب الأساسي`
                        });
                        return;
                    }

                    // Parse debit/credit
                    const debitValue = parseFloat(debit) || 0;
                    const creditValue = parseFloat(credit) || 0;

                    // Only posting accounts should have values
                    if (templateAccount.isPosting) {
                        totalDebit += debitValue;
                        totalCredit += creditValue;
                    } else if (debitValue !== 0 || creditValue !== 0) {
                        errors.push({
                            row: index + 2,
                            type: 'invalid_posting',
                            message: `الحساب "${cleanName}" هو حساب رئيسي ولا يمكن الترحيل عليه مباشرة`
                        });
                    }

                    accounts.push({
                        code,
                        name: cleanName,
                        level,
                        debit: debitValue,
                        credit: creditValue,
                        balance: debitValue - creditValue,
                        isPosting: templateAccount.isPosting,
                        parent: templateAccount.parent
                    });
                });

                // Validate balance
                const difference = Math.abs(totalDebit - totalCredit);
                const isBalanced = difference < 0.01; // Allow 1 cent tolerance

                if (!isBalanced) {
                    errors.push({
                        type: 'imbalance',
                        message: `إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)})`,
                        difference: difference
                    });
                }

                // Check if all 284 accounts are present
                if (accounts.length !== ACCOUNTS_284.length) {
                    errors.push({
                        type: 'incomplete',
                        message: `القالب يحتوي على ${accounts.length} حساب فقط، المطلوب 284 حساب`
                    });
                }

                resolve({
                    success: errors.length === 0,
                    accounts,
                    totalDebit,
                    totalCredit,
                    difference,
                    isBalanced,
                    errors,
                    metadata: {
                        uploadDate: new Date().toISOString(),
                        accountCount: accounts.length,
                        postingAccountCount: accounts.filter(a => a.isPosting).length
                    }
                });

            } catch (error) {
                reject({
                    success: false,
                    error: error.message,
                    message: 'خطأ في قراءة الملف. تأكد من أنه ملف Excel صحيح'
                });
            }
        };

        reader.onerror = () => {
            reject({
                success: false,
                error: 'FileReader error',
                message: 'فشل في قراءة الملف'
            });
        };

        reader.readAsArrayBuffer(file);
    });
}

export default {
    generateTrialBalanceTemplate,
    downloadTrialBalanceTemplate,
    generateTemplateArrayBuffer,
    parseAndValidateTrialBalance
};
