/**
 * Chart of Accounts - شجرة الحسابات
 * 5 مستويات تصنيف للحسابات
 */

// المستوى الأول - التصنيف الأساسي (Level 1)
export const LEVEL_1_CATEGORIES = {
    CURRENT_ASSETS: { code: '01', name: 'الأصول المتداولة', nameEn: 'Current Assets' },
    FIXED_ASSETS: { code: '02', name: 'الأصول الثابتة', nameEn: 'Fixed Assets' },
    CURRENT_LIABILITIES: { code: '03', name: 'الخصوم المتداولة', nameEn: 'Current Liabilities' },
    LONG_TERM_LIABILITIES: { code: '04', name: 'خصوم طويلة الأجل', nameEn: 'Long Term Liabilities' },
    EQUITY: { code: '05', name: 'حقوق الملكية', nameEn: 'Equity' },
    COSTS: { code: '06', name: 'التكاليف', nameEn: 'Costs & Expenses' },
    REVENUE: { code: '07', name: 'الإيرادات', nameEn: 'Revenue' },
};

// شجرة الحسابات الكاملة
export const CHART_OF_ACCOUNTS = [
    // ═══════════════════════════════════════════════════════════════════
    // الأصول المتداولة (01)
    // ═══════════════════════════════════════════════════════════════════
    { code: '01', name: 'الأصول المتداولة', level: 1, parent: null, type: 'header' },

    // البنوك (0101)
    { code: '0101', name: 'البنوك', level: 2, parent: '01', type: 'group' },
    { code: '010101', name: 'حسابات البنوك', level: 3, parent: '0101', type: 'subgroup' },
    { code: '01010101', name: 'مصرف الإنماء', level: 4, parent: '010101', type: 'detail' },
    { code: '01010102', name: 'مصرف الراجحي', level: 4, parent: '010101', type: 'detail' },
    { code: '01010103', name: 'بنك الرياض', level: 4, parent: '010101', type: 'detail' },
    { code: '01010104', name: 'البنك الأهلي', level: 4, parent: '010101', type: 'detail' },
    { code: '010102', name: 'ضمانات نقدية', level: 3, parent: '0101', type: 'subgroup' },
    { code: '01010201', name: 'ضمانات إنماء', level: 4, parent: '010102', type: 'detail' },
    { code: '01010202', name: 'ضمانات الرياض', level: 4, parent: '010102', type: 'detail' },
    { code: '010103', name: 'تأمين ضمانات', level: 3, parent: '0101', type: 'subgroup' },

    // العملاء (0102)
    { code: '0102', name: 'العملاء', level: 2, parent: '01', type: 'group' },
    { code: '010201', name: '01 العملاء', level: 3, parent: '0102', type: 'subgroup' },

    // ضمانات العملاء (0103)
    { code: '0103', name: 'ضمانات العملاء', level: 2, parent: '01', type: 'group' },
    { code: '010301', name: 'ضمانات أعمال العملاء', level: 3, parent: '0103', type: 'subgroup' },

    // العهد (0104)
    { code: '0104', name: 'العهد', level: 2, parent: '01', type: 'group' },
    { code: '010401', name: 'العهدة الجارية', level: 3, parent: '0104', type: 'subgroup' },
    { code: '010402', name: 'العهدة المستديمة', level: 3, parent: '0104', type: 'subgroup' },

    // ذمم الموظفين (0105)
    { code: '0105', name: 'ذمم الموظفين', level: 2, parent: '01', type: 'group' },
    { code: '010501', name: 'سلف الموظفين', level: 3, parent: '0105', type: 'subgroup' },
    { code: '010502', name: 'ذمم موظفين أخرى', level: 3, parent: '0105', type: 'subgroup' },

    // المخزون (0106)
    { code: '0106', name: 'المخزون', level: 2, parent: '01', type: 'group' },
    { code: '010601', name: 'مواد خام', level: 3, parent: '0106', type: 'subgroup' },
    { code: '010602', name: 'مواد تامة الصنع', level: 3, parent: '0106', type: 'subgroup' },

    // مدينون متنوعون (0107)
    { code: '0107', name: 'مدينون متنوعون', level: 2, parent: '01', type: 'group' },
    { code: '010701', name: 'دفعات مقاولين', level: 3, parent: '0107', type: 'subgroup' },
    { code: '010702', name: 'مصروفات مقدمة', level: 3, parent: '0107', type: 'subgroup' },
    { code: '010703', name: 'إيرادات مستحقة', level: 3, parent: '0107', type: 'subgroup' },

    // أوراق قبض (0108)
    { code: '0108', name: 'أوراق قبض', level: 2, parent: '01', type: 'group' },
    { code: '010801', name: 'شيكات تحت التحصيل', level: 3, parent: '0108', type: 'subgroup' },

    // أصول متداولة أخرى (0109)
    { code: '0109', name: 'أصول متداولة أخرى', level: 2, parent: '01', type: 'group' },

    // ═══════════════════════════════════════════════════════════════════
    // الأصول الثابتة (02)
    // ═══════════════════════════════════════════════════════════════════
    { code: '02', name: 'الأصول الثابتة', level: 1, parent: null, type: 'header' },

    // الأصول الثابتة (0201)
    { code: '0201', name: 'الأصول الثابتة', level: 2, parent: '02', type: 'group' },
    { code: '020101', name: 'السيارات', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020102', name: 'المعدات', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020103', name: 'الأخشاب', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020104', name: 'المكاتب الجاهزة', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020105', name: 'الأثاث', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020106', name: 'الديكورات', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020107', name: 'الشدة المعدنية', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020108', name: 'أجهزة كمبيوتر', level: 3, parent: '0201', type: 'subgroup' },
    { code: '020109', name: 'أدوات ومعدات صغيرة', level: 3, parent: '0201', type: 'subgroup' },

    // ═══════════════════════════════════════════════════════════════════
    // الخصوم المتداولة (03)
    // ═══════════════════════════════════════════════════════════════════
    { code: '03', name: 'الخصوم المتداولة', level: 1, parent: null, type: 'header' },

    // الموردين (0301)
    { code: '0301', name: 'الموردين', level: 2, parent: '03', type: 'group' },
    { code: '030101', name: 'الموردين المحليين', level: 3, parent: '0301', type: 'subgroup' },
    { code: '030102', name: 'الموردين الخارجيين', level: 3, parent: '0301', type: 'subgroup' },

    // المقاولين (0302)
    { code: '0302', name: 'المقاولين', level: 2, parent: '03', type: 'group' },
    { code: '030201', name: 'المقاولين من الباطن', level: 3, parent: '0302', type: 'subgroup' },
    { code: '030202', name: 'مكاتب هندسية', level: 3, parent: '0302', type: 'subgroup' },

    // ضمانات المقاولين (0303)
    { code: '0303', name: 'ضمانات المقاولين', level: 2, parent: '03', type: 'group' },

    // دائنون متنوعون (0304)
    { code: '0304', name: 'دائنون متنوعون', level: 2, parent: '03', type: 'group' },
    { code: '030401', name: 'مصروفات مستحقة', level: 3, parent: '0304', type: 'subgroup' },
    { code: '03040101', name: 'مصروفات مستحقة رواتب', level: 4, parent: '030401', type: 'detail' },
    { code: '03040102', name: 'مصروفات مستحقة أخرى', level: 4, parent: '030401', type: 'detail' },

    // دفعات مقدمة من العملاء (0305)
    { code: '0305', name: 'دفعات مقدمة من العملاء', level: 2, parent: '03', type: 'group' },

    // ضريبة القيمة المضافة (0306)
    { code: '0306', name: 'ضريبة القيمة المضافة', level: 2, parent: '03', type: 'group' },
    { code: '030601', name: 'ضريبة مشتريات', level: 3, parent: '0306', type: 'subgroup' },
    { code: '030602', name: 'ضريبة إيرادات', level: 3, parent: '0306', type: 'subgroup' },
    { code: '030603', name: 'صافي ضريبة القيمة المضافة', level: 3, parent: '0306', type: 'subgroup' },

    // أوراق الدفع (0307)
    { code: '0307', name: 'أوراق الدفع', level: 2, parent: '03', type: 'group' },

    // خصوم متداولة أخرى (0308)
    { code: '0308', name: 'خصوم متداولة أخرى', level: 2, parent: '03', type: 'group' },
    { code: '030801', name: 'التزامات أخرى', level: 3, parent: '0308', type: 'subgroup' },

    // حسابات وسيطة (0309)
    { code: '0309', name: 'حسابات وسيطة', level: 2, parent: '03', type: 'group' },

    // ═══════════════════════════════════════════════════════════════════
    // خصوم طويلة الأجل (04)
    // ═══════════════════════════════════════════════════════════════════
    { code: '04', name: 'خصوم طويلة الأجل', level: 1, parent: null, type: 'header' },

    // مخصص حقوق الموظفين (0401)
    { code: '0401', name: 'مخصص حقوق الموظفين', level: 2, parent: '04', type: 'group' },
    { code: '040101', name: 'مخصص نهاية الخدمة', level: 3, parent: '0401', type: 'subgroup' },
    { code: '040102', name: 'مخصص الإجازات', level: 3, parent: '0401', type: 'subgroup' },

    // مجمع الاهلاك (0402)
    { code: '0402', name: 'مجمع الاهلاك', level: 2, parent: '04', type: 'group' },
    { code: '040201', name: 'مجمع اهلاك السيارات', level: 3, parent: '0402', type: 'subgroup' },
    { code: '040202', name: 'مجمع اهلاك المعدات', level: 3, parent: '0402', type: 'subgroup' },
    { code: '040203', name: 'مجمع اهلاك الأخشاب', level: 3, parent: '0402', type: 'subgroup' },
    { code: '040204', name: 'مجمع اهلاك المكاتب الجاهزة', level: 3, parent: '0402', type: 'subgroup' },
    { code: '040205', name: 'مجمع اهلاك الأثاث', level: 3, parent: '0402', type: 'subgroup' },
    { code: '040206', name: 'مجمع اهلاك الديكورات', level: 3, parent: '0402', type: 'subgroup' },
    { code: '040207', name: 'مجمع اهلاك الشدة المعدنية', level: 3, parent: '0402', type: 'subgroup' },
    { code: '040208', name: 'مجمع اهلاك أجهزة الكمبيوتر', level: 3, parent: '0402', type: 'subgroup' },

    // قروض طويلة الأجل (0403)
    { code: '0403', name: 'قروض طويلة الأجل', level: 2, parent: '04', type: 'group' },

    // ═══════════════════════════════════════════════════════════════════
    // حقوق الملكية (05)
    // ═══════════════════════════════════════════════════════════════════
    { code: '05', name: 'حقوق الملكية', level: 1, parent: null, type: 'header' },

    // رأس المال (0501)
    { code: '0501', name: 'رأس المال', level: 2, parent: '05', type: 'group' },
    { code: '050101', name: 'رأس المال المدفوع', level: 3, parent: '0501', type: 'subgroup' },

    // الاحتياطي النظامي (0502)
    { code: '0502', name: 'الاحتياطي النظامي', level: 2, parent: '05', type: 'group' },
    { code: '050201', name: 'الاحتياطي القانوني', level: 3, parent: '0502', type: 'subgroup' },
    { code: '050202', name: 'الاحتياطي العام', level: 3, parent: '0502', type: 'subgroup' },

    // جاري الشركاء (0503)
    { code: '0503', name: 'جاري الشركاء', level: 2, parent: '05', type: 'group' },
    { code: '050301', name: 'جاري الشريك الأول', level: 3, parent: '0503', type: 'subgroup' },
    { code: '050302', name: 'جاري الشريك الثاني', level: 3, parent: '0503', type: 'subgroup' },
    { code: '050303', name: 'جاري الشريك الثالث', level: 3, parent: '0503', type: 'subgroup' },

    // الأرباح (0504)
    { code: '0504', name: 'الأرباح', level: 2, parent: '05', type: 'group' },
    { code: '050401', name: 'أرباح مبقاة', level: 3, parent: '0504', type: 'subgroup' },
    { code: '050402', name: 'أرباح العام الحالي', level: 3, parent: '0504', type: 'subgroup' },

    // ═══════════════════════════════════════════════════════════════════
    // التكاليف (06)
    // ═══════════════════════════════════════════════════════════════════
    { code: '06', name: 'التكاليف', level: 1, parent: null, type: 'header' },

    // تكاليف العمليات (0601)
    { code: '0601', name: 'تكاليف العمليات', level: 2, parent: '06', type: 'group' },
    { code: '060101', name: 'مواد مباشرة', level: 3, parent: '0601', type: 'subgroup' },
    { code: '060102', name: 'أجور مباشرة', level: 3, parent: '0601', type: 'subgroup' },
    { code: '060103', name: 'مقاولين من الباطن', level: 3, parent: '0601', type: 'subgroup' },
    { code: '060104', name: 'تكاليف معدات', level: 3, parent: '0601', type: 'subgroup' },
    { code: '060105', name: 'تكاليف نقل', level: 3, parent: '0601', type: 'subgroup' },
    { code: '060106', name: 'تكاليف غير مباشرة', level: 3, parent: '0601', type: 'subgroup' },

    // المصروفات العمومية (0602)
    { code: '0602', name: 'المصروفات العمومية', level: 2, parent: '06', type: 'group' },
    { code: '060201', name: 'رواتب وأجور', level: 3, parent: '0602', type: 'subgroup' },
    { code: '06020101', name: 'رواتب الموظفين', level: 4, parent: '060201', type: 'detail' },
    { code: '06020102', name: 'بدلات الموظفين', level: 4, parent: '060201', type: 'detail' },
    { code: '06020103', name: 'تأمينات اجتماعية', level: 4, parent: '060201', type: 'detail' },
    { code: '060202', name: 'إيجارات', level: 3, parent: '0602', type: 'subgroup' },
    { code: '06020201', name: 'إيجار المكتب', level: 4, parent: '060202', type: 'detail' },
    { code: '06020202', name: 'إيجار المستودعات', level: 4, parent: '060202', type: 'detail' },
    { code: '060203', name: 'مصروفات مكتبية', level: 3, parent: '0602', type: 'subgroup' },
    { code: '06020301', name: 'أدوات مكتبية', level: 4, parent: '060203', type: 'detail' },
    { code: '06020302', name: 'طباعة وتصوير', level: 4, parent: '060203', type: 'detail' },
    { code: '060204', name: 'صيانة', level: 3, parent: '0602', type: 'subgroup' },
    { code: '06020401', name: 'صيانة سيارات', level: 4, parent: '060204', type: 'detail' },
    { code: '06020402', name: 'صيانة معدات', level: 4, parent: '060204', type: 'detail' },
    { code: '06020403', name: 'صيانة مباني', level: 4, parent: '060204', type: 'detail' },
    { code: '060205', name: 'اتصالات', level: 3, parent: '0602', type: 'subgroup' },
    { code: '06020501', name: 'هاتف وانترنت', level: 4, parent: '060205', type: 'detail' },
    { code: '06020502', name: 'بريد ومراسلات', level: 4, parent: '060205', type: 'detail' },
    { code: '060206', name: 'مصروفات سفر وتنقل', level: 3, parent: '0602', type: 'subgroup' },
    { code: '060207', name: 'استشارات وخدمات مهنية', level: 3, parent: '0602', type: 'subgroup' },
    { code: '060208', name: 'تأمينات', level: 3, parent: '0602', type: 'subgroup' },
    { code: '060209', name: 'كهرباء ومياه', level: 3, parent: '0602', type: 'subgroup' },
    { code: '060210', name: 'رسوم حكومية', level: 3, parent: '0602', type: 'subgroup' },
    { code: '060211', name: 'ضيافة', level: 3, parent: '0602', type: 'subgroup' },
    { code: '060212', name: 'مصروفات عمومية أخرى', level: 3, parent: '0602', type: 'subgroup' },

    // مصروفات التمويل (0603)
    { code: '0603', name: 'مصروفات التمويل', level: 2, parent: '06', type: 'group' },
    { code: '060301', name: 'عمولات بنكية', level: 3, parent: '0603', type: 'subgroup' },
    { code: '060302', name: 'فوائد قروض', level: 3, parent: '0603', type: 'subgroup' },

    // الاهلاك (0604)
    { code: '0604', name: 'الاهلاك', level: 2, parent: '06', type: 'group' },
    { code: '060401', name: 'اهلاك السيارات', level: 3, parent: '0604', type: 'subgroup' },
    { code: '060402', name: 'اهلاك المعدات', level: 3, parent: '0604', type: 'subgroup' },
    { code: '060403', name: 'اهلاك الأخشاب', level: 3, parent: '0604', type: 'subgroup' },
    { code: '060404', name: 'اهلاك المكاتب الجاهزة', level: 3, parent: '0604', type: 'subgroup' },
    { code: '060405', name: 'اهلاك الأثاث', level: 3, parent: '0604', type: 'subgroup' },
    { code: '060406', name: 'اهلاك الديكورات', level: 3, parent: '0604', type: 'subgroup' },
    { code: '060407', name: 'اهلاك الشدة المعدنية', level: 3, parent: '0604', type: 'subgroup' },
    { code: '060408', name: 'اهلاك أجهزة الكمبيوتر', level: 3, parent: '0604', type: 'subgroup' },

    // الزكاة والضريبة (0605)
    { code: '0605', name: 'الزكاة والضريبة', level: 2, parent: '06', type: 'group' },
    { code: '060501', name: 'مصروف الزكاة', level: 3, parent: '0605', type: 'subgroup' },
    { code: '060502', name: 'مصروف ضريبة الدخل', level: 3, parent: '0605', type: 'subgroup' },

    // ═══════════════════════════════════════════════════════════════════
    // الإيرادات (07)
    // ═══════════════════════════════════════════════════════════════════
    { code: '07', name: 'الإيرادات', level: 1, parent: null, type: 'header' },

    // إيرادات العمليات (0701)
    { code: '0701', name: 'إيرادات العمليات', level: 2, parent: '07', type: 'group' },
    { code: '070101', name: 'إيرادات المشاريع', level: 3, parent: '0701', type: 'subgroup' },
    { code: '070102', name: 'إيرادات الصيانة', level: 3, parent: '0701', type: 'subgroup' },
    { code: '070103', name: 'إيرادات التأجير', level: 3, parent: '0701', type: 'subgroup' },

    // إيرادات أخرى (0702)
    { code: '0702', name: 'إيرادات أخرى', level: 2, parent: '07', type: 'group' },
    { code: '070201', name: 'إيرادات استثمارات', level: 3, parent: '0702', type: 'subgroup' },
    { code: '070202', name: 'أرباح بيع أصول', level: 3, parent: '0702', type: 'subgroup' },
    { code: '070203', name: 'إيرادات متنوعة', level: 3, parent: '0702', type: 'subgroup' },
];

/**
 * الحصول على مستوى الحساب من الكود
 * @param {string} code - كود الحساب
 * @returns {number} - مستوى الحساب (1-5)
 */
export function getAccountLevel(code) {
    if (!code) return 0;
    const len = code.length;
    if (len === 2) return 1;
    if (len === 4) return 2;
    if (len === 6) return 3;
    if (len === 8) return 4;
    if (len >= 10) return 5;
    return 0;
}

/**
 * الحصول على التصنيف الرئيسي (المستوى الأول) من الكود
 * @param {string} code - كود الحساب
 * @returns {Object|null} - بيانات التصنيف الرئيسي
 */
export function getLevel1Category(code) {
    if (!code) return null;
    const prefix = code.substring(0, 2);
    return Object.values(LEVEL_1_CATEGORIES).find(cat => cat.code === prefix) || null;
}

/**
 * الحصول على الحساب الأب
 * @param {string} code - كود الحساب
 * @returns {string|null} - كود الحساب الأب
 */
export function getParentCode(code) {
    if (!code || code.length <= 2) return null;
    return code.substring(0, code.length - 2);
}

/**
 * البحث عن حساب بالكود
 * @param {string} code - كود الحساب
 * @returns {Object|null} - بيانات الحساب
 */
export function findAccountByCode(code) {
    return CHART_OF_ACCOUNTS.find(acc => acc.code === code) || null;
}

/**
 * الحصول على جميع الحسابات الفرعية لحساب معين
 * @param {string} parentCode - كود الحساب الأب
 * @returns {Array} - قائمة الحسابات الفرعية
 */
export function getChildAccounts(parentCode) {
    return CHART_OF_ACCOUNTS.filter(acc => acc.parent === parentCode);
}

/**
 * الحصول على المسار الكامل للحساب (من المستوى 1 حتى الحساب)
 * @param {string} code - كود الحساب
 * @returns {Array} - مصفوفة الحسابات من الأعلى للأسفل
 */
export function getAccountPath(code) {
    const path = [];
    let currentCode = code;

    while (currentCode) {
        const account = findAccountByCode(currentCode);
        if (account) {
            path.unshift(account);
        }
        currentCode = getParentCode(currentCode);
    }

    return path;
}

/**
 * تصنيف الحساب وإرجاع بيانات المستويات
 * @param {string} code - كود الحساب
 * @param {string} name - اسم الحساب
 * @returns {Object} - بيانات التصنيف للمستويات الخمسة
 */
export function classifyAccount(code, name) {
    const path = getAccountPath(code);
    const level1 = getLevel1Category(code);

    return {
        code,
        name,
        level: getAccountLevel(code),
        level1Name: level1?.name || '',
        level2Name: path.find(p => p.level === 2)?.name || '',
        level3Name: path.find(p => p.level === 3)?.name || '',
        level4Name: path.find(p => p.level === 4)?.name || '',
        level5Name: path.find(p => p.level === 5)?.name || '',
        category: level1,
        path,
    };
}

export default CHART_OF_ACCOUNTS;
