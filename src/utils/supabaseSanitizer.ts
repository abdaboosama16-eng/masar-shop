import { Order, Expense, Employee, InventoryItem } from '../types';

/**
 * تنظيف وتحضير كائن الفاتورة (Order) قبل إرساله إلى Supabase
 * يضمن:
 * 1. وجود كافة الأعمدة المطلوبة والمحدثة (isPinned, isUnderReview, costBreakdown, costExecutors, assignedEmployee, إلخ)
 * 2. عدم وجود أي قيمة undefined نهائياً لمنع رفض السحابة لعمليات الإدراج
 * 3. تحويل الكائنات والمصفوفات إلى تنسيق JSON متوافق مع أعمدة JSONB في PostgreSQL
 */
export function sanitizeOrderPayload(order: Partial<Order> | any): Record<string, any> {
  if (!order || typeof order !== 'object') return {};

  const cleanCostBreakdown = order.costBreakdown && typeof order.costBreakdown === 'object' 
    ? order.costBreakdown 
    : {};

  const cleanCostExecutors = order.costExecutors && typeof order.costExecutors === 'object' 
    ? order.costExecutors 
    : {};

  const cleanCostDetails = order.costDetails && typeof order.costDetails === 'object' 
    ? order.costDetails 
    : {};

  let cleanInvoiceDetails: any[] = [];
  if (Array.isArray(order.invoiceDetails)) {
    cleanInvoiceDetails = order.invoiceDetails.filter((item: any) => item !== undefined && item !== null);
  } else if (typeof order.invoiceDetails === 'string' && order.invoiceDetails.trim()) {
    cleanInvoiceDetails = order.invoiceDetails.split(/[\n•,]+/).map((s: string) => s.trim()).filter(Boolean);
  }

  const payload: Record<string, any> = {
    id: String(order.id || `ord-${Date.now()}`),
    serialNumber: order.serialNumber ? String(order.serialNumber) : String(order.id || ''),
    serviceType: order.serviceType ? String(order.serviceType) : 'لافتة إعلانية',
    clientName: order.clientName ? String(order.clientName).trim() : 'عميل نقدي',
    clientId: order.clientId ?? null,
    description: order.description ? String(order.description).trim() : (order.serviceType ? String(order.serviceType) : 'طلب جديد'),
    price: Number(order.price) || 0,
    cost: Number(order.cost) || 0,
    expectedProfit: Number(order.expectedProfit) || 0,
    designCost: Number(order.designCost) || 0,
    designerName: order.designerName ? String(order.designerName).trim() : null,
    materialCost: Number(order.materialCost) || 0,
    printingCost: Number(order.printingCost) || 0,
    printerName: order.printerName ? String(order.printerName).trim() : null,
    externalCost: Number(order.externalCost) || 0,
    externalExecutor: order.externalExecutor ? String(order.externalExecutor).trim() : null,
    commissionCost: Number(order.commissionCost) || 0,
    otherCosts: Number(order.otherCosts) || 0,
    assignedEmployee: order.assignedEmployee ? String(order.assignedEmployee).trim() : 'إدارة الورشة',
    status: order.status || 'بانتظار اعتماد التصميم',
    paymentMethod: order.paymentMethod || 'نقدي',
    date: order.date || new Date().toISOString(),
    deposit: Number(order.deposit) || 0,
    remaining: Number(order.remaining) || 0,
    isPaid: Boolean(order.isPaid),
    paidAt: order.paidAt ? String(order.paidAt) : null,
    isPinned: Boolean(order.isPinned),
    isUnderReview: Boolean(order.isUnderReview),
    costCenter: order.costCenter ? String(order.costCenter).trim() : null,
    costBreakdown: cleanCostBreakdown,
    costExecutors: cleanCostExecutors,
    costDetails: cleanCostDetails,
    costBreakdownSummary: order.costBreakdownSummary ? String(order.costBreakdownSummary).trim() : null,
    invoiceDetails: cleanInvoiceDetails,
    installationAddress: order.installationAddress ? String(order.installationAddress).trim() : null,
    craneCost: Number(order.craneCost) || 0,
    adBudgetUsd: Number(order.adBudgetUsd) || 0,
    adExchangeRate: Number(order.adExchangeRate) || 0,
    dimensions: order.dimensions && typeof order.dimensions === 'object' ? order.dimensions : null,
    targetDeliveryDate: order.targetDeliveryDate ? String(order.targetDeliveryDate) : null,
    usedMaterials: Array.isArray(order.usedMaterials) ? order.usedMaterials : [],
    attachments: Array.isArray(order.attachments) ? order.attachments : [],
    auditLog: Array.isArray(order.auditLog) ? order.auditLog : [],
    notes: order.notes ? String(order.notes).trim() : null,
    pendingSync: false,
    commissions: Array.isArray(order.commissions) ? order.commissions : [],
  };

  // إزالة أي مفتاح غير معرف تماماً (Strictly strip any undefined keys)
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  return payload;
}

/**
 * تنظيف وتحضير كائن المصروف (Expense) قبل إرساله إلى Supabase
 */
export function sanitizeExpensePayload(expense: Partial<Expense> | any): Record<string, any> {
  if (!expense || typeof expense !== 'object') return {};

  const payload: Record<string, any> = {
    id: String(expense.id || `exp-${Date.now()}`),
    type: expense.type ? String(expense.type) : 'مصروف',
    description: expense.description ? String(expense.description).trim() : 'مصروف عام',
    amount: Number(expense.amount) || 0,
    category: expense.category ? String(expense.category).trim() : 'تشغيلي',
    date: expense.date || new Date().toISOString(),
    paymentMethod: expense.paymentMethod || 'نقدي',
    employeeId: expense.employeeId ? String(expense.employeeId) : null,
    referenceNumber: expense.referenceNumber ? String(expense.referenceNumber) : null,
    notes: expense.notes ? String(expense.notes).trim() : null,
    isPinned: Boolean(expense.isPinned),
    attachments: Array.isArray(expense.attachments) ? expense.attachments : [],
    pendingSync: false,
    commissions: Array.isArray(expense.commissions) ? expense.commissions : [],
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  return payload;
}

/**
 * تنظيف وتحضير كائن الموظف (Employee) قبل إرساله إلى Supabase
 */
export function sanitizeEmployeePayload(employee: Partial<Employee> | any): Record<string, any> {
  if (!employee || typeof employee !== 'object') return {};

  const payload: Record<string, any> = {
    id: String(employee.id || `emp-${Date.now()}`),
    name: employee.name ? String(employee.name).trim() : 'موظف جديد',
    role: employee.role ? String(employee.role).trim() : 'فني تنفيذ',
    salary: Number(employee.salary) || 0,
    pinCode: employee.pinCode ? String(employee.pinCode) : null,
    phone: employee.phone ? String(employee.phone).trim() : null,
    nationalId: employee.nationalId ? String(employee.nationalId).trim() : null,
    joinedDate: employee.joinedDate ? String(employee.joinedDate) : null,
    emergencyContact: employee.emergencyContact ? String(employee.emergencyContact).trim() : null,
    status: employee.status || 'نشط',
    pendingSync: false,
    commissions: Array.isArray(employee.commissions) ? employee.commissions : [],
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  return payload;
}

/**
 * تنظيف وتحضير كائن المخزون (InventoryItem) قبل إرساله إلى Supabase
 */
export function sanitizeInventoryPayload(item: Partial<InventoryItem> | any): Record<string, any> {
  if (!item || typeof item !== 'object') return {};

  const payload: Record<string, any> = {
    id: String(item.id || `inv-${Date.now()}`),
    name: item.name ? String(item.name).trim() : 'مادة جديدة',
    category: item.category ? String(item.category).trim() : 'مواد خام',
    quantity: Number(item.quantity) || 0,
    minQuantity: Number(item.minQuantity) || 0,
    unit: item.unit ? String(item.unit) : 'قطعة',
    unitPrice: Number(item.unitPrice) || 0,
    costPrice: Number(item.costPrice) || 0,
    supplier: item.supplier ? String(item.supplier).trim() : null,
    location: item.location ? String(item.location).trim() : null,
    notes: item.notes ? String(item.notes).trim() : null,
    pendingSync: false,
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  return payload;
}

/**
 * دالة مركزية موحدة لتنظيف أي كائن حسب اسم الجدول
 */
export function sanitizePayloadForTable(table: string, payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object') return {};

  switch (table) {
    case 'orders':
    case 'sales':
      return sanitizeOrderPayload(payload);
    case 'expenses':
      return sanitizeExpensePayload(payload);
    case 'employees':
      return sanitizeEmployeePayload(payload);
    case 'inventory':
      return sanitizeInventoryPayload(payload);
    default: {
      // تنظيف عام لأي جدول آخر (مثل monthly_notes, exchange_rates)
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) {
          clean[k] = v;
        } else {
          clean[k] = null;
        }
      }
      return clean;
    }
  }
}
