/**
 * Complete 284-Account Chart of Accounts
 * Structure: Name-based identification with 5-level hierarchy
 * Based on user's posting accounts list
 */

export const ACCOUNTS_284 = [
    // ═══════════════════════════════════════════════════════════════════
    // (01) الأصول المتداولة - CURRENT ASSETS
    // ═══════════════════════════════════════════════════════════════════
    { name: 'الأصول المتداولة', level: 1, parent: null, isPosting: false },

    // ─────────────────────────────────────────────────────────────────
    // البنوك - Banks
    // ─────────────────────────────────────────────────────────────────
    { name: 'البنوك', level: 2, parent: 'الأصول المتداولة', isPosting: false },
    { name: 'حسابات البنوك', level: 3, parent: 'البنوك', isPosting: false },

    // مصرف الإنماء
    { name: 'مصرف الإنماء', level: 4, parent: 'حسابات البنوك', isPosting: false },
    { name: 'مصرف الانماء 68200000071000', level: 5, parent: 'مصرف الإنماء', isPosting: true },
    { name: 'مصرف الانماء 68200000071001', level: 5, parent: 'مصرف الإنماء', isPosting: true },

    // مصرف الراجحي
    { name: 'مصرف الراجحى', level: 4, parent: 'حسابات البنوك', isPosting: false },
    { name: 'مصرف الراجحى 521608010111995', level: 5, parent: 'مصرف الراجحى', isPosting: true },
    { name: 'مصرف الراجحى 375608010001177', level: 5, parent: 'مصرف الراجحى', isPosting: true },

    // بنك الرياض
    { name: 'بنك الرياض', level: 4, parent: 'حسابات البنوك', isPosting: false },
    { name: 'بنك الرياض 001000698249940', level: 5, parent: 'بنك الرياض', isPosting: true },
    { name: 'وسيط بنك الرياض', level: 5, parent: 'بنك الرياض', isPosting: true },

    // البنك الأهلي
    { name: 'البنك الاهلى', level: 4, parent: 'حسابات البنوك', isPosting: false },
    { name: 'البنك الاهلى 065900000713108', level: 5, parent: 'البنك الاهلى', isPosting: true },
    { name: 'البنك الاهلى فرعى  1806', level: 5, parent: 'البنك الاهلى', isPosting: true },
    { name: 'البنك الاهلى فرعى  8901', level: 5, parent: 'البنك الاهلى', isPosting: true },

    // ضمانات بنكية
    { name: 'ضمانات بنكية', level: 3, parent: 'البنوك', isPosting: false },
    { name: 'ضمان بنكى - مصرف الانماء', level: 4, parent: 'ضمانات بنكية', isPosting: true },
    { name: 'ضمان بنكى - بنك الرياض', level: 4, parent: 'ضمانات بنكية', isPosting: true },

    // تأمين ضمانات
    { name: 'تامين ضمانات', level: 3, parent: 'البنوك', isPosting: false },
    { name: 'تامين ضمانات - بنك الرياض', level: 4, parent: 'تامين ضمانات', isPosting: true },
    { name: 'تامين ضمانات - البنك الاهلى', level: 4, parent: 'تامين ضمانات', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // العملاء - Customers
    // ─────────────────────────────────────────────────────────────────
    { name: 'العملاء', level: 2, parent: 'الأصول المتداولة', isPosting: false },
    { name: '01 العملاء', level: 3, parent: 'العملاء', isPosting: true },
    { name: 'ضمان تأمين أعمال لدى العملاء', level: 3, parent: 'العملاء', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // العهد - Advances
    // ─────────────────────────────────────────────────────────────────
    { name: 'العهد', level: 2, parent: 'الأصول المتداولة', isPosting: false },
    { name: 'عهدة جارية', level: 3, parent: 'العهد', isPosting: false },
    { name: 'عهدة - المنطقة الشرقية', level: 4, parent: 'عهدة جارية', isPosting: true },
    { name: 'عهدة - منطقة الرياض', level: 4, parent: 'عهدة جارية', isPosting: true },
    { name: 'عهدة - مصنع الالمونيوم', level: 4, parent: 'عهدة جارية', isPosting: true },
    { name: 'عهدة - شفيق الخواجة', level: 4, parent: 'عهدة جارية', isPosting: true },
    { name: 'عهدة - شئون الموظفين', level: 4, parent: 'عهدة جارية', isPosting: true },

    { name: 'عهدة مستديمة', level: 3, parent: 'العهد', isPosting: false },
    { name: 'عهدة مستديمة - المنطقة الشرقية', level: 4, parent: 'عهدة مستديمة', isPosting: true },
    { name: 'عهدة مستديمة - منطقة الرياض', level: 4, parent: 'عهدة مستديمة', isPosting: true },
    { name: 'عهدة مستديمة - مصنع الالمونيوم', level: 4, parent: 'عهدة مستديمة', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // ذمم الموظفين - Employee Receivables
    // ─────────────────────────────────────────────────────────────────
    { name: 'ذمم الموظفين', level: 2, parent: 'الأصول المتداولة', isPosting: false },
    { name: 'ذمم الموظفين ', level: 3, parent: 'ذمم الموظفين', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // المخزون - Inventory
    // ─────────────────────────────────────────────────────────────────
    { name: 'المخزون', level: 2, parent: 'الأصول المتداولة', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // مدينون متنوعون - Other Receivables
    // ─────────────────────────────────────────────────────────────────
    { name: 'مدينون متنوعون', level: 2, parent: 'الأصول المتداولة', isPosting: false },
    { name: 'تامينات لدى الغير ', level: 3, parent: 'مدينون متنوعون', isPosting: true },
    { name: 'دفعات مقدمة مقاولين', level: 3, parent: 'مدينون متنوعون', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // أوراق قبض - Notes Receivable
    // ─────────────────────────────────────────────────────────────────
    { name: 'اوراق قبض', level: 2, parent: 'الأصول المتداولة', isPosting: true },
    { name: 'شيكات تحت التحصيل', level: 2, parent: 'الأصول المتداولة', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // مصروفات مقدمة - Prepaid Expenses
    // ─────────────────────────────────────────────────────────────────
    { name: 'مصروفات مقدمة', level: 2, parent: 'الأصول المتداولة', isPosting: false },
    { name: 'مصروفات مقدمة - ايجارات', level: 3, parent: 'مصروفات مقدمة', isPosting: true },
    { name: 'مصروفات مقدمة - عمولة تسهيلات', level: 3, parent: 'مصروفات مقدمة', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // إيرادات مستحقة - Accrued Revenue
    // ─────────────────────────────────────────────────────────────────
    { name: 'ايرادات مستحقة غير مفوترة', level: 2, parent: 'الأصول المتداولة', isPosting: true },

    // ─────────────────────────────────────────────────────────────────
    // أخرى - Other
    // ─────────────────────────────────────────────────────────────────
    { name: 'كروت ائتمان /فيزا', level: 2, parent: 'الأصول المتداولة', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // (02) الأصول الثابتة - FIXED ASSETS
    // ═══════════════════════════════════════════════════════════════════
    { name: 'الأصول الثابتة', level: 1, parent: null, isPosting: false },

    { name: 'السيارات ', level: 2, parent: 'الأصول الثابتة', isPosting: true },
    { name: 'الالات والمعدات', level: 2, parent: 'الأصول الثابتة', isPosting: true },
    { name: 'الاخشاب المرابيع', level: 2, parent: 'الأصول الثابتة', isPosting: true },
    { name: 'المكاتب الجاهزة', level: 2, parent: 'الأصول الثابتة', isPosting: true },
    { name: 'أجهزة الكمبيوتر والطابعات', level: 2, parent: 'الأصول الثابتة', isPosting: true },
    { name: 'الأثاث والمفروشات', level: 2, parent: 'الأصول الثابتة', isPosting: true },
    { name: 'الديكورات', level: 2, parent: 'الأصول الثابتة', isPosting: true },
    { name: 'الشدة المعدنية ', level: 2, parent: 'الأصول الثابتة', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // (03) الخصوم المتداولة - CURRENT LIABILITIES
    // ═══════════════════════════════════════════════════════════════════
    { name: 'الخصوم المتداولة', level: 1, parent: null, isPosting: false },

    { name: '02 الموردين', level: 2, parent: 'الخصوم المتداولة', isPosting: true },
    { name: '03 المقاولين', level: 2, parent: 'الخصوم المتداولة', isPosting: true },
    { name: 'ضمان حسن التنفيذ للمقاولين', level: 2, parent: 'الخصوم المتداولة', isPosting: true },
    { name: '04 المكاتب الهندسية والاستشارية', level: 2, parent: 'الخصوم المتداولة', isPosting: true },
    { name: 'دفعات مقدمة من العملاء', level: 2, parent: 'الخصوم المتداولة', isPosting: true },

    // ضريبة القيمة المضافة
    { name: 'ضريبة القيمة المضافة', level: 2, parent: 'الخصوم المتداولة', isPosting: false },
    { name: 'ضريبة المشتريات', level: 3, parent: 'ضريبة القيمة المضافة', isPosting: true },
    { name: 'ضريبة الإيرادات ', level: 3, parent: 'ضريبة القيمة المضافة', isPosting: true },
    { name: 'تسوية ضريبة القيمة المضافة', level: 3, parent: 'ضريبة القيمة المضافة', isPosting: true },

    { name: 'اوراق الدفع', level: 2, parent: 'الخصوم المتداولة', isPosting: true },

    // مصروفات مستحقة
    { name: 'مصروفات مستحقة', level: 2, parent: 'الخصوم المتداولة', isPosting: false },
    { name: 'مصروفات مستحقة - رواتب', level: 3, parent: 'مصروفات مستحقة', isPosting: true },
    { name: 'مصروفات مستحقة - اتعاب مهنية', level: 3, parent: 'مصروفات مستحقة', isPosting: true },
    { name: 'مصروفات مستحقة - تكلفة التمويل ', level: 3, parent: 'مصروفات مستحقة', isPosting: true },

    { name: 'تسوية مستحقات الموظفين', level: 2, parent: 'الخصوم المتداولة', isPosting: true },
    { name: 'مخصص الزكاة وضريبة الدخل', level: 2, parent: 'الخصوم المتداولة', isPosting: true },

    // حسابات وسيطة
    { name: 'حسابات وسيطة', level: 2, parent: 'الخصوم المتداولة', isPosting: false },
    { name: 'تسوية مؤقت', level: 3, parent: 'حسابات وسيطة', isPosting: true },
    { name: 'وسيط أضافة أصول ثابتة', level: 3, parent: 'حسابات وسيطة', isPosting: true },
    { name: 'تحويلات بين الخزائن', level: 3, parent: 'حسابات وسيطة', isPosting: true },
    { name: 'تحويلات بين المخازن', level: 3, parent: 'حسابات وسيطة', isPosting: true },
    { name: 'تسويات بين مراكز التكلفة', level: 3, parent: 'حسابات وسيطة', isPosting: true },
    { name: 'وسيط خصومات من العملاء', level: 3, parent: 'حسابات وسيطة', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // (04) خصوم طويلة الأجل - LONG-TERM LIABILITIES
    // ═══════════════════════════════════════════════════════════════════
    { name: 'خصوم طويلة الأجل', level: 1, parent: null, isPosting: false },

    { name: 'قروض من بنك الرياض', level: 2, parent: 'خصوم طويلة الأجل', isPosting: true },

    // مخصصات
    { name: 'المخصصات', level: 2, parent: 'خصوم طويلة الأجل', isPosting: false },
    { name: 'مخصص بدل الاجارة', level: 3, parent: 'المخصصات', isPosting: true },
    { name: 'مخصص نهاية الخدمة', level: 3, parent: 'المخصصات', isPosting: true },
    { name: 'مخصص نهاية الخدمة الاكتوارى', level: 3, parent: 'المخصصات', isPosting: true },

    // مجمع الاهلاك
    { name: 'مجمع الاهلاك', level: 2, parent: 'خصوم طويلة الأجل', isPosting: false },
    { name: 'مجمع اهلاك - السيارات ', level: 3, parent: 'مجمع الاهلاك', isPosting: true },
    { name: 'مجمع اهلاك - الالات والمعدات ', level: 3, parent: 'مجمع الاهلاك', isPosting: true },
    { name: 'مجمع اهلاك - الاخشاب', level: 3, parent: 'مجمع الاهلاك', isPosting: true },
    { name: 'مجمع اهلاك - المكاتب الجاهزة', level: 3, parent: 'مجمع الاهلاك', isPosting: true },
    { name: 'مجمع اهلاك - اجهزة الكمبيوتر والطابعات', level: 3, parent: 'مجمع الاهلاك', isPosting: true },
    { name: 'مجمع اهلاك - الأثاث والمفروشات', level: 3, parent: 'مجمع الاهلاك', isPosting: true },
    { name: 'مجمع اهلاك - الديكورات', level: 3, parent: 'مجمع الاهلاك', isPosting: true },
    { name: 'مجمع اهلاك - الشدة المعدنية ', level: 3, parent: 'مجمع الاهلاك', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // (05) حقوق الملكية - EQUITY
    // ═══════════════════════════════════════════════════════════════════
    { name: 'حقوق الملكية', level: 1, parent: null, isPosting: false },

    // رأس المال
    { name: 'راس المال', level: 2, parent: 'حقوق الملكية', isPosting: false },
    { name: 'راس المال - نواف عبدالعزيز على الغفيض', level: 3, parent: 'راس المال', isPosting: true },
    { name: 'راس المال - شركة كيان السعودية', level: 3, parent: 'راس المال', isPosting: true },
    { name: 'راس المال - احمد إسماعيل الدموهى', level: 3, parent: 'راس المال', isPosting: true },

    { name: 'الاحتياطى النظامى', level: 2, parent: 'حقوق الملكية', isPosting: true },

    // جاري الشركاء
    { name: 'جاري الشركاء', level: 2, parent: 'حقوق الملكية', isPosting: false },
    { name: 'جارى الشريك - نواف عبدالعزيز على الغفيض', level: 3, parent: 'جاري الشركاء', isPosting: true },
    { name: 'جارى الشريك - شركة كيان السعودية', level: 3, parent: 'جاري الشركاء', isPosting: true },
    { name: 'جارى الشريك - احمد اسماعيل الدموهى', level: 3, parent: 'جاري الشركاء', isPosting: true },

    { name: 'الارباح المرحله', level: 2, parent: 'حقوق الملكية', isPosting: true },
    { name: 'ارباح وخسائر اعادة تقييم منافع الموظفين', level: 2, parent: 'حقوق الملكية', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // (06) التكاليف والمصروفات - COSTS & EXPENSES
    // ═══════════════════════════════════════════════════════════════════
    { name: 'التكاليف والمصروفات', level: 1, parent: null, isPosting: false },

    // تكاليف مباشرة
    { name: 'تكاليف مباشرة', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'المواد والخامات', level: 3, parent: 'تكاليف مباشرة', isPosting: true },
    { name: 'مصنعيات مقاولين الباطن', level: 3, parent: 'تكاليف مباشرة', isPosting: true },

    // رواتب وأجور - عمليات
    { name: 'رواتب وأجور - عمليات', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'الراتب الاساسى  - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'بدل سكن - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'بدلات اخرى - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'اضافى - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'مكافات وحوافز - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'تعويض انهاء الخدمات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'بدل طبيعة عمل - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'بدل الاجازه - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },
    { name: 'بدل نهاية الخدمه - عمليات', level: 3, parent: 'رواتب وأجور - عمليات', isPosting: true },

    // إيجارات ومعدات
    { name: 'ايجار معدات', level: 2, parent: 'التكاليف والمصروفات', isPosting: true },
    { name: 'ايجار سيارات - عمليات', level: 2, parent: 'التكاليف والمصروفات', isPosting: true },
    { name: 'ايجار سكن الموظفين', level: 2, parent: 'التكاليف والمصروفات', isPosting: true },
    { name: 'ايجار مصنع الالمونيوم', level: 2, parent: 'التكاليف والمصروفات', isPosting: true },

    // رسوم حكومية - عمليات
    { name: 'رسوم حكومية - عمليات', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'رسوم تجديد اقامات - عمليات', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم رخص العمل - عمليات', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم خروج وعودة  - عمليات', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم نقل كفالات - عمليات', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم تاشيرات العمل - عمليات', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'اشتراك هيئة المهندسين - عمليات', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم رخصة البناء', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم العداد المؤقت', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم عدادات الكهرباء الدائم', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم عداد المياه', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم عداد الصرف الصحى ', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم تصريف مياه جوفيه', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم الهيئة السعودية للمقاولين', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم فرز ', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },
    { name: 'رسوم قرار مساحى', level: 3, parent: 'رسوم حكومية - عمليات', isPosting: true },

    // تأمينات
    { name: 'تامينات', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'تامين العيوب الخفية ', level: 3, parent: 'تامينات', isPosting: true },
    { name: 'الفحص الفنى', level: 3, parent: 'تامينات', isPosting: true },
    { name: 'تامين مخاطر المقاولين', level: 3, parent: 'تامينات', isPosting: true },

    // محروقات وصيانة
    { name: 'محروقات - عمليات', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'محروقات وزيت معدات - عمليات', level: 3, parent: 'محروقات - عمليات', isPosting: true },
    { name: 'محروقات وزيت سيارات - عمليات', level: 3, parent: 'محروقات - عمليات', isPosting: true },

    // خدمات هندسية
    { name: 'خدمات هندسية', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'اشراف وتقرير هندسى', level: 3, parent: 'خدمات هندسية', isPosting: true },
    { name: 'رسومات هندسية تصاميم ومخططات', level: 3, parent: 'خدمات هندسية', isPosting: true },
    { name: 'اتعاب حصر هندسي', level: 3, parent: 'خدمات هندسية', isPosting: true },
    { name: 'اتعاب استخراج رخصة البناء', level: 3, parent: 'خدمات هندسية', isPosting: true },
    { name: 'اتعاب قرار مساحى', level: 3, parent: 'خدمات هندسية', isPosting: true },
    { name: 'اتعاب فرز', level: 3, parent: 'خدمات هندسية', isPosting: true },

    // مصروفات عمومية - عمليات
    { name: 'مصروفات عمومية - عمليات', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'تذاكر سفر  - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'انتقالات  - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'ادوات مكتبيه ومطبوعات  - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'صيانة معدات - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'صيانة سيارات - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'صيانة عامه - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'صيانة برامج', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'انترنت - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'بريد وارساليات - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'ضيافة - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'مياه شرب - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'مواد نظافة - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'كشف وفحص طبى وعلاج - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'ماموريات خارجية ورحلات عمل', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'ايجار فنادق - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'تجهيزات مكاتب المواقع', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'تجهيزات سكن الموظفين', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'كراسات الشروط والمناقصات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'غرامات ومخالفات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'مختبرات خارجيه', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },
    { name: 'مصروفات متنوعه - عمليات', level: 3, parent: 'مصروفات عمومية - عمليات', isPosting: true },

    { name: 'خصم مسموح به', level: 2, parent: 'التكاليف والمصروفات', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // المصروفات الإدارية - ADMINISTRATIVE EXPENSES
    // ═══════════════════════════════════════════════════════════════════
    { name: 'المصروفات الادارية', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },

    // رواتب إدارية
    { name: 'رواتب وأجور - ادارية', level: 3, parent: 'المصروفات الادارية', isPosting: false },
    { name: 'الراتب الاساسى - ادارية', level: 4, parent: 'رواتب وأجور - ادارية', isPosting: true },
    { name: 'بدل سكن - ادارية', level: 4, parent: 'رواتب وأجور - ادارية', isPosting: true },
    { name: 'بدلات اخرى - ادارية', level: 4, parent: 'رواتب وأجور - ادارية', isPosting: true },
    { name: 'اضافى - ادارية', level: 4, parent: 'رواتب وأجور - ادارية', isPosting: true },
    { name: 'مكافات وحوافز - ادارية', level: 4, parent: 'رواتب وأجور - ادارية', isPosting: true },
    { name: 'بدل الاجازه - اداريه', level: 4, parent: 'رواتب وأجور - ادارية', isPosting: true },
    { name: 'بدل نهاية الخدمه - ادارية', level: 4, parent: 'رواتب وأجور - ادارية', isPosting: true },

    // عمولات بنكية
    { name: 'عمولات بنكية', level: 3, parent: 'المصروفات الادارية', isPosting: true },
    { name: 'رسوم وعمولات التسهيلات البنكية', level: 3, parent: 'المصروفات الادارية', isPosting: true },
    { name: 'مصروف فوائد الاكتوارى', level: 3, parent: 'المصروفات الادارية', isPosting: true },

    // تأمينات
    { name: 'التامينات الاجتماعيه', level: 3, parent: 'المصروفات الادارية', isPosting: true },
    { name: 'التامين الطبى', level: 3, parent: 'المصروفات الادارية', isPosting: true },
    { name: 'تامين السيارات', level: 3, parent: 'المصروفات الادارية', isPosting: true },

    // رسوم حكومية - إدارية
    { name: 'رسوم حكومية - ادارية', level: 3, parent: 'المصروفات الادارية', isPosting: false },
    { name: 'رسوم تجديد اقامات - ادارية', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },
    { name: 'رسوم رخص العمل - ادارية', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },
    { name: 'رسوم خروج وعودة - ادارية', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },
    { name: 'رسوم نقل كفالات - ادارية', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },
    { name: 'رسوم تغيير المهن', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },
    { name: 'اشتراك هيئة المحاسبين - ادارية', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },
    { name: 'رسوم حكومية ومروريه', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },
    { name: 'رسوم تصديقات وتفاويض', level: 4, parent: 'رسوم حكومية - ادارية', isPosting: true },

    // مرافق
    { name: 'فواتير الكهرباء والمياه', level: 3, parent: 'المصروفات الادارية', isPosting: true },
    { name: 'فواتير المياه', level: 3, parent: 'المصروفات الادارية', isPosting: true },

    // إيجارات
    { name: 'ايجار المكاتب - الادارية', level: 3, parent: 'المصروفات الادارية', isPosting: true },
    { name: 'ايجار سيارات  - ادارية', level: 3, parent: 'المصروفات الادارية', isPosting: true },

    { name: 'الاتعاب المهنية', level: 3, parent: 'المصروفات الادارية', isPosting: true },

    // مصروفات عمومية إدارية
    { name: 'مصروفات عمومية - ادارية', level: 3, parent: 'المصروفات الادارية', isPosting: false },
    { name: 'تذاكر سفر  - ادارية', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'انتقالات  - ادارية', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'بريد وارساليات', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'الهاتف والانترنت', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'دعايا واعلان', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'صيانة سيارات - ادارية', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'صيانة عامه وبرامج', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'محروقات - ادارية', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'مخالفات مروريه', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'ضيافه ومواد نظافة المكتب', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'ادوات مكتبيه ومطبوعات ', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'مصروفات متنوعه', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'الزى الموحد يونيفورم ', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'مصروف فروقات زكوية', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'دورات تدريبية ', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'برمجة اجهزة كمبيوتر سنترالات ', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'اشتراكات برامج', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },
    { name: 'مصروفات توظيف', level: 4, parent: 'مصروفات عمومية - ادارية', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // الاهلاك - DEPRECIATION
    // ═══════════════════════════════════════════════════════════════════
    { name: 'الاهلاك', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'اهلاك - السيارات ', level: 3, parent: 'الاهلاك', isPosting: true },
    { name: 'اهلاك - الالات والمعدات ', level: 3, parent: 'الاهلاك', isPosting: true },
    { name: 'اهلاك - الاخشاب', level: 3, parent: 'الاهلاك', isPosting: true },
    { name: 'اهلاك - المكاتب الجاهزة', level: 3, parent: 'الاهلاك', isPosting: true },
    { name: 'اهلاك - اجهزة الكمبيوتر والطابعات', level: 3, parent: 'الاهلاك', isPosting: true },
    { name: 'اهلاك - الأثاث والمفروشات', level: 3, parent: 'الاهلاك', isPosting: true },
    { name: 'اهلاك - الديكورات', level: 3, parent: 'الاهلاك', isPosting: true },
    { name: 'اهلاك - الشدة المعدنية ', level: 3, parent: 'الاهلاك', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // الزكاة والضرائب - ZAKAT & TAXES
    // ═══════════════════════════════════════════════════════════════════
    { name: 'الزكاة والضرائب', level: 2, parent: 'التكاليف والمصروفات', isPosting: false },
    { name: 'الزكاة', level: 3, parent: 'الزكاة والضرائب', isPosting: true },
    { name: 'ضريبة الدخل', level: 3, parent: 'الزكاة والضرائب', isPosting: true },

    // ═══════════════════════════════════════════════════════════════════
    // (07) الإيرادات - REVENUE
    // ═══════════════════════════════════════════════════════════════════
    { name: 'الإيرادات', level: 1, parent: null, isPosting: false },
    { name: 'ايرادات مشاريع المقاولات', level: 2, parent: 'الإيرادات', isPosting: true },
    { name: 'ايرادات اخرى', level: 2, parent: 'الإيرادات', isPosting: true },
    { name: 'ارباح وخسائر راسمالية', level: 2, parent: 'الإيرادات', isPosting: true },
];

/**
 * Get account by name
 */
export function getAccountByName(name) {
    return ACCOUNTS_284.find(acc => acc.name === name);
}

/**
 * Get all children of a parent account
 */
export function getChildren(parentName) {
    return ACCOUNTS_284.filter(acc => acc.parent === parentName);
}

/**
 * Get all posting accounts (leaf nodes)
 */
export function getPostingAccounts() {
    return ACCOUNTS_284.filter(acc => acc.isPosting === true);
}

/**
 * Build hierarchy from flat structure
 */
export function buildAccountHierarchy() {
    const accountMap = new Map();

    // Create map
    ACCOUNTS_284.forEach(acc => {
        accountMap.set(acc.name, { ...acc, children: [] });
    });

    // Build tree
    const rootAccounts = [];
    ACCOUNTS_284.forEach(acc => {
        const node = accountMap.get(acc.name);
        if (acc.parent) {
            const parent = accountMap.get(acc.parent);
            if (parent) {
                parent.children.push(node);
            } else {
                rootAccounts.push(node);
            }
        } else {
            rootAccounts.push(node);
        }
    });

    return rootAccounts;
}

export default ACCOUNTS_284;
