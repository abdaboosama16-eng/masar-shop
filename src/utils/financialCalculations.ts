import { Order } from '../types';

/**
 * دالة مركزية لحساب مجموع تكاليف بنود التفاصيل لأي فاتورة / طلبية بدقة تامة
 * بنود التفاصيل تشمل: المصمم، الطباعة، التكاليف الخارجية، المواد، وأي بنود مخصصة من القالب
 * تضمن استخدام Number() أو parseFloat() لجميع القيم لمنع أي أخطاء دمج نصوص
 */
export function getOrderTotalDetailCosts(order: Partial<Order> | null | undefined): number {
  if (!order) return 0;

  // 1. فحص كائن تفصيل التكاليف الديناميكي costBreakdown
  if (order.costBreakdown && typeof order.costBreakdown === 'object') {
    const values = Object.values(order.costBreakdown);
    let bSum = 0;
    let hasValues = false;
    for (const val of values) {
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      if (!isNaN(num) && num > 0) {
        bSum = Number((bSum + num).toFixed(2));
        hasValues = true;
      }
    }
    if (hasValues && bSum > 0) {
      return Number(bSum.toFixed(2));
    }
  }

  // 2. إذا لم تتوفر قيم في costBreakdown، نفحص costDetails
  if (order.costDetails && typeof order.costDetails === 'object') {
    let dSum = 0;
    let hasDetails = false;
    for (const val of Object.values(order.costDetails)) {
      if (typeof val === 'object' && val !== null) {
        const num = typeof val.amount === 'number' ? val.amount : parseFloat(String(val.amount || 0));
        if (!isNaN(num) && num > 0) {
          dSum = Number((dSum + num).toFixed(2));
          hasDetails = true;
        }
      } else {
        const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
        if (!isNaN(num) && num > 0) {
          dSum = Number((dSum + num).toFixed(2));
          hasDetails = true;
        }
      }
    }
    if (hasDetails && dSum > 0) {
      return Number(dSum.toFixed(2));
    }
  }

  // 3. بنود التكلفة المباشرة (التصميم، الطباعة، الخارجية، المواد، إلخ)
  const design = typeof order.designCost === 'number' ? order.designCost : (parseFloat(String(order.designCost || 0)) || 0);
  const printing = typeof order.printingCost === 'number' ? order.printingCost : (parseFloat(String(order.printingCost || 0)) || 0);
  const external = typeof order.externalCost === 'number' ? order.externalCost : (parseFloat(String(order.externalCost || 0)) || 0);
  const material = typeof order.materialCost === 'number' ? order.materialCost : (parseFloat(String(order.materialCost || 0)) || 0);
  const commission = typeof order.commissionCost === 'number' ? order.commissionCost : (parseFloat(String(order.commissionCost || 0)) || 0);
  const other = typeof order.otherCosts === 'number' ? order.otherCosts : (parseFloat(String(order.otherCosts || 0)) || 0);

  const explicitSum = Number((design + printing + external + material + commission + other).toFixed(2));
  if (explicitSum > 0) {
    return explicitSum;
  }

  // 4. التكلفة المباشرة الإجمالية cost
  const directCost = typeof order.cost === 'number' ? order.cost : (parseFloat(String(order.cost || 0)) || 0);
  return Number((directCost > 0 ? directCost : 0).toFixed(2));
}

/**
 * دالة حساب صافي الربح الدقيق لكل فاتورة وفق المعادلة المعتمدة حصراً:
 * هامش الربح = إجمالي الفاتورة - مجموع تكاليف بنود التفاصيل (المصمم، الطباعة، إلخ)
 */
export function getOrderNetProfit(order: Partial<Order> | null | undefined): number {
  if (!order) return 0;
  
  const price = typeof order.price === 'number' ? order.price : (parseFloat(String(order.price || 0)) || 0);
  const totalDetailCosts = getOrderTotalDetailCosts(order);
  
  // هامش الربح = إجمالي الفاتورة - مجموع تكاليف بنود التفاصيل
  const netProfit = Number((price - totalDetailCosts).toFixed(2));
  return netProfit;
}

/**
 * دالة احتساب المؤشرات المالية الموحدة للشهر:
 * 1. إجمالي الفواتير
 * 2. إجمالي تكاليف البنود المباشرة
 * 3. هامش الربح = إجمالي الفواتير - إجمالي التكاليف المباشرة
 * 4. إجمالي المصاريف التشغيلية
 * 5. صافي الربح الفعلي = هامش الربح - المصاريف التشغيلية
 */
export function calculateMonthlyFinancials(orders: Partial<Order>[], monthlyExpensesAmount: number = 0) {
  let totalInvoices = 0;
  let totalCosts = 0;
  let totalProfitMargin = 0;

  for (const order of orders) {
    if (!order) continue;
    const price = typeof order.price === 'number' ? order.price : (parseFloat(String(order.price || 0)) || 0);
    const cost = getOrderTotalDetailCosts(order);
    const profit = Number((price - cost).toFixed(2));

    totalInvoices = Number((totalInvoices + price).toFixed(2));
    totalCosts = Number((totalCosts + cost).toFixed(2));
    totalProfitMargin = Number((totalProfitMargin + profit).toFixed(2));
  }

  const cleanExpenses = Number((monthlyExpensesAmount || 0).toFixed(2));
  const actualNetProfit = Number((totalProfitMargin - cleanExpenses).toFixed(2));

  return {
    totalInvoices,
    totalCosts,
    totalProfitMargin,
    totalExpenses: cleanExpenses,
    actualNetProfit,
  };
}

/**
 * تنسيق الأرقام مع فواصل الآلاف
 */
export function formatMoney(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : (parseFloat(String(amount || 0)) || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * التحقق الصارم مما إذا كانت الخدمة "إعلانات ممولة" (أو إعلانات):
 * القاعدة الحتمية: فقط "إعلانات ممولة" (أو إعلانات رقمية ممولة) هي التي تتبع حسابات الدولار وسعر الصرف.
 * جميع الخدمات الأخرى (إدارة صفحة، لافتات إعلانية، طباعة، تصميم، بنر، فلكس، تركيب، برمجة، إلخ)
 * تُعامل بالدينار الليبي فقط وتتجاهل حقل سعر الصرف تماماً.
 */
export function isSponsoredAds(serviceName?: string | null): boolean {
  if (!serviceName) return false;
  const s = serviceName.trim().toLowerCase();

  // استبعاد صريح وقاطع للخدمات المحلية واللافتات والطباعة وإدارة الصفحات
  if (
    s.includes('لافت') || 
    s.includes('لوح') || 
    s.includes('طباع') || 
    s.includes('صفح') || 
    s.includes('تصميم') || 
    s.includes('بنر') || 
    s.includes('فلكس') ||
    s.includes('كروت') ||
    s.includes('هوية') ||
    s.includes('بروشور') ||
    s.includes('فولدر') ||
    s.includes('بوستر') ||
    s.includes('ستيكر') ||
    s.includes('تركيب') ||
    s.includes('قص') ||
    s.includes('موقع') ||
    s.includes('برمج') ||
    s.includes('استضاف') ||
    s.includes('أخرى')
  ) {
    return false;
  }

  // مطابقة صريحة لخدمة الإعلانات الممولة
  return (
    s === 'إعلانات ممولة' ||
    s === 'إعلانات' ||
    s === 'إعلان ممول' ||
    s === 'حملة إعلانية ممولة' ||
    s.includes('ممول') ||
    s === 'sponsored ads' ||
    s === 'sponsored' ||
    s === 'ads' ||
    s === 'ad'
  );
}

/**
 * دالة حساب إجمالي الفاتورة وقاعدة التحويل بالدولار الصارمة:
 * - القاعدة الحتمية: يجب أن يكون الإجمالي هو التكلفة بالدينار الليبي فقط.
 * - يُمنع منعاً باتاً ضرب التكلفة في سعر الصرف (الدولار) إلا إذا كان serviceType === 'إعلانات ممولة'.
 * - أي خدمة أخرى تتجاهل حقل سعر الصرف تماماً وتعتمد التكلفة بالدينار الليبي حصراً.
 * - هامش الربح = إجمالي الفاتورة المعتمد - مجموع التكاليف
 */
export function calculateOrderFinancials(params: {
  serviceType?: string | null;
  rawPrice?: number | string | null;
  rawCost?: number | string | null;
  adBudgetUsd?: number | string | null;
  usdExchangeRate?: number | null;
  profitMarginPercent?: number | null;
}): {
  price: number;
  cost: number;
  profit: number;
  isDollarConverted: boolean;
} {
  const isAd = isSponsoredAds(params.serviceType);
  const parsedPrice = typeof params.rawPrice === 'number' 
    ? params.rawPrice 
    : (parseFloat(String(params.rawPrice || 0)) || 0);

  let parsedCost = typeof params.rawCost === 'number' 
    ? params.rawCost 
    : (parseFloat(String(params.rawCost || 0)) || 0);

  let isDollarConverted = false;

  // فقط إذا كانت الخدمة تحديداً "إعلانات ممولة" وهناك ميزانية بالدولار وسعر صرف صالح يتم تطبيق التحويل
  if (isAd) {
    const rate = Number(params.usdExchangeRate) || 0;
    const numUsd = typeof params.adBudgetUsd === 'number' 
      ? params.adBudgetUsd 
      : (parseFloat(String(params.adBudgetUsd || 0)) || 0);

    if (numUsd > 0 && rate > 0) {
      parsedCost = Math.round(numUsd * rate);
      isDollarConverted = true;
    }
  }

  // أي خدمة أخرى: تتجاهل حقل سعر الصرف تماماً وتبقى بالدينار الليبي
  let finalPrice = parsedPrice;
  if (finalPrice <= 0 && parsedCost > 0) {
    const margin = typeof params.profitMarginPercent === 'number' ? params.profitMarginPercent : 32;
    const marginRatio = Math.max(0.01, Math.min(0.9, margin / 100));
    finalPrice = Math.round(parsedCost / (1 - marginRatio));
  }

  // هامش الربح = إجمالي الفاتورة - التكلفة المعتمدة
  const profit = Number((finalPrice - parsedCost).toFixed(2));

  return {
    price: finalPrice,
    cost: parsedCost,
    profit,
    isDollarConverted,
  };
}

