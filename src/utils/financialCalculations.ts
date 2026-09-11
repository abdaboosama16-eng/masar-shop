import { Order } from '../types';

/**
 * دالة مركزية لحساب مجموع تكاليف بنود التفاصيل لأي فاتورة / طلبية بدقة تامة
 * بنود التفاصيل تشمل: المصمم، الطباعة، التكاليف الخارجية، المواد، وأي بنود مخصصة من القالب
 * تضمن استخدام Number() أو parseFloat() لجميع القيم لمنع أي أخطاء دمج نصوص
 */
export function getOrderTotalDetailCosts(order: Partial<Order> | null | undefined): number {
  if (!order) return 0;

  let detailsSum = 0;
  let hasFoundDetails = false;

  // 1. فحص كائن تفصيل التكاليف الديناميكي costBreakdown
  if (order.costBreakdown && typeof order.costBreakdown === 'object') {
    const values = Object.values(order.costBreakdown);
    if (values.length > 0) {
      let bSum = 0;
      for (const val of values) {
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        if (!isNaN(num) && num > 0) {
          bSum = Number((bSum + num).toFixed(2));
          hasFoundDetails = true;
        }
      }
      if (hasFoundDetails && bSum > 0) {
        detailsSum = bSum;
      }
    }
  }

  // 2. إذا لم تتوفر قيم في costBreakdown، نفحص costDetails
  if (!hasFoundDetails && order.costDetails && typeof order.costDetails === 'object') {
    let dSum = 0;
    for (const val of Object.values(order.costDetails)) {
      if (typeof val === 'object' && val !== null) {
        const num = typeof val.amount === 'number' ? val.amount : parseFloat(String(val.amount || 0));
        if (!isNaN(num) && num > 0) {
          dSum = Number((dSum + num).toFixed(2));
          hasFoundDetails = true;
        }
      } else {
        const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
        if (!isNaN(num) && num > 0) {
          dSum = Number((dSum + num).toFixed(2));
          hasFoundDetails = true;
        }
      }
    }
    if (hasFoundDetails && dSum > 0) {
      detailsSum = dSum;
    }
  }

  // 3. إذا لم تتوفر قيم ديناميكية، نفحص حقول التكلفة المباشرة (التصميم، الطباعة، الخارجية، المواد، إلخ)
  if (!hasFoundDetails) {
    const design = typeof order.designCost === 'number' ? order.designCost : (parseFloat(String(order.designCost || 0)) || 0);
    const printing = typeof order.printingCost === 'number' ? order.printingCost : (parseFloat(String(order.printingCost || 0)) || 0);
    const external = typeof order.externalCost === 'number' ? order.externalCost : (parseFloat(String(order.externalCost || 0)) || 0);
    const material = typeof order.materialCost === 'number' ? order.materialCost : (parseFloat(String(order.materialCost || 0)) || 0);
    const commission = typeof order.commissionCost === 'number' ? order.commissionCost : (parseFloat(String(order.commissionCost || 0)) || 0);
    const other = typeof order.otherCosts === 'number' ? order.otherCosts : (parseFloat(String(order.otherCosts || 0)) || 0);

    const explicitSum = Number((design + printing + external + material + commission + other).toFixed(2));
    if (explicitSum > 0) {
      detailsSum = explicitSum;
      hasFoundDetails = true;
    }
  }

  // 4. إذا لم توجد بنود تفصيلية على الإطلاق، نأخذ التكلفة الإجمالية المباشرة cost
  if (!hasFoundDetails) {
    const directCost = typeof order.cost === 'number' ? order.cost : (parseFloat(String(order.cost || 0)) || 0);
    detailsSum = directCost > 0 ? directCost : 0;
  }

  return Number(detailsSum.toFixed(2));
}

/**
 * دالة حساب صافي الربح الدقيق لكل فاتورة وفق المعادلة المعتمدة حصراً:
 * صافي الربح = إجمالي الفاتورة - مجموع تكاليف بنود التفاصيل (المصمم، الطباعة، إلخ)
 */
export function getOrderNetProfit(order: Partial<Order> | null | undefined): number {
  if (!order) return 0;
  
  const price = typeof order.price === 'number' ? order.price : (parseFloat(String(order.price || 0)) || 0);
  const totalDetailCosts = getOrderTotalDetailCosts(order);
  
  // صافي الربح = إجمالي الفاتورة - مجموع تكاليف بنود التفاصيل
  const netProfit = Number((price - totalDetailCosts).toFixed(2));
  return netProfit;
}

/**
 * تنسيق الأرقام مع فواصل الآلاف
 */
export function formatMoney(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : (parseFloat(String(amount || 0)) || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * التحقق مما إذا كانت الخدمة إعلانات ممولة / حملات إعلانية
 */
export function isSponsoredAds(serviceName?: string | null): boolean {
  if (!serviceName) return false;
  const s = serviceName.toLowerCase().trim();
  return s.includes('إعلان') || s.includes('ممول') || s.includes('ad') || s.includes('campaign');
}
