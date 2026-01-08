/**
 * Trial Balance Utilities - أدوات ميزان المراجعة
 * دوال لمعالجة وتحليل بيانات ميزان المراجعة مع الحفاظ على ترتيب الملف
 * وبناء التجميع الهرمي L5 → L1 استناداً إلى طول الكود فقط.
 */

const TOLERANCE = 0.05;

const CODE_KEYS = [
    'Code',
    'code',
    'Account Code',
    'account code',
    'كود الحساب',
    'كود الحساب ',
    'الكود',
    'كود',
    'رمز',
    'رقم الحساب',
];
const PARENT_NAME_KEYS = ['Parent', 'Parent Name', 'parent', 'الأب', 'البند الأب', 'Parent Account'];
const NAME_KEYS = ['Account Name', 'اسم الحساب', 'الحساب', 'المجموعة / الحساب', 'Account', 'الحساب/المجموعة', 'account'];
// دعم مسميات الأعمدة الشائعة في القالب الجديد
const DEBIT_KEYS = ['Debit', 'debit', 'الرصيد مدين', 'الرصيد مدين ', 'مدين', 'مدين (Debit)', 'Debit (مدين)'];
const CREDIT_KEYS = ['Credit', 'credit', 'الرصيد دائن', 'الرصيد دائن ', 'دائن', 'دائن (Credit)', 'Credit (دائن)'];
const LEVEL_KEYS = ['Level', 'المستوى', 'المستوي'];
const POSTING_KEYS = ['Is Posting Account', 'Posting', 'حساب ترحيل', 'حساب ترحيل؟', 'Posting Account?', 'Is Posting'];

// خريطة أسماء المستويات العليا (L1) وفق الكود
const L1_NAMES = {
    '01': 'الأصول المتداولة',
    '02': 'الأصول الثابتة',
    '03': 'الخصوم المتداولة',
    '04': 'خصوم طويلة الأجل',
    '05': 'حقوق الملكية',
    '06': 'التكاليف والمصروفات',
    '07': 'الإيرادات',
};

// الشجرة القياسية الكاملة (كما زوّدها المستخدم) تُستخدم لتوليد قاموس الكود ↔ الاسم لكل القطاعات 01–07
const CANON_TREE = {
    "01 الاصول المتداولة": {
        "0101 البنوك": {
            "010101 حسابات البنوك": {
                "01010101 مصرف الانماء": {
                    "0101010101 مصرف الانماء 68200000071000": {},
                    "0101010102 مصرف الانماء 68200000071001": {}
                },
                "01010102 مصرف الراجحي": {
                    "0101010201 مصرف الراجحي 521608010111995": {},
                    "0101010202 مصرف الراجحي 375608010001177": {}
                },
                "01010103 بنك الرياض": {
                    "0101010301 بنك الرياض 001000698249940": {},
                    "0101010302 وسيط بنك الرياض": {}
                },
                "01010104 البنك الأهلي": {
                    "0101010401 البنك الاهلى 065900000713108": {},
                    "0101010402 البنك الاهلى فرعى 1806": {},
                    "0101010403 البنك الاهلى فرعى 8901": {}
                }
            },
            "010102 ضمانات بنكية - 100% غطاء نقدي": {
                "01010201 ضمان بنكي - مصرف الانماء": {},
                "01010202 ضمان بنكي - بنك الرياض": {}
            },
            "010103 تامين ضمانات - تسهيلات البنوك": {
                "01010301 تامين ضمانات - بنك الرياض": {},
                "01010302 تامين ضمانات - البنك الاهلى": {}
            }
        },
        "0102 العملاء": {
            "010201 العملاء": {}
        },
        "0103 ضمان حسن التنفيذ لدى العملاء": {
            "010301 ضمان تأمين أعمال لدى العملاء": {}
        },
        "0104 العهد": {
            "010401 العهدة الجارية": {
                "01040101 عهدة - المنطقة الشرقية": {},
                "01040102 عهدة - منطقة الرياض": {},
                "01040103 عهدة - مصنع الالمونيوم": {},
                "01040104 عهدة - شفيق الخواجة": {},
                "01040105 عهدة - شئون الموظفين": {}
            },
            "010402 العهدة المستديمة": {
                "01040201 عهدة مستديمة - المنطقة الشرقية": {},
                "01040202 عهدة مستديمة - منطقة الرياض": {},
                "01040203 عهدة مستديمة - مصنع الالمونيوم": {}
            }
        },
        "0105 ذمم الموظفين": {
            "010501 ذمم الموظفين": {}
        },
        "0106 المخزون": {
            "010601 المخزون": {}
        },
        "0107 مدينون متنوعون": {
            "010701 تأمينات لدى الغير": {
                "01070101 تأمينات لدى الغير": {}
            },
            "010702 دفعات مقدمة مقاولين": {},
            "010703 مصروفات مؤجلة - تكلفة التمويل": {},
            "010704 شركة منحنى الوصول للمقاولات": {}
        },
        "0108 أوراق قبض وشيكات تحت التحصيل": {
            "010801 أوراق قبض": {},
            "010802 شيكات تحت التحصيل": {}
        },
        "0109 أصول متداولة أخرى": {
            "010901 مصروفات مقدمة": {
                "01090101 مصروفات مقدمة - إيجارات": {},
                "01090102 مصروفات مقدمة - عمولة تسهيلات": {}
            },
            "010902 إيرادات مستحقة": {
                "01090201 إيرادات مستحقة غير مفوترة": {}
            },
            "010903 كروت ائتمان / فيزا": {}
        }
    },
    "02 الاصول الثابتة": {
        "0201 الاصول الثابته": {
            "020101 السيارات": {},
            "020102 الالات والمعدات": {},
            "020103 الاخشاب المرابيع": {},
            "020104 المكاتب الجاهزة": {},
            "020105 أجهزة الكمبيوتر والطابعات": {},
            "020106 الأثاث والمفروشات": {},
            "020107 الديكورات": {},
            "020108 الشدة المعدنية": {}
        }
    },
    "03 الخصوم المتداولة": {
        "0301 الموردين": {
            "030101 02 الموردين": {}
        },
        "0302 المقاولين": {
            "030201 03 المقاولين": {}
        },
        "0303 ضمان حسن التنفيذ للمقاولين": {},
        "0304 دائنون متنوعون": {
            "030402 القروض": {
                "030403 قروض من بنك الرياض": {}
            },
            "030401 المكاتب الهندسية والاستشارية": {}
        },
        "0305 دفعات مقدمة من العملاء": {},
        "0306 ضريبة القيمة المضافة": {
            "030601 ضريبة المشتريات": {},
            "030602 ضريبة الإيرادات": {},
            "030603 تسوية ضريبة القيمة المضافة": {}
        },
        "0307 أوراق الدفع": {},
        "0308 خصوم متداولة أخرى": {
            "030801 مصروفات مستحقة": {
                "03080101 مصروفات مستحقة - رواتب": {},
                "03080102 مصروفات مستحقة - أتعاب مهنية": {},
                "03080103 تسوية مستحقات الموظفين": {},
                "03080104 مخصص الزكاة وضريبة الدخل": {},
                "03080105 مصروفات مستحقة - تكلفة التمويل": {}
            }
        },
        "0309 حسابات وسيطة": {
            "030901 وسيط إضافة أصول ثابتة": {},
            "030902 تحويلات بين الخزائن": {},
            "030903 تحويلات بين المخازن": {},
            "030904 تسويات بين مراكز التكلفة": {},
            "030905 وسيط خصومات من العملاء": {}
        }
    },
    "04 خصوم طويلة الاجل": {
        "0401 مخصص حقوق الموظفين": {
            "040101 مخصص بدل الاجازة": {
                "04010101 مخصص بدل الاجارة": {}
            },
            "040102 مخصص نهاية الخدمة": {
                "04010201 مخصص نهاية الخدمة": {},
                "04010202 مخصص نهاية الخدمة الاكتوارى": {}
            }
        },
        "0402 مجمع اهلاك الاصول الثابتة": {
            "040201 مجمع اهلاك - السيارات": {},
            "040202 مجمع اهلاك - الالات والمعدات": {},
            "040203 مجمع اهلاك - الاخشاب": {},
            "040204 مجمع اهلاك - المكاتب الجاهزة": {},
            "040205 مجمع اهلاك - أجهزة الكمبيوتر والطابعات": {},
            "040206 مجمع اهلاك - الأثاث والمفروشات": {},
            "040207 مجمع اهلاك - الديكورات": {},
            "040208 مجمع اهلاك - الشدة المعدنية": {}
        }
    },
    "05 حقوق الملكية": {
        "0501 راس المال": {
            "050101 راس المال - نواف عبدالعزيز على الغفيض": {},
            "050102 راس المال - شركة كيان السعودية": {},
            "050103 راس المال - احمد إسماعيل الدموهى": {}
        },
        "0502 الاحتياطي النظامى": {
            "050201 الاحتياطى النظامى": {}
        },
        "0503 جارى الشركاء": {
            "050301 جاري الشريك - نواف عبدالعزيز على الغفيض": {},
            "050302 جاري الشريك - شركة كيان السعودية": {},
            "050303 جاري الشريك - احمد إسماعيل الدموهى": {}
        },
        "0504 الارباح": {
            "050402 الارباح المرحله": {},
            "050403 ارباح وخسائر اعادة تقييم منافع الموظفين": {}
        }
    },
    "06 التكاليف": {
        "0601 تكاليف العمليات": {
            "060101 المواد والمصنعيات": {
                "06010101 المواد والخامات": {},
                "06010102 مصنعيات مقاولين الباطن": {}
            },
            "060102 الرواتب والاجور وما فى حكمها": {
                "06010201 الراتب الاساسى - عمليات": {},
                "06010202 بدل سكن - عمليات": {},
                "06010203 بدلات اخرى - عمليات": {},
                "06010204 اضافى - عمليات": {},
                "06010205 مكافات وحوافز - عمليات": {},
                "06010206 تعويض انهاء الخدمات": {},
                "06010207 بدل طبيعة عمل - عمليات": {},
                "06010208 بدل الاجازه - عمليات": {}
            },
            "060103 تاجير المعدات والسيارات": {
                "06010301 ايجار معدات": {},
                "06010302 ايجار سيارات - عمليات": {}
            },
            "060104 الرسوم الحكومية": {
                "06010401 رسوم تجديد اقامات - عمليات": {},
                "06010402 رسوم رخص العمل - عمليات": {},
                "06010403 رسوم خروج وعودة - عمليات": {},
                "06010404 رسوم نقل كفالات - عمليات": {},
                "06010405 رسوم تاشيرات العمل - عمليات": {},
                "06010406 اشتراك هيئة المهندسين - عمليات": {},
                "06010407 رسوم رخصة البناء": {},
                "06010408 رسوم العداد المؤقت": {},
                "06010409 رسوم عدادات الكهرباء الدائم": {},
                "06010410 رسوم عداد المياه": {},
                "06010411 رسوم عداد الصرف الصحى": {},
                "06010412 رسوم تصريف مياه جوفيه": {},
                "06010413 رسوم الهيئة السعودية للمقاولين": {},
                "06010414 رسوم فرز": {},
                "06010415 رسوم قرار مساحى": {}
            },
            "060105 التامين على المشاريع": {
                "06010501 تامين العيوب الخفية": {},
                "06010502 الفحص الفنى": {},
                "06010503 تامين مخاطر المقاولين": {}
            },
            "060106 الايجارات": {
                "06010601 ايجار سكن الموظفين": {},
                "06010602 ايجار مصنع الالمونيوم": {}
            },
            "060107 المحروقات": {
                "06010701 محروقات وزيت معدات - عمليات": {},
                "06010702 محروقات وزيت سيارات - عمليات": {}
            },
            "060108 الرسوم الهندسية والاستشارية": {
                "06010801 اشراف وتقرير هندسى": {},
                "06010802 رسومات هندسية تصاميم ومخططات": {},
                "06010803 اتعاب حصر هندسي": {},
                "06010804 اتعاب استخراج رخصة البناء": {},
                "06010805 اتعاب قرار مساحى": {},
                "06010806 اتعاب فرز": {}
            },
            "060109 تذاكر السفر والانتقالات": {
                "06010901 تذاكر سفر - عمليات": {},
                "06010902 انتقالات - عمليات": {}
            },
            "060110 منافع الموظفين": {
                "06011001 بدل نهاية الخدمه - عمليات": {}
            },
            "060111 المصروفات المكتبية": {
                "06011101 ادوات مكتبيه ومطبوعات - عمليات": {}
            },
            "060112 الصيانة والاصلاح": {
                "06011201 صيانة معدات - عمليات": {},
                "06011202 صيانة سيارات - عمليات": {},
                "06011203 صيانة عامه - عمليات": {},
                "06011204 صيانة برامج": {}
            },
            "060113 الهاتف والبريد": {
                "06011301 انترنت - عمليات": {},
                "06011302 بريد وارساليات - عمليات": {}
            },
            "060114 مختبرات": {
                "06011401 مختبرات خارجيه": {}
            },
            "060115 اخرى - عمليات": {
                "06011501 ضيافة - عمليات": {},
                "06011502 مياه شرب - عمليات": {},
                "06011503 مواد نظافة  - عمليات": {},
                "06011504 كشف وفحص طبى وعلاج - عمليات": {},
                "06011505 ماموريات خارجية ورحلات عمل": {},
                "06011506 ايجار فنادق - عمليات": {},
                "06011507 تجهيزات مكاتب المواقع": {},
                "06011508 تجهيزات سكن الموظفين": {},
                "06011509 كراسات الشروط والمناقصات": {},
                "06011510 غرامات ومخالفات": {},
                "06011512 مصروفات متنوعه - عمليات": {},
                "06011513 خصم مسموح به": {}
            }
        },
        "0602 المصروفات العمومية والإدارية": {
            "060201 الرواتب والاجور وما فى حكمها": {
                "06020101 الراتب الاساسى - ادارية": {},
                "06020102 بدل سكن - ادارية": {},
                "06020103 بدلات اخرى - ادارية": {},
                "06020104 اضافى - ادارية": {},
                "06020105 مكافات وحوافز - ادارية": {},
                "06020106 بدل الاجازه - ادارية": {}
            },
            "060202 مصاريف بنكية": {
                "06020201 عمولات بنكية": {},
                "06020202 رسوم وعمولات التسهيلات البنكية": {}
            },
            "060203 التامينات الاجتماعية": {
                "06020301 التامينات الاجتماعيه": {}
            },
            "060204 التامين الطبى": {},
            "060205 الرسوم الحكومية": {
                "06020501 رسوم تجديد اقامات - ادارية": {},
                "06020502 رسوم رخص العمل - ادارية": {},
                "06020503 رسوم خروج وعودة - ادارية": {},
                "06020504 رسوم نقل كفالات - ادارية": {},
                "06020505 رسوم تغيير المهن": {},
                "06020506 اشتراك هيئة المحاسبين - ادارية": {},
                "06020507 رسوم حكومية ومروريه": {},
                "06020508 رسوم تصديقات وتفاويض": {}
            },
            "060206 الكهرباء والمياه": {
                "06020601 فواتير الكهرباء والمياه": {},
                "06020602 فواتير المياه": {}
            },
            "060207 الايجارات": {
                "0602018 ايجار المكاتب - الادارية": {},
                "0602024 ايجار سيارات - ادارية": {}
            },
            "060208 الاتعاب المهنية": {},
            "060209 منافع الموظفين": {
                "0602007 بدل نهاية الخدمه - ادارية": {},
                "0602036 مصروف فوائد الاكتوارى": {}
            },
            "060210 تامين السيارات": {},
            "060211 تذاكر السفر والانتقالات": {
                "0602016 تذاكر سفر - ادارية": {},
                "0602017 انتقالات - ادارية": {}
            },
            "060212 الهاتف والبريد": {
                "0602030 بريد وارساليات": {},
                "0602039 الهاتف والانترنت": {}
            },
            "060213 الدعايا والتسويق": {
                "0602033 دعايا واعلان": {}
            },
            "060214 الصيانة والاصلاح": {
                "0602023 صيانة سيارات - ادارية": {},
                "0602031 صيانة عامه وبرامج": {}
            },
            "060215 ايجار السيارات": {
                "06021501 ايجار سيارات  - ادارية": {}
            },
            "060216 اخرى - ادارية": {
                "06021601 ضيافه ومواد نظافة المكتب": {},
                "06021602 ادوات مكتبيه ومطبوعات": {},
                "06021603 محروقات - ادارية": {},
                "06021604 مخالفات مروريه": {},
                "06021605 الزى الموحد يونيفورم": {},
                "06021606 دورات تدريبية": {},
                "06021607 مصروفات توظيف": {},
                "06021608 مصروف فروقات زكوية": {},
                "06021609 اشتراكات برامج": {},
                "06021610 برمجة اجهزة كمبيوتر سنترالات": {}
            }
        },
        "0604 الاهلاك": {
            "060401 اهلاك - السيارات": {},
            "060402 اهلاك - الالات والمعدات": {},
            "060403 اهلاك - الاخشاب": {},
            "060404 اهلاك - المكاتب الجاهزة": {},
            "060405 اهلاك - اجهزة الكمبيوتر والطابعات": {},
            "060406 اهلاك - الأثاث والمفروشات": {},
            "060407 اهلاك - الديكورات": {},
            "060408 اهلاك - الشدة المعدنية": {}
        },
        "0605 الزكاة وضريبة الدخل": {
            "060501 الزكاة": {},
            "060502 ضريبة الدخل": {}
        }
    },
    "07 الايرادات": {
        "07001 ايرادات مشاريع المقاولات": {},
        "07002 ايرادات اخرى": {},
        "07003 ارباح وخسائر راسمالية": {}
    }
};

// بناء قاموس كود -> اسم، وقاموس كود -> أب رسمي، من الشجرة أعلاه
const buildCanonMaps = (tree) => {
    const map = {};
    const parent = {};
    const walk = (node, parentCode = null) => {
        Object.keys(node).forEach((key) => {
            const parts = key.trim().split(' ');
            const code = parts.shift();
            const name = parts.join(' ').trim();
            if (code) {
                map[code] = name || code;
                if (parentCode) parent[code] = parentCode;
            }
            const child = node[key];
            if (child && typeof child === 'object') {
                walk(child, code || parentCode);
            }
        });
    };
    walk(tree, null);
    return { map, parent };
};

const { map: CANON_MAP, parent: CANON_PARENT } = buildCanonMaps(CANON_TREE);
// إضافة أكواد تفصيلية مفقودة لتطابق القالب (ذمم الموظفين، المخزون) إن وجدت
CANON_MAP['010501'] = CANON_MAP['0105'] || 'ذمم الموظفين';
CANON_MAP['010601'] = CANON_MAP['0106'] || 'المخزون';
CANON_MAP['030301'] = CANON_MAP['0303'] || 'ضمان حسن التنفيذ للمقاولين';
CANON_MAP['030501'] = CANON_MAP['0305'] || 'دفعات مقدمة من العملاء';
CANON_MAP['030701'] = CANON_MAP['0307'] || 'اوراق الدفع';
CANON_MAP['060201'] = 'الرواتب والاجور وما فى حكمها';
CANON_MAP['06020401'] = CANON_MAP['060204'] || 'التامين الطبى';
CANON_MAP['060207'] = 'الايجارات';
CANON_MAP['060209'] = 'منافع الموظفين';
CANON_MAP['060211'] = 'تذاكر السفر والانتقالات';
CANON_MAP['060212'] = 'الهاتف والبريد';
// تثبيت التسمية الصحيحة للكود 060114 وفق القالب المحدث
CANON_MAP['060114'] = 'مختبرات';
CANON_MAP['060115'] = 'اخرى - عمليات';
CANON_MAP['060215'] = 'ايجار السيارات';
CANON_MAP['060216'] = 'اخرى - ادارية';
CANON_MAP['060214'] = 'الصيانة والاصلاح';
CANON_MAP['0'] = 'دليل الحسابات';
// aliases خاصة بالكود 06 فقط (للسماح بـ "التكاليف" مقابل "التكاليف والمصروفات")
const CANON_ALIASES = {
    '06': ['التكاليف', 'التكاليف والمصروفات'],
    '010102': ['ضمانات البنكية-100% غطاء نقدي', 'ضمانات البنكية - 100% غطاء نقدي'],
    '010903': ['كروت ائتمان /فيزا', 'كروت ائتمان/فيزا', 'كروت ائتمان/ فيزا'],
    '0309': ['حسابات وسيطه'],
    // قبول الاسم السابق إن وجد مع الإبقاء على الاسم الرسمي "مختبرات"
    '060114': ['مختبرات', 'اخرى - عمليات'],
    '06011503': ['مواد نظافة - عمليات', 'مواد نظافة  - عمليات'],
    '060215': ['اخرى - ادارية'], // قبول الاسم السابق
    '06011404': ['كشف وفحص طبى وعلاج - عمليات'],
    '06020106': ['بدل الاجازه - اداريه'],
    '0602043': ['برمجة اجهزة كمبيوتر سنترالات'],
};
// إعادة تعيين أكواد خاطئة شائعة إلى الأكواد الرسمية
const CODE_REMAP = {
    '0602029': '060208', // الاتعاب المهنية (الإداري)
    '0602021': '060210', // تامين السيارات (الإداري)
    '0700': '07', // توحيد الايرادات بدون صفر إضافي
};
// أطوال الأكواد المتوقعة لكل مستوى
const LEVEL_CODE_LENGTH = {
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 10,
};
// قائمة البنود المصرح بها كحسابات ترحيل (Posting Accounts) تؤثر في الرصيد
const POSTING_ACCOUNTS = new Set([
    'مصرف الانماء 68200000071000',
    'مصرف الانماء 68200000071001',
    'مصرف الراجحى 521608010111995',
    'مصرف الراجحى 375608010001177',
    'بنك الرياض 001000698249940',
    'وسيط بنك الرياض',
    'البنك الاهلى 065900000713108',
    'البنك الاهلى فرعى  1806',
    'البنك الاهلى فرعى  8901',
    'ضمان بنكى - مصرف الانماء',
    'ضمان بنكى - بنك الرياض',
    'تامين ضمانات - بنك الرياض',
    'تامين ضمانات - البنك الاهلى',
    '01 العملاء',
    'ضمان تأمين أعمال لدى العملاء',
    'عهدة - المنطقة الشرقية',
    'عهدة - منطقة الرياض',
    'عهدة - مصنع الالمونيوم',
    'عهدة - شفيق الخواجة',
    'عهدة - شئون الموظفين',
    'عهدة مستديمة - المنطقة الشرقية',
    'عهدة مستديمة - منطقة الرياض',
    'عهدة مستديمة - مصنع الالمونيوم',
    'ذمم الموظفين ',
    'المخزون',
    'تامينات لدى الغير ',
    'تامينات لدى الغير', // بدون مسافة
    'دفعات مقدمة مقاولين',
    'اوراق قبض',
    'شيكات تحت التحصيل',
    'مصروفات مؤجلة - تكلفة التمويل ',
    'مصروفات مؤجلة - تكلفة التمويل',
    'شركة منحنى الوصول للمقاولات',
    'مصروفات مقدمة - ايجارات',
    'مصروفات مقدمة - عمولة تسهيلات',
    'ايرادات مستحقة غير مفوترة',
    'كروت ائتمان /فيزا',
    'السيارات ',
    'الالات والمعدات',
    'الاخشاب المرابيع',
    'المكاتب الجاهزة',
    'أجهزة الكمبيوتر والطابعات',
    'الأثاث والمفروشات',
    'الديكورات',
    'الشدة المعدنية ',
    '02 الموردين',
    '03 المقاولين',
    'ضمان حسن التنفيذ للمقاولين',
    'قروض من بنك الرياض',
    '04 المكاتب الهندسية والاستشارية',
    'دفعات مقدمة من العملاء',
    'ضريبة المشتريات',
    'ضريبة الإيرادات ',
    'تسوية ضريبة القيمة المضافة',
    'اوراق الدفع',
    'مصروفات مستحقة - رواتب',
    'مصروفات مستحقة - اتعاب مهنية',
    'تسوية مستحقات الموظفين',
    'مخصص الزكاة وضريبة الدخل',
    'مصروفات مستحقة - تكلفة التمويل ',
    'تسوية مؤقت',
    'وسيط أضافة أصول ثابتة',
    'تحويلات بين الخزائن',
    'تحويلات بين المخازن',
    'تسويات بين مراكز التكلفة',
    'وسيط خصومات من العملاء',
    'مخصص بدل الاجارة',
    'مخصص نهاية الخدمة',
    'مخصص نهاية الخدمة الاكتوارى',
    'مجمع اهلاك - السيارات ',
    'مجمع اهلاك - الالات والمعدات ',
    'مجمع اهلاك - الاخشاب',
    'مجمع اهلاك - المكاتب الجاهزة',
    'مجمع اهلاك - اجهزة الكمبيوتر والطابعات',
    'مجمع اهلاك - الأثاث والمفروشات',
    'مجمع اهلاك - الديكورات',
    'مجمع اهلاك - الشدة المعدنية ',
    'راس المال - نواف عبدالعزيز على الغفيض',
    'راس المال - شركة كيان السعودية',
    'راس المال - احمد إسماعيل الدموهى',
    'الاحتياطى النظامى',
    'جارى الشريك - نواف عبدالعزيز على الغفيض',
    'جارى الشريك - شركة كيان السعودية',
    'جارى الشريك - احمد اسماعيل الدموهى',
    'الارباح المرحله',
    'ارباح وخسائر اعادة تقييم منافع الموظفين',
    'المواد والخامات',
    'مصنعيات مقاولين الباطن',
    'الراتب الاساسى  - عمليات',
    'بدل سكن - عمليات',
    'بدلات اخرى - عمليات',
    'اضافى - عمليات',
    'مكافات وحوافز - عمليات',
    'تعويض انهاء الخدمات',
    'بدل طبيعة عمل - عمليات',
    'بدل الاجازه - عمليات',
    'ايجار معدات',
    'ايجار سيارات - عمليات',
    'رسوم تجديد اقامات - عمليات',
    'رسوم رخص العمل - عمليات',
    'رسوم خروج وعودة  - عمليات',
    'رسوم نقل كفالات - عمليات',
    'رسوم تاشيرات العمل - عمليات',
    'اشتراك هيئة المهندسين - عمليات',
    'رسوم رخصة البناء',
    'رسوم العداد المؤقت',
    'رسوم عدادات الكهرباء الدائم',
    'رسوم عداد المياه',
    'رسوم عداد الصرف الصحى ',
    'رسوم تصريف مياه جوفيه',
    'رسوم الهيئة السعودية للمقاولين',
    'رسوم فرز ',
    'رسوم قرار مساحى',
    'تامين العيوب الخفية ',
    'الفحص الفنى',
    'تامين مخاطر المقاولين',
    'ايجار سكن الموظفين',
    'ايجار مصنع الالمونيوم',
    // المصروفات العمومية والإدارية
    'الراتب الاساسى - ادارية',
    'بدل سكن - ادارية',
    'بدلات اخرى - ادارية',
    'اضافى - ادارية',
    'مكافات وحوافز - ادارية',
    'بدل الاجازه - اداريه',
    'عمولات بنكية',
    'رسوم وعمولات التسهيلات البنكية',
    'التامينات الاجتماعيه',
    'التامين الطبى',
    'رسوم تجديد اقامات - ادارية',
    'رسوم رخص العمل - ادارية',
    'رسوم خروج وعودة - ادارية',
    'رسوم نقل كفالات - ادارية',
    'رسوم تغيير المهن',
    'اشتراك هيئة المحاسبين - ادارية',
    'رسوم حكومية ومروريه',
    'رسوم تصديقات وتفاويض',
    'فواتير الكهرباء والمياه',
    'فواتير المياه',
    'ايجار المكاتب - الادارية',
    'ايجار سيارات  - ادارية',
    'الاتعاب المهنية',
    'بدل نهاية الخدمه - ادارية',
    'تامين السيارات',
    'تذاكر سفر  - ادارية',
    'انتقالات  - ادارية',
    'بريد وارساليات',
    'الهاتف والانترنت',
    'دعايا واعلان',
    'صيانة سيارات - ادارية',
    'صيانة عامه وبرامج',
    'محروقات - ادارية',
    'ضيافه ومواد نظافة المكتب',
    'ادوات مكتبيه ومطبوعات ',
    'الزى الموحد يونيفورم ',
    'مصروف فروقات زكوية',
    'دورات تدريبية ',
    'برمجة اجهزة كمبيوتر سنترالات ',
    'اشتراكات برامج',
    'مصروفات توظيف',
    // الاهلاك
    'اهلاك - السيارات ',
    'اهلاك - الالات والمعدات ',
    'اهلاك - الاخشاب',
    'اهلاك - المكاتب الجاهزة',
    'اهلاك - اجهزة الكمبيوتر والطابعات',
    'اهلاك - الأثاث والمفروشات',
    'اهلاك - الديكورات',
    'اهلاك - الشدة المعدنية ',
    // الزكاة والدخل
    'الزكاة',
    'ضريبة الدخل',
    // الإيرادات
    'ايرادات مشاريع المقاولات',
    'ايرادات اخرى',
    'ارباح وخسائر راسمالية',
]);

const getFirstValue = (row, keys) => {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return '';
};

const parseNumeric = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? 0 : num;
};

const normalizeCode = (value) => String(value || '').trim();
const normalizeNameString = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeForCompare = (value) => {
    let s = normalizeNameString(value);
    s = s.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/\u0640/g, ''); // همزات، ياء، تطويل
    s = s.replace(/[-–—]/g, ' '); // الشرطات
    s = s.replace(/^[0-9]+/g, '').trim(); // إزالة أرقام بادئة مثل "01 العملاء"
    s = s.replace(/\s+/g, ' ').trim();
    return s;
};
const getCanonicalName = (code) => CANON_MAP[code] || null;

export function getAccountLevel(code) {
    if (!code) return 0;
    const len = code.length;
    // مرونة: حتى 2 = L1، حتى 4 = L2، حتى 6 = L3، حتى 8 = L4، وما بعده L5
    if (len <= 2) return 1;
    if (len <= 4) return 2;
    if (len <= 6) return 3;
    if (len <= 8) return 4;
    return 5;
}

export function getParentCode(code) {
    if (!code) return null;
    // أولاً: استخدم الأب الرسمي من الشجرة القياسية إذا كان متوفراً
    if (CANON_PARENT[code]) return CANON_PARENT[code];

    const len = code.length;
    if (len <= 2) return null;
    // قواعد طولية: 4←2، 6←4، 8←6، ≥10←8
    if (len <= 4) return code.slice(0, 2);
    if (len <= 6) return code.slice(0, 4);
    if (len <= 8) return code.slice(0, 6);
    return code.slice(0, 8);
}

const prefix = (code, len) => (code?.length >= len ? code.slice(0, len) : '');

/**
 * تحليل بيانات ميزان المراجعة من Excel
 * @param {Array} rawData - البيانات الخام من ملف Excel
 * @returns {Array} - البيانات المعالجة
 */
export function parseTrialBalanceData(rawData) {
    // 1) قراءة كل صف مع الحفاظ على الترتيب كما في الملف
    let rows = rawData
        .map((row, index) => {
            let originalCode = normalizeCode(getFirstValue(row, CODE_KEYS));
            const name = String(getFirstValue(row, NAME_KEYS) || '').trim();
            const levelFromFile = parseNumeric(getFirstValue(row, LEVEL_KEYS));
            const isPostingFromFile = String(getFirstValue(row, POSTING_KEYS) || '').trim();

            // إعادة تعيين الأكواد الخاطئة الشائعة
            if (CODE_REMAP[originalCode]) {
                originalCode = CODE_REMAP[originalCode];
            }

            if (!originalCode) return null; // تجاهل الصفوف بلا كود
            const code = originalCode;
            let debit = parseNumeric(getFirstValue(row, DEBIT_KEYS));
            let credit = parseNumeric(getFirstValue(row, CREDIT_KEYS));
            const balance = debit - credit;

            // مستوى يعتمد فقط على طول الكود
            const level = levelFromFile || getAccountLevel(originalCode);
            const parentCode = getParentCode(originalCode) || '';

            return {
                id: index + 1, // صف الإكسيل (1-based)
                order: index,  // الحفاظ على الترتيب الأصلي
                code,
                name,
                debit,
                credit,
                balance,
                level,
                parentCode,
                originalCode,
                isPostingFlag: ['yes', 'true', '1', 'y', 'نعم', 'ايوا', 'ايوه'].includes(isPostingFromFile.toLowerCase()) || level >= 4,
            };
        })
        .filter(Boolean); // استبعاد الصفوف الفارغة تماماً

    // تحقق صارم لقطاع 06: الكود ↔ الاسم
    const errors06 = [];
    const filtered = [];
    rows.forEach((r) => {
        const expected = getCanonicalName(r.code);
        if (!expected) {
            // تخطى الأكواد غير الموجودة في الهيكل الرسمي وأضف تحذيراً غير قاطع
            errors06.push({
                type: 'unknown-code',
                code: r.code,
                actual: r.name,
                row: r.id,
                message: `تم تجاهل كود غير معروف ${r.code} (الاسم في الملف: ${r.name || '—'})`,
            });
            return;
        }
        const actualName = normalizeNameString(r.name);
        const expectedNorm = normalizeNameString(expected);
        const actualCmp = normalizeForCompare(actualName);
        const expectedCmp = normalizeForCompare(expectedNorm);
        const aliases = (CANON_ALIASES[r.code] || []).map(normalizeForCompare);
        const isAlias = aliases.includes(actualName);
        if (actualName && actualCmp !== expectedCmp && !aliases.includes(actualCmp)) {
            errors06.push({
                type: 'name-mismatch',
                code: r.code,
                expected,
                actual: actualName,
                row: r.id,
                message: `كود ${r.code} يتوقع الاسم "${expected}" لكن الملف يحتوي "${actualName}"`,
            });
        }
        filtered.push(r);
    });
    // رمي أخطاء فقط عند اختلاف الاسم؛ الأكواد المجهولة تم تجاهلها
    const fatal = errors06.filter(e => e.type === 'name-mismatch');
    if (fatal.length > 0) {
        const first = fatal[0];
        const err = new Error(first.message);
        err.validationErrors = fatal;
        throw err;
    }

    // استبدال rows بالصفوف المفلترة بعد تجاهل الأكواد غير المعروفة
    rows = filtered;

    // 2) بناء خريطة أسماء للأكواد لعرض المسار (من القاموس الرسمي)
    const nameMap = new Map();
    rows.forEach((r) => {
        if (r.code) {
            const canonical = getCanonicalName(r.code);
            nameMap.set(r.code, canonical || r.name);
        }
    });

    // 3) إلحاق بيانات المسار (أسماء المستويات) من القاموس أو الملف
    return rows.map((r) => {
        const canonicalName = getCanonicalName(r.code) || r.name;
        const l1 = prefix(r.code, 2);
        const l2 = prefix(r.code, 4);
        const l3 = prefix(r.code, 6);
        const l4 = prefix(r.code, 8);
        const l5 = prefix(r.code, 10);

        return {
            ...r,
            name: canonicalName,
            level1Code: l1,
            level2Code: l2,
            level3Code: l3,
            level4Code: l4,
            level5Code: l5,
            level1Name: nameMap.get(l1) || '',
            level2Name: nameMap.get(l2) || '',
            level3Name: nameMap.get(l3) || '',
            level4Name: nameMap.get(l4) || '',
            level5Name: nameMap.get(l5) || '',
        };
    });
}

/**
 * حساب إجماليات كل مستوى
 * @param {Array} data - البيانات المعالجة
 * @returns {Object} - إجماليات المستويات
 */
export function calculateLevelTotalsFromHierarchy(hierarchy = []) {
    const totals = {
        level1: {},
        level2: {},
        level3: {},
        overall: { totalDebit: 0, totalCredit: 0, balance: 0 },
    };

    const visit = (node) => {
        const debit = node.aggDebit ?? node.debit ?? 0;
        const credit = node.aggCredit ?? node.credit ?? 0;
        const balance = node.aggBalance ?? node.balance ?? (debit - credit);

        if (node.level === 1) {
            totals.level1[node.code] = {
                code: node.code,
                name: node.name,
                debit,
                credit,
                balance,
            };
            totals.overall.totalDebit += debit;
            totals.overall.totalCredit += credit;
            totals.overall.balance += balance;
        }

        if (node.level === 2) {
            totals.level2[node.code] = {
                code: node.code,
                name: node.name,
                debit,
                credit,
                balance,
                parent: node.parentCode,
            };
        }

        if (node.level === 3) {
            totals.level3[node.code] = {
                code: node.code,
                name: node.name,
                debit,
                credit,
                balance,
                parent: node.parentCode,
            };
        }

        node.children?.forEach(visit);
    };

    hierarchy.forEach(visit);
    return totals;
}

/**
 * حساب الإجماليات المالية الرئيسية
 * @param {Array} data - البيانات المعالجة
 * @returns {Object} - الإجماليات المالية
 */
export function calculateFinancialSummaryFromHierarchy(hierarchy = []) {
    const summary = {
        currentAssets: 0,       // 01
        fixedAssets: 0,         // 02
        totalAssets: 0,
        currentLiabilities: 0,  // 03
        longTermLiabilities: 0, // 04
        totalLiabilities: 0,
        equity: 0,              // 05
        costs: 0,               // 06
        revenue: 0,             // 07
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        isBalanced: false,
    };

    hierarchy.forEach((node) => {
        if (node.level !== 1) return;
        const balance = node.aggBalance ?? node.balance ?? 0;
        const debit = node.aggDebit ?? node.debit ?? 0;
        const credit = node.aggCredit ?? node.credit ?? 0;

        summary.totalDebit += debit;
        summary.totalCredit += credit;

        if (node.code.startsWith('01')) summary.currentAssets += balance;
        if (node.code.startsWith('02')) summary.fixedAssets += balance;
        if (node.code.startsWith('03')) summary.currentLiabilities += Math.abs(balance);
        if (node.code.startsWith('04')) summary.longTermLiabilities += Math.abs(balance);
        if (node.code.startsWith('05')) summary.equity += Math.abs(balance);
        if (node.code.startsWith('06')) summary.costs += balance;
        if (node.code.startsWith('07')) summary.revenue += Math.abs(balance);
    });

    summary.totalAssets = summary.currentAssets + summary.fixedAssets;
    summary.totalLiabilities = summary.currentLiabilities + summary.longTermLiabilities;
    summary.difference = Math.abs(summary.totalDebit - summary.totalCredit);
    summary.isBalanced = summary.difference < TOLERANCE;
    return summary;
}

/**
 * التحقق من توازن الميزان
 * @param {number} totalDebit - إجمالي المدين
 * @param {number} totalCredit - إجمالي الدائن
 * @returns {Object} - نتيجة التحقق
 */
export function validateBalance(totalDebit, totalCredit) {
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < TOLERANCE;

    return {
        isBalanced,
        totalDebit,
        totalCredit,
        difference,
        message: isBalanced
            ? 'ميزان المراجعة متوازن ✓'
            : `يوجد فرق في الميزان بقيمة ${difference.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}`,
    };
}

/**
 * إنشاء تقرير جودة البيانات
 * @param {Array} data - البيانات المعالجة
 * @returns {Object} - تقرير الجودة
 */
export function generateDataQualityReport(data, hierarchyResult = null) {
    const issues = {
        missingCodes: [],
        invalidCodes: [],
        unclassified: [],
        duplicates: [],
        zeroBalances: [],
        negativeBalances: [],
        missingParents: [],
        aggregationMismatches: [],
        imbalance: [],
    };

    const codeCount = {};

    data.forEach((row, index) => {
        // حسابات بدون كود
        if (!row.code && row.name) {
            issues.missingCodes.push({
                row: index + 1,
                name: row.name,
                debit: row.debit,
                credit: row.credit,
            });
        }

        // التكرارات
        if (row.code) {
            codeCount[row.code] = (codeCount[row.code] || 0) + 1;
        }

        // أرصدة صفرية
        if (row.debit === 0 && row.credit === 0) {
            issues.zeroBalances.push({
                row: index + 1,
                code: row.code,
                name: row.name,
            });
        }
    });

    // إيجاد التكرارات
    Object.entries(codeCount).forEach(([code, count]) => {
        if (count > 1) {
            issues.duplicates.push({
                code,
                count,
                rows: data.filter(r => r.code === code).map(r => r.id),
            });
        }
    });

    // إضافة تحذيرات الهرمية (إن وجدت)
    if (hierarchyResult) {
        hierarchyResult.warnings.forEach((w) => {
            if (w.type === 'missing-parent') issues.missingParents.push(w);
            if (w.type === 'aggregation-mismatch') issues.aggregationMismatches.push(w);
            if (w.type === 'imbalance') issues.imbalance.push(w);
        });
    }

    // حساب نقاط الجودة
    const totalIssues =
        issues.missingCodes.length +
        issues.invalidCodes.length +
        issues.unclassified.length +
        issues.duplicates.length +
        issues.missingParents.length +
        issues.aggregationMismatches.length +
        issues.imbalance.length;

    const qualityScore = Math.max(0, 100 - (totalIssues / data.length) * 100);

    return {
        issues,
        totalRecords: data.length,
        totalIssues,
        qualityScore: qualityScore.toFixed(1),
        summary: {
            missingCodes: issues.missingCodes.length,
            invalidCodes: issues.invalidCodes.length,
            unclassified: issues.unclassified.length,
            duplicates: issues.duplicates.length,
            zeroBalances: issues.zeroBalances.length,
            missingParents: issues.missingParents.length,
            aggregationMismatches: issues.aggregationMismatches.length,
            imbalance: issues.imbalance.length,
        },
    };
}

/**
 * حساب النسب المالية
 * @param {Object} summary - الملخص المالي
 * @returns {Object} - النسب المالية
 */
export function calculateFinancialRatios(summary) {
    const ratios = {
        // نسب السيولة
        currentRatio: summary.currentLiabilities > 0
            ? (summary.currentAssets / summary.currentLiabilities)
            : 0,

        // رأس المال العامل
        workingCapital: summary.currentAssets - summary.currentLiabilities,

        // نسبة المديونية
        debtRatio: summary.totalAssets > 0
            ? (summary.totalLiabilities / summary.totalAssets) * 100
            : 0,

        // نسبة الملاءة
        solvencyRatio: summary.totalAssets > 0
            ? ((summary.totalAssets - summary.totalLiabilities) / summary.totalAssets) * 100
            : 0,

        // هيكل التمويل
        equityRatio: summary.totalAssets > 0
            ? (summary.equity / summary.totalAssets) * 100
            : 0,

        debtToEquity: summary.equity > 0
            ? (summary.totalLiabilities / summary.equity)
            : 0,

        // نسبة الربحية
        profitMargin: summary.revenue > 0
            ? ((summary.revenue - summary.costs) / summary.revenue) * 100
            : 0,
    };

    // تقييم كل نسبة
    ratios.evaluation = {
        currentRatio: ratios.currentRatio >= 2 ? 'ممتاز' : ratios.currentRatio >= 1 ? 'جيد' : 'ضعيف',
        workingCapital: ratios.workingCapital > 0 ? 'إيجابي' : 'سلبي',
        debtRatio: ratios.debtRatio <= 50 ? 'منخفض' : ratios.debtRatio <= 70 ? 'متوسط' : 'مرتفع',
        solvencyRatio: ratios.solvencyRatio >= 30 ? 'جيد' : 'ضعيف',
        profitMargin: ratios.profitMargin >= 20 ? 'ممتاز' : ratios.profitMargin >= 10 ? 'جيد' : 'ضعيف',
    };

    return ratios;
}

/**
 * بناء الهيكل الهرمي للعرض
 * @param {Array} data - البيانات المعالجة (تُعامل كحسابات ترحيل مفصلة)
 * @returns {Array} - الهيكل الهرمي
 */
export function buildHierarchy(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return { hierarchy: [], nodeIndex: new Map(), warnings: [], totals: { aggregated: { debit: 0, credit: 0 }, provided: { debit: 0, credit: 0 } } };
    }

    const nodeIndex = new Map();
    const warnings = [];

    const ensureNode = (code, name, level) => {
        if (!code) return null;
        if (nodeIndex.has(code)) return nodeIndex.get(code);

        const canonical = getCanonicalName(code);

        const node = {
            id: null,
            order: null,
            code,
            name: canonical || name || code,
            level: level || getAccountLevel(code),
            parentCode: getParentCode(code) || '',
            debit: 0,
            credit: 0,
            balance: 0,
            children: [],
            isPosting: false,
            aggDebit: 0,
            aggCredit: 0,
            aggBalance: 0,
        };
        nodeIndex.set(code, node);
        return node;
    };

    // 1) إنشاء عقد حسابات الترحيل (التفصيلية) من الملف
    data.forEach((row, idx) => {
        const code = normalizeCode(row.code);
        if (!code) {
            warnings.push({ type: 'invalid-code', row: row.id || idx + 1, message: 'كود فارغ' });
            return;
        }
        const canonical = getCanonicalName(code);
        if ((code.length % 2 !== 0 || code.length < 2) && !canonical) {
            warnings.push({ type: 'invalid-code', code, row: row.id || idx + 1, message: 'طول الكود غير صالح' });
            return;
        }

        const level = getAccountLevel(code);
        if (level < 1 || level > 5) {
            warnings.push({ type: 'invalid-code', code, row: row.id || idx + 1, message: 'مستوى غير مدعوم' });
            return;
        }

        const node = {
            ...row,
            code,
            level,
            parentCode: getParentCode(code) || '',
            name: canonical || row.name,
            children: [],
            isPosting: true,
            aggDebit: 0,
            aggCredit: 0,
            aggBalance: 0,
        };

        nodeIndex.set(code, node);
    });

    // 2) إنشاء العقد الهيكلية المفقودة عبر البادئات
    nodeIndex.forEach((node) => {
        const code = node.code;
        // لكل بادئة صاعدة
        for (let len = 2; len < code.length; len += 2) {
            const parentCode = code.slice(0, len);
            if (!nodeIndex.has(parentCode)) {
                const lvl = getAccountLevel(parentCode);
                const canonicalParent = getCanonicalName(parentCode);
                const name = canonicalParent || (lvl === 1 ? (L1_NAMES[parentCode] || parentCode) : parentCode);
                ensureNode(parentCode, name, lvl);
            }
        }
    });

    // 3) ربط الآباء بالأبناء
    nodeIndex.forEach((node) => {
        const parentCode = getParentCode(node.code);
        if (!parentCode) return;
        const parent = nodeIndex.get(parentCode);
        if (parent) {
            parent.children.push(node);
        }
    });

    // 4) التجميع من الأسفل إلى الأعلى مع حماية من الدورات
    const visited = new Set();
    const rollUp = (node, stack = new Set()) => {
        if (stack.has(node.code)) return node; // منع الدورات
        stack.add(node.code);

        if (!node.children || node.children.length === 0) {
            node.isPosting = true;
            node.aggDebit = node.debit || 0;
            node.aggCredit = node.credit || 0;
            node.aggBalance = node.aggDebit - node.aggCredit;
            visited.add(node.code);
            return node;
        }

        let childDebit = 0;
        let childCredit = 0;
        node.children.forEach((child) => {
            rollUp(child, stack);
            childDebit += child.aggDebit;
            childCredit += child.aggCredit;
        });

        node.isPosting = false;
        node.aggDebit = childDebit;
        node.aggCredit = childCredit;
        node.aggBalance = childDebit - childCredit;
        visited.add(node.code);
        return node;
    };

    // الجذور = الأكواد ذات الطول 2
    const roots = [];
    nodeIndex.forEach((node) => {
        if (node.code.length === 2) roots.push(node);
    });
    roots.forEach((r) => rollUp(r, new Set()));

    // 5) إجماليات التوازن
    const providedTotals = data.reduce(
        (acc, row) => {
            acc.debit += row.debit || 0;
            acc.credit += row.credit || 0;
            return acc;
        },
        { debit: 0, credit: 0 }
    );

    const aggregatedTotals = roots.reduce(
        (acc, node) => {
            acc.debit += node.aggDebit;
            acc.credit += node.aggCredit;
            return acc;
        },
        { debit: 0, credit: 0 }
    );

    if (Math.abs(aggregatedTotals.debit - aggregatedTotals.credit) > TOLERANCE) {
        warnings.push({
            type: 'imbalance',
            totalDebit: aggregatedTotals.debit,
            totalCredit: aggregatedTotals.credit,
            difference: Math.abs(aggregatedTotals.debit - aggregatedTotals.credit),
        });
    }

    return {
        hierarchy: roots,
        nodeIndex,
        warnings,
        totals: {
            aggregated: aggregatedTotals,
            provided: providedTotals,
        },
    };
}

/**
 * تصدير البيانات لملف Excel
 * @param {Array} data - البيانات
 * @param {string} type - نوع التصدير (hierarchy, summary, quality)
 * @returns {Array} - البيانات للتصدير
 */
export function prepareExportData(data, type = 'full') {
    if (type === 'hierarchy') {
        return data.map(row => ({
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
    }

    if (type === 'summary') {
        const totals = calculateLevelTotals(data);
        return Object.entries(totals.level1).map(([name, values]) => ({
            'التصنيف': name,
            'مدين': values.debit,
            'دائن': values.credit,
            'الرصيد': values.balance,
        }));
    }

    return data.map(row => ({
        'الكود': row.code,
        'اسم الحساب': row.name,
        'المستوى': row.level,
        'التصنيف الرئيسي': row.level1Name,
        'مدين': row.debit,
        'دائن': row.credit,
        'الرصيد': row.balance,
    }));
}

/**
 * تنسيق الأرقام للعرض
 * @param {number} value - القيمة
 * @returns {string} - القيمة المنسقة
 */
export function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * تنسيق الأرقام بالعربية
 * @param {number} value - القيمة
 * @returns {string} - القيمة المنسقة
 */
export function formatNumberAr(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return Number(value).toLocaleString('ar-SA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// الاحتفاظ بالتواقيع القديمة للتوافق الخلفي
export function calculateLevelTotals(data, hierarchyOverride) {
    if (hierarchyOverride) return calculateLevelTotalsFromHierarchy(hierarchyOverride);
    return calculateLevelTotalsFromHierarchy(Array.isArray(data) && data[0]?.children ? data : []);
}

export function calculateFinancialSummary(data, hierarchyOverride) {
    if (hierarchyOverride) return calculateFinancialSummaryFromHierarchy(hierarchyOverride);
    return calculateFinancialSummaryFromHierarchy(Array.isArray(data) && data[0]?.children ? data : []);
}

// إتاحة الخريطة الكاملة للاختبارات/التوثيق
export function getCanonicalMap() {
    return { ...CANON_MAP };
}

/**
 * إعادة حساب الهرمية بعد التعديلات
 * Recalculate hierarchy after edits to posting accounts
 * @param {Array} hierarchy - الهرمية الأصلية
 * @param {Object} edits - التعديلات {nodeKey: {debit, credit}}
 * @returns {Array} - الهرمية المحدثة
 */
export function recalculateHierarchy(hierarchy, edits = {}) {
    if (!hierarchy || hierarchy.length === 0) return hierarchy;
    if (!edits || Object.keys(edits).length === 0) return hierarchy;

    // نسخ عميق للهرمية لتجنب تعديل الأصل
    const cloneNode = (node) => {
        const cloned = {
            ...node,
            children: node.children ? node.children.map(cloneNode) : [],
        };

        // تطبيق التعديلات على حسابات الترحيل
        const nodeKey = node.code || node.name;
        if (edits[nodeKey] && node.isPosting) {
            cloned.debit = edits[nodeKey].debit ?? node.debit;
            cloned.credit = edits[nodeKey].credit ?? node.credit;
            cloned.balance = cloned.debit - cloned.credit;
        }

        return cloned;
    };

    const updatedHierarchy = hierarchy.map(cloneNode);

    // إعادة حساب التجميعات من الأسفل للأعلى
    const recalculate = (node) => {
        if (!node.children || node.children.length === 0) {
            // حسابات ترحيل - استخدم القيم المحدثة
            node.aggDebit = node.isPosting ? (node.debit || 0) : 0;
            node.aggCredit = node.isPosting ? (node.credit || 0) : 0;
            node.aggBalance = node.aggDebit - node.aggCredit;
            return node;
        }

        // حسابات هيكلية - اجمع الأطفال
        let childDebit = 0;
        let childCredit = 0;

        node.children.forEach((child) => {
            recalculate(child);
            childDebit += child.aggDebit;
            childCredit += child.aggCredit;
        });

        node.aggDebit = childDebit;
        node.aggCredit = childCredit;
        node.aggBalance = childDebit - childCredit;

        return node;
    };

    updatedHierarchy.forEach(recalculate);
    return updatedHierarchy;
}

