import mammoth from 'mammoth';
import { ServiceType } from '../types';

export interface ExtractedInvoice {
  id: string;
  rawRowIndex: number;
  month: number; // 1 to 12
  year: number; // e.g. 2026
  date: string; // ISO string e.g. "2026-01-15T12:00:00.000Z"
  clientName: string; // من Index 4
  serviceType: ServiceType; // من Index 5
  netCost: number; // التكلفة الصافية المباشرة بالدينار (من Index 2 - دون ضرب بسعر الصرف)
  rawDocTotal: number; // إجمالي الفاتورة المذكور بالمستند إن وجد من Index 3 (مع معالجة 6.660 كـ 6660)
  rawDocProfit: number; // هامش الربح المذكور بالمستند إن وجد من Index 1
  calculatedPrice: number; // إجمالي الفاتورة النهائي بالدينار
  profitMargin: number; // هامش الربح المحتسب = calculatedPrice - netCost
  profitPercent: number; // نسبة هامش الربح %
  notes: string; // ملاحظات المستند الأصلية فقط من Index 0 (فارغة إذا لم توجد)
}

// التوافق مع الأنواع السابقة
export type RawExtractedInvoice = ExtractedInvoice;
export type CalculatedInvoice = ExtractedInvoice;

export interface ExtractedExpenseItem {
  id: string;
  month: number; // 1 to 12
  year: number; // e.g. 2026
  date: string; // ISO string e.g. "2026-01-15T12:00:00.000Z"
  description: string; // بيان المصروف (مثل: إيجار المكتب)
  amount: number; // قيمة المصروف بالدينار الصافي (مثل: 1000)
  category: string; // إيجار، رواتب، مصروفات تشغيلية، فواتير وصيانة...
  notes: string;
  employeeName?: string; // إن كان المصروف راتباً
}

// التوافق مع الأنواع السابقة
export type ExtractedSalaryExpense = ExtractedExpenseItem;

export interface MonthGeneralNotes {
  month: number;
  year: number;
  monthKey: string; // e.g. "2026-01"
  items: string[];
  combinedText: string;
}

export interface DocxStrictAnalysisResult {
  fileName: string;
  invoices: ExtractedInvoice[];
  expenses: ExtractedExpenseItem[];
  salaries: ExtractedExpenseItem[]; // مصفوفة الرواتب المستخرجة من قسم المصاريف
  monthlyNotes: Record<number, MonthGeneralNotes>; // الملاحظات العامة لكل شهر
  detectedMonths: number[];
  ignoredRowsCount: number;
  totalRawRowsFound: number;
}

export type PricingMode = 'doc_total' | 'direct_dinar';

/**
 * دالة تنظيف وتجريد مبالغ الدينار (Critical Math Fix):
 * - الأرقام في الملف هي بالدينار (مثل 680)، لا تضرب في سعر الصرف أبداً.
 * - الأرقام المكتوبة بنقاط (مثل 6.660 أو 6.470 أو 1.000) هي بالآلاف (6660، 6470، 1000).
 * - يتم إزالة النقطة (Dot) والفواصل قبل تحويل النص إلى رقم لتجنب تحويلها إلى كسور عشرية.
 * - تحويل الأرقام المشرقية (الهندية) والفارسية إلى أرقام غربية (0-9).
 */
export function cleanDinarAmount(rawVal: any): number {
  if (rawVal === null || rawVal === undefined) return 0;
  if (typeof rawVal === 'number') {
    return isNaN(rawVal) ? 0 : Math.round(rawVal);
  }

  let str = String(rawVal).trim();
  if (!str) return 0;

  // 1. تحويل الأرقام المشرقية (٠-٩) والفارسية (۰-۹) إلى أرقام غربية (0-9)
  const arabicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  str = str.replace(/[٠-٩۰-۹]/g, d => arabicDigits[d] || d);

  // 2. إزالة نصوص ورموز العملات
  str = str.replace(/دينار|د\.ل|د\.ت|ج\.م|ريال|دولار|\$|USD|LYD|EGP|SAR/gi, '');

  // 3. إزالة النقاط والفواصل (إزالة Dot بالكامل لتحويل 6.660 إلى 6660 و 1.000 إلى 1000)
  str = str.replace(/[.,،\s\u00A0\u200E\u200F\u202A-\u202E]/g, '');

  // 4. استخراج الأرقام
  const match = str.match(/-?\d+/);
  if (!match) return 0;

  const num = parseInt(match[0], 10);
  return isNaN(num) ? 0 : num;
}

// أسماء بديلة للتوافق الكامل
export const cleanNetCost = cleanDinarAmount;
export const parseArabicNumber = cleanDinarAmount;

/**
 * دالة تنظيف وتطبيع النصوص العربية للمقارنة والفرز
 */
export function normalizeArabicText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
    .replace(/[أإآ]/g, 'ا') // توحيد الألفات
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة
    .replace(/ى/g, 'ي') // توحيد الياء
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * دالة ذكية لاكتشاف الشهر والسنة من النصوص (Month & Year Detection):
 * تتعرف على أشكال كتابة الأشهر مثل:
 * "شهر 1", "شهر 2", "شهر 10", "شهر (1)", "شهر: 2", "شهر يناير", "شهر فبراير"...
 */
export function extractMonthAndYear(text: string): { month: number | null; year: number | null } {
  if (!text) return { month: null, year: null };

  const norm = normalizeArabicText(text);

  // 1. استخراج السنة إن وجدت (مثال: 2024, 2025, 2026, 2027)
  let detectedYear: number | null = null;
  const yearMatch = norm.match(/\b(202\d)\b/);
  if (yearMatch) {
    detectedYear = parseInt(yearMatch[1], 10);
  }

  // تحويل الأرقام المشرقية في النص لمطابقة الأرقام
  const arabicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  const asciiText = norm.replace(/[٠-٩]/g, d => arabicDigits[d] || d);

  // 2. فحص نمط "شهر X" أو "الشهر X" حيث X رقم من 1 إلى 12
  const monthNumMatch = asciiText.match(/(?:شهر|الشهر)\s*[:\-_/()\[\]#]*\s*(\d{1,2})\b/);
  if (monthNumMatch) {
    const m = parseInt(monthNumMatch[1], 10);
    if (m >= 1 && m <= 12) {
      return { month: m, year: detectedYear };
    }
  }

  // 3. فحص أسماء الشهور المكتوبة بالحروف
  const arabicMonthNames: Record<string, number> = {
    'يناير': 1,
    'فبراير': 2,
    'مارس': 3,
    'ابريل': 4,
    'مايو': 5,
    'يونيو': 6,
    'يوليو': 7,
    'اغسطس': 8,
    'سبتمبر': 9,
    'اكتوبر': 10,
    'نوفمبر': 11,
    'ديسمبر': 12,
  };

  for (const [name, m] of Object.entries(arabicMonthNames)) {
    if (asciiText.includes(name)) {
      return { month: m, year: detectedYear };
    }
  }

  // 4. فحص الأرقام المكتوبة نصاً بعد كلمة شهر (شهر واحد، شهر اثنين...)
  const textMonthMap: Record<string, number> = {
    'شهر واحد': 1,
    'شهر الاول': 1,
    'شهر اثنان': 2,
    'شهر اثنين': 2,
    'شهر تاني': 2,
    'شهر الثاني': 2,
    'شهر ثلاثه': 3,
    'شهر تلاته': 3,
    'شهر الثالث': 3,
    'شهر اربعه': 4,
    'شهر الرابع': 4,
    'شهر خمسه': 5,
    'شهر الخامس': 5,
    'شهر سته': 6,
    'شهر السادس': 6,
    'شهر سبعه': 7,
    'شهر السابع': 7,
    'شهر ثمانيه': 8,
    'شهر تمانيه': 8,
    'شهر الثامن': 8,
    'شهر تسعه': 9,
    'شهر التاسع': 9,
    'شهر عشره': 10,
    'شهر العاشر': 10,
    'شهر احد عشر': 11,
    'شهر الحادي عشر': 11,
    'شهر اثنا عشر': 12,
    'شهر الثاني عشر': 12,
  };

  for (const [phrase, m] of Object.entries(textMonthMap)) {
    if (asciiText.includes(phrase)) {
      return { month: m, year: detectedYear };
    }
  }

  return { month: null, year: detectedYear };
}

/**
 * فحص ما إذا كان السطر يمثل إشارة لتغيير وضع القراءة إلى المصاريف (Expenses Mode Switch):
 * عند وصول القارئ لكلمة "مصاريف" داخل الجدول، يغير وضع القراءة ويبدأ في قراءة البنود كمصروفات تشغيلية.
 */
export function isExpensesTrigger(text: string): boolean {
  const norm = normalizeArabicText(text);
  if (!norm) return false;
  // استثناء الترويسات التي تحتوي على اسم العميل أو غيره
  if (norm.includes('اسم العميل') || norm.includes('الزبون') || norm.includes('بدون مصاريف')) {
    return false;
  }
  return (
    norm.includes('مصاريف') ||
    norm.includes('المصاريف') ||
    norm.includes('مصروفات') ||
    norm.includes('المصروفات') ||
    norm.includes('قسم المصاريف') ||
    norm.includes('جدول المصاريف') ||
    norm.includes('مصاريف تشغيليه')
  );
}

/**
 * فحص ما إذا كان السطر يمثل عودة إلى وضع الفواتير
 */
export function isInvoicesTrigger(text: string): boolean {
  const norm = normalizeArabicText(text);
  return (
    norm.includes('اسم العميل') ||
    norm.includes('العميل') ||
    norm.includes('الزبون') ||
    norm.includes('نوع الخدمه') ||
    norm.includes('فواتير') ||
    norm.includes('المبيعات') ||
    norm.includes('طلبيات') ||
    norm.includes('قائمه الفواتير')
  );
}

/**
 * فحص ما إذا كان السطر ترويسة أعمدة للفواتير
 */
export function isInvoicesHeaderRow(cells: string[]): boolean {
  const rowText = normalizeArabicText(cells.join(' '));
  return (
    (rowText.includes('العميل') || rowText.includes('الزبون')) &&
    (rowText.includes('التكلفه') || rowText.includes('الخدمه') || rowText.includes('الربح') || rowText.includes('الاجمالي'))
  );
}

/**
 * فحص ما إذا كانت الخلية أو النص ترويسة يجب تجاهلها كفاتورة
 */
export function isHeaderValue(val: string): boolean {
  const norm = normalizeArabicText(val);
  return (
    norm === 'اسم العميل' ||
    norm === 'العميل' ||
    norm === 'الزبون' ||
    norm === 'اسم الزبون' ||
    norm === 'نوع الخدمه' ||
    norm === 'نوع الخدمة' ||
    norm === 'الخدمه' ||
    norm === 'الخدمة' ||
    norm === 'البيان' ||
    norm === 'الملاحظات' ||
    norm === 'ملاحظات' ||
    norm === 'التكلفه' ||
    norm === 'التكلفة' ||
    norm === 'التكلفه الصافيه' ||
    norm === 'التكلفة الصافية' ||
    norm === 'هامش الربح' ||
    norm === 'الربح' ||
    norm === 'المبلغ' ||
    norm === 'القيمه' ||
    norm.includes('اجمالي') ||
    norm.includes('المجموع')
  );
}

/**
 * فحص ما إذا كان النص المكتوب خارج الجدول يمثل ملاحظة عامة للشهر:
 * مثل "كيان تبي نرجعلهم 840 دينار"
 */
export function isGeneralNoteCandidate(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return false;

  const norm = normalizeArabicText(trimmed);

  // استبعاد النصوص التشكيلية والافتتاحية العادية
  if (
    norm === 'بسم الله الرحمن الرحيم' ||
    norm === 'المملكه' ||
    norm === 'شركه' ||
    norm.startsWith('صفحه ') ||
    norm.startsWith('page ') ||
    /^\d+$/.test(norm) ||
    norm === '-' ||
    norm === '--'
  ) {
    return false;
  }

  // إذا كان النص مجرد تعريف شهر فقط، فهو ترويسة شهر وليس ملاحظة
  const mInfo = extractMonthAndYear(trimmed);
  if (mInfo.month !== null && (norm.length <= 12 || norm.startsWith('شهر ') || norm.startsWith('الشهر '))) {
    // إذا كان يحتوي على كلمات إضافية مثل "ملاحظة: كيان تبي نرجعلهم 840 دينار" نقبله
    if (norm.length < 15 && !norm.includes('دينار') && !norm.includes('تبي') && !norm.includes('حساب') && !norm.includes('باقي')) {
      return false;
    }
  }

  // استبعاد ترويسات المصاريف المجردة
  if (norm === 'مصاريف' || norm === 'المصاريف' || norm === 'قسم المصاريف' || norm === 'جدول المصاريف') {
    return false;
  }

  return true;
}

/**
 * تحديد نوع الخدمة بناءً على نص البيان
 */
export function detectServiceType(text: string): ServiceType {
  const norm = normalizeArabicText(text);
  if (norm.includes('اعلان') || norm.includes('ممول') || norm.includes('سوشيال') || norm.includes('حمله') || norm.includes('ad')) {
    return 'إعلانات ممولة';
  }
  if (norm.includes('طباع') || norm.includes('بنر') || norm.includes('فلكس') || norm.includes('ستكر') || norm.includes('بروشور') || norm.includes('كارت') || norm.includes('كروت')) {
    return 'طباعة عامة';
  }
  if (norm.includes('تصميم') || norm.includes('هويه') || norm.includes('شعار') || norm.includes('لوجو') || norm.includes('مونتاج') || norm.includes('اداره الصفحه') || norm.includes('ادارة الصفحه')) {
    return 'تصميم ومونتاج';
  }
  if (norm.includes('كلادنج') || norm.includes('واجه') || norm.includes('واجهات')) {
    return 'واجهات كلادينج';
  }
  if (norm.includes('حروف') || norm.includes('مضيئ') || norm.includes('بارز') || norm.includes('ستانلس') || norm.includes('اكريلك') || norm.includes('نيون')) {
    return 'حروف بارزة ومضيئة';
  }
  if (norm.includes('شاش') || norm.includes('الكتروني') || norm.includes('ليد')) {
    return 'شاشات إلكترونية';
  }
  return 'لوحات إعلانية';
}

/**
 * قراءة مستند Word (.docx) وتحويله إلى HTML عبر mammoth
 */
export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value || '';
}

/**
 * استخراج بيانات بند المصروف التشغيلي من خلايا الجدول أو النص المباشر
 */
export function parseExpenseRow(
  cells: string[],
  currentMonth: number,
  currentYear: number
): ExtractedExpenseItem | null {
  if (cells.length === 0) return null;

  // فحص كل خلية للبحث عن القيمة المالية
  let foundAmount = 0;
  let textParts: string[] = [];

  cells.forEach(cell => {
    const amt = cleanDinarAmount(cell);
    if (amt > 0 && foundAmount === 0) {
      foundAmount = amt;
    } else {
      const cleanedCell = cell.replace(/دينار|د\.ل/gi, '').trim();
      if (cleanedCell && !isHeaderValue(cleanedCell)) {
        textParts.push(cleanedCell);
      }
    }
  });

  // إذا لم نجد مبلغاً منفصلاً، ربما كان في خلية مدمجة مثل "إيجار المكتب 1000"
  let description = textParts.join(' ').trim();
  if (foundAmount === 0 && cells.length > 0) {
    const fullRow = cells.join(' ');
    const amt = cleanDinarAmount(fullRow);
    if (amt > 0) {
      foundAmount = amt;
      // استخراج النص وتجريد الأرقام
      description = fullRow
        .replace(/\d+/g, '')
        .replace(/[.,]/g, '')
        .replace(/دينار|د\.ل/gi, '')
        .trim();
    }
  }

  if (foundAmount <= 0 || !description || isHeaderValue(description)) {
    return null;
  }

  const normDesc = normalizeArabicText(description);

  // تحديد التصنيف
  let category = 'مصروفات تشغيلية';
  let employeeName: string | undefined = undefined;

  if (normDesc.includes('راتب') || normDesc.includes('رواتب') || normDesc.includes('مرتب')) {
    category = 'رواتب';
    const cleanEmp = description.replace(/راتب|مرتب|رواتب/gi, '').trim();
    employeeName = cleanEmp || 'موظف';
  } else if (normDesc.includes('ايجار') || normDesc.includes('إيجار')) {
    category = 'إيجار';
  } else if (normDesc.includes('كهرباء') || normDesc.includes('نت') || normDesc.includes('انترنت') || normDesc.includes('صيانه') || normDesc.includes('صيانة')) {
    category = 'فواتير وصيانة';
  } else if (normDesc.includes('بنزين') || normDesc.includes('وقود') || normDesc.includes('نقل') || normDesc.includes('سياره') || normDesc.includes('سيارة')) {
    category = 'محروقات ونقل';
  }

  const dateIso = `${currentYear}-${String(currentMonth).padStart(2, '0')}-15T12:00:00.000Z`;

  return {
    id: `exp-${currentMonth}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    month: currentMonth,
    year: currentYear,
    date: dateIso,
    description,
    amount: foundAmount,
    category,
    notes: '',
    employeeName,
  };
}

/**
 * الخوارزمية الشاملة والذكية لتحليل ملفات الوورد (DOCX Contextual & Strict Importer):
 * 
 * 1. تتبع الأشهر (Month Tracking):
 *    - الخوارزمية تتتبع السطر الحالي. إذا احتوى السطر على "شهر 1" أو "شهر 2"، تحدث currentMonth للشهر المعني.
 *    - ربط الفاتورة برقم الشهر الخاص بها وتعيين date لمنتصف ذلك الشهر (YYYY-MM-15T12:00:00.000Z) لمنع رميها في الشهر الحالي للواجهة.
 * 
 * 2. منع ضرب العملات وإصلاح الأرقام (Critical Math Fix):
 *    - الأرقام في الملف بالدينار (مثل 680) وتدخل كقيمة صافية مباشرة دون ضرب بسعر الصرف.
 *    - الأرقام ذات النقاط (مثل 6.660 أو 6.470) هي بالآلاف (6660 و 6470)، يتم إزالة النقطة (Dot) قبل التحويل لتجنب الكسور.
 * 
 * 3. استخراج المصاريف (Expenses Section & Mode Switch):
 *    - عند وصول القارئ لكلمة "مصاريف" داخل الجدول، يغير وضع القراءة ويبدأ في قراءة البنود كمصروفات تشغيلية وحفظها في جدول expenses للشهر نفسه.
 * 
 * 4. التعرف على الملاحظات العامة (Outside Table General Notes):
 *    - النصوص المكتوبة خارج الجدول (مثل "كيان تبي نرجعلهم 840 دينار") يتم التقاطها وتخزينها في خانة الملاحظات العامة للشهر المعني.
 */
export function extractDocxDataStrict(
  htmlContent: string,
  fileName: string,
  defaultYear?: number
): DocxStrictAnalysisResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const detectedYear = defaultYear || new Date().getFullYear();
  let currentYear = detectedYear;
  let currentMonth = 1; // الافتراضي شهر 1 حتى يتم الكشف عن الترويسات
  let currentMode: 'invoices' | 'expenses' = 'invoices';

  const invoices: ExtractedInvoice[] = [];
  const expenses: ExtractedExpenseItem[] = [];
  const salaries: ExtractedExpenseItem[] = [];
  const monthlyNotesMap: Record<number, string[]> = {};
  const detectedMonthsSet = new Set<number>();

  let ignoredRowsCount = 0;
  let totalRawRowsFound = 0;

  // استخراج عناصر المستند بتسلسلها وترتيبها الحقيقي في الـ DOM
  let elements = Array.from(doc.body.children);
  if (elements.length === 1 && elements[0].tagName.toLowerCase() === 'div' && elements[0].children.length > 1) {
    elements = Array.from(elements[0].children);
  }

  elements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    // ==========================================
    // حالة 1: العنصر ليس جدولاً (فقرة، عنوان، قائمة خارج الجدول)
    // ==========================================
    if (tagName !== 'table') {
      const text = (element.textContent || '').trim();
      if (!text) return;

      // أ) فحص وجود مؤشر شهر (مثل: "شهر 1", "شهر 2", "شهر يناير")
      const monthInfo = extractMonthAndYear(text);
      if (monthInfo.month !== null) {
        currentMonth = monthInfo.month;
        detectedMonthsSet.add(currentMonth);
        if (monthInfo.year !== null) {
          currentYear = monthInfo.year;
        }

        // إذا كانت الفقرة تحتوي كلمة مصاريف أيضاً
        if (isExpensesTrigger(text)) {
          currentMode = 'expenses';
        } else {
          currentMode = 'invoices'; // إعادة الوضع إلى الفواتير لبداية الشهر الجديد
        }

        // فحص إذا كان هناك نص إضافي في نفس الفقرة يحمل ملاحظة
        const norm = normalizeArabicText(text);
        if (norm.length > 25 && !norm.startsWith('شهر ') && isGeneralNoteCandidate(text)) {
          if (!monthlyNotesMap[currentMonth]) monthlyNotesMap[currentMonth] = [];
          monthlyNotesMap[currentMonth].push(text);
        }
        return;
      }

      // ب) فحص التبديل للمصاريف خارج الجداول
      if (isExpensesTrigger(text)) {
        currentMode = 'expenses';
        return;
      }

      // ج) فحص التبديل للفواتير خارج الجداول
      if (isInvoicesTrigger(text)) {
        currentMode = 'invoices';
        return;
      }

      // د) إذا كنا في وضع المصاريف ووجد بند مصروف في فقرة نصية
      if (currentMode === 'expenses') {
        const expItem = parseExpenseRow([text], currentMonth, currentYear);
        if (expItem) {
          expenses.push(expItem);
          if (expItem.category === 'رواتب') {
            salaries.push(expItem);
          }
          return;
        }
      }

      // هـ) النصوص المكتوبة خارج الجدول (الملاحظات العامة للشهر مثل: "كيان تبي نرجعلهم 840 دينار")
      if (isGeneralNoteCandidate(text)) {
        detectedMonthsSet.add(currentMonth);
        if (!monthlyNotesMap[currentMonth]) monthlyNotesMap[currentMonth] = [];
        monthlyNotesMap[currentMonth].push(text);
      }
      return;
    }

    // ==========================================
    // حالة 2: العنصر جدول (Table)
    // ==========================================
    const trElements = Array.from(element.querySelectorAll('tr'));
    if (trElements.length === 0) return;

    trElements.forEach((tr, rIdx) => {
      totalRawRowsFound++;
      const cells = Array.from(tr.querySelectorAll('td, th')).map(c => (c.textContent || '').trim());

      if (cells.length === 0 || cells.every(c => !c)) {
        ignoredRowsCount++;
        return;
      }

      const rowText = cells.join(' ').trim();

      // أ) فحص ما إذا كان هذا الصف هو عنوان شهر مدمج داخل الجدول
      const rowMonthInfo = extractMonthAndYear(rowText);
      if (rowMonthInfo.month !== null) {
        currentMonth = rowMonthInfo.month;
        detectedMonthsSet.add(currentMonth);
        if (rowMonthInfo.year !== null) {
          currentYear = rowMonthInfo.year;
        }
        if (isExpensesTrigger(rowText)) {
          currentMode = 'expenses';
        } else {
          currentMode = 'invoices';
        }
        return;
      }

      // ب) فحص التبديل لوضع المصاريف داخل الجدول (Mode Switch)
      if (isExpensesTrigger(rowText)) {
        currentMode = 'expenses';
        return;
      }

      // ج) فحص التبديل لوضع الفواتير (ترويسة فواتير جديدة)
      if (isInvoicesHeaderRow(cells)) {
        currentMode = 'invoices';
        return;
      }

      // د) معالجة وضع المصاريف (Operational Expenses Mode)
      if (currentMode === 'expenses') {
        const expItem = parseExpenseRow(cells, currentMonth, currentYear);
        if (expItem) {
          detectedMonthsSet.add(currentMonth);
          expenses.push(expItem);
          if (expItem.category === 'رواتب') {
            salaries.push(expItem);
          }
        } else {
          // إذا كان صف ملاحظات داخل قسم المصاريف
          if (cells.length === 1 && isGeneralNoteCandidate(cells[0])) {
            if (!monthlyNotesMap[currentMonth]) monthlyNotesMap[currentMonth] = [];
            monthlyNotesMap[currentMonth].push(cells[0]);
          } else {
            ignoredRowsCount++;
          }
        }
        return;
      }

      // هـ) معالجة وضع الفواتير (Invoices Mode)
      // الترتيب الصارم المعتمد في الـ DOM:
      // Index 0: الملاحظات (Notes)
      // Index 1: هامش الربح (Profit)
      // Index 2: التكلفة الصافية (Net Cost) - قيمة صافية بالدينار دون ضرب بسعر الصرف
      // Index 3: الإجمالي (Total) - قيمة إجمالي الفاتورة بالدينار (مع معالجة 6.660 كـ 6660)
      // Index 4: اسم العميل (Client Name)
      // Index 5: نوع الخدمة (Service Type)
      if (cells.length < 5) {
        // إذا كان سطراً بملاحظة عريضة خارج التوزيع
        if (cells.length === 1 && isGeneralNoteCandidate(cells[0])) {
          if (!monthlyNotesMap[currentMonth]) monthlyNotesMap[currentMonth] = [];
          monthlyNotesMap[currentMonth].push(cells[0]);
        } else {
          ignoredRowsCount++;
        }
        return;
      }

      const rawNotes = cells[0] || '';
      const rawProfit = cells[1] || '';
      const rawNetCost = cells[2] || '';
      const rawTotal = cells[3] || '';
      const rawClient = cells[4] || '';
      const rawService = cells[5] || '';

      const clientName = rawClient.trim();
      const serviceText = rawService.trim();

      // تجريد وتنظيف الأرقام بالدينار الصافي دون أي ضرب في أسعار الصرف
      // مع إزالة النقطة (Dot) للآلاف (6.660 -> 6660, 6.470 -> 6470, 1.000 -> 1000)
      const netCost = cleanDinarAmount(rawNetCost);
      const docTotal = cleanDinarAmount(rawTotal);
      const docProfit = cleanDinarAmount(rawProfit);

      // استبعاد الترويسات والصفوف غير الصالحة
      if (!clientName || (netCost <= 0 && docTotal <= 0) || isHeaderValue(clientName) || isHeaderValue(rawNetCost)) {
        ignoredRowsCount++;
        return;
      }

      // احتساب السعر الصافي وهامش الربح بالدينار الصافي مباشرة:
      // إما إجمالي المستند أو التكلفة الصافية + الربح
      let calculatedPrice = 0;
      if (docTotal > 0) {
        calculatedPrice = docTotal;
      } else if (docProfit > 0) {
        calculatedPrice = netCost + docProfit;
      } else {
        calculatedPrice = netCost;
      }

      const profitMargin = Math.max(0, calculatedPrice - netCost);
      const profitPercent = calculatedPrice > 0 ? Math.round((profitMargin / calculatedPrice) * 100) : 0;

      const serviceType = detectServiceType(`${serviceText} ${clientName}`);
      const invoiceDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-15T12:00:00.000Z`;

      detectedMonthsSet.add(currentMonth);

      invoices.push({
        id: `inv-${currentMonth}-${rIdx + 1}-${invoices.length + 1}`,
        rawRowIndex: rIdx + 1,
        month: currentMonth,
        year: currentYear,
        date: invoiceDate,
        clientName,
        serviceType,
        netCost,
        rawDocTotal: docTotal,
        rawDocProfit: docProfit,
        calculatedPrice,
        profitMargin,
        profitPercent,
        notes: rawNotes.trim(), // الملاحظات الأصلية فقط دون أي إضافات آلية
      });
    });
  });

  // بناء كائنات الملاحظات العامة لكل شهر
  const monthlyNotes: Record<number, MonthGeneralNotes> = {};
  Object.entries(monthlyNotesMap).forEach(([mStr, items]) => {
    const m = parseInt(mStr, 10);
    const mKey = `${currentYear}-${String(m).padStart(2, '0')}`;
    const cleanItems = items.map(it => it.trim()).filter(Boolean);
    monthlyNotes[m] = {
      month: m,
      year: currentYear,
      monthKey: mKey,
      items: cleanItems,
      combinedText: cleanItems.map(it => `• ${it}`).join('\n'),
    };
  });

  const detectedMonths = Array.from(detectedMonthsSet).sort((a, b) => a - b);
  if (detectedMonths.length === 0) {
    detectedMonths.push(1);
  }

  return {
    fileName,
    invoices,
    expenses,
    salaries,
    monthlyNotes,
    detectedMonths,
    ignoredRowsCount,
    totalRawRowsFound: totalRawRowsFound || invoices.length + expenses.length + ignoredRowsCount,
  };
}

/**
 * دالة إعادة احتساب الفواتير:
 * تعتمد القيم الصافية المباشرة بالدينار دون ضرب بسعر الصرف إطلاقاً
 */
export function calculateInvoices(
  rawInvoices: ExtractedInvoice[],
  _mode?: PricingMode,
  _rate?: number
): ExtractedInvoice[] {
  return rawInvoices.map((inv) => {
    let finalPrice = inv.calculatedPrice;
    if (finalPrice <= 0) {
      if (inv.rawDocTotal > 0) {
        finalPrice = inv.rawDocTotal;
      } else if (inv.rawDocProfit > 0) {
        finalPrice = inv.netCost + inv.rawDocProfit;
      } else {
        finalPrice = inv.netCost;
      }
    }

    const profitMargin = Math.max(0, finalPrice - inv.netCost);
    const profitPercent = finalPrice > 0 ? Math.round((profitMargin / finalPrice) * 100) : 0;

    return {
      ...inv,
      calculatedPrice: finalPrice,
      profitMargin,
      profitPercent,
    };
  });
}

// دالة التوافق مع الكود السابق
export function calculateInvoicesWithExchangeRate(
  rawInvoices: ExtractedInvoice[],
  _exchangeRate: number
): ExtractedInvoice[] {
  return calculateInvoices(rawInvoices);
}
