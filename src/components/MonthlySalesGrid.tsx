import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, ServiceType } from '../types';
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
  Pencil
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import CostItemsPopover from './CostItemsPopover';

interface MonthlySalesGridProps {
  orders: Order[];
  currency: string;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void;
  onPrintOrder?: (order: Order) => void;
  onShareWhatsApp?: (order: Order) => void;
  onViewDesign?: (order: Order) => void;
  onViewOrderDetails?: (order: Order) => void;
  onTogglePaid?: (orderId: string) => void;
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
  isAddingRow: propIsAddingRow,
  setIsAddingRow: propSetIsAddingRow,
}: MonthlySalesGridProps) {
  const { 
    updateOrder: contextUpdateOrder, 
    addOrder, 
    getNextSerialNumber, 
    settings, 
    employees 
  } = useAppContext();

  // Controlled or Internal State for adding new inline row
  const [internalIsAddingRow, setInternalIsAddingRow] = useState(false);
  const isAddingRow = propIsAddingRow !== undefined ? propIsAddingRow : internalIsAddingRow;
  const setIsAddingRow = propSetIsAddingRow || setInternalIsAddingRow;

  // Form Fields for new inline row
  const [newServiceType, setNewServiceType] = useState('لافتة إعلانية');
  const [newClientName, setNewClientName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Draft cost items when adding a new row via popover
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

  const draftNewOrder: Order = useMemo(() => ({
    id: 'draft-new-order',
    clientName: newClientName.trim() || 'طلب جديد',
    price: parseFloat(newPrice) || 0,
    cost: parseFloat(newCost) || 0,
    description: newDetails.trim() || 'طلب جديد',
    invoiceDetails: newDetails.trim() ? newDetails.split(/[\n•,]+/).map(s => s.trim()).filter(Boolean) : undefined,
    serviceType: newServiceType,
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
    const parsedPrice = parseFloat(editPrice) || 0;
    const parsedCost = parseFloat(editCost) || 0;
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
    const parsedPrice = parseFloat(newPrice) || 0;
    
    // Save if client name or price entered
    if (!trimmedClient && parsedPrice <= 0) {
      return;
    }

    const parsedCost = parseFloat(newCost) || 0;
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
    setNewClientName('');
    setNewPrice('');
    setNewDetails('');
    setNewCost('');
    setNewNotes('');
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
      order,
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

    // Include all months from orders
    orders.forEach(o => {
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
  }, [orders]);

  // Selected Month bounds
  const currentMonthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const currentMonthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);
  const formattedCurrentMonth = useMemo(() => format(selectedDate, 'MMMM yyyy', { locale: ar }), [selectedDate]);

  // Orders filtered by the selected month
  const monthlyOrders = useMemo(() => {
    return orders.filter(order => {
      try {
        const orderDate = parseISO(order.date);
        if (isNaN(orderDate.getTime())) return false;
        return isWithinInterval(orderDate, { start: currentMonthStart, end: currentMonthEnd });
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [orders, currentMonthStart, currentMonthEnd]);

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
  const tableTotals = useMemo(() => {
    let sumInvoices = 0;
    let sumTotalCosts = 0;
    let sumDesign = 0;
    let sumPrinting = 0;
    let sumExternal = 0;
    let sumNetProfit = 0;

    filteredGridOrders.forEach(order => {
      const p = order.price || 0;
      const dCost = order.designCost || 0;
      const prCost = order.printingCost || 0;
      const exCost = order.externalCost || 0;
      const itemCostSum = dCost + prCost + exCost;
      const actualCost = itemCostSum > 0 ? itemCostSum : (order.cost || 0);
      const netProfit = order.expectedProfit !== undefined ? order.expectedProfit : (p - actualCost);

      sumInvoices += p;
      sumTotalCosts += actualCost;
      sumDesign += dCost;
      sumPrinting += prCost;
      sumExternal += exCost;
      sumNetProfit += netProfit;
    });

    return {
      sumInvoices,
      sumTotalCosts,
      sumDesign,
      sumPrinting,
      sumExternal,
      sumNetProfit,
    };
  }, [filteredGridOrders]);

  // Export Monthly Data Grid to CSV
  const handleExportCSV = () => {
    if (filteredGridOrders.length === 0) return;

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
                className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="الشهر السابق"
                aria-label="الشهر السابق"
              >
                <ChevronRight size={15} />
              </button>

              <button
                type="button"
                id="btn-current-month"
                onClick={handleCurrentMonth}
                className="px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                title="الرجوع إلى الشهر الحالي"
              >
                الحالي
              </button>

              <button
                type="button"
                id="btn-next-month"
                onClick={handleNextMonth}
                className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="الشهر التالي"
                aria-label="الشهر التالي"
              >
                <ChevronLeft size={15} />
              </button>
            </div>

            {/* Action Buttons: Add Row, Export Excel & Print */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-grid-add-row"
                onClick={() => setIsAddingRow(true)}
                className="btn-primary py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer transition-colors"
                title="إضافة بند جديد في السجل"
              >
                <Plus size={14} />
                <span>+ إضافة بند</span>
              </button>

              <button
                type="button"
                id="btn-export-excel-grid"
                onClick={handleExportCSV}
                className="btn-secondary py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800"
                title="تصدير كشف الشهر الحالي إلى ملف Excel / CSV"
              >
                <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>تصدير Excel</span>
              </button>

              <button
                type="button"
                id="btn-print-monthly-grid"
                onClick={handlePrintGrid}
                className="btn-secondary py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800"
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
              <option value="إدارة صفحات سوشيال ميديا">إدارة صفحات سوشيال ميديا</option>
              <option value="لافتة إعلانية">لافتة إعلانية</option>
              <option value="تصميم موقع إلكتروني">تصميم موقع إلكتروني</option>
              <option value="خدمات طباعة">خدمات طباعة</option>
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
          <p className="text-sm text-slate-600 mt-1">الفترة: {formattedCurrentMonth} | إجمالي الفواتير: {tableTotals.sumInvoices.toLocaleString()} {currency} | صافي الأرباح: {tableTotals.sumNetProfit.toLocaleString()} {currency}</p>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold select-none">
                
                {/* عنصر تفاعلي: مربع الدفع في بداية السطر (بدون ترويسة نصية) */}
                <th scope="col" className="py-3 px-3 border-l border-slate-200/80 dark:border-slate-700 w-12 text-center select-none">
                  <span className="sr-only">تأكيد الدفع</span>
                </th>

                {/* 1. نوع الخدمة */}
                <th scope="col" className="py-3 px-4 font-bold border-l border-slate-200/80 dark:border-slate-700 min-w-[150px]">
                  نوع الخدمة
                </th>

                {/* 2. اسم العميل */}
                <th scope="col" className="py-3 px-4 font-bold border-l border-slate-200/80 dark:border-slate-700 min-w-[160px]">
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

                {/* 5. صافي الربح */}
                <th scope="col" className="py-3 px-4 font-black border-l border-slate-200/80 dark:border-slate-700 min-w-[120px] text-center">
                  صافي الربح
                </th>

                {/* 6. الملاحظات */}
                <th scope="col" className="py-3 px-4 font-bold min-w-[200px]">
                  الملاحظات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {/* أولاً: إذا كانت isAddingRow === true، اعرض السطر الجديد <tr> الذي يحتوي على حقول الإدخال */}
              {isAddingRow && (
                <tr className="bg-blue-50/90 dark:bg-blue-950/50 border-b-2 border-blue-400 dark:border-blue-500 animate-in fade-in slide-in-from-top-1 duration-150 shadow-inner">
                  {/* أزرار الحفظ والإلغاء السريعة */}
                  <td className="py-2 px-2 border-l border-blue-200 dark:border-blue-800 text-center bg-blue-100/60 dark:bg-blue-900/40">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        id="btn-save-inline-row-icon"
                        onClick={handleSaveInlineRow}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title="حفظ الفاتورة وإدراجها في السجل"
                        aria-label="حفظ الفاتورة"
                      >
                        <Check size={14} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        id="btn-cancel-inline-row-icon"
                        onClick={() => setIsAddingRow(false)}
                        className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title="إلغاء الإضافة"
                        aria-label="إلغاء الإضافة"
                      >
                        <X size={14} className="stroke-[3]" />
                      </button>
                    </div>
                  </td>

                  {/* 1. نوع الخدمة */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800">
                    <div className="relative">
                      <select
                        id="inline-input-service-type"
                        value={newServiceType}
                        onChange={(e) => setNewServiceType(e.target.value)}
                        className="w-full glass-input rounded-lg pr-2.5 pl-6 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="لافتة إعلانية">لافتة إعلانية</option>
                        <option value="تصميم موقع إلكتروني">تصميم موقع إلكتروني</option>
                        <option value="إدارة صفحات سوشيال ميديا">إدارة صفحات سوشيال ميديا</option>
                        <option value="خدمات طباعة">خدمات طباعة</option>
                        <option value="تنفيذ لافتات">تنفيذ لافتات</option>
                      </select>
                      <ChevronDown size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </td>

                  {/* 2. اسم العميل */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800">
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
                      className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* 3. إجمالي الفاتورة */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                    <input
                      type="number"
                      id="inline-input-price"
                      step="any"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveInlineRow();
                        if (e.key === 'Escape') setIsAddingRow(false);
                      }}
                      placeholder="0.00"
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

                  {/* 5. صافي الربح / التكلفة */}
                  <td className="py-2 px-3 border-l border-blue-200 dark:border-blue-800 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        id="inline-input-cost"
                        step="any"
                        value={newCost}
                        onChange={(e) => setNewCost(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineRow();
                          if (e.key === 'Escape') setIsAddingRow(false);
                        }}
                        placeholder="التكلفة"
                        className="w-16 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-bold text-center text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700"
                        title="التكلفة الإجمالية (لحساب صافي الربح تلقائياً)"
                      />
                      <span className="text-[11px] font-mono font-black text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        ={(Math.max(0, (parseFloat(newPrice) || 0) - (parseFloat(newCost) || 0))).toLocaleString()}
                      </span>
                    </div>
                  </td>

                  {/* 6. الملاحظات وزر الإلغاء والحفظ */}
                  <td className="py-2 px-3">
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
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        id="btn-save-inline-row"
                        onClick={handleSaveInlineRow}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={14} />
                        <span>حفظ</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ثانياً: اعرض الفواتير المسجلة مسبقاً (إن وجدت) باستخدام map */}
              {filteredGridOrders.map((order, index) => {
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
                      {/* أزرار التحكم بالتعديل: زر حفظ أخضر وزر إلغاء رمادي/أحمر استبدالاً لمربع الدفع */}
                      <td className="py-2 px-2 border-l border-amber-200 dark:border-amber-800 text-center bg-amber-100/70 dark:bg-amber-900/40">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            id={`btn-save-edit-${order.id}`}
                            onClick={() => handleSaveEdit(order.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                            title="حفظ التعديلات"
                            aria-label="حفظ التعديلات"
                          >
                            <Check size={14} className="stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            id={`btn-cancel-edit-${order.id}`}
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-lg bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/80 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 shadow-xs transition-transform active:scale-95 cursor-pointer"
                            title="إلغاء التعديل والتراجع"
                            aria-label="إلغاء التعديل والتراجع"
                          >
                            <X size={14} className="stroke-[3]" />
                          </button>
                        </div>
                      </td>

                      {/* 1. نوع الخدمة */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800">
                        <div className="relative">
                          <select
                            id={`edit-select-service-${order.id}`}
                            value={editServiceType}
                            onChange={(e) => setEditServiceType(e.target.value as ServiceType)}
                            className="w-full glass-input rounded-lg pr-2 pl-6 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 appearance-none cursor-pointer focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="لافتة إعلانية">لافتة إعلانية</option>
                            <option value="تصميم موقع إلكتروني">تصميم موقع إلكتروني</option>
                            <option value="إدارة صفحات سوشيال ميديا">إدارة صفحات سوشيال ميديا</option>
                            <option value="خدمات طباعة">خدمات طباعة</option>
                            <option value="تنفيذ لافتات">تنفيذ لافتات</option>
                            {order.serviceType && !['لافتة إعلانية', 'تصميم موقع إلكتروني', 'إدارة صفحات سوشيال ميديا', 'خدمات طباعة', 'تنفيذ لافتات'].includes(order.serviceType) && (
                              <option value={order.serviceType}>{order.serviceType}</option>
                            )}
                          </select>
                          <ChevronDown size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </td>

                      {/* 2. اسم العميل */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800">
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
                          className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* 3. إجمالي الفاتورة */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800 text-center">
                        <input
                          type="number"
                          id={`edit-input-price-${order.id}`}
                          step="any"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(order.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          placeholder="0.00"
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

                      {/* 5. صافي الربح / التكلفة */}
                      <td className="py-2 px-3 border-l border-amber-200 dark:border-amber-800 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            id={`edit-input-cost-${order.id}`}
                            step="any"
                            value={editCost}
                            onChange={(e) => setEditCost(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(order.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            placeholder="التكلفة"
                            className="w-16 glass-input rounded-lg px-1.5 py-1 text-[11px] font-mono font-bold text-center text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700"
                            title="التكلفة الإجمالية (لحساب صافي الربح تلقائياً)"
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
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            id={`btn-save-edit-inline-${order.id}`}
                            onClick={() => handleSaveEdit(order.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={14} />
                            <span>حفظ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // وضع العرض العادي (Normal Display Mode)
                const isChecked = Boolean(order.isPaid);
                const dCost = order.designCost || 0;
                const prCost = order.printingCost || 0;
                const exCost = order.externalCost || 0;
                const itemCostSum = dCost + prCost + exCost;
                const actualCost = itemCostSum > 0 ? itemCostSum : (order.cost || 0);
                const netProfit = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - actualCost);
                
                // تفاصيل الفاتورة المحفوظة لعرضها كبطاقات عمودية نظيفة
                const detailsItems = getOrderInvoiceDetailsList(order);

                // حقل الملاحظات مستقل تماماً ولا يتكرر فيه نوع الخدمة أو أي بيانات أخرى
                const displayedNotes = (order.notes || '').trim();

                return (
                  <tr 
                    key={order.id}
                    className={`transition-colors duration-150 group ${
                      isChecked 
                        ? 'bg-yellow-100/90 dark:bg-yellow-950/45 hover:bg-yellow-200/70 dark:hover:bg-yellow-900/40 text-slate-900 dark:text-slate-100' 
                        : `${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/50'} hover:bg-slate-50/90 dark:hover:bg-slate-800/60`
                    }`}
                  >
                    {/* مربع الدفع التفاعلي وزر التعديل السريع بجانبه */}
                    <td className="py-3 px-2 border-l border-slate-200/60 dark:border-slate-800 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="checkbox"
                          id={`order-check-${order.id}`}
                          checked={isChecked}
                          onChange={() => onTogglePaid && onTogglePaid(order.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-400 focus:ring-2 cursor-pointer transition-all accent-amber-500 shrink-0"
                          title={isChecked ? 'الفاتورة مدفوعة ومحددة (انقر لإلغاء التحديد)' : 'تحديد الفاتورة كمدفوعة وخالصة'}
                          aria-label={`تحديد حالة الدفع للفاتورة الخاصة بـ ${order.clientName}`}
                        />
                        <button
                          type="button"
                          id={`btn-edit-order-${order.id}`}
                          onClick={() => handleStartEdit(order)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                          title="تعديل بيانات الفاتورة مباشرة من السجل"
                          aria-label={`تعديل الفاتورة الخاصة بـ ${order.clientName}`}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>

                    {/* 1. نوع الخدمة */}
                    <td className="py-3 px-4 border-l border-slate-200/60 dark:border-slate-800">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold border ${getServiceBadgeClass(order.serviceType)}`}>
                        {order.serviceType || 'خدمة مخصصة'}
                      </span>
                    </td>

                    {/* 2. اسم العميل */}
                    <td className="py-3 px-4 border-l border-slate-200/60 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 max-w-[180px] truncate" title={order.clientName}>
                      {order.clientName}
                    </td>

                    {/* 3. إجمالي الفاتورة */}
                    <td className="py-3 px-4 border-l border-slate-200/60 dark:border-slate-800 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100">
                      {order.price.toLocaleString()} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">{currency}</span>
                    </td>

                    {/* 4. تفاصيل الفاتورة: عرض البطاقات الرأسية في حال وجود بيانات أو - عند الفراغ (بدون زر +) */}
                    <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-center align-middle max-w-[220px]">
                      {detailsItems.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {detailsItems.map((itemText, idx) => (
                            <span 
                              key={idx}
                              className="bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-md text-xs text-center p-1 font-medium border border-gray-200/60 dark:border-gray-700/60 block truncate"
                              title={itemText}
                            >
                              {itemText}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 select-none text-sm font-bold">
                          -
                        </span>
                      )}
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
                    <td className="py-3 px-4 max-w-[260px]">
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
                  </tr>
                );
              })}

              {/* ثالثاً (الأهم): اعرض رسالة "لا توجد فواتير مسجلة في شهر ..." فقط وحصرياً إذا كان السجل فارغاً و لم يكن المستخدم في وضع الإضافة */}
              {filteredGridOrders.length === 0 && !isAddingRow && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
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
                  
                  {/* Checkbox column spacer */}
                  <td className="py-3 px-3 text-center border-l border-slate-300 dark:border-slate-700 text-slate-400">
                    -
                  </td>

                  {/* Columns 1-2: نوع الخدمة + اسم العميل Label */}
                  <td colSpan={2} className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700 font-bold">
                    <div className="flex items-center justify-between">
                      <span>إجمالي الشهر ({filteredGridOrders.length} طلبية):</span>
                      <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">
                        مجموع القيم المحسوبة
                      </span>
                    </div>
                  </td>

                  {/* Column 3 Total: إجمالي الفواتير */}
                  <td className="py-3 px-4 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700">
                    {tableTotals.sumInvoices.toLocaleString()} <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">{currency}</span>
                  </td>

                  {/* Column 4: تفاصيل الفاتورة (Footer Spacer) */}
                  <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700">
                    -
                  </td>

                  {/* Column 5 Total: صافي الربح */}
                  <td className={`py-3 px-4 text-center font-mono tabular-nums font-black border-l border-slate-300 dark:border-slate-700 ${
                    tableTotals.sumNetProfit >= 0 
                      ? 'text-emerald-800 dark:text-emerald-300' 
                      : 'text-rose-800 dark:text-rose-300'
                  }`}>
                    {tableTotals.sumNetProfit >= 0 ? `+${tableTotals.sumNetProfit.toLocaleString()}` : tableTotals.sumNetProfit.toLocaleString()} <span className="text-[10px] font-normal opacity-80">{currency}</span>
                  </td>

                  {/* Column 6: الملاحظات (Footer Spacer) */}
                  <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
