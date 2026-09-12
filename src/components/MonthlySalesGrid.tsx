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
  CheckSquare,
  FileText,
  DollarSign
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppContext, defaultServicesConfig } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import CostItemsPopover from './CostItemsPopover';
import { getOrderTotalDetailCosts, getOrderNetProfit, isSponsoredAds } from '../utils/financialCalculations';
import ExchangeRateModal from './ExchangeRateModal';

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
    expenses,
    selectedDate,
    setSelectedDate,
    currentMonthExchangeRate,
    getExchangeRateForMonth,
    setMonthExchangeRate,
    exchangeRates
  } = useAppContext();

  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false);

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
    handleOpenSmartDuplicateModal(orderToDuplicate);
  };

  // حالة تمييز السطر بالكامل باللون البرتقالي عند النقر على نوع الخدمة
  const [orangeRowIds, setOrangeRowIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('masar_orange_rows');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  const handleToggleOrangeHighlight = (orderId: string | number) => {
    const idStr = String(orderId);
    setOrangeRowIds(prev => {
      const next = new Set(prev);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      try {
        localStorage.setItem('masar_orange_rows', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // نافذة النسخ الذكية وترحيل الفاتورة إلى شهر آخر
  const [duplicateModalOrder, setDuplicateModalOrder] = useState<Order | null>(null);
  const [targetDuplicateMonth, setTargetDuplicateMonth] = useState<string>('');
  const [resetPaidInDuplicate, setResetPaidInDuplicate] = useState<boolean>(true);

  // قائمة الأشهر المتاحة للترحيل (أشهر السنة الحالية والقادمة)
  const availableMonthsForDuplication = useMemo(() => {
    const base = new Date();
    const list: { key: string; label: string }[] = [];
    for (let i = -2; i <= 12; i++) {
      const d = addMonths(base, i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMMM yyyy', { locale: ar });
      list.push({ key, label });
    }
    return list;
  }, []);

  const handleOpenSmartDuplicateModal = (order: Order) => {
    setDuplicateModalOrder(order);
    const nextMonth = addMonths(selectedDate || new Date(), 1);
    setTargetDuplicateMonth(format(nextMonth, 'yyyy-MM'));
    setResetPaidInDuplicate(true);
  };

  const handleConfirmSmartDuplicate = () => {
    if (!duplicateModalOrder || !targetDuplicateMonth) return;
    
    const [yearStr, monthStr] = targetDuplicateMonth.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    
    // Create a date in that target month
    const targetDate = new Date(y, m, 1, 10, 0, 0);
    const newSerial = getNextSerialNumber();
    const duplicatedOrder: Omit<Order, 'id'> = {
      ...duplicateModalOrder,
      serialNumber: newSerial,
      date: targetDate.toISOString(),
      isPaid: resetPaidInDuplicate ? false : Boolean(duplicateModalOrder.isPaid),
      paidAt: resetPaidInDuplicate ? undefined : duplicateModalOrder.paidAt,
      deposit: resetPaidInDuplicate ? 0 : duplicateModalOrder.deposit,
      remaining: resetPaidInDuplicate ? duplicateModalOrder.price : duplicateModalOrder.remaining,
      pendingSync: true,
    };

    addOrder(duplicatedOrder, newSerial);

    const monthLabel = format(targetDate, 'MMMM yyyy', { locale: ar });
    alert(`تم نسخ الفاتورة وترحيلها بنجاح إلى شهر (${monthLabel}).`);
    setDuplicateModalOrder(null);
  };

  // نافذة إضافة بند فرعي جديد (+)
  const [subItemModalOrder, setSubItemModalOrder] = useState<Order | null>(null);
  const [subItemMode, setSubItemMode] = useState<'detail_cost' | 'sub_order'>('detail_cost');
  const [subItemName, setSubItemName] = useState('');
  const [subItemAmount, setSubItemAmount] = useState('');
  const [subItemCategory, setSubItemCategory] = useState<'design' | 'print' | 'external' | 'general'>('general');

  const handleOpenSubItemModal = (order: Order) => {
    setSubItemModalOrder(order);
    setSubItemMode('detail_cost');
    setSubItemName('');
    setSubItemAmount('');
    setSubItemCategory('general');
  };

  const handleConfirmAddSubItem = () => {
    if (!subItemModalOrder || !subItemName.trim()) return;
    const numAmount = parseFloat(subItemAmount) || 0;

    if (subItemMode === 'detail_cost') {
      const currentBreakdown = { ...(subItemModalOrder.costBreakdown || {}) };
      const currentDetails = { ...(subItemModalOrder.costDetails || {}) };
      const key = `item_${Date.now()}`;
      
      currentBreakdown[key] = numAmount;
      currentDetails[key] = {
        name: subItemName.trim(),
        amount: numAmount,
        type: subItemCategory,
      };

      const existingCost = getOrderTotalDetailCosts(subItemModalOrder);
      const newTotalCost = Number((existingCost + numAmount).toFixed(2));
      const price = typeof subItemModalOrder.price === 'number' ? subItemModalOrder.price : (parseFloat(String(subItemModalOrder.price || 0)) || 0);
      const newProfit = Number((price - newTotalCost).toFixed(2));

      const updatedOrderDetails = [
        subItemModalOrder.invoiceDetails || '',
        `+ ${subItemName.trim()} (${numAmount} ${currency})`
      ].filter(Boolean).join(' | ');

      const updates: Partial<Order> = {
        costBreakdown: currentBreakdown,
        costDetails: currentDetails,
        cost: newTotalCost,
        expectedProfit: newProfit,
        invoiceDetails: updatedOrderDetails,
      };

      const idStr = String(subItemModalOrder.id);
      const updated = invoices.map(o => String(o.id) === idStr ? { ...o, ...updates } : o);
      setInvoices(updated);
      try {
        localStorage.setItem('masar_invoices', JSON.stringify(updated));
        localStorage.setItem('masar_orders', JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving subitem updates:', err);
      }

      if (onUpdateOrder) {
        onUpdateOrder(idStr, updates);
      } else if (contextUpdateOrder) {
        contextUpdateOrder(idStr, updates);
      }
      alert(`تمت إضافة البند الفرعي "${subItemName.trim()}" إلى تكاليف الفاتورة بنجاح.`);
    } else {
      const newSerial = getNextSerialNumber();
      const newSubOrder: Omit<Order, 'id'> = {
        serialNumber: newSerial,
        clientName: subItemModalOrder.clientName,
        serviceType: subItemModalOrder.serviceType || 'خدمة إضافية',
        description: `بند فرعي تابع للفاتورة #${subItemModalOrder.serialNumber}: ${subItemName.trim()}`,
        price: numAmount,
        cost: 0,
        expectedProfit: numAmount,
        date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
        invoiceDetails: `بند فرعي تابع للفاتورة #${subItemModalOrder.serialNumber}: ${subItemName.trim()}`,
        isPaid: false,
        status: 'قيد التصميم',
        paymentMethod: 'نقدي',
        pendingSync: true,
      };

      addOrder(newSubOrder, newSerial);
      alert(`تم إنشاء طلبية فرعية جديدة برقم #${newSerial} للعميل ${subItemModalOrder.clientName}.`);
    }

    setSubItemModalOrder(null);
  };

  // حالة تحديد الصفوف (التحديد النشط باللون السماوي Cyan)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const handleToggleSelectRow = (orderId: string | number) => {
    const idStr = String(orderId);
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  };

  // دالة تبديل حالة الدفع من قبل الزبون مع الحفظ الفوري
  const handleTogglePaid = (orderId: string | number) => {
    const idStr = String(orderId);
    const target = invoices.find(o => String(o.id) === idStr);
    const currentlyPaid = target ? Boolean(target.isPaid) : false;
    const nextPaid = !currentlyPaid;

    const updated = invoices.map(o => {
      if (String(o.id) !== idStr) return o;
      return {
        ...o,
        isPaid: nextPaid,
        paidAt: nextPaid ? new Date().toISOString() : undefined,
        deposit: nextPaid ? o.price : (o.deposit === o.price ? 0 : o.deposit),
        remaining: nextPaid ? 0 : (o.remaining === 0 ? o.price : o.remaining),
      };
    });
    setInvoices(updated);
    try {
      localStorage.setItem('masar_invoices', JSON.stringify(updated));
      localStorage.setItem('masar_orders', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving updated paid status:', err);
    }

    if (onTogglePaid) {
      onTogglePaid(idStr);
    } else if (contextUpdateOrder) {
      const found = updated.find(o => String(o.id) === idStr);
      if (found) contextUpdateOrder(found);
    }
  };

  // معالجة جماعية للفواتير المحددة
  const handleBatchMarkPaid = (paid: boolean) => {
    const updated = invoices.map(o => {
      if (!selectedRowIds.has(String(o.id))) return o;
      return {
        ...o,
        isPaid: paid,
        paidAt: paid ? new Date().toISOString() : undefined,
        deposit: paid ? o.price : (o.deposit === o.price ? 0 : o.deposit),
        remaining: paid ? 0 : (o.remaining === 0 ? o.price : o.remaining),
      };
    });
    setInvoices(updated);
    try {
      localStorage.setItem('masar_invoices', JSON.stringify(updated));
      localStorage.setItem('masar_orders', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving batch paid status:', err);
    }

    selectedRowIds.forEach(id => {
      const target = invoices.find(o => String(o.id) === id);
      if (target && Boolean(target.isPaid) !== paid) {
        if (onTogglePaid) {
          onTogglePaid(id);
        } else if (contextUpdateOrder) {
          const found = updated.find(o => String(o.id) === id);
          if (found) contextUpdateOrder(found);
        }
      }
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowIds.size === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف ${selectedRowIds.size} فاتورة محددة؟`)) {
      const idsToDelete = Array.from(selectedRowIds);
      idsToDelete.forEach(id => handleDelete(String(id)));
      setSelectedRowIds(new Set());
    }
  };

  // ثالثاً: دالة تثبيت / فك تثبيت البند (Pin Row) للأشهر القادمة مع الحفظ الفوري في LocalStorage
  const handleTogglePin = (orderId: string) => {
    const idStr = String(orderId);
    const target = invoices.find(o => String(o.id) === idStr);
    const nextPinned = target ? !Boolean(target.isPinned) : true;

    // 1. تحديث الحالة المحلية فوراً
    const updated = invoices.map(o => String(o.id) === idStr ? { ...o, isPinned: nextPinned } : o);
    setInvoices(updated);
    try {
      localStorage.setItem('masar_invoices', JSON.stringify(updated));
      localStorage.setItem('masar_orders', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving updated pin status:', err);
    }

    // 2. تحديث الحالة العامة
    if (onTogglePinned) {
      onTogglePinned(idStr);
    } else if (contextToggleOrderPinned) {
      contextToggleOrderPinned(idStr);
    } else if (onUpdateOrder) {
      onUpdateOrder(idStr, { isPinned: nextPinned });
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
  const [newAdBudgetUsd, setNewAdBudgetUsd] = useState('');
  const [editAdBudgetUsd, setEditAdBudgetUsd] = useState('');

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

    if (isSponsoredAds(newService) && newAdBudgetUsd) {
      const rate = currentMonthExchangeRate || 1;
      const numUsd = parseFloat(newAdBudgetUsd) || 0;
      const convertedCost = Math.round(numUsd * rate);
      setNewCost(convertedCost > 0 ? String(convertedCost) : '');
      setNewDetails(`ميزانية إعلان ممول: ${newAdBudgetUsd}$ = ${convertedCost.toLocaleString()} ${currency}`);
    } else {
      setNewCost(totalCost > 0 ? String(totalCost) : '');
      setNewDetails(detailsList.join(' • '));
    }
  };

  const handleNewAdBudgetUsdChange = (usdVal: string) => {
    setNewAdBudgetUsd(usdVal);
    const rate = currentMonthExchangeRate || 1;
    const numUsd = parseFloat(usdVal) || 0;
    const convertedCost = Math.round(numUsd * rate);
    setNewCost(convertedCost > 0 ? String(convertedCost) : '');

    const updatedDetails = {
      ...(draftCostDetails || {}),
      'ميزانية الإعلان بالدولار': {
        amount: convertedCost,
        executor: `إعلانات ممولة ($${usdVal || '0'} × ${rate})`,
      }
    };
    const updatedBreakdown = {
      ...(draftCostBreakdown || {}),
      'ميزانية الإعلان بالدولار': convertedCost,
    };
    setDraftCostDetails(updatedDetails);
    setDraftCostBreakdown(updatedBreakdown);
    setNewDetails(`ميزانية إعلان ممول: ${usdVal}$ = ${convertedCost.toLocaleString()} ${currency}`);
  };

  const handleEditAdBudgetUsdChange = (usdVal: string) => {
    setEditAdBudgetUsd(usdVal);
    const rate = currentMonthExchangeRate || 1;
    const numUsd = parseFloat(usdVal) || 0;
    const convertedCost = Math.round(numUsd * rate);
    setEditCost(convertedCost > 0 ? String(convertedCost) : '');
    setEditDetails(`ميزانية إعلان ممول: ${usdVal}$ = ${convertedCost.toLocaleString()} ${currency}`);
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

    // Ad Budget USD initialization
    if (order.adBudgetUsd !== undefined && order.adBudgetUsd > 0) {
      setEditAdBudgetUsd(String(order.adBudgetUsd));
    } else if (isSponsoredAds(order.serviceType)) {
      const rate = order.adExchangeRate || currentMonthExchangeRate || 1;
      const calcUsd = rate > 0 ? Math.round((order.cost || 0) / rate) : 0;
      setEditAdBudgetUsd(calcUsd > 0 ? String(calcUsd) : '');
    } else {
      setEditAdBudgetUsd('');
    }

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
    const parsedPrice = parseFloat(editPrice) || 0;
    const parsedCost = parseFloat(editCost) || 0;
    const expectedProfit = parsedPrice - parsedCost;

    const isAd = isSponsoredAds(editServiceType);
    const usdBudget = parseFloat(editAdBudgetUsd) || (isAd && currentMonthExchangeRate > 0 ? Math.round(parsedCost / currentMonthExchangeRate) : undefined);

    const updates: Partial<Order> = {
      serviceType: editServiceType,
      clientName: trimmedClient || 'عميل نقدي',
      price: parsedPrice,
      cost: parsedCost,
      expectedProfit,
      invoiceDetails: editDetails.trim() ? editDetails.split(/[\n•,]+/).map(s => s.trim()).filter(Boolean) : undefined,
      notes: editNotes.trim() ? editNotes.trim() : undefined,
      ...(isAd ? {
        adBudgetUsd: usdBudget,
        adExchangeRate: currentMonthExchangeRate || undefined,
      } : {}),
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
    const parsedPrice = parseFloat(newPrice) || 0;
    
    // Save if client name or price entered
    if (!trimmedClient && parsedPrice <= 0) {
      return;
    }

    const parsedCost = parseFloat(newCost) || 0;
    const expectedProfit = parsedPrice - parsedCost;
    const autoSerial = getNextSerialNumber ? getNextSerialNumber() : `INV-${Date.now().toString().slice(-4)}`;

    const isAd = isSponsoredAds(newServiceType);
    const usdBudget = parseFloat(newAdBudgetUsd) || (isAd && currentMonthExchangeRate > 0 ? Math.round(parsedCost / currentMonthExchangeRate) : undefined);

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
      adBudgetUsd: isAd ? usdBudget : undefined,
      adExchangeRate: isAd ? (currentMonthExchangeRate || undefined) : undefined,
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

  // Orders filtered by the selected month & excluding deleted rows (respecting pinned recurring contracts)
  // منطق ميزة التثبيت (الاشتراكات المتكررة عبر الأشهر):
  // الفاتورة المثبتة تتجاوز حاجز الشهر الحالي؛ بحيث إذا تم تثبيت فاتورة، تظهر تلقائياً في مقدمة القائمة
  // عند انتقال المستخدم إلى الأشهر القادمة (تعمل كعقد مستمر أو اشتراك شهري).
  // عند جلب بيانات شهر معين، اجلب معه جميع الفواتير المثبتة من الأشهر السابقة واعرضها في أعلى الجدول،
  // وتُحتسب قيمها المالية (الإجمالي، التكلفة، هامش الربح) ضمن مجاميع الشهر الجديد الذي تُعرض فيه.
  const monthlyOrders = useMemo(() => {
    const list = invoices
      .filter(order => !deletedRowIds.some(dId => String(dId) === String(order.id)))
      .filter(order => {
        try {
          const orderDate = parseISO(order.date);
          if (isNaN(orderDate.getTime())) return false;

          // 1. الفواتير التابعة للشهر المحدد حالياً
          const isInCurrentMonth = isWithinInterval(orderDate, { start: currentMonthStart, end: currentMonthEnd });
          if (isInCurrentMonth) return true;

          // 2. الفواتير المثبتة: تنتقل للأشهر القادمة وتظهر دائماً في أعلى الجدول
          if (order.isPinned) {
            return true;
          }

          return false;
        } catch {
          return false;
        }
      });

    // ترتيب القائمة: الفواتير المثبتة في أعلى الجدول دائماً (في المقدمة)
    const customOrderMap = new Map<string, number>();
    if (customOrderIds.length > 0) {
      customOrderIds.forEach((id, idx) => customOrderMap.set(String(id), idx));
    }

    return [...list].sort((a, b) => {
      // 1. الفواتير المثبتة تأتي أولاً في أعلى الجدول
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) {
        return bPinned - aPinned; // pinned first
      }

      // 2. الترتيب المخصص إذا وجد
      if (customOrderIds.length > 0) {
        const strA = String(a.id);
        const strB = String(b.id);
        const idxA = customOrderMap.has(strA) ? customOrderMap.get(strA)! : 999999;
        const idxB = customOrderMap.has(strB) ? customOrderMap.get(strB)! : 999999;
        if (idxA !== idxB) {
          return idxA - idxB;
        }
      }

      // 3. الترتيب الزمني الافتراضي: الأحدث أولاً
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

  // حالة تحديد الكل للفواتير الظاهرة
  const isAllSelected = useMemo(() => {
    const visibleOrders = filteredGridOrders.filter(o => !isSummaryOrTotalRow(o));
    if (visibleOrders.length === 0) return false;
    return visibleOrders.every(o => selectedRowIds.has(String(o.id)));
  }, [filteredGridOrders, selectedRowIds]);

  const handleToggleSelectAll = () => {
    const visibleOrders = filteredGridOrders.filter(o => !isSummaryOrTotalRow(o));
    if (isAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(visibleOrders.map(o => String(o.id))));
    }
  };

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

  // مساحة الملاحظات العامة للشهر المحدد وربطها وحفظها في Supabase (Persistence)
  const selectedYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  const selectedMonth = selectedDate ? selectedDate.getMonth() + 1 : new Date().getMonth() + 1;
  const monthKey = useMemo(() => `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`, [selectedYear, selectedMonth]);
  const legacyMonthKey = useMemo(() => format(selectedDate, 'yyyy_MM'), [selectedDate]);

  const [monthlyNotes, setMonthlyNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(`masar_monthly_notes_${monthKey}`) || 
             localStorage.getItem(`masar_monthly_notes_${legacyMonthKey}`) || '';
    } catch {
      return '';
    }
  });
  const [notesSaveStatus, setNotesSaveStatus] = useState<string>('');
  const notesDebounceTimerRef = React.useRef<any>(null);
  const currentNotesTextRef = React.useRef<string>(monthlyNotes);

  // دالة الحفظ السحابي في Supabase مع التخزين المحلي التلقائي
  const persistNotesToCloud = async (textToSave: string) => {
    try {
      localStorage.setItem(`masar_monthly_notes_${monthKey}`, textToSave);
    } catch {}

    if (isSupabaseConfigured) {
      setNotesSaveStatus('جاري الحفظ سحابياً...');
      try {
        const payload = {
          id: `note-${monthKey}`,
          month_key: monthKey,
          month: selectedMonth,
          year: selectedYear,
          notes: textToSave,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('monthly_notes')
          .upsert(payload, { onConflict: 'month_key' });

        if (error) {
          console.warn('Supabase upsert monthly_notes warning:', error);
          setNotesSaveStatus('تم الحفظ محلياً');
        } else {
          setNotesSaveStatus('تم الحفظ في السحابة');
        }
      } catch (err) {
        console.warn('Network / Supabase error saving notes:', err);
        setNotesSaveStatus('تم الحفظ محلياً');
      }
    } else {
      setNotesSaveStatus('تم الحفظ تلقائياً');
    }

    setTimeout(() => {
      setNotesSaveStatus('');
    }, 2500);
  };

  // استدعاء الملاحظات الخاصة بالشهر المحدد فور فتح الصفحة وتغيير الشهر
  useEffect(() => {
    // 1. استرجاع الكاش المحلي فوراً
    let cached = '';
    try {
      cached = localStorage.getItem(`masar_monthly_notes_${monthKey}`) || 
               localStorage.getItem(`masar_monthly_notes_${legacyMonthKey}`) || '';
      setMonthlyNotes(cached);
      currentNotesTextRef.current = cached;
      setNotesSaveStatus('');
    } catch {}

    // 2. جلب الملاحظات المسجلة في Supabase للشهر والسنة المحددة
    let isCancelled = false;
    const fetchRemoteNotes = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('monthly_notes')
          .select('*')
          .eq('month_key', monthKey)
          .maybeSingle();

        if (!isCancelled && !error && data) {
          const remoteNotes = data.notes ?? data.note ?? '';
          if (typeof remoteNotes === 'string') {
            setMonthlyNotes(remoteNotes);
            currentNotesTextRef.current = remoteNotes;
            try {
              localStorage.setItem(`masar_monthly_notes_${monthKey}`, remoteNotes);
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Supabase fetch notes error:', err);
      }
    };

    fetchRemoteNotes();

    return () => {
      isCancelled = true;
      if (notesDebounceTimerRef.current) {
        clearTimeout(notesDebounceTimerRef.current);
      }
    };
  }, [monthKey, legacyMonthKey, selectedYear, selectedMonth]);

  // الاستماع لتحديثات الملاحظات العامة عند الاستيراد التلقائي
  useEffect(() => {
    const handleNotesUpdated = (e: any) => {
      const targetKey = e?.detail?.monthKey;
      if (!targetKey || targetKey === monthKey) {
        const refreshed = localStorage.getItem(`masar_monthly_notes_${monthKey}`) || 
                          localStorage.getItem(`masar_monthly_notes_${legacyMonthKey}`) || '';
        setMonthlyNotes(refreshed);
        currentNotesTextRef.current = refreshed;
      }
    };
    window.addEventListener('masar_notes_updated', handleNotesUpdated);
    window.addEventListener('storage', handleNotesUpdated);
    return () => {
      window.removeEventListener('masar_notes_updated', handleNotesUpdated);
      window.removeEventListener('storage', handleNotesUpdated);
    };
  }, [monthKey, legacyMonthKey]);

  // تحديث النص مع Debounce تلقائي أثناء الكتابة
  const handleNotesChange = (val: string) => {
    setMonthlyNotes(val);
    currentNotesTextRef.current = val;
    try {
      localStorage.setItem(`masar_monthly_notes_${monthKey}`, val);
    } catch {}

    if (notesDebounceTimerRef.current) {
      clearTimeout(notesDebounceTimerRef.current);
    }

    setNotesSaveStatus('جاري الكتابة...');
    notesDebounceTimerRef.current = setTimeout(() => {
      persistNotesToCloud(val);
    }, 1200);
  };

  // حفظ فوري عند انتهاء المستخدم من الكتابة وخروج مؤشر الفأرة (onBlur)
  const handleNotesBlur = () => {
    if (notesDebounceTimerRef.current) {
      clearTimeout(notesDebounceTimerRef.current);
    }
    persistNotesToCloud(currentNotesTextRef.current);
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

            {/* Action Buttons: Exchange Rate, Export Excel & Print */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* زر ومؤشر سعر صرف الدولار للشهر الحالي */}
              <button
                type="button"
                id="btn-open-exchange-rate-modal"
                onClick={() => setShowExchangeRateModal(true)}
                className="relative z-10 cursor-pointer py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 shadow-2xs transition-colors"
                title="تحديد أو تعديل سعر صرف الدولار المعتمد لهذا الشهر"
              >
                <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                <span>صرف $:</span>
                <span className="font-mono font-black">
                  {currentMonthExchangeRate > 0 ? `${currentMonthExchangeRate.toLocaleString()} ${currency}` : 'تحديد'}
                </span>
              </button>

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
      <div className="glass-panel rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        
        {/* Printable Header (Visible only when printing) */}
        <div className="hidden print:block p-4 border-b border-slate-200 text-center">
          <h2 className="text-xl font-bold">تقرير سجل الفواتير الشهري</h2>
          <p className="text-sm text-slate-600 mt-1">الفترة: {formattedCurrentMonth} | إجمالي الفواتير: {tableTotals.sumInvoices.toLocaleString()} {currency} | هامش الربح: {tableTotals.sumNetProfit.toLocaleString()} {currency}</p>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse text-xs min-w-[950px]">
            <thead className="sticky top-0 z-20 backdrop-blur-sm shadow-xs">
              <tr className="bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold select-none">
                
                {/* 0. أيقونة السحب والترتيب اليدوي في بداية الجدول (أقصى اليمين) */}
                <th scope="col" className="py-3 px-2 border-l border-slate-200/80 dark:border-slate-700 w-10 text-center select-none print:hidden">
                  <span className="sr-only">ترتيب الصفوف</span>
                  <GripVertical size={16} className="mx-auto text-slate-400 dark:text-slate-500" />
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
                <th scope="col" className="py-3 px-4 font-bold min-w-[200px] border-l border-slate-200/80 dark:border-slate-700 text-center">
                  الملاحظات
                </th>

                {/* 7. إجراءات السطر في أقصى اليسار */}
                <th scope="col" className="py-3 px-2 text-center font-bold min-w-[85px] w-24 print:hidden select-none">
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
                      className="bg-blue-50/70 dark:bg-blue-950/40 border-y-2 border-blue-400 dark:border-blue-500 shadow-inner animate-in fade-in duration-150"
                    >
                      {/* عمود فارغ للسحب أثناء التعديل المباشر */}
                      <td className="py-2 px-2 border-l border-blue-200 dark:border-blue-800 text-center print:hidden"></td>

                      {/* 1. نوع الخدمة */}
                      <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                        <div className="relative">
                          <select
                            id={`edit-select-service-${order.id}`}
                            value={editServiceType}
                            onChange={(e) => handleEditServiceChange(order.id, e.target.value)}
                            className="w-full glass-input rounded-lg pr-2 pl-6 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 text-center"
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
                      <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
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
                          className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </td>

                      {/* 3. إجمالي الفاتورة */}
                      <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                        <input
                          type="number"
                          id={`edit-input-price-${order.id}`}
                          step="any"
                          value={editPrice === '0' ? '' : editPrice}
                          onFocus={(e) => {
                            if (e.target.value === '0' || e.target.value === '.') {
                              setEditPrice('');
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditPrice(val === '.' ? '' : val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(order.id);
                            if (e.key === 'Escape') handleCancelEdit();
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
                            id={`edit-input-details-${order.id}`}
                            value={editDetails}
                            onChange={(e) => setEditDetails(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(order.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            placeholder="المقاس، الألوان..."
                            className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-center text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            id={`btn-edit-costs-popover-${order.id}`}
                            onClick={(e) => handleOpenPopover(order, e)}
                            className="w-7 h-7 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs"
                            title="إدخال وتعديل التكاليف في القائمة المنسدلة"
                            aria-label="إدخال وتعديل التكاليف في القائمة المنسدلة"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </td>

                      {/* 5. صافي الربح / التكلفة أو ميزانية الدولار للإعلانات الممولة */}
                      <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                        {isSponsoredAds(editServiceType) ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1" title={`سعر صرف الدولار المعتمد: ${currentMonthExchangeRate || 1} ${currency}`}>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">$</span>
                              <input
                                type="number"
                                id={`edit-input-ad-budget-usd-${order.id}`}
                                step="any"
                                value={editAdBudgetUsd}
                                onChange={(e) => handleEditAdBudgetUsdChange(e.target.value)}
                                placeholder="الميزانية $"
                                className="w-20 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-black text-center text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-600 focus:ring-2 focus:ring-emerald-500"
                                title="ميزانية الإعلان بالدولار (تحسب التكلفة تلقائياً بضربها في سعر الصرف)"
                              />
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                              <span>تكلفة:</span>
                              <span className="text-rose-600 dark:text-rose-400 font-black">{editCost ? Number(editCost).toLocaleString() : '0'}</span>
                              <span>ربح:</span>
                              <span className={`font-black ${currentProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                {currentProfit.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              id={`edit-input-cost-${order.id}`}
                              step="any"
                              value={editCost === '0' ? '' : editCost}
                              onFocus={(e) => {
                                if (e.target.value === '0' || e.target.value === '.') {
                                  setEditCost('');
                                }
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditCost(val === '.' ? '' : val);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(order.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              placeholder="0"
                              className="w-16 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-bold text-center text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700"
                              title="التكلفة الإجمالية (لحساب صافي الربح تلقائياً)"
                            />
                            <span className={`text-[11px] font-mono font-black whitespace-nowrap ${
                              currentProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                            }`}>
                              ={currentProfit.toLocaleString()}
                            </span>
                          </div>
                        )}
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
                            className="flex-1 glass-input rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
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

                      {/* 7. عمود الإجراءات: حفظ وإلغاء التعديل */}
                      <td className="py-2 px-2 text-center print:hidden">
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
                    </tr>
                  );
                }

                // وضع العرض العادي (Normal Display Mode)
                const isSelected = selectedRowIds.has(String(order.id));
                const isPaidByClient = Boolean(order.isPaid);
                const actualCost = getOrderTotalDetailCosts(order);
                const netProfit = getOrderNetProfit(order);
                
                // تفاصيل الفاتورة المحفوظة لعرضها كبطاقات عمودية نظيفة
                const detailsItems = getOrderInvoiceDetailsList(order);

                // حقل الملاحظات مستقل تماماً ولا يتكرر فيه نوع الخدمة أو أي بيانات أخرى
                const displayedNotes = (order.notes || '').trim();

                // 1. تحديد نمط ولون الصف:
                // التفاعل بسيط ومباشر: عند النقر على أي مكان في صف الفاتورة لتحديده، يتغير لون خلفية الصف بالكامل إلى البرتقالي (Orange) فقط
                const isRowSelected = selectedRowIds.has(String(order.id)) || orangeRowIds.has(String(order.id));
                let rowBgClass = '';
                if (dragOverOrderId === order.id && draggedOrderId !== order.id) {
                  rowBgClass = 'border-t-2 border-orange-500 dark:border-orange-400 bg-orange-50/70 dark:bg-orange-900/30';
                } else if (draggedOrderId === order.id) {
                  rowBgClass = 'opacity-40 bg-slate-100 dark:bg-slate-800';
                } else if (isRowSelected) {
                  // التحديد النشط: اللون البرتقالي (Orange) فقط للصف بالكامل
                  rowBgClass = 'bg-orange-100/95 dark:bg-orange-950/80 text-orange-950 dark:text-orange-100 border-r-4 border-r-orange-500 hover:bg-orange-200/90 dark:hover:bg-orange-900/80 ring-1 ring-orange-400/50 shadow-xs';
                } else if (order.isUnderReview) {
                  rowBgClass = 'bg-rose-50/70 dark:bg-rose-950/40 text-slate-900 dark:text-slate-100 border-r-4 border-r-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/50';
                } else {
                  rowBgClass = index % 2 === 0 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50/90 dark:hover:bg-slate-800/60' 
                    : 'bg-slate-50/40 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 hover:bg-slate-50/90 dark:hover:bg-slate-800/60';
                }

                return (
                  <tr 
                    key={order.id}
                    onDragOver={(e) => handleDragOver(e, order.id)}
                    onDrop={(e) => handleDrop(e, order.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (!isTotalRow) {
                        handleToggleSelectRow(order.id);
                      }
                    }}
                    className={`transition-all duration-150 group cursor-pointer ${rowBgClass}`}
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

                    {/* 1. نوع الخدمة */}
                    <td 
                      className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-center select-none"
                    >
                      <div className="relative inline-block w-full max-w-[175px]" onClick={(e) => e.stopPropagation()}>
                        <select
                          id={`select-service-${order.id}`}
                          value={order.serviceType || availableServices[0]?.name || 'لافتة إعلانية'}
                          onChange={(e) => {
                            handleServiceChange(order.id, e.target.value);
                          }}
                          className={`w-full text-center text-xs font-bold py-1.5 pr-2 pl-6 rounded-lg border appearance-none cursor-pointer transition-colors shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden ${getServiceSelectClass(order.serviceType)}`}
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
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 select-none shadow-2xs shrink-0"
                              title="اشتراك شهري مثبت / عقد متكرر مستمر في الأشهر القادمة"
                            >
                              <Pin size={10} className="text-amber-600 dark:text-amber-400 fill-amber-500/30 shrink-0" />
                              <span>عقد مستمر</span>
                            </span>
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
                    <td className="py-3 px-4 max-w-[260px] border-l border-slate-200/60 dark:border-slate-800 text-center">
                      {displayedNotes ? (
                        <span 
                          className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate block max-w-[250px] mx-auto text-center cursor-help hover:text-slate-900 dark:hover:text-white"
                          title={displayedNotes}
                        >
                          {displayedNotes}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300 dark:text-slate-600 select-none block text-center">
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

                          {/* ثانياً: أيقونة نسخ وترحيل الفاتورة إلى شهر آخر (Copy Modal) */}
                          <button
                            type="button"
                            id={`btn-duplicate-order-${order.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSmartDuplicateModal(order);
                            }}
                            className="relative z-10 cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
                            title="نسخ وترحيل الفاتورة إلى شهر آخر"
                            aria-label={`نسخ وترحيل فاتورة ${order.clientName}`}
                          >
                            <Copy size={15} />
                          </button>

                          {/* ثالثاً: أيقونة تمييز الفاتورة تحت المراجعة (AlertCircle) */}
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
                      type="number"
                      id="inline-input-price"
                      step="any"
                      value={newPrice === '0' ? '' : newPrice}
                      onFocus={(e) => {
                        if (e.target.value === '0' || e.target.value === '.') {
                          setNewPrice('');
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewPrice(val === '.' ? '' : val);
                      }}
                      onKeyDown={(e) => {
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

                  {/* 5. صافي الربح / التكلفة أو ميزانية الدولار للإعلانات الممولة */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                    {isSponsoredAds(newServiceType) ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1" title={`سعر صرف الدولار المعتمد: ${currentMonthExchangeRate || 1} ${currency}`}>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">$</span>
                          <input
                            type="number"
                            id="inline-input-ad-budget-usd"
                            step="any"
                            value={newAdBudgetUsd}
                            onChange={(e) => handleNewAdBudgetUsdChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineRow();
                              if (e.key === 'Escape') setIsAddingRow(false);
                            }}
                            placeholder="الميزانية $"
                            className="w-20 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-black text-center text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-600 focus:ring-2 focus:ring-emerald-500"
                            title="ميزانية الإعلان بالدولار (تحسب التكلفة تلقائياً بضربها في سعر الصرف)"
                          />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          <span>تكلفة:</span>
                          <span className="text-rose-600 dark:text-rose-400 font-black">{newCost ? Number(newCost).toLocaleString() : '0'}</span>
                          <span>ربح:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-black">
                            {(Math.max(0, (parseFloat(newPrice) || 0) - (parseFloat(newCost) || 0))).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="number"
                          id="inline-input-cost"
                          step="any"
                          value={newCost === '0' ? '' : newCost}
                          onFocus={(e) => {
                            if (e.target.value === '0' || e.target.value === '.') {
                              setNewCost('');
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewCost(val === '.' ? '' : val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineRow();
                            if (e.key === 'Escape') setIsAddingRow(false);
                          }}
                          placeholder="0"
                          className="w-16 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-bold text-center text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700"
                          title="التكلفة الإجمالية (لحساب صافي الربح تلقائياً)"
                        />
                        <span className="text-[11px] font-mono font-black text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          ={(Math.max(0, (parseFloat(newPrice) || 0) - (parseFloat(newCost) || 0))).toLocaleString()}
                        </span>
                      </div>
                    )}
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

                  {/* 7. عمود الإجراءات أثناء الإضافة: حفظ وإلغاء */}
                  <td className="py-2 px-2 text-center print:hidden">
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
                </tr>
              )}

              {/* ثالثاً (الأهم): اعرض رسالة "لا توجد فواتير مسجلة في شهر ..." فقط وحصرياً إذا كان السجل فارغاً و لم يكن المستخدم في وضع الإضافة */}
              {filteredGridOrders.length === 0 && !isAddingRow && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet size={32} className="text-slate-300 dark:text-slate-600" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        لا توجد فواتير مسجلة في شهر {formattedCurrentMonth}
                      </span>
                      <p className="text-xs text-slate-500">
                        يمكنك إضافة طلبيات جديدة أو اختيار شهر آخر من شريط التنقل أعلاه
                      </p>
                      <button
                        type="button"
                        id="btn-empty-add-invoice"
                        onClick={handleTriggerAddRow}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>إضافة فاتورة الآن</span>
                      </button>
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
                  <td className="py-3 px-2 text-center border-l border-slate-300 dark:border-slate-700 text-slate-400 print:hidden select-none">
                    -
                  </td>

                  {/* الخلية أقصى اليمين (تحت عمود نوع الخدمة): زر إضافة فاتورة النصي الأخضر */}
                  <td className="py-2.5 px-3 border-l border-slate-300 dark:border-slate-700 text-center">
                    <button
                      type="button"
                      id="btn-footer-add-invoice"
                      onClick={handleTriggerAddRow}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      title="إضافة فاتورة جديدة إلى السجل"
                    >
                      <Plus size={14} className="stroke-[2.5]" />
                      <span>إضافة فاتورة</span>
                    </button>
                  </td>

                  {/* Column 2: اسم العميل (تسمية إجمالي الشهر) */}
                  <td className="py-3 px-3 text-center text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700 font-bold">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xs">إجمالي الشهر ({actualOrdersCount} طلبية)</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        مجموع القيم
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

                  {/* Column 7: أقصى اليسار تحت عمود الإجراءات (فاصل) */}
                  <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500 print:hidden font-bold select-none">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
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
          onBlur={handleNotesBlur}
          placeholder={`اكتب هنا أي ملاحظات، أهداف، أو تسويات تخص شهر ${formattedCurrentMonth}... يتم الحفظ تلقائياً في السحابة.`}
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

      {/* نافذة تسعير وتعديل سعر صرف الدولار للشهر */}
      <ExchangeRateModal
        forceOpen={showExchangeRateModal}
        onClose={() => setShowExchangeRateModal(false)}
      />

      {/* ========================================================================= */}
      {/* 1. نافذة النسخ الذكية وترحيل الفاتورة إلى شهر آخر (Smart Duplicate Modal) */}
      {/* ========================================================================= */}
      {duplicateModalOrder && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDuplicateModalOrder(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Copy size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">نسخ وترحيل الفاتورة إلى شهر آخر</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تكرار الفاتورة في قاعدة البيانات للشهر المختار</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Invoice Summary Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">العميل:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{duplicateModalOrder.clientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">نوع الخدمة:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{duplicateModalOrder.serviceType || 'لافتة إعلانية'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">المبلغ:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {Number(duplicateModalOrder.price || 0).toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              {/* Month Selection */}
              <div>
                <label htmlFor="target-duplicate-month" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  اختر الشهر المستهدف للترحيل:
                </label>
                <select
                  id="target-duplicate-month"
                  value={targetDuplicateMonth}
                  onChange={(e) => setTargetDuplicateMonth(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500"
                >
                  {availableMonthsForDuplication.map(m => (
                    <option key={m.key} value={m.key} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {m.label} ({m.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* Option: reset paid status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="checkbox-reset-paid"
                  checked={resetPaidInDuplicate}
                  onChange={(e) => setResetPaidInDuplicate(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500 accent-cyan-600 cursor-pointer"
                />
                <label htmlFor="checkbox-reset-paid" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  تعيين حالة الفاتورة كـ "غير مدفوع" في الشهر الجديد
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-5 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                id="btn-confirm-duplicate-month"
                onClick={handleConfirmSmartDuplicate}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>تأكيد النسخ والترحيل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. نافذة إضافة بند فرعي جديد (Add Sub-Item Modal) */}
      {/* ========================================================================= */}
      {subItemModalOrder && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSubItemModalOrder(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Plus size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">إضافة بند فرعي جديد</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    فاتورة #{subItemModalOrder.serialNumber} - {subItemModalOrder.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubItemModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Mode Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSubItemMode('detail_cost')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                    subItemMode === 'detail_cost'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  بند تكلفة تفصيلي
                </button>
                <button
                  type="button"
                  onClick={() => setSubItemMode('sub_order')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                    subItemMode === 'sub_order'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  طلبية فرعية مستقلة
                </button>
              </div>

              {/* Form fields */}
              <div>
                <label htmlFor="subitem-title-input" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  بيان / اسم البند الفرعي:
                </label>
                <input
                  type="text"
                  id="subitem-title-input"
                  value={subItemName}
                  onChange={(e) => setSubItemName(e.target.value)}
                  placeholder="مثلاً: طباعة ستيكر إضافي، تصميم شعار، تركيب خارجي..."
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="subitem-amount-input" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {subItemMode === 'detail_cost' ? `تكلفة البند (${currency}):` : `سعر الطلبية الفرعية (${currency}):`}
                </label>
                <input
                  type="number"
                  id="subitem-amount-input"
                  step="any"
                  value={subItemAmount}
                  onChange={(e) => setSubItemAmount(e.target.value)}
                  placeholder="0"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-left"
                />
              </div>

              {subItemMode === 'detail_cost' && (
                <div>
                  <label htmlFor="subitem-category-select" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    تصنيف بند التكلفة:
                  </label>
                  <select
                    id="subitem-category-select"
                    value={subItemCategory}
                    onChange={(e: any) => setSubItemCategory(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="general">تكلفة عامة إضافية</option>
                    <option value="design">تكلفة تصميم</option>
                    <option value="print">تكلفة طباعة</option>
                    <option value="external">تكلفة خارجية / تركيب</option>
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-5 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubItemModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                id="btn-confirm-add-subitem"
                disabled={!subItemName.trim()}
                onClick={handleConfirmAddSubItem}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>إضافة البند الفرعي</span>
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
