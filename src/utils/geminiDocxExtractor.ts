import mammoth from 'mammoth';
import { ServiceType } from '../types';

export interface GeminiRawSale {
  client: string;
  service: string;
  cost: number | string;
}

export interface GeminiRawExpense {
  item: string;
  cost: number | string;
}

export interface GeminiMonthData {
  month: number;
  notes?: string;
  sales: GeminiRawSale[];
  expenses: GeminiRawExpense[];
}

export interface GeminiFinancialResponse {
  months: GeminiMonthData[];
}

export interface ProcessedInvoiceItem {
  id: string;
  month: number;
  year: number;
  date: string;
  clientName: string;
  serviceType: ServiceType;
  rawServiceDesc: string;
  netCost: number; // cost القادم من Gemini
  calculatedPrice: number; // total المحتسب
  profitMargin: number; // profit المحتسب = total - cost
  profitPercent: number; // %
  notes: string;
}

export interface ProcessedExpenseItem {
  id: string;
  month: number;
  year: number;
  date: string;
  description: string;
  amount: number; // cost القادم من Gemini
  category: string;
  employeeName?: string;
}

export interface ProcessedMonthData {
  month: number;
  year: number;
  monthKey: string; // e.g. "2026-01"
  notes: string;
  invoices: ProcessedInvoiceItem[];
  expenses: ProcessedExpenseItem[];
  totalSalesCost: number;
  totalSalesPrice: number;
  totalSalesProfit: number;
  totalExpensesAmount: number;
}

export interface ProcessedFinancialResult {
  fileName: string;
  rawText: string;
  detectedMonths: number[];
  monthsData: Record<number, ProcessedMonthData>;
  allInvoices: ProcessedInvoiceItem[];
  allExpenses: ProcessedExpenseItem[];
  totalInvoicesCount: number;
  totalExpensesCount: number;
}

export const GEMINI_FINANCIAL_SYSTEM_PROMPT = `أنت مساعد مالي دقيق. استخرج البيانات المالية من هذا النص المأخوذ من ملف Word ليبي. النص يحتوي على فواتير، مصاريف، وملاحظات مقسمة حسب الأشهر.
القواعد الصارمة:
1. تجاهل أي أرقام هوامش ربح أو إجماليات سابقة.
2. استخرج التكلفة الصافية للخدمة، وأزل أي كلمات مثل 'دينار' أو 'دولار'. إذا كان الرقم يحتوي على نقطة (مثل 6.660) فهي تعني آلاف (6660)، حولها إلى رقم صحيح Number. إياك أن تضرب الرقم في أي سعر صرف.
3. قسّم البيانات في JSON بناءً على الأشهر الموجودة في النص (شهر 1، شهر 2.. الخ).
4. ابحث عن أي نصوص حرة واعتبرها 'ملاحظات الشهر'.
5. ابحث عن قسم 'المصاريف' واستخرجه كقائمة منفصلة (item, cost).

يجب أن يكون المخرج حصرياً بصيغة JSON بهذا الشكل بدون أي نصوص تمهيدية أو ختامية:
{
  "months": [
    {
      "month": 1,
      "notes": "نص الملاحظة إن وجد",
      "sales": [{ "client": "اسم", "service": "نوع", "cost": 680 }],
      "expenses": [{ "item": "إيجار المكتب", "cost": 1000 }]
    }
  ]
}`;

/**
 * استخراج النص الخام (Raw Text) من ملف الوورد المرفوع عبر مكتبة mammoth فقط
 * بدون محاولة قراءة الجداول برمجياً
 */
export async function extractRawTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const result = await (mammoth as any).extractRawText({ arrayBuffer });
    const rawVal = (result?.value || '').trim();
    if (rawVal.length > 0) {
      return rawVal;
    }
  } catch (err) {
    console.warn('mammoth.extractRawText fallback:', err);
  }

  // في حال تعذر extractRawText، نلجأ لاستخراج النص بدون جداول عبر convertToHtml
  const htmlRes = await mammoth.convertToHtml({ arrayBuffer });
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlRes.value || '', 'text/html');
  return (doc.body.textContent || '').trim();
}

/**
 * دالة مساعدة لتنظيف الأرقام المالية:
 * تحول 6.660 إلى 6660 وتجرد الدينار والفواصل
 */
export function cleanFinancialNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.round(val);
  }

  let str = String(val).trim();
  if (!str) return 0;

  // تحويل الأرقام المشرقية
  const arabicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  str = str.replace(/[٠-٩۰-۹]/g, d => arabicDigits[d] || d);

  // إزالة الكلمات والنقاط (لتحويل 6.660 إلى 6660)
  str = str.replace(/دينار|د\.ل|د\.ت|ج\.م|ريال|دولار|\$|USD|LYD/gi, '');
  str = str.replace(/[.,،\s\u00A0\u200E\u200F]/g, '');

  const match = str.match(/-?\d+/);
  if (!match) return 0;

  const parsed = parseInt(match[0], 10);
  return isNaN(parsed) ? 0 : Math.abs(parsed);
}

/**
 * تطبيع النصوص
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/**
 * تحديد نوع الخدمة المعتمد في المنظومة
 */
export function mapToServiceType(serviceName: string, clientName: string): ServiceType {
  const combined = normalizeText(`${serviceName} ${clientName}`);

  if (combined.includes('اعلان') || combined.includes('ممول') || combined.includes('سوشيال') || combined.includes('حمله') || combined.includes('فيس') || combined.includes('ad')) {
    return 'إعلانات ممولة';
  }
  if (combined.includes('طباع') || combined.includes('بنر') || combined.includes('فلكس') || combined.includes('ستكر') || combined.includes('بروشور') || combined.includes('كارت') || combined.includes('كروت')) {
    return 'طباعة عامة';
  }
  if (combined.includes('تصميم') || combined.includes('هويه') || combined.includes('شعار') || combined.includes('لوجو') || combined.includes('مونتاج') || combined.includes('اداره الصفحه') || combined.includes('ادارة الصفحه')) {
    return 'تصميم ومونتاج';
  }
  if (combined.includes('كلادنج') || combined.includes('واجه') || combined.includes('واجهات')) {
    return 'واجهات كلادينج';
  }
  if (combined.includes('حروف') || combined.includes('مضيئ') || combined.includes('بارز') || combined.includes('ستانلس') || combined.includes('اكريلك') || combined.includes('نيون')) {
    return 'حروف بارزة ومضيئة';
  }
  if (combined.includes('شاش') || combined.includes('الكتروني') || combined.includes('ليد')) {
    return 'شاشات إلكترونية';
  }
  return 'لوحات إعلانية';
}

/**
 * تحديد تصنيف المصروف التشغيلي
 */
export function mapExpenseCategory(description: string): { category: string; employeeName?: string } {
  const norm = normalizeText(description);

  if (norm.includes('راتب') || norm.includes('رواتب') || norm.includes('مرتب')) {
    const cleanEmp = description.replace(/راتب|مرتب|رواتب/gi, '').trim();
    return {
      category: 'رواتب',
      employeeName: cleanEmp || 'موظف',
    };
  }

  if (norm.includes('ايجار') || norm.includes('إيجار')) {
    return { category: 'إيجار' };
  }

  if (norm.includes('كهرباء') || norm.includes('نت') || norm.includes('انترنت') || norm.includes('صيانه') || norm.includes('صيانة') || norm.includes('ماء') || norm.includes('مياه')) {
    return { category: 'فواتير وصيانة' };
  }

  if (norm.includes('بنزين') || norm.includes('وقود') || norm.includes('نقل') || norm.includes('سياره') || norm.includes('سيارة')) {
    return { category: 'محروقات ونقل' };
  }

  return { category: 'مصروفات تشغيلية' };
}

/**
 * الحصول على مفتاح Gemini API من متغيرات البيئة
 */
export function getGeminiApiKey(): string {
  // 1. فحص VITE_GEMINI_API_KEY
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : null;
  if (metaEnv?.VITE_GEMINI_API_KEY) {
    return metaEnv.VITE_GEMINI_API_KEY;
  }

  // 2. فحص NEXT_PUBLIC_GEMINI_API_KEY
  if (metaEnv?.NEXT_PUBLIC_GEMINI_API_KEY) {
    return metaEnv.NEXT_PUBLIC_GEMINI_API_KEY;
  }

  // 3. فحص process.env
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.VITE_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      ''
    );
  }

  return '';
}

/**
 * إرسال النص الخام إلى Google Gemini API واسترجاع هيكل الـ JSON المالي
 */
export async function sendRawTextToGemini(rawText: string): Promise<GeminiFinancialResponse> {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('النص الخام المستخرج من ملف Word فارغ.');
  }

  let responseJsonText = '';
  let serverErrorMessage = '';

  // 1. المسار الأساسي والآمن: الاستدعاء عبر مسار الخادم الخلفي /api/gemini-extract
  try {
    const proxyRes = await fetch('/api/gemini-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: GEMINI_FINANCIAL_SYSTEM_PROMPT,
        rawText,
      }),
    });

    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      const textCandidate = proxyData?.text || proxyData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textCandidate) {
        responseJsonText = textCandidate;
      }
    } else {
      const errData = await proxyRes.json().catch(() => null);
      if (errData?.error) {
        serverErrorMessage = errData.error;
      }
    }
  } catch (proxyErr: any) {
    console.warn('Proxy call /api/gemini-extract failed, trying fallback:', proxyErr);
    serverErrorMessage = proxyErr?.message || '';
  }

  // 2. مسار احتياطي في حال توفر مفتاح محلي في المتصفح
  const apiKey = getGeminiApiKey();
  if (!responseJsonText && apiKey) {
    try {
      const fullPrompt = `${GEMINI_FINANCIAL_SYSTEM_PROMPT}\n\nنص ملف Word المطلوب معالجته:\n"""\n${rawText}\n"""`;
      const fetchRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (fetchRes.ok) {
        const data = await fetchRes.json();
        const textCandidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textCandidate) {
          responseJsonText = textCandidate;
        }
      }
    } catch (clientErr: any) {
      console.warn('Direct client fetch fallback failed:', clientErr);
    }
  }

  if (!responseJsonText) {
    throw new Error(
      serverErrorMessage
        ? `خطأ أثناء المعالجة بالذكاء الاصطناعي: ${serverErrorMessage}`
        : 'تعذر الاتصال بـ Google Gemini API. يرجى التأكد من توفر مفتاح GEMINI_API_KEY في إعدادات البيئة.'
    );
  }

  // تنظيف النص المسترجع من أي أوسمة كود markdown
  let cleanedJson = responseJsonText.trim();
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleanedJson) as GeminiFinancialResponse;
    if (!parsed || !Array.isArray(parsed.months)) {
      throw new Error('الرد المستلم من Gemini لا يطابق هيكل الأشهر المطلوب.');
    }
    return parsed;
  } catch (parseErr: any) {
    console.error('Failed parsing Gemini JSON:', cleanedJson);
    throw new Error('فشل تحليل صيغة JSON المسترجعة من الذكاء الاصطناعي: ' + parseErr.message);
  }
}

/**
 * معالجة بيانات الـ JSON المسترجعة من Gemini وحساب total و profit وفق معادلات المنظومة الحالية
 * 
 * معادلات المنظومة الحالية:
 * - التكلفة الصافية = cost
 * - نسبة هامش الربح = profitMarginPercent (افتراضياً 32%)
 * - إجمالي الفاتورة المحتسب (total / price) = cost / (1 - (marginPercent / 100))
 * - صافي الربح المحتسب (profit / expectedProfit) = total - cost
 * - ترتبط الفاتورة والمصروف والملاحظة برقم الشهر (month) القادم من الـ JSON حصراً
 */
export function processGeminiResponseData(
  geminiData: GeminiFinancialResponse,
  fileName: string,
  rawText: string,
  baseYear: number = new Date().getFullYear(),
  defaultProfitMarginPercent: number = 32
): ProcessedFinancialResult {
  const monthsData: Record<number, ProcessedMonthData> = {};
  const allInvoices: ProcessedInvoiceItem[] = [];
  const allExpenses: ProcessedExpenseItem[] = [];
  const detectedMonthsSet = new Set<number>();

  const marginRatio = Math.max(0.01, Math.min(0.9, defaultProfitMarginPercent / 100));

  geminiData.months.forEach((mItem) => {
    const mNumber = typeof mItem.month === 'number' ? mItem.month : parseInt(String(mItem.month || 1), 10) || 1;
    detectedMonthsSet.add(mNumber);

    const mKey = `${baseYear}-${String(mNumber).padStart(2, '0')}`;
    const dateIso = `${baseYear}-${String(mNumber).padStart(2, '0')}-15T12:00:00.000Z`;

    const monthInvoices: ProcessedInvoiceItem[] = [];
    const monthExpenses: ProcessedExpenseItem[] = [];

    // 1. معالجة الفواتير (sales)
    (mItem.sales || []).forEach((sale, sIdx) => {
      const clientName = (sale.client || '').trim();
      const rawService = (sale.service || '').trim();
      const netCost = cleanFinancialNumber(sale.cost);

      if (!clientName && netCost <= 0) return;

      // تطبيق معادلات المنظومة لتوليد total و profit
      // price = netCost / (1 - marginRatio)
      const calculatedPrice = netCost > 0 ? Math.round(netCost / (1 - marginRatio)) : 0;
      const profitMargin = Math.max(0, calculatedPrice - netCost);
      const profitPercent = calculatedPrice > 0 ? Math.round((profitMargin / calculatedPrice) * 100) : 0;
      const serviceType = mapToServiceType(rawService, clientName);

      const invoiceItem: ProcessedInvoiceItem = {
        id: `inv-ai-${mNumber}-${sIdx + 1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        month: mNumber,
        year: baseYear,
        date: dateIso,
        clientName: clientName || 'عميل مسار',
        serviceType,
        rawServiceDesc: rawService || serviceType,
        netCost,
        calculatedPrice,
        profitMargin,
        profitPercent,
        notes: '',
      };

      monthInvoices.push(invoiceItem);
      allInvoices.push(invoiceItem);
    });

    // 2. معالجة المصروفات التشغيلية (expenses)
    (mItem.expenses || []).forEach((exp, eIdx) => {
      const description = (exp.item || '').trim();
      const amount = cleanFinancialNumber(exp.cost);

      if (!description && amount <= 0) return;

      const { category, employeeName } = mapExpenseCategory(description);

      const expenseItem: ProcessedExpenseItem = {
        id: `exp-ai-${mNumber}-${eIdx + 1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        month: mNumber,
        year: baseYear,
        date: dateIso,
        description: description || 'مصروف تشغيلي',
        amount,
        category,
        employeeName,
      };

      monthExpenses.push(expenseItem);
      allExpenses.push(expenseItem);
    });

    const totalSalesCost = monthInvoices.reduce((sum, inv) => sum + inv.netCost, 0);
    const totalSalesPrice = monthInvoices.reduce((sum, inv) => sum + inv.calculatedPrice, 0);
    const totalSalesProfit = monthInvoices.reduce((sum, inv) => sum + inv.profitMargin, 0);
    const totalExpensesAmount = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    monthsData[mNumber] = {
      month: mNumber,
      year: baseYear,
      monthKey: mKey,
      notes: (mItem.notes || '').trim(),
      invoices: monthInvoices,
      expenses: monthExpenses,
      totalSalesCost,
      totalSalesPrice,
      totalSalesProfit,
      totalExpensesAmount,
    };
  });

  const detectedMonths = Array.from(detectedMonthsSet).sort((a, b) => a - b);
  if (detectedMonths.length === 0) {
    detectedMonths.push(1);
  }

  return {
    fileName,
    rawText,
    detectedMonths,
    monthsData,
    allInvoices,
    allExpenses,
    totalInvoicesCount: allInvoices.length,
    totalExpensesCount: allExpenses.length,
  };
}
