import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, ServiceType, DynamicServiceConfig } from '../types';
import { 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  Calendar, 
  ChevronDown,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  GripVertical,
  Copy,
  Pin,
  Layers,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Receipt,
  FileText
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppContext, defaultServicesConfig } from '../context/AppContext';
import CostItemsPopover from './CostItemsPopover';
import { getOrderTotalDetailCosts, getOrderNetProfit } from '../utils/financialCalculations';

interface MonthlySalesGridProps {
  orders: Order[];
  currency: string;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void;
  onDeleteOrder?: (orderId: string) => void;
  onReorderOrders?: (newOrders: Order[]) => void;
  onPrintOrder?: (order: Order) => void;
  onShareWhatsApp?: (order: Order) => void;
  onViewDesign?: (order: Order) => void;
  onViewOrderDetails?: (order: Order) => void;
  onTogglePaid?: (orderId: string) => void;
  onTogglePinned?: (orderId: string) => void;
  onDuplicateOrder?: (order: Order) => void;
  isAddingRow?: boolean;
  setIsAddingRow?: (val: boolean) => void;
}

interface NormalizedInvoiceBadge {
  item: string;
  value?: string | number;
}

const getNormalizedInvoiceBadges = (details?: any): NormalizedInvoiceBadge[] => {
  if (!details) return [];
  if (Array.isArray(details)) {
    return details.map((d: any) => {
      if (typeof d === 'string') {
        if (d.includes(':')) {
          const parts = d.split(':');
          return { item: parts[0].trim(), value: parts.slice(1).join(':').trim() };
        }
        return { item: d.trim() };
      }
      if (d && typeof d === 'object') {
        return { item: String(d.item || '').trim(), value: d.value };
      }
      return { item: String(d).trim() };
    }).filter(d => Boolean(d.item));
  }
  if (typeof details === 'string') {
    const trimmed = details.trim();
    if (!trimmed) return [];
    const lines = trimmed.split(/[\n•]+/).map(s => s.trim()).filter(Boolean);
    return lines.map(line => {
      if (line.includes(':')) {
        const parts = line.split(':');
        return { item: parts[0].trim(), value: parts.slice(1).join(':').trim() };
      }
      return { item: line };
    });
  }
  return [];
};

// استخراج بنود تفاصيل الفاتورة كمصفوفة نصوص نظيفة لعرضها في الجدول
const getOrderInvoiceDetailsList = (order: Order): string[] => {
  const list: string[] = [];

  // 1. تفاصيل الفاتورة المسجلة كـ مصفوفة أو نصوص
  if (Array.isArray(order.invoiceDetails) && order.invoiceDetails.length > 0) {
    order.invoiceDetails.forEach((d) => {
      if (typeof d === 'string' && d.trim()) {
        list.push(d.trim());
      } else if (d && typeof d === 'object') {
        const item = (d as any).item || '';
        const val = (d as any).value !== undefined ? (d as any).value : '';
        if (item && val !== '') list.push(`${item}: ${val}`);
        else if (item) list.push(String(item));
      }
    });
  } else if (typeof order.invoiceDetails === 'string' && order.invoiceDetails.trim()) {
    const parts = order.invoiceDetails.split(/[\n•,]+/).map(s => s.trim()).filter(Boolean);
    list.push(...parts);
  }

  // 2. إذا لم تكن هناك بنود، نتحقق من تفصيل التكاليف (costBreakdown)
  if (list.length === 0 && order.costBreakdown && Object.keys(order.costBreakdown).length > 0) {
    Object.entries(order.costBreakdown).forEach(([key, val]) => {
      if (val !== undefined && val !== null && Number(val) > 0) {
        const executor = order.costExecutors?.[key] ? ` (${order.costExecutors[key]})` : '';
        list.push(`${key}: ${val}${executor}`);
      }
    });
  }

  // 3. إذا لم تكن هناك بنود، نتحقق من حقول التكلفة المفردة
  if (list.length === 0) {
    if (order.designCost && order.designCost > 0) {
      list.push(`تكلفة التصميم: ${order.designCost}${order.designerName ? ` (${order.designerName})` : ''}`);
    }
    if (order.printingCost && order.printingCost > 0) {
      list.push(`تكلفة الطباعة: ${order.printingCost}${order.printerName ? ` (${order.printerName})` : ''}`);
    }
    if (order.externalCost && order.externalCost > 0) {
      list.push(`تكلفة خارجية: ${order.externalCost}${order.externalExecutor ? ` (${order.externalExecutor})` : ''}`);
    }
    if (order.materialCost && order.materialCost > 0) {
      list.push(`مواد خام: ${order.materialCost}`);
    }
  }

  return list.filter(item => item !== 'طلب جديد' && item !== order.serviceType);
};

// دالة التحقق من صف الإجماليات والمجاميع (مجموع القيم المحسوبة / إجمالي الشهر) لتمييزه عن صفوف الفواتير الحقيقية
const isSummaryOrTotalRow = (row: any): boolean => {
  if (!row) return false;
  if (row.isTotal || row.isSummary) return true;
  const idStr = String(row.id || '').toLowerCase().trim();
  if (idStr === 'total' || idStr === 'totals' || idStr === 'summary' || idStr === 'footer-total') return true;

  const clientName = String(row.clientName || '').trim();
  const serviceType = String(row.serviceType || '').trim();
  const description = String(row.description || '').trim();
  const notes = String(row.notes || '').trim();

  if (
    clientName.includes('مجموع القيم المحسوبة') ||
    clientName.includes('إجمالي الشهر') ||
    clientName.includes('مجموع الفواتير') ||
    clientName === 'المجموع' ||
    clientName === 'الإجمالي' ||
    clientName === 'مجموع' ||
    clientName === 'إجمالي'
  ) {
    return true;
  }

  if (
    serviceType.includes('مجموع القيم المحسوبة') ||
    serviceType.includes('إجمالي الشهر') ||
    serviceType === 'المجموع' ||
    serviceType === 'الإجمالي'
  ) {
    return true;
  }

  if (
    description.includes('مجموع القيم المحسوبة') ||
    description.includes('إجمالي الشهر') ||
    notes.includes('مجموع القيم المحسوبة')
  ) {
    return true;
  }

  return false;
};

export default function MonthlySalesGrid({
  orders,
  currency,
  onUpdateStatus,
  onUpdateOrder,
  onPrintOrder,
  onShareWhatsApp,
  onViewDesign,
  onViewOrderDetails,
  onTogglePaid,
  onTogglePinned,
  onDuplicateOrder,
  onDeleteOrder,
  onReorderOrders,
  isAddingRow: propIsAddingRow,
  setIsAddingRow: propSetIsAddingRow,
}: MonthlySalesGridProps) {
  const { 
    updateOrder: contextUpdateOrder, 
    addOrder, 
    deleteOrder,
    setOrders,
    reorderOrders: contextReorderOrders,
    toggleOrderPinned: contextToggleOrderPinned,
    getNextSerialNumber, 
    settings, 
    employees,
    expenses
  } = useAppContext();

  // إدارة حالة الفواتير (Invoices State) لضمان الاستجابة اللحظية والتحديث المباشر واستبعاد أي صف إجماليات
  const [invoices, setInvoicesState] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('masar_invoices') || localStorage.getItem('masar_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((inv: any) => !isSummaryOrTotalRow(inv))
            .map((inv: any, idx: number) => ({
              ...inv,
              id: inv.id !== undefined && inv.id !== null ? String(inv.id) : (inv.serialNumber ? String(inv.serialNumber) : `inv-${idx}`)
            }));
        }
      }
    } catch (e) {
      console.error('Failed to read invoices from localStorage:', e);
    }
    return (orders || [])
      .filter((inv: any) => !isSummaryOrTotalRow(inv))
      .map((inv: any, idx: number) => ({
        ...inv,
        id: inv.id !== undefined && inv.id !== null ? String(inv.id) : (inv.serialNumber ? String(inv.serialNumber) : `inv-${idx}`)
      }));
  });

  // مزامنة حالة الفواتير عند تحديث orders من المصدر الخارجي
  useEffect(() => {
    if (orders) {
      setInvoicesState(
        orders
          .filter((inv: any) => !isSummaryOrTotalRow(inv))
          .map((inv: any, idx: number) => ({
            ...inv,
            id: inv.id !== undefined && inv.id !== null ? String(inv.id) : (inv.serialNumber ? String(inv.serialNumber) : `inv-${idx}`)
          }))
      );
    }
  }, [orders]);

  // دالة تحديث الحالة (State) والـ LocalStorage مباشرة
  const setInvoices = (updated: Order[]) => {
    const normalized = updated.map((inv: any, idx: number) => ({
      ...inv,
      id: inv.id !== undefined && inv.id !== null ? String(inv.id) : (inv.serialNumber ? String(inv.serialNumber) : `inv-${idx}`)
    }));
    setInvoicesState(normalized);
    try {
      localStorage.setItem('masar_invoices', JSON.stringify(normalized));
      localStorage.setItem('masar_orders', JSON.stringify(normalized));
    } catch (err) {
      console.error('Failed to update masar_invoices/masar_orders in localStorage:', err);
    }
    if (setOrders) {
      setOrders(normalized);
    }
  };

  // Local list of deleted order IDs for instantaneous UI filter response
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);

  // Drag and drop state for manually reordering table rows
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverOrderId, setDragOverOrderId] = useState<string | null>(null);

  // Local state for persisted manual order of row IDs
  const [customOrderIds, setCustomOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('masar_sales_grid_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error('Error reading masar_sales_grid_order from localStorage:', err);
    }
    return [];
  });

  // معالجات السحب والإفلات وتحديث الحالة وحفظ الترتيب فوراً
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedOrderId(orderId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetId !== dragOverOrderId) {
      setDragOverOrderId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedOrderId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedOrderId(null);
      setDragOverOrderId(null);
      return;
    }

    // 1. تحديث ترتيب المصفوفة الشاملة للطلبيات
    const allOrdersList = [...orders];
    const fromFullIdx = allOrdersList.findIndex((o) => o.id === sourceId);
    const toFullIdx = allOrdersList.findIndex((o) => o.id === targetId);

    if (fromFullIdx !== -1 && toFullIdx !== -1) {
      const [movedItem] = allOrdersList.splice(fromFullIdx, 1);
      allOrdersList.splice(toFullIdx, 0, movedItem);

      // حفظ الترتيب الجديد فوراً في التخزين المحلي masar_orders
      try {
        localStorage.setItem('masar_orders', JSON.stringify(allOrdersList));
      } catch (err) {
        console.error('Error saving masar_orders to localStorage:', err);
      }

      // تحديث الحالة العامة في Context أو Props
      if (onReorderOrders) {
        onReorderOrders(allOrdersList);
      } else if (contextReorderOrders) {
        contextReorderOrders(allOrdersList);
      }
    }

    // 2. تحديث مصفوفة الترتيب المخصص customOrderIds وحفظها في التخزين المحلي
    const baseIds = customOrderIds.length > 0 ? [...customOrderIds] : orders.map((o) => o.id);
    let updatedIds = [...baseIds];
    const fromIdx = updatedIds.indexOf(sourceId);
    const toIdx = updatedIds.indexOf(targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [movedId] = updatedIds.splice(fromIdx, 1);
      updatedIds.splice(toIdx, 0, movedId);
    } else {
      updatedIds = updatedIds.filter((id) => id !== sourceId);
      const targetPos = updatedIds.indexOf(targetId);
      if (targetPos !== -1) {
        updatedIds.splice(targetPos, 0, sourceId);
      } else {
        updatedIds.unshift(sourceId);
      }
    }

    setCustomOrderIds(updatedIds);
    try {
      localStorage.setItem('masar_sales_grid_order', JSON.stringify(updatedIds));
    } catch (err) {
      console.error('Error saving masar_sales_grid_order to localStorage:', err);
    }

    setDraggedOrderId(null);
    setDragOverOrderId(null);
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
    setDragOverOrderId(null);
  };

  // دالة تشغيل إضافة فاتورة جديدة في أسفل الجدول
  const handleTriggerAddRow = () => {
    setIsAddingRow(true);
    setTimeout(() => {
      const inputEl = document.getElementById('inline-input-client-name');
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // دالة الحذف وتحديث الحالة (State) وحفظ المصفوفة الجديدة في localStorage مباشرة
  const handleDelete = (orderId: string | number) => {
    const idStr = String(orderId);
    // 1. تحديث الحالة المحلية فورياً لإخفاء السطر في نفس اللحظة
    setDeletedRowIds(prev => [...prev, idStr]);

    // 2. تصفية المصفوفة وتحديث الحالة والـ localStorage مباشرة
    const updated = invoices.filter(inv => String(inv.id) !== idStr);
    setInvoices(updated);
    try {
      localStorage.setItem('masar_invoices', JSON.stringify(updated));
      localStorage.setItem('masar_orders', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving masar_invoices to localStorage:', err);
    }

    // تنظيف معرّف الطلبية من الترتيب المخصص في localStorage إن وجد
    const savedOrderIds = localStorage.getItem('masar_monthly_grid_order');
    if (savedOrderIds) {
      try {
        const parsedIds = JSON.parse(savedOrderIds);
        if (Array.isArray(parsedIds)) {
          const updatedIds = parsedIds.filter((id: string) => String(id) !== idStr);
          localStorage.setItem('masar_monthly_grid_order', JSON.stringify(updatedIds));
          setCustomOrderIds(updatedIds);
        }
      } catch {
        // ignore
      }
    }

    // 3. تحديث الحالة العامة للتطبيق
    if (onDeleteOrder) {
      onDeleteOrder(idStr);
    }
    deleteOrder(idStr);
  };
  const handleDeleteRow = handleDelete;

  // ثانياً: دالة نسخ / تكرار الفاتورة (Duplicate Row) وإدراج السطر المنسوخ في أسفل الجدول
  const handleDuplicate = (orderToDuplicate: Order) => {
    if (onDuplicateOrder) {
      onDuplicateOrder(orderToDuplicate);
      return;
    }

    const newSerial = getNextSerialNumber();
    const duplicatedOrder: Omit<Order, 'id'> = {
      ...orderToDuplicate,
      serialNumber: newSerial,
      // الاحتفاظ بتاريخ الشهر المعروض أو تاريخ اليوم
      date: selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), Math.min(new Date().getDate(), 28)).toISOString() : new Date().toISOString(),
      isPaid: false, // يبدأ غير مدفوع كافتراضي للفاتورة الجديدة
      paidAt: undefined,
      pendingSync: true,
    };

    // إضافة الفاتورة المكررة، ودالة addOrder تقوم بإدراجها في أسفل الجدول [...prev, newItem]
    addOrder(duplicatedOrder, newSerial);

    // إذا كان هناك ترتيب مخصص للأعمدة، نضيف المعرف الجديد في نهاية مصفوفة الترتيب المخصص
    if (customOrderIds.length > 0) {
      const updatedCustomOrder = [...customOrderIds, newSerial];
      setCustomOrderIds(updatedCustomOrder);
      try {
        localStorage.setItem('masar_sales_grid_order', JSON.stringify(updatedCustomOrder));
      } catch (err) {
        console.error('Error saving updated masar_sales_grid_order:', err);
      }
    }
  };

  // ثالثاً: دالة تثبيت / فك تثبيت البند (Pin Row) للأشهر القادمة مع الحفظ الفوري في LocalStorage
  const handleTogglePin = (orderId: string) => {
    if (onTogglePinned) {
      onTogglePinned(orderId);
    } else if (contextToggleOrderPinned) {
      contextToggleOrderPinned(orderId);
    } else {
      // Fallback updating via contextUpdateOrder or direct localStorage
      const target = orders.find(o => o.id === orderId);
      if (target) {
        const nextPinned = !Boolean(target.isPinned);
        if (contextUpdateOrder) {
          contextUpdateOrder(orderId, { isPinned: nextPinned });
        }
      }
    }
  };

  // رابعاً: دالة تمييز / إلغاء تمييز الفاتورة "تحت المراجعة" لتدقيق التكاليف والأرباح
  const handleToggleUnderReview = (orderId: string | number) => {
    const idStr = String(orderId);
    const target = invoices.find(o => String(o.id) === idStr);
    const nextVal = target ? !Boolean(target.isUnderReview) : true;

    // 1. تحديث الحالة المحلية
    const updated = invoices.map(o => String(o.id) === idStr ? { ...o, isUnderReview: nextVal } : o);
    setInvoices(updated);
    try {
      localStorage.setItem('masar_invoices', JSON.stringify(updated));
      localStorage.setItem('masar_orders', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving updated underReview status:', err);
    }

    // 2. تحديث الحالة العامة
    if (onUpdateOrder) {
      onUpdateOrder(idStr, { isUnderReview: nextVal });
    } else if (contextUpdateOrder) {
      contextUpdateOrder(idStr, { isUnderReview: nextVal });
    }
  };

  // Controlled or Internal State for adding new inline row
  const [internalIsAddingRow, setInternalIsAddingRow] = useState(false);
  const isAddingRow = propIsAddingRow !== undefined ? propIsAddingRow : internalIsAddingRow;
  const setIsAddingRow = propSetIsAddingRow || setInternalIsAddingRow;

  // قائمة قوالب الخدمات المتاحة
  const availableServices = useMemo(() => {
    return (settings.servicesConfig && settings.servicesConfig.length > 0)
      ? settings.servicesConfig
      : defaultServicesConfig;
  }, [settings.servicesConfig]);

  // دالة جلب قالب الخدمة المعتمد
  const getTemplateForService = (serviceName: string): DynamicServiceConfig => {
    return availableServices.find(s => s.name === serviceName)
      || availableServices.find(s => s.name === 'لافتة إعلانية')
      || availableServices[0];
  };

  // دالة بناء وتوليد كائن بنود التكلفة costDetails ومصفوفة التفاصيل بناءً على القالب
  const buildCostDataFromTemplate = (
    template: DynamicServiceConfig,
    existingCostDetails?: Record<string, any>,
    existingBreakdown?: Record<string, number>,
    existingExecutors?: Record<string, string>
  ) => {
    const costItems = template?.costItems || ['تكلفة التصميم', 'تكلفة الطباعة', 'التكلفة الخارجية', 'مواد خام'];
    const defaultCosts = template?.defaultCosts || {};
    const defaultExecutors = template?.defaultExecutors || {};

    const costDetails: Record<string, { amount: number; executor: string }> = {};
    const costBreakdown: Record<string, number> = {};
    const costExecutors: Record<string, string> = {};

    costItems.forEach(item => {
      let amt = 0;
      let exec = '';

      if (existingCostDetails && existingCostDetails[item] !== undefined) {
        const d = existingCostDetails[item];
        if (typeof d === 'object' && d !== null) {
          amt = Number(d.amount) || 0;
          exec = d.executor || '';
        } else {
          amt = Number(d) || 0;
        }
      } else if (existingBreakdown && existingBreakdown[item] !== undefined) {
        amt = Number(existingBreakdown[item]) || 0;
        exec = existingExecutors?.[item] || '';
      } else {
        amt = defaultCosts[item] !== undefined ? defaultCosts[item] : 0;
        exec = defaultExecutors[item] || '';
      }

      costDetails[item] = { amount: amt, executor: exec };
      costBreakdown[item] = amt;
      if (exec) {
        costExecutors[item] = exec;
      }
    });

    const totalCost = Object.values(costBreakdown).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const detailsList = costItems.map(item => {
      const val = costBreakdown[item] !== undefined ? costBreakdown[item] : 0;
      const ex = costExecutors[item];
      return ex ? `${item}: ${val} (${ex})` : `${item}: ${val}`;
    });

    return {
      costDetails,
      costBreakdown,
      costExecutors,
      totalCost,
      detailsList,
    };
  };

  // Form Fields for new inline row
  const [newServiceType, setNewServiceType] = useState('لافتة إعلانية');
  const [newClientName, setNewClientName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Draft cost items when adding a new row via popover
  const [draftCostDetails, setDraftCostDetails] = useState<Record<string, any> | undefined>(undefined);
  const [draftCostBreakdown, setDraftCostBreakdown] = useState<Record<string, number> | undefined>(undefined);
  const [draftCostExecutors, setDraftCostExecutors] = useState<Record<string, string> | undefined>(undefined);
  const [draftDetailedCosts, setDraftDetailedCosts] = useState<{
    designCost?: number;
    designerName?: string;
    printingCost?: number;
    printerName?: string;
    externalCost?: number;
    externalExecutor?: string;
    materialCost?: number;
  }>({});

  // استدعاء قالب التكلفة تلقائياً عند تغيير نوع الخدمة في صف الإضافة الجديد
  const handleNewServiceChange = (newService: string) => {
    setNewServiceType(newService);
    const template = getTemplateForService(newService);
    const { costDetails, costBreakdown, costExecutors, totalCost, detailsList } = buildCostDataFromTemplate(
      template,
      draftCostDetails,
      draftCostBreakdown,
      draftCostExecutors
    );

    setDraftCostDetails(costDetails);
    setDraftCostBreakdown(costBreakdown);
    setDraftCostExecutors(costExecutors);
    setNewCost(totalCost > 0 ? String(totalCost) : '');
    setNewDetails(detailsList.join(' • '));
  };

  // عند فتح صف الإضافة، قم بتهيئة البيانات من القالب الافتراضي إذا كانت فارغة
  useEffect(() => {
    if (isAddingRow && (!newCost || !draftCostDetails)) {
      handleNewServiceChange(newServiceType || availableServices[0]?.name || 'لافتة إعلانية');
    }
  }, [isAddingRow]);

  const draftNewOrder: Order = useMemo(() => ({
    id: 'draft-new-order',
    clientName: newClientName.trim() || 'طلب جديد',
    price: parseFloat(newPrice) || 0,
    cost: parseFloat(newCost) || 0,
    description: newDetails.trim() || 'طلب جديد',
    invoiceDetails: newDetails.trim() ? newDetails.split(/[\n•,]+/).map(s => s.trim()).filter(Boolean) : undefined,
    serviceType: newServiceType,
    costDetails: draftCostDetails,
    costBreakdown: draftCostBreakdown,
    costExecutors: draftCostExecutors,
    designCost: draftDetailedCosts.designCost,
    designerName: draftDetailedCosts.designerName,
    printingCost: draftDetailedCosts.printingCost,
    printerName: draftDetailedCosts.printerName,
    externalCost: draftDetailedCosts.externalCost,
    externalExecutor: draftDetailedCosts.externalExecutor,
    materialCost: draftDetailedCosts.materialCost,
    date: new Date().toISOString(),
    paymentMethod: 'نقدي',
    status: 'بانتظار اعتماد التصميم',
  }), [
    newClientName,
    newPrice,
    newCost,
    newDetails,
    newServiceType,
    draftCostDetails,
    draftCostBreakdown,
    draftCostExecutors,
    draftDetailedCosts
  ]);

  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editServiceType, setEditServiceType] = useState<ServiceType>('لافتة إعلانية');
  const [editClientName, setEditClientName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // الاستدعاء التلقائي (Auto-fill) ومزامنة كائن costDetails داخل الفاتورة فوراً بمجرد تغير نوع الخدمة
  const handleServiceChange = (orderId: string, newService: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const template = getTemplateForService(newService);
    const { costDetails, costBreakdown, costExecutors, totalCost, detailsList } = buildCostDataFromTemplate(
      template,
      targetOrder.costDetails,
      targetOrder.costBreakdown,
      targetOrder.costExecutors
    );

    const price = targetOrder.price || 0;
    const expectedProfit = price - totalCost;

    const updates: Partial<Order> = {
      serviceType: newService as ServiceType,
      costDetails,
      costBreakdown: Object.keys(costBreakdown).length > 0 ? costBreakdown : undefined,
      costExecutors: Object.keys(costExecutors).length > 0 ? costExecutors : undefined,
      cost: totalCost,
      expectedProfit,
      invoiceDetails: detailsList.length > 0 ? detailsList : undefined,
    };

    if (onUpdateOrder) {
      onUpdateOrder(orderId, updates);
    } else if (contextUpdateOrder) {
      contextUpdateOrder(orderId, updates);
    }

    // مزامنة حالة التعديل إذا كان هذا السطر قيد التعديل المباشر
    if (editingRowId === orderId) {
      setEditServiceType(newService as ServiceType);
      setEditCost(totalCost > 0 ? String(totalCost) : '');
      setEditDetails(detailsList.join(' • '));
    }

    // مزامنة نافذة التفاصيل المنبثقة النشطة إذا كانت مفتوحة
    setActivePopover(prev => (prev && prev.order.id === orderId) ? {
      ...prev,
      order: {
        ...prev.order,
        ...updates,
      }
    } : prev);
  };

  // معالجة تغيير نوع الخدمة أثناء التعديل المباشر
  const handleEditServiceChange = (orderId: string, newService: string) => {
    setEditServiceType(newService as ServiceType);
    handleServiceChange(orderId, newService);
  };

  // Start Inline Editing for a specific row
  const handleStartEdit = (order: Order) => {
    setEditingRowId(order.id);
    setEditServiceType((order.serviceType as ServiceType) || 'لافتة إعلانية');
    setEditClientName(order.clientName || '');
    setEditPrice(order.price !== undefined ? String(order.price) : '');
    
    // Format invoiceDetails
    const detailsList = getOrderInvoiceDetailsList(order);
    let detailsVal = '';
    if (detailsList.length > 0) {
      detailsVal = detailsList.join(' • ');
    } else if (order.description && order.description !== order.serviceType && order.description !== 'طلب جديد') {
      detailsVal = order.description;
    }
    setEditDetails(detailsVal);

    // Cost calculation
    const dCost = order.designCost || 0;
    const prCost = order.printingCost || 0;
    const exCost = order.externalCost || 0;
    const itemCostSum = dCost + prCost + exCost;
    const actualCost = itemCostSum > 0 ? itemCostSum : (order.cost || 0);
    setEditCost(actualCost ? String(actualCost) : '');

    // Independent Notes field
    setEditNotes(order.notes || '');
  };

  // Cancel Inline Editing
  const handleCancelEdit = () => {
    setEditingRowId(null);
  };

  // Save Inline Editing
  const handleSaveEdit = (orderId: string) => {
    const trimmedClient = editClientName.trim();
    const parsedPrice = Math.round(Number(editPrice)) || 0;
    const parsedCost = Math.round(Number(editCost)) || 0;
    const expectedProfit = parsedPrice - parsedCost;

    const updates: Partial<Order> = {
      serviceType: editServiceType,
      clientName: trimmedClient || 'عميل نقدي',
      price: parsedPrice,
      cost: parsedCost,
      expectedProfit,
      invoiceDetails: editDetails.trim() ? editDetails.split(/[\n•,]+/).map(s => s.trim()).filter(Boolean) : undefined,
      notes: editNotes.trim() ? editNotes.trim() : undefined,
    };

    if (onUpdateOrder) {
      onUpdateOrder(orderId, updates);
    } else if (contextUpdateOrder) {
      contextUpdateOrder(orderId, updates);
    }

    setEditingRowId(null);
  };

  // Save new inline order
  const handleSaveInlineRow = () => {
    const trimmedClient = newClientName.trim();
    const parsedPrice = Math.round(Number(newPrice)) || 0;
    
    // Save if client name or price entered
    if (!trimmedClient && parsedPrice <= 0) {
      return;
    }

    const parsedCost = Math.round(Number(newCost)) || 0;
    const expectedProfit = parsedPrice - parsedCost;
    const autoSerial = getNextSerialNumber ? getNextSerialNumber() : `INV-${Date.now().toString().slice(-4)}`;

    const detailsArray = newDetails.trim() 
      ? newDetails.split(/[\n•,]+/).map(s => s.trim()).filter(Boolean) 
      : undefined;

    addOrder({
      serialNumber: autoSerial,
      serviceType: (newServiceType as ServiceType) || 'لافتة إعلانية',
      clientName: trimmedClient || 'عميل نقدي',
      description: newDetails.trim() || 'طلب جديد',
      invoiceDetails: detailsArray,
      price: parsedPrice,
      cost: parsedCost,
      expectedProfit,
      costDetails: draftCostDetails,
      costBreakdown: draftCostBreakdown,
      costExecutors: draftCostExecutors,
      designCost: draftDetailedCosts.designCost,
      designerName: draftDetailedCosts.designerName,
      printingCost: draftDetailedCosts.printingCost,
      printerName: draftDetailedCosts.printerName,
      externalCost: draftDetailedCosts.externalCost,
      externalExecutor: draftDetailedCosts.externalExecutor,
      materialCost: draftDetailedCosts.materialCost,
      assignedEmployee: (employees && employees.length > 0 ? employees[0].name : 'إدارة الورشة'),
      status: 'بانتظار اعتماد التصميم',
      paymentMethod: 'نقدي',
      date: selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), Math.min(new Date().getDate(), 28)).toISOString() : new Date().toISOString(),
      isPaid: false,
      notes: newNotes.trim() ? newNotes.trim() : undefined,
    }, autoSerial);

    // Reset inputs & close row
    if (customOrderIds.length > 0) {
      const updatedCustomOrder = [...customOrderIds, autoSerial];
      setCustomOrderIds(updatedCustomOrder);
      try {
        localStorage.setItem('masar_sales_grid_order', JSON.stringify(updatedCustomOrder));
      } catch (err) {
        console.error('Error saving updated masar_sales_grid_order:', err);
      }
    }

    setNewClientName('');
    setNewPrice('');
    setNewDetails('');
    setNewCost('');
    setNewNotes('');
    setDraftCostDetails(undefined);
    setDraftCostBreakdown(undefined);
    setDraftCostExecutors(undefined);
    setDraftDetailedCosts({});
    setIsAddingRow(false);
  };

  // Selected Month state (defaults to current month or date of latest order)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // If there are orders, pick the latest order's month or current month
    if (orders.length > 0) {
      const dates = orders.map(o => new Date(o.date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates));
        return startOfMonth(maxDate);
      }
    }
    return startOfMonth(new Date());
  });

  // Floating Popover state for Cost Items
  const [activePopover, setActivePopover] = useState<{
    order: Order;
    position: { top?: number; bottom?: number; left: number; maxHeight?: number };
  } | null>(null);

  const handleOpenPopover = (order: Order, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activePopover?.order.id === order.id) {
      setActivePopover(null);
      return;
    }

    // ضمان ملء بنود التكلفة من القالب المعتمد للخدمة تلقائياً إذا لم تكن مهيأة
    let hydratedOrder = { ...order };
    const currentService = order.serviceType || availableServices[0]?.name || 'لافتة إعلانية';
    const template = getTemplateForService(currentService);

    if (!hydratedOrder.costDetails || Object.keys(hydratedOrder.costDetails).length === 0) {
      const { costDetails, costBreakdown, costExecutors, totalCost } = buildCostDataFromTemplate(
        template,
        hydratedOrder.costDetails,
        hydratedOrder.costBreakdown,
        hydratedOrder.costExecutors
      );
      hydratedOrder = {
        ...hydratedOrder,
        costDetails,
        costBreakdown: hydratedOrder.costBreakdown || (Object.keys(costBreakdown).length > 0 ? costBreakdown : undefined),
        costExecutors: hydratedOrder.costExecutors || (Object.keys(costExecutors).length > 0 ? costExecutors : undefined),
        cost: hydratedOrder.cost !== undefined ? hydratedOrder.cost : totalCost,
      };
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = Math.min(370, window.innerWidth - 32);

    // توجيه القائمة لتطفو وتنبثق إلى الأعلى (Top) مباشرة فوق الزر مع هامش 8 بكسل (مكافئ لـ bottom-full mb-2)
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let position: { top?: number; bottom?: number; left: number; maxHeight?: number };

    // الوضع الافتراضي الدائم: الانبثاق للأعلى (Top)
    if (spaceAbove >= 180 || spaceAbove >= spaceBelow) {
      const bottom = window.innerHeight - rect.top + 8; // يعادل تماماً bottom-full mb-2 فوق الزر
      const maxHeight = Math.min(500, Math.max(260, rect.top - 20));
      position = { bottom, left: 0, maxHeight };
    } else {
      // ملاذ احتياطي فقط إذا كانت المساحة العلوية ضيقة جداً (<180px) والسفلية متسعة
      const top = rect.bottom + 8;
      const maxHeight = Math.min(500, Math.max(260, spaceBelow - 20));
      position = { top, left: 0, maxHeight };
    }

    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }
    position.left = left;

    setActivePopover({
      order: hydratedOrder,
      position,
    });
  };

  const handleSaveOrderCosts = (orderId: string, updates: Partial<Order>) => {
    if (orderId === 'draft-new-order') {
      if (updates.cost !== undefined) {
        setNewCost(String(updates.cost));
      }
      if (Array.isArray(updates.invoiceDetails) && updates.invoiceDetails.length > 0) {
        setNewDetails(updates.invoiceDetails.join(' • '));
      }
      if (updates.costDetails !== undefined) {
        setDraftCostDetails(updates.costDetails);
      }
      setDraftCostBreakdown(updates.costBreakdown);
      setDraftCostExecutors(updates.costExecutors);
      setDraftDetailedCosts({
        designCost: updates.designCost,
        designerName: updates.designerName,
        printingCost: updates.printingCost,
        printerName: updates.printerName,
        externalCost: updates.externalCost,
        externalExecutor: updates.externalExecutor,
        materialCost: updates.materialCost,
      });
      setActivePopover(prev => prev ? {
        ...prev,
        order: { ...prev.order, ...updates },
      } : null);
      return;
    }

    if (onUpdateOrder) {
      onUpdateOrder(orderId, updates);
    } else if (contextUpdateOrder) {
      contextUpdateOrder(orderId, updates);
    }

    // Sync with edit mode fields if this row is currently being edited
    if (editingRowId === orderId) {
      if (updates.cost !== undefined) {
        setEditCost(String(updates.cost));
      }
      if (Array.isArray(updates.invoiceDetails) && updates.invoiceDetails.length > 0) {
        setEditDetails(updates.invoiceDetails.join(' • '));
      }
    }

    setActivePopover(prev => prev ? {
      ...prev,
      order: { ...prev.order, ...updates },
    } : null);
  };

  // Search and status filters within the monthly view
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [serviceFilter, setServiceFilter] = useState<string>('الكل');

  // Month navigation handlers
  const handlePrevMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedDate(startOfMonth(new Date()));
  };

  // Extract available months from existing orders to populate dropdown
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, Date>();
    
    // Always include current month and adjacent 3 months
    const now = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = addMonths(now, i);
      const key = format(d, 'yyyy-MM');
      monthMap.set(key, startOfMonth(d));
    }

    // Include all months from invoices
    invoices.forEach(o => {
      try {
        const d = parseISO(o.date);
        if (!isNaN(d.getTime())) {
          const key = format(d, 'yyyy-MM');
          if (!monthMap.has(key)) {
            monthMap.set(key, startOfMonth(d));
          }
        }
      } catch {
        // Ignore invalid dates
      }
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // latest first
      .map(([key, date]) => ({
        key,
        date,
        label: format(date, 'MMMM yyyy', { locale: ar }),
      }));
  }, [invoices]);

  // Selected Month bounds
  const currentMonthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const currentMonthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);
  const formattedCurrentMonth = useMemo(() => format(selectedDate, 'MMMM yyyy', { locale: ar }), [selectedDate]);

  // Orders filtered by the selected month & excluding deleted rows (respecting manual reordering)
  // عزل تام بين الأشهر: لا تظهر فواتير أي شهر إلا عند اختياره من قائمة الأشهر
  // وخاصية التثبيت (Pin) محلية ترفع الفاتورة لأعلى شهرها فقط دون أن تظهر في بقية الأشهر
  const monthlyOrders = useMemo(() => {
    // 1. عزل صارم لشهر العرض الحالي فقط
    const list = invoices
      .filter(order => !deletedRowIds.some(dId => String(dId) === String(order.id)))
      .filter(order => {
        try {
          const orderDate = parseISO(order.date);
          if (isNaN(orderDate.getTime())) return false;
          return isWithinInterval(orderDate, { start: currentMonthStart, end: currentMonthEnd });
        } catch {
          return false;
        }
      });

    // 2. الترتيب: الفواتير المثبتة (isPinned) ترتفع لأعلى شهرها
    return [...list].sort((a, b) => {
      // رفع البنود المثبتة (isPinned) لأعلى الشهر
      const aPinned = Boolean(a.isPinned);
      const bPinned = Boolean(b.isPinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }

      // إذا وجد ترتيب يدوي مخصص محفوظ
      if (customOrderIds.length > 0) {
        const strA = String(a.id);
        const strB = String(b.id);
        const idxA = customOrderIds.indexOf(strA);
        const idxB = customOrderIds.indexOf(strB);
        if (idxA !== -1 && idxB !== -1) {
          return idxA - idxB;
        }
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }

      // الترتيب الافتراضي بحسب تاريخ الفاتورة
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [invoices, deletedRowIds, currentMonthStart, currentMonthEnd, customOrderIds]);

  // Filtered orders after search & category filters
  const filteredGridOrders = useMemo(() => {
    return monthlyOrders.filter(order => {
      const serial = (order.serialNumber || order.id).toLowerCase();
      const client = order.clientName.toLowerCase();
      const desc = (order.description || '').toLowerCase();
      const notes = (order.notes || '').toLowerCase();
      const service = (order.serviceType || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();

      const matchesSearch = !term || serial.includes(term) || client.includes(term) || desc.includes(term) || notes.includes(term) || service.includes(term);
      
      let matchesStatus = true;
      if (statusFilter === 'نهائية') {
        matchesStatus = order.status === 'تم التسليم';
      } else if (statusFilter === 'قيد التنفيذ') {
        matchesStatus = order.status !== 'تم التسليم';
      } else if (statusFilter !== 'الكل') {
        matchesStatus = order.status === statusFilter;
      }

      const matchesService = serviceFilter === 'الكل' || order.serviceType === serviceFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [monthlyOrders, searchTerm, statusFilter, serviceFilter]);

  // Filtered rows totals for bottom summary row
  const actualOrdersCount = useMemo(() => {
    return filteredGridOrders.filter(o => !isSummaryOrTotalRow(o)).length;
  }, [filteredGridOrders]);

  const tableTotals = useMemo(() => {
    let sumInvoices = 0;
    let sumTotalCosts = 0;
    let sumDesign = 0;
    let sumPrinting = 0;
    let sumExternal = 0;
    let sumNetProfit = 0;

    filteredGridOrders.forEach(order => {
      if (isSummaryOrTotalRow(order)) return;
      const p = typeof order.price === 'number' ? order.price : (parseFloat(String(order.price || 0)) || 0);
      const actualCost = getOrderTotalDetailCosts(order);
      const netProfit = getOrderNetProfit(order);

      const dCost = typeof order.designCost === 'number' ? order.designCost : (parseFloat(String(order.designCost || 0)) || 0);
      const prCost = typeof order.printingCost === 'number' ? order.printingCost : (parseFloat(String(order.printingCost || 0)) || 0);
      const exCost = typeof order.externalCost === 'number' ? order.externalCost : (parseFloat(String(order.externalCost || 0)) || 0);

      sumInvoices = Number((sumInvoices + p).toFixed(2));
      sumTotalCosts = Number((sumTotalCosts + actualCost).toFixed(2));
      sumDesign = Number((sumDesign + dCost).toFixed(2));
      sumPrinting = Number((sumPrinting + prCost).toFixed(2));
      sumExternal = Number((sumExternal + exCost).toFixed(2));
      sumNetProfit = Number((sumNetProfit + netProfit).toFixed(2));
    });

    return {
      sumInvoices,
      sumTotalCosts,
      sumDesign,
      sumPrinting,
      sumExternal,
      sumNetProfit
    };
  }, [filteredGridOrders]);

  // المصاريف التشغيلية المعتمدة للشهر الحالي
  const currentMonthExpenses = useMemo(() => {
    return (expenses || []).filter(exp => {
      if (!exp.date) return false;
      const expDate = parseISO(exp.date);
      return isWithinInterval(expDate, { start: currentMonthStart, end: currentMonthEnd });
    });
  }, [expenses, currentMonthStart, currentMonthEnd]);

  // إجمالي المصاريف التشغيلية
  const totalMonthlyExpenses = useMemo(() => {
    return Number(
      currentMonthExpenses
        .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0)
        .toFixed(2)
    );
  }, [currentMonthExpenses]);

  // صافي الربح الفعلي = هامش الربح - إجمالي المصاريف التشغيلية
  const actualNetProfit = useMemo(() => {
    return Number((tableTotals.sumNetProfit - totalMonthlyExpenses).toFixed(2));
  }, [tableTotals.sumNetProfit, totalMonthlyExpenses]);

  // مساحة الملاحظات العامة للشهر الحالي وتحديثها وحفظها تلقائياً
  const currentMonthKey = useMemo(() => format(selectedDate, 'yyyy_MM'), [selectedDate]);
  const [monthlyNotes, setMonthlyNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(`masar_monthly_notes_${currentMonthKey}`) || '';
    } catch {
      return '';
    }
  });
  const [notesSaveStatus, setNotesSaveStatus] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`masar_monthly_notes_${currentMonthKey}`) || '';
      setMonthlyNotes(saved);
      setNotesSaveStatus('');
    } catch {
      // ignore
    }
  }, [currentMonthKey]);

  const handleNotesChange = (val: string) => {
    setMonthlyNotes(val);
    try {
      localStorage.setItem(`masar_monthly_notes_${currentMonthKey}`, val);
      setNotesSaveStatus('تم الحفظ تلقائياً');
      setTimeout(() => setNotesSaveStatus(''), 2000);
    } catch (e) {
      console.error('Error saving monthly notes:', e);
    }
  };

  // Export Monthly Data Grid to CSV / Excel
  const handleExportCSV = () => {
    if (!filteredGridOrders || filteredGridOrders.length === 0) {
      alert('سيتم تفعيل ميزة التصدير قريباً');
      return;
    }

    try {
      const headers = [
        'حالة الدفع',
        'نوع الخدمة',
        'اسم العميل',
        'إجمالي الفاتورة',
        'تفاصيل الفاتورة',
        'صافي الربح',
        'الملاحظات',
      ];

      const rows = filteredGridOrders.map(order => {
        const dCost = order.designCost || 0;
        const prCost = order.printingCost || 0;
        const exCost = order.externalCost || 0;
        const itemCostSum = dCost + prCost + exCost;
        const actualCost = itemCostSum > 0 ? itemCostSum : (order.cost || 0);
        const netProfit = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - actualCost);
        const detailBadges = getNormalizedInvoiceBadges(order.invoiceDetails || order.description);
        const defaultInvoiceText = detailBadges.map(b => b.value !== undefined && b.value !== '' ? `${b.item}: ${b.value}` : b.item).join(' • ') || (order.description || '');
        const noteContent = (order.notes || '').trim() || defaultInvoiceText;

        return [
          order.isPaid ? 'مدفوعة' : 'غير مدفوعة',
          order.serviceType || 'خدمة مخصصة',
          order.clientName,
          order.price,
          order.costBreakdownSummary || (actualCost > 0 ? `${actualCost} ${currency}` : '-'),
          netProfit,
          noteContent || '-',
        ];
      });

      // Add Totals row
      rows.push([
        '-',
        'الإجمالي العام',
        `${filteredGridOrders.length} طلبية`,
        tableTotals.sumInvoices,
        '-',
        tableTotals.sumNetProfit,
        '-',
      ]);

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `سجل_الفواتير_${format(selectedDate, 'yyyy_MM')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert('سيتم تفعيل ميزة التصدير قريباً');
    }
  };

  const handlePrintGrid = () => {
    window.print();
  };

  // Listen for global navbar export event
  useEffect(() => {
    const onGlobalExport = (e: Event) => {
      e.preventDefault();
      handleExportCSV();
    };

    window.addEventListener('app-export-monthly-grid', onGlobalExport);
    return () => {
      window.removeEventListener('app-export-monthly-grid', onGlobalExport);
    };
  }, [filteredGridOrders, selectedDate, tableTotals]);

  // Helper to format service type label
  const getServiceBadgeClass = (service?: string) => {
    switch (service) {
      case 'إدارة صفحات سوشيال ميديا':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'لافتة إعلانية':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      case 'تصميم موقع إلكتروني':
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60';
      case 'خدمات طباعة':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getServiceSelectClass = (service?: string) => {
    switch (service) {
      case 'إدارة صفحات سوشيال ميديا':
        return 'bg-blue-50/90 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/60';
      case 'لافتة إعلانية':
        return 'bg-amber-50/90 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/60';
      case 'تصميم موقع إلكتروني':
        return 'bg-purple-50/90 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800/60';
      case 'خدمات طباعة':
        return 'bg-emerald-50/90 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/60';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      
      {/* ========================================================================= */}
      {/* 1. COMPACT MONTH SELECTOR, SEARCH & ACTION BUTTONS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="glass-panel p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xs space-y-3 no-print">
        
        {/* Top Line: Month Info, Month Switcher & Action Buttons */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          
          {/* Left Title & Month Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs shrink-0">
              <FileSpreadsheet size={17} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                سجل الفواتير
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {formattedCurrentMonth}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                ({filteredGridOrders.length} طلبية)
              </span>
            </div>
          </div>

          {/* Right Controls: Month Selector & Action Buttons (Export/Print) */}
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end">
            
            {/* Month Dropdown */}
            <div className="relative flex-1 sm:w-44 min-w-[140px]">
              <select
                id="month-selector-dropdown"
                value={format(selectedDate, 'yyyy-MM')}
                onChange={(e) => {
                  const targetMonth = availableMonths.find(m => m.key === e.target.value);
                  if (targetMonth) {
                    setSelectedDate(targetMonth.date);
                  }
                }}
                className="w-full glass-input rounded-lg pr-3 pl-8 py-1.5 text-xs font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 appearance-none cursor-pointer shadow-2xs"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Previous / Current / Next Month Controls */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shrink-0">
              <button
                type="button"
                id="btn-prev-month"
                onClick={handlePrevMonth}
                className="relative z-10 cursor-pointer p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="الشهر السابق"
                aria-label="الشهر السابق"
              >
                <ChevronRight size={15} />
              </button>

              <button
                type="button"
                id="btn-current-month"
                onClick={handleCurrentMonth}
                className="relative z-10 cursor-pointer px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                title="الرجوع إلى الشهر الحالي"
              >
                الحالي
              </button>

              <button
                type="button"
                id="btn-next-month"
                onClick={handleNextMonth}
                className="relative z-10 cursor-pointer p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="الشهر التالي"
                aria-label="الشهر التالي"
              >
                <ChevronLeft size={15} />
              </button>
            </div>

            {/* Action Buttons: Export Excel & Print */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-export-excel-grid"
                onClick={handleExportCSV}
                className="relative z-10 cursor-pointer btn-secondary py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800"
                title="تصدير كشف الشهر الحالي إلى ملف Excel / CSV"
              >
                <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>تصدير Excel</span>
              </button>

              <button
                type="button"
                id="btn-print-monthly-grid"
                onClick={() => window.print()}
                className="relative z-10 cursor-pointer btn-secondary py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800"
                title="طباعة السجل الشهري"
              >
                <Printer size={14} className="text-blue-600 dark:text-blue-400" />
                <span>طباعة السجل</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Line: Search & Service Filters */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="monthly-grid-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم العميل، نوع الخدمة، أو الملاحظات..."
              className="w-full glass-input rounded-lg pr-9 pl-3 py-1.5 text-xs bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Service Filter Dropdown */}
          <div className="relative shrink-0 md:w-56">
            <select
              id="monthly-service-filter"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full glass-input rounded-lg pr-3 pl-7 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 appearance-none cursor-pointer"
            >
              <option value="الكل">كافة أنواع الخدمات</option>
              {availableServices.map((srv) => (
                <option key={srv.id || srv.name} value={srv.name}>{srv.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXPANDED MONTHLY DATA GRID (Clean Design Table) */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative">
        
        {/* Printable Header (Visible only when printing) */}
        <div className="hidden print:block p-4 border-b border-slate-200 text-center">
          <h2 className="text-xl font-bold">تقرير سجل الفواتير الشهري</h2>
          <p className="text-sm text-slate-600 mt-1">الفترة: {formattedCurrentMonth} | إجمالي الفواتير: {tableTotals.sumInvoices.toLocaleString()} {currency} | هامش الربح: {tableTotals.sumNetProfit.toLocaleString()} {currency}</p>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold select-none">
                
                {/* 0. أيقونة السحب والترتيب اليدوي في بداية الجدول (أقصى اليمين) */}
                <th scope="col" className="py-3 px-2 border-l border-slate-200/80 dark:border-slate-700 w-10 text-center select-none print:hidden">
                  <span className="sr-only">ترتيب الصفوف</span>
                  <GripVertical size={16} className="mx-auto text-slate-400 dark:text-slate-500" />
                </th>

                {/* عنصر تفاعلي: مربع الدفع في بداية السطر (بدون ترويسة نصية) */}
                <th scope="col" className="py-3 px-3 border-l border-slate-200/80 dark:border-slate-700 w-12 text-center select-none">
                  <span className="sr-only">تأكيد الدفع</span>
                </th>

                {/* 1. نوع الخدمة */}
                <th scope="col" className="py-3 px-4 font-bold border-l border-slate-200/80 dark:border-slate-700 min-w-[150px] text-center">
                  نوع الخدمة
                </th>

                {/* 2. اسم العميل */}
                <th scope="col" className="py-3 px-4 font-bold border-l border-slate-200/80 dark:border-slate-700 min-w-[160px] text-center">
                  اسم العميل
                </th>

                {/* 3. إجمالي الفاتورة */}
                <th scope="col" className="py-3 px-4 font-black border-l border-slate-200/80 dark:border-slate-700 min-w-[120px] text-center">
                  إجمالي الفاتورة
                </th>

                {/* 4. تفاصيل الفاتورة */}
                <th scope="col" className="py-3 px-4 font-bold border-l border-slate-200/80 dark:border-slate-700 min-w-[90px] text-center">
                  تفاصيل الفاتورة
                </th>

                {/* 5. هامش الربح */}
                <th scope="col" className="py-3 px-4 font-black border-l border-slate-200/80 dark:border-slate-700 min-w-[120px] text-center">
                  هامش الربح
                </th>

                {/* 6. الملاحظات */}
                <th scope="col" className="py-3 px-4 font-bold min-w-[200px] border-l border-slate-200/80 dark:border-slate-700">
                  الملاحظات
                </th>

                {/* 7. إجراءات السطر في أقصى اليسار */}
                <th scope="col" className="py-3 px-2 text-center font-bold min-w-[70px] print:hidden select-none">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {/* أولاً: اعرض الفواتير المسجلة مسبقاً (إن وجدت) باستخدام map */}
              {filteredGridOrders.map((order, index) => {
                const row = order;
                const isTotalRow = isSummaryOrTotalRow(order);

                // وضع التعديل المباشر (Inline Editing Mode)
                if (editingRowId === order.id) {
                  const currentCostVal = parseFloat(editCost) || 0;
                  const currentPriceVal = parseFloat(editPrice) || 0;
                  const currentProfit = currentPriceVal - currentCostVal;

                  return (
                    <tr 
                      key={order.id}
                      className="bg-amber-50/95 dark:bg-amber-950/40 border-y-2 border-amber-400 dark:border-amber-500 shadow-inner animate-in fade-in duration-150"
                    >
                      {/* عمود فارغ للسحب أثناء التعديل المباشر */}
                      <td className="py-2 px-2 border-l border-amber-200 dark:border-amber-800 text-center print:hidden"></td>

                      {/* أزرار التحكم بالتعديل: زر حفظ أخضر وزر إلغاء رمادي/أحمر استبدالاً لمربع الدفع */}
                      <td className="py-2 px-2 border-l border-amber-200 dark:border-amber-800 text-center bg-amber-100/70 dark:bg-amber-900/40">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            id={`btn-save-edit-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit(order.id);
                            }}
                            className="relative z-10 cursor-pointer p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-transform active:scale-95"
                            title="حفظ التعديلات"
                            aria-label="حفظ التعديلات"
                          >
                            <Check size={14} className="stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            id={`btn-cancel-edit-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="relative z-10 cursor-pointer p-1.5 rounded-lg bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/80 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 shadow-xs transition-transform active:scale-95"
                            title="إلغاء التعديل والتراجع"
                            aria-label="إلغاء التعديل والتراجع"
                          >
                            <X size={14} className="stroke-[3]" />
                          </button>
                        </div>
                      </td>

                      {/* 1. نوع الخدمة */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800 text-center">
                        <div className="relative">
                          <select
                            id={`edit-select-service-${order.id}`}
                            value={editServiceType}
                            onChange={(e) => handleEditServiceChange(order.id, e.target.value)}
                            className="w-full glass-input rounded-lg pr-2 pl-6 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 appearance-none cursor-pointer focus:ring-2 focus:ring-amber-500 text-center"
                          >
                            {availableServices.map((srv) => (
                              <option key={srv.id || srv.name} value={srv.name}>{srv.name}</option>
                            ))}
                            {order.serviceType && !availableServices.some(s => s.name === order.serviceType) && (
                              <option value={order.serviceType}>{order.serviceType}</option>
                            )}
                          </select>
                          <ChevronDown size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </td>

                      {/* 2. اسم العميل */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800 text-center">
                        <input
                          type="text"
                          id={`edit-input-client-${order.id}`}
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(order.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          placeholder="اسم العميل..."
                          autoFocus
                          className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500 text-center"
                        />
                      </td>

                      {/* 3. إجمالي الفاتورة */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          id={`edit-input-price-${order.id}`}
                          value={editPrice === '0' ? '' : editPrice}
                          onFocus={(e) => {
                            if (e.target.value === '0' || e.target.value === '.') {
                              setEditPrice('');
                            }
                          }}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d]/g, '');
                            const clean = raw.replace(/^0+/, '') || (raw === '0' ? '0' : '');
                            setEditPrice(clean);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',') {
                              e.preventDefault();
                              return;
                            }
                            if (e.key === 'Enter') handleSaveEdit(order.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          placeholder="0"
                          className="w-full glass-input rounded-lg px-2 py-1.5 text-xs font-mono font-black text-center text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* 4. تفاصيل الفاتورة مع زر + لفتح القائمة المنسدلة للتكاليف */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="text"
                            id={`edit-input-details-${order.id}`}
                            value={editDetails}
                            onChange={(e) => setEditDetails(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(order.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            placeholder="المقاس، الألوان..."
                            className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-center text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            id={`btn-edit-costs-popover-${order.id}`}
                            onClick={(e) => handleOpenPopover(order, e)}
                            className="w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs"
                            title="إدخال وتعديل التكاليف في القائمة المنسدلة"
                            aria-label="إدخال وتعديل التكاليف في القائمة المنسدلة"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </td>

                      {/* 5. هامش الربح / التكلفة */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            id={`edit-input-cost-${order.id}`}
                            value={editCost === '0' ? '' : editCost}
                            onFocus={(e) => {
                              if (e.target.value === '0' || e.target.value === '.') {
                                setEditCost('');
                              }
                            }}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d]/g, '');
                              const clean = raw.replace(/^0+/, '') || (raw === '0' ? '0' : '');
                              setEditCost(clean);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === '.' || e.key === ',') {
                                e.preventDefault();
                                return;
                              }
                              if (e.key === 'Enter') handleSaveEdit(order.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            placeholder="0"
                            className="w-16 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-bold text-center text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700"
                            title="التكلفة الإجمالية (لحساب هامش الربح تلقائياً)"
                          />
                          <span className={`text-[11px] font-mono font-black whitespace-nowrap ${
                            currentProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}>
                            ={currentProfit.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* 6. الملاحظات وأزرار الإلغاء والحفظ */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            id={`edit-input-notes-${order.id}`}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(order.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            placeholder="ملاحظات..."
                            className="flex-1 glass-input rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            id={`btn-cancel-edit-inline-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="relative z-10 cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            id={`btn-save-edit-inline-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit(order.id);
                            }}
                            className="relative z-10 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors shrink-0 flex items-center gap-1"
                          >
                            <Check size={14} />
                            <span>حفظ</span>
                          </button>
                        </div>
                      </td>

                      {/* 7. عمود الإجراءات (فارغ أثناء التعديل) */}
                      <td className="py-2 px-2 text-center print:hidden"></td>
                    </tr>
                  );
                }

                // وضع العرض العادي (Normal Display Mode)
                const isChecked = Boolean(order.isPaid);
                const actualCost = getOrderTotalDetailCosts(order);
                const netProfit = getOrderNetProfit(order);
                
                // تفاصيل الفاتورة المحفوظة لعرضها كبطاقات عمودية نظيفة
                const detailsItems = getOrderInvoiceDetailsList(order);

                // حقل الملاحظات مستقل تماماً ولا يتكرر فيه نوع الخدمة أو أي بيانات أخرى
                const displayedNotes = (order.notes || '').trim();

                return (
                  <tr 
                    key={order.id}
                    onDragOver={(e) => handleDragOver(e, order.id)}
                    onDrop={(e) => handleDrop(e, order.id)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-150 group ${
                      dragOverOrderId === order.id && draggedOrderId !== order.id
                        ? 'border-t-2 border-blue-500 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-900/30'
                        : ''
                    } ${
                      draggedOrderId === order.id
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-800'
                        : order.isUnderReview
                          ? 'bg-amber-100/85 dark:bg-amber-950/65 hover:bg-amber-200/80 dark:hover:bg-amber-900/60 text-slate-900 dark:text-slate-100 border-r-4 border-r-amber-500'
                          : isChecked 
                            ? 'bg-yellow-100/90 dark:bg-yellow-950/45 hover:bg-yellow-200/70 dark:hover:bg-yellow-900/40 text-slate-900 dark:text-slate-100' 
                            : `${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/50'} hover:bg-slate-50/90 dark:hover:bg-slate-800/60`
                    }`}
                  >
                    {/* 0. أيقونة السحب Drag Handle في بداية كل صف (أقصى اليمين) */}
                    <td 
                      className="py-3 px-2 border-l border-slate-200/60 dark:border-slate-800 text-center print:hidden select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isTotalRow ? (
                        <span className="text-slate-400 dark:text-slate-600 font-bold select-none">-</span>
                      ) : (
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, order.id);
                          }}
                          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors inline-flex items-center justify-center select-none"
                          title="اسحب لتغيير ترتيب الصف"
                          aria-label={`اسحب لتغيير ترتيب فاتورة ${order.clientName}`}
                        >
                          <GripVertical size={16} />
                        </div>
                      )}
                    </td>

                    {/* مربع الدفع التفاعلي وزر التعديل السريع بجانبه */}
                    <td className="py-3 px-2 border-l border-slate-200/60 dark:border-slate-800 text-center">
                      {isTotalRow ? (
                        <span className="text-slate-400 dark:text-slate-600 font-bold select-none">-</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            id={`order-check-${order.id}`}
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              onTogglePaid && onTogglePaid(order.id);
                            }}
                            className="relative z-10 cursor-pointer w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-400 focus:ring-2 transition-all accent-amber-500 shrink-0"
                            title={isChecked ? 'الفاتورة مدفوعة ومحددة (انقر لإلغاء التحديد)' : 'تحديد الفاتورة كمدفوعة وخالصة'}
                            aria-label={`تحديد حالة الدفع للفاتورة الخاصة بـ ${order.clientName}`}
                          />
                          <button
                            type="button"
                            id={`btn-edit-order-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRowId(order.id);
                              handleStartEdit(order);
                            }}
                            className="relative z-10 cursor-pointer p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center opacity-70 group-hover:opacity-100"
                            title="تعديل بيانات الفاتورة مباشرة من السجل"
                            aria-label={`تعديل الفاتورة الخاصة بـ ${order.clientName}`}
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 1. نوع الخدمة */}
                    <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-center">
                      <div className="relative inline-block w-full max-w-[175px]">
                        <select
                          id={`select-service-${order.id}`}
                          value={order.serviceType || availableServices[0]?.name || 'لافتة إعلانية'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleServiceChange(order.id, e.target.value);
                          }}
                          className={`w-full text-center text-xs font-bold py-1.5 pr-2 pl-6 rounded-lg border appearance-none cursor-pointer transition-colors shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden ${getServiceSelectClass(order.serviceType)}`}
                          title="تغيير نوع الخدمة واستدعاء قالب التكلفة تلقائياً"
                        >
                          {availableServices.map((srv) => (
                            <option key={srv.id || srv.name} value={srv.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">
                              {srv.name}
                            </option>
                          ))}
                          {order.serviceType && !availableServices.some(s => s.name === order.serviceType) && (
                            <option value={order.serviceType} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1">
                              {order.serviceType}
                            </option>
                          )}
                        </select>
                        <ChevronDown size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </td>

                    {/* 2. اسم العميل */}
                    <td className="py-3 px-4 border-l border-slate-200/60 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 max-w-[180px] text-center" title={order.clientName}>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1.5 truncate max-w-full">
                          {order.isPinned && (
                            <Pin size={13} className="text-amber-500 fill-amber-500/20 shrink-0" title="بند مثبت للأشهر القادمة" />
                          )}
                          <span className="truncate">{order.clientName}</span>
                        </div>
                        {order.isUnderReview && (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/90 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-700 select-none shadow-2xs"
                            title="فاتورة تحت المراجعة: تدقيق التكاليف والأرباح مطلوب"
                          >
                            <AlertCircle size={10} className="text-amber-700 dark:text-amber-400 shrink-0 stroke-[2.5]" />
                            <span>تحت المراجعة</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. إجمالي الفاتورة */}
                    <td className="py-3 px-4 border-l border-slate-200/60 dark:border-slate-800 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100">
                      {order.price.toLocaleString()} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">{currency}</span>
                    </td>

                    {/* 4. تفاصيل الفاتورة مع زر التفاصيل لفتح نافذة بنود التكلفة */}
                    <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-center align-middle max-w-[220px]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {detailsItems.length > 0 ? (
                          <div className="flex flex-col gap-1 w-full">
                            {detailsItems.slice(0, 2).map((itemText, idx) => (
                              <span 
                                key={idx}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-[11px] text-center px-1.5 py-0.5 font-medium border border-slate-200/60 dark:border-slate-700/60 block truncate"
                                title={itemText}
                              >
                                {itemText}
                              </span>
                            ))}
                            {detailsItems.length > 2 && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                +{detailsItems.length - 2} بنود إضافية
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">-</span>
                        )}
                        <button
                          type="button"
                          id={`btn-open-cost-details-${order.id}`}
                          onClick={(e) => handleOpenPopover(order, e)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 hover:text-amber-700 dark:text-slate-200 dark:hover:text-amber-300 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs cursor-pointer active:scale-95"
                          title="فتح نافذة بنود التكلفة المستدعاة من القالب"
                        >
                          <Layers size={13} className="text-amber-600 dark:text-amber-400" />
                          <span>التفاصيل</span>
                        </button>
                      </div>
                    </td>

                    {/* 5. صافي الربح */}
                    <td className={`py-3 px-4 border-l border-slate-200/60 dark:border-slate-800 text-center font-mono tabular-nums font-black ${
                      netProfit >= 0 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {netProfit >= 0 ? `+${netProfit.toLocaleString()}` : netProfit.toLocaleString()} <span className="text-[10px] font-normal opacity-75">{currency}</span>
                    </td>

                    {/* 6. الملاحظات المستقلة */}
                    <td className="py-3 px-4 max-w-[260px] border-l border-slate-200/60 dark:border-slate-800">
                      {displayedNotes ? (
                        <span 
                          className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate block max-w-[250px] cursor-help hover:text-slate-900 dark:hover:text-white"
                          title={displayedNotes}
                        >
                          {displayedNotes}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300 dark:text-slate-600 select-none">
                          —
                        </span>
                      )}
                    </td>

                    {/* 7. أزرار الإجراءات في أقصى اليسار: تعديل، تكرار، تثبيت، وحذف */}
                    <td className="py-3 px-2 text-center print:hidden relative z-50 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                      {isTotalRow ? (
                        <span className="text-slate-400 dark:text-slate-500 font-bold select-none">-</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1 relative z-50 pointer-events-auto">
                          <button
                            type="button"
                            id={`btn-action-edit-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRowId(order.id);
                              handleStartEdit(order);
                            }}
                            className="relative z-10 cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
                            title="تعديل هذا السطر مباشرة"
                            aria-label={`تعديل فاتورة ${order.clientName}`}
                          >
                            <Pencil size={15} />
                          </button>

                          {/* ثانياً: أيقونة نسخ/تكرار الفاتورة (Copy SVG) */}
                          <button
                            type="button"
                            id={`btn-duplicate-order-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(order);
                            }}
                            className="relative z-10 cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
                            title="نسخ وتكرار هذا البند لأسفل الجدول"
                            aria-label={`تكرار فاتورة ${order.clientName}`}
                          >
                            <Copy size={15} />
                          </button>

                          {/* ثالثاً: أيقونة تثبيت البند للأشهر القادمة (Pin SVG) */}
                          <button
                            type="button"
                            id={`btn-pin-order-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(order.id);
                            }}
                            className={`relative z-10 cursor-pointer p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${
                              order.isPinned 
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 shadow-xs' 
                                : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-800'
                            }`}
                            title={order.isPinned ? "البند مثبت للأشهر القادمة (انقر لإلغاء التثبيت)" : "تثبيت البند للأشهر القادمة"}
                            aria-label={`تثبيت فاتورة ${order.clientName}`}
                          >
                            <Pin size={15} className={order.isPinned ? "fill-amber-500/30 text-amber-500 dark:text-amber-400" : ""} />
                          </button>

                          {/* رابعاً: أيقونة تمييز الفاتورة تحت المراجعة (AlertCircle) */}
                          <button
                            type="button"
                            id={`btn-review-order-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleUnderReview(order.id);
                            }}
                            className={`relative z-10 cursor-pointer p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${
                              order.isUnderReview 
                                ? 'text-amber-700 bg-amber-100 dark:bg-amber-900/70 dark:text-amber-300 shadow-xs border border-amber-300 dark:border-amber-600' 
                                : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800'
                            }`}
                            title={order.isUnderReview ? "الفاتورة تحت المراجعة (انقر لإلغاء التمييز)" : "تمييز كـ تحت المراجعة لتدقيق التكاليف والأرباح"}
                            aria-label={`تمييز مراجعة فاتورة ${order.clientName}`}
                          >
                            <AlertCircle size={15} className={order.isUnderReview ? "text-amber-600 dark:text-amber-300 stroke-[2.5]" : ""} />
                          </button>

                          {/* خامساً: زر الحذف */}
                          <button
                            type="button"
                            id={`btn-delete-order-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('هل تريد حذف هذا السطر؟')) {
                                handleDelete(order.id);
                              }
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                            title="حذف هذا السطر"
                            aria-label={`حذف فاتورة ${order.clientName}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* ثانياً: إذا كانت isAddingRow === true، اعرض السطر الجديد <tr> في أسفل الجدول (Append to bottom) */}
              {isAddingRow && (
                <tr className="bg-blue-50/90 dark:bg-blue-950/50 border-y-2 border-blue-400 dark:border-blue-500 animate-in fade-in slide-in-from-bottom-1 duration-150 shadow-inner">
                  {/* عمود فارغ للسحب أثناء إضافة سطر جديد */}
                  <td className="py-2 px-2 border-l border-blue-200 dark:border-blue-800 text-center print:hidden"></td>

                  {/* أزرار الحفظ والإلغاء السريعة */}
                  <td className="py-2 px-2 border-l border-blue-200 dark:border-blue-800 text-center bg-blue-100/60 dark:bg-blue-900/40">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        id="btn-save-inline-row-icon"
                        onClick={handleSaveInlineRow}
                        className="relative z-10 cursor-pointer p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-transform active:scale-95"
                        title="حفظ الفاتورة وإدراجها في السجل"
                        aria-label="حفظ الفاتورة"
                      >
                        <Check size={14} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        id="btn-cancel-inline-row-icon"
                        onClick={() => setIsAddingRow(false)}
                        className="relative z-10 cursor-pointer p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 shadow-xs transition-transform active:scale-95"
                        title="إلغاء الإضافة"
                        aria-label="إلغاء الإضافة"
                      >
                        <X size={14} className="stroke-[3]" />
                      </button>
                    </div>
                  </td>

                  {/* 1. نوع الخدمة */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                    <div className="relative">
                      <select
                        id="inline-input-service-type"
                        value={newServiceType}
                        onChange={(e) => handleNewServiceChange(e.target.value)}
                        className="w-full glass-input rounded-lg pr-2.5 pl-6 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 text-center"
                      >
                        {availableServices.map((srv) => (
                          <option key={srv.id || srv.name} value={srv.name}>{srv.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </td>

                  {/* 2. اسم العميل */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                    <input
                      type="text"
                      id="inline-input-client-name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveInlineRow();
                        if (e.key === 'Escape') setIsAddingRow(false);
                      }}
                      placeholder="اسم العميل أو الشركة..."
                      autoFocus
                      className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </td>

                  {/* 3. إجمالي الفاتورة */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      id="inline-input-price"
                      value={newPrice === '0' ? '' : newPrice}
                      onFocus={(e) => {
                        if (e.target.value === '0' || e.target.value === '.') {
                          setNewPrice('');
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const clean = raw.replace(/^0+/, '') || (raw === '0' ? '0' : '');
                        setNewPrice(clean);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '.' || e.key === ',') {
                          e.preventDefault();
                          return;
                        }
                        if (e.key === 'Enter') handleSaveInlineRow();
                        if (e.key === 'Escape') setIsAddingRow(false);
                      }}
                      placeholder="0"
                      className="w-full glass-input rounded-lg px-2 py-1.5 text-xs font-mono font-black text-center text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* 4. تفاصيل الفاتورة مع زر + لفتح القائمة المنسدلة للتكاليف */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="text"
                        id="inline-input-details"
                        value={newDetails}
                        onChange={(e) => setNewDetails(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineRow();
                          if (e.key === 'Escape') setIsAddingRow(false);
                        }}
                        placeholder="المقاس، الألوان..."
                        className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-center text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        id="btn-add-costs-popover-new"
                        onClick={(e) => handleOpenPopover(draftNewOrder, e)}
                        className="w-7 h-7 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs"
                        title="إدخال بنود التكاليف في القائمة المنسدلة"
                        aria-label="إدخال بنود التكاليف في القائمة المنسدلة"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </td>

                  {/* 5. هامش الربح / التكلفة */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        id="inline-input-cost"
                        value={newCost === '0' ? '' : newCost}
                        onFocus={(e) => {
                          if (e.target.value === '0' || e.target.value === '.') {
                            setNewCost('');
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d]/g, '');
                          const clean = raw.replace(/^0+/, '') || (raw === '0' ? '0' : '');
                          setNewCost(clean);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === ',') {
                            e.preventDefault();
                            return;
                          }
                          if (e.key === 'Enter') handleSaveInlineRow();
                          if (e.key === 'Escape') setIsAddingRow(false);
                        }}
                        placeholder="0"
                        className="w-16 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-bold text-center text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700"
                        title="التكلفة الإجمالية (لحساب هامش الربح تلقائياً)"
                      />
                      <span className="text-[11px] font-mono font-black text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        ={(Math.max(0, (Math.round(Number(newPrice)) || 0) - (Math.round(Number(newCost)) || 0))).toLocaleString()}
                      </span>
                    </div>
                  </td>

                  {/* 6. الملاحظات وزر الإلغاء والحفظ */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        id="inline-input-notes"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineRow();
                          if (e.key === 'Escape') setIsAddingRow(false);
                        }}
                        placeholder="أي ملاحظات إضافية..."
                        className="flex-1 glass-input rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        id="btn-cancel-inline-row"
                        onClick={() => setIsAddingRow(false)}
                        className="relative z-10 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        id="btn-save-inline-row"
                        onClick={handleSaveInlineRow}
                        className="relative z-10 cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors shrink-0 flex items-center gap-1"
                      >
                        <Check size={14} />
                        <span>حفظ</span>
                      </button>
                    </div>
                  </td>

                  {/* 7. عمود الإجراءات (فارغ أثناء الإضافة) */}
                  <td className="py-2 px-2 text-center print:hidden"></td>
                </tr>
              )}

              {/* ثالثاً (الأهم): اعرض رسالة "لا توجد فواتير مسجلة في شهر ..." فقط وحصرياً إذا كان السجل فارغاً و لم يكن المستخدم في وضع الإضافة */}
              {filteredGridOrders.length === 0 && !isAddingRow && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet size={32} className="text-slate-300 dark:text-slate-600" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        لا توجد فواتير مسجلة في شهر {formattedCurrentMonth}
                      </span>
                      <p className="text-xs text-slate-500">
                        يمكنك إضافة طلبيات جديدة أو اختيار شهر آخر من شريط التنقل أعلاه
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* ========================================================================= */}
            {/* 3. SUMMARY TOTALS ROW (Table Footer) */}
            {/* ========================================================================= */}
            {filteredGridOrders.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200/90 dark:bg-slate-800/95 font-black border-t-2 border-slate-300 dark:border-slate-700 text-xs select-none">
                  
                  {/* Drag column spacer */}
                  <td className="py-3 px-2 text-center border-l border-slate-300 dark:border-slate-700 text-slate-400 print:hidden">
                    -
                  </td>

                  {/* Checkbox column spacer */}
                  <td className="py-3 px-3 text-center border-l border-slate-300 dark:border-slate-700 text-slate-400">
                    -
                  </td>

                  {/* Columns 1-2: نوع الخدمة + اسم العميل Label */}
                  <td colSpan={2} className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700 font-bold">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>إجمالي الشهر ({actualOrdersCount} طلبية):</span>
                      <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">
                        مجموع القيم المحسوبة
                      </span>
                    </div>
                  </td>

                  {/* Column 3 Total: إجمالي الفواتير */}
                  <td className="py-3 px-4 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700">
                    {tableTotals.sumInvoices.toLocaleString()} <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">{currency}</span>
                  </td>

                  {/* Column 4: إجمالي المصاريف التشغيلية للشهر الحالي */}
                  <td className="py-3 px-3 text-center border-l border-slate-300 dark:border-slate-700">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">المصاريف التشغيلية</span>
                      <span className="font-mono font-black text-amber-800 dark:text-amber-300">
                        {totalMonthlyExpenses.toLocaleString()} <span className="text-[9px] font-normal opacity-75">{currency}</span>
                      </span>
                    </div>
                  </td>

                  {/* Column 5 Total: هامش الربح */}
                  <td 
                    title="إجمالي هامش الربح"
                    className={`py-3 px-3 text-center font-mono tabular-nums font-black border-l border-slate-300 dark:border-slate-700 ${
                    tableTotals.sumNetProfit >= 0 
                      ? 'text-indigo-800 dark:text-indigo-300' 
                      : 'text-rose-800 dark:text-rose-300'
                  }`}>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold opacity-80">هامش الربح</span>
                      <span>
                        {tableTotals.sumNetProfit >= 0 ? `+${tableTotals.sumNetProfit.toLocaleString()}` : tableTotals.sumNetProfit.toLocaleString()} <span className="text-[9px] font-normal opacity-80">{currency}</span>
                      </span>
                    </div>
                  </td>

                  {/* Column 6: صافي الربح الفعلي (هامش الربح - المصاريف التشغيلية) */}
                  <td className="py-3 px-3 text-center border-l border-slate-300 dark:border-slate-700">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">صافي الربح الفعلي</span>
                      <span className={`font-mono font-black ${
                        actualNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {actualNetProfit >= 0 ? `+${actualNetProfit.toLocaleString()}` : actualNetProfit.toLocaleString()} <span className="text-[9px] font-normal opacity-80">{currency}</span>
                      </span>
                    </div>
                  </td>

                  {/* Column 7: حذف (Footer Spacer) */}
                  <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500 print:hidden font-bold select-none">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* زر الإضافة الأخضر الدائري (+) مثبت ذكياً بحافة مساحة الجدول اليمنى السفلية */}
        <div className="sticky bottom-6 z-30 flex justify-start pointer-events-none -mt-14 mb-3 mr-4 print:hidden">
          <button
            type="button"
            id="btn-fab-add-invoice"
            onClick={handleTriggerAddRow}
            className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-95 text-white shadow-xl hover:shadow-2xl hover:shadow-emerald-600/50 border-2 border-white/40 dark:border-slate-700/60 flex items-center justify-center transition-all duration-300 cursor-pointer group focus:outline-hidden focus:ring-4 focus:ring-emerald-500/40"
            title="إضافة بند جديد (+)"
            aria-label="إضافة بند جديد"
          >
            <Plus 
              size={28} 
              className="text-white stroke-[2.75] transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:scale-110" 
            />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EXPANDED FINANCIAL SUMMARY & MONTHLY NOTES (شريط الإجماليات ومساحة الملاحظات) */}
      {/* ========================================================================= */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
        {/* بطاقة إجمالي الفواتير */}
        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">
            <span>إجمالي المبيعات (الفواتير)</span>
            <FileSpreadsheet size={15} className="text-slate-400 shrink-0" />
          </div>
          <div className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
            {tableTotals.sumInvoices.toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">عدد الفواتير: {actualOrdersCount}</span>
        </div>

        {/* بطاقة إجمالي هامش الربح */}
        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">
            <span>إجمالي هامش الربح</span>
            <TrendingUp size={15} className="text-indigo-500 shrink-0" />
          </div>
          <div className={`text-lg font-black font-mono ${tableTotals.sumNetProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {tableTotals.sumNetProfit >= 0 ? `+${tableTotals.sumNetProfit.toLocaleString()}` : tableTotals.sumNetProfit.toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">الأرباح التشغيلية للطلبيات</span>
        </div>

        {/* بطاقة إجمالي المصاريف التشغيلية */}
        <div className="glass-panel p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold mb-1">
            <span>إجمالي المصاريف التشغيلية</span>
            <Receipt size={15} className="text-amber-600 shrink-0" />
          </div>
          <div className="text-lg font-black font-mono text-amber-800 dark:text-amber-300">
            {totalMonthlyExpenses.toLocaleString()} <span className="text-xs font-normal text-amber-600/80">{currency}</span>
          </div>
          <span className="text-[10px] text-amber-600/70 mt-1">مصاريف شهر {formattedCurrentMonth}</span>
        </div>

        {/* بطاقة صافي الربح الفعلي */}
        <div className={`glass-panel p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${
          actualNetProfit >= 0 
            ? 'border-emerald-200/90 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20' 
            : 'border-rose-200/90 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={actualNetProfit >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}>
              صافي الربح الفعلي
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              actualNetProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
            }`}>
              (هامش الربح - المصاريف)
            </span>
          </div>
          <div className={`text-xl font-black font-mono ${actualNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {actualNetProfit >= 0 ? `+${actualNetProfit.toLocaleString()}` : actualNetProfit.toLocaleString()} <span className="text-xs font-normal opacity-80">{currency}</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">الربح الصافي النهائي بعد خصم كافة المصاريف</span>
        </div>
      </div>

      {/* مساحة ملاحظات واسعة ومرنة أسفل الجدول لتدوين الملاحظات العامة للشهر وتحديثها تلقائياً */}
      <div className="mt-3 glass-panel p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs print:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label htmlFor="monthly-general-notes" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
              <FileText size={15} className="text-slate-500 dark:text-slate-400" />
              <span>ملاحظات عامة لشهر {formattedCurrentMonth}</span>
            </label>
            <span className="text-[11px] text-slate-400 font-normal">
              (تدوين التوجيهات، الملاحظات الإدارية، وتسويات الشهر)
            </span>
          </div>
          {notesSaveStatus && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in flex items-center gap-1">
              <Check size={13} className="stroke-[3]" />
              <span>{notesSaveStatus}</span>
            </span>
          )}
        </div>
        <textarea
          id="monthly-general-notes"
          rows={3}
          value={monthlyNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder={`اكتب هنا أي ملاحظات، أهداف، أو تسويات تخص شهر ${formattedCurrentMonth}... يتم الحفظ تلقائياً.`}
          className="w-full glass-input rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500 resize-y min-h-[75px]"
        />
      </div>

      {/* Popover إدارة وتعديل بنود التكلفة العائم */}
      {activePopover && (
        <CostItemsPopover
          order={activePopover.order}
          currency={currency}
          position={activePopover.position}
          onClose={() => setActivePopover(null)}
          onSave={handleSaveOrderCosts}
        />
      )}
    </div>
  );
}
