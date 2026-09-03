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
  Eye, 
  Share2, 
  ChevronDown,
  FileText,
  MessageSquare,
  Check
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MonthlySalesGridProps {
  orders: Order[];
  currency: string;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onPrintOrder: (order: Order) => void;
  onShareWhatsApp: (order: Order) => void;
  onViewDesign?: (order: Order) => void;
  onViewOrderDetails?: (order: Order) => void;
  onTogglePaid?: (orderId: string) => void;
}

// Helper to determine the role label based on cost item name
function getCostRoleLabel(costItemName: string): string {
  const name = costItemName.toLowerCase();
  if (name.includes('تصميم') || name.includes('مصمم') || name.includes('ui')) return 'المصمم';
  if (name.includes('طباعة') || name.includes('مطبعة')) return 'فني الطباعة';
  if (name.includes('تركيب')) return 'فني التركيب';
  if (name.includes('قص') || name.includes('تشكيل') || name.includes('ليزر')) return 'فني القص والتشكيل';
  if (name.includes('مطور') || name.includes('مبرمج') || name.includes('برمجة')) return 'المطور';
  if (name.includes('محتوى') || name.includes('كتابة')) return 'كاتب المحتوى';
  if (name.includes('إعلان') || name.includes('ممولة') || name.includes('حملة')) return 'مسؤول الإعلانات';
  if (name.includes('خارج') || name.includes('ورشة')) return 'الجهة الخارجية';
  if (name.includes('مواد') || name.includes('خام') || name.includes('مخزن')) return 'المستودع / التوريد';
  if (name.includes('تغليف') || name.includes('توصيل')) return 'فني التغليف';
  return 'المنفذ المسؤول';
}

// Helper to resolve executor name from order data
function getCostExecutorName(order: Order, costItemName: string): string {
  // 1. Direct match in costExecutors map
  if (order.costExecutors && order.costExecutors[costItemName]) {
    return order.costExecutors[costItemName];
  }

  // 2. Fuzzy match in costExecutors
  if (order.costExecutors) {
    for (const [key, val] of Object.entries(order.costExecutors)) {
      if (key.includes(costItemName) || costItemName.includes(key)) {
        return val;
      }
    }
  }

  // 3. Fallback to specialized order fields
  const name = costItemName.toLowerCase();
  if ((name.includes('تصميم') || name.includes('مصمم')) && order.designerName) {
    return order.designerName;
  }
  if ((name.includes('طباعة') || name.includes('مطبعة')) && order.printerName) {
    return order.printerName;
  }
  if ((name.includes('خارج') || name.includes('ورشة')) && order.externalExecutor) {
    return order.externalExecutor;
  }

  // 4. Fallback to general assignedEmployee if available
  if (order.assignedEmployee) {
    return order.assignedEmployee;
  }

  return 'غير محدد';
}

interface CostBadgeProps {
  key?: string;
  label: string;
  amount: number;
  role: string;
  executor: string;
  badgeStyle?: string;
}

function CostBadgeWithTooltip({ label, amount, role, executor, badgeStyle }: CostBadgeProps) {
  return (
    <div className="relative group inline-flex items-center">
      <span 
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all duration-150 cursor-help select-none ${
          badgeStyle || 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
      >
        <span>{label}:</span>
        <strong className="font-mono tabular-nums">{amount.toLocaleString()}</strong>
      </span>

      {/* Floating Hover Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50 transition-all duration-200 ease-out opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100">
        <div className="bg-slate-900/95 dark:bg-slate-900/90 dark:backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700/80 dark:border-slate-600/60 whitespace-nowrap flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">{role}:</span>
          <span className="text-emerald-400 font-bold">{executor}</span>
        </div>
        {/* Triangle Arrow */}
        <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-900/90 border-r border-b border-slate-700/80 dark:border-slate-600/60 transform rotate-45 -mt-1"></div>
      </div>
    </div>
  );
}

export default function MonthlySalesGrid({
  orders,
  currency,
  onUpdateStatus,
  onPrintOrder,
  onShareWhatsApp,
  onViewDesign,
  onViewOrderDetails,
  onTogglePaid,
}: MonthlySalesGridProps) {
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
      'رقم الفاتورة',
      'تاريخ الطلب',
      'نوع الخدمة',
      'اسم العميل',
      'إجمالي الفاتورة',
      'إجمالي التكلفة',
      'تفاصيل بنود التكلفة',
      'الملاحظات',
      'صافي المربح',
    ];

    const rows = filteredGridOrders.map(order => {
      const dCost = order.designCost || 0;
      const prCost = order.printingCost || 0;
      const exCost = order.externalCost || 0;
      const itemCostSum = dCost + prCost + exCost;
      const actualCost = itemCostSum > 0 ? itemCostSum : (order.cost || 0);
      const netProfit = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - actualCost);
      const breakdownText = order.costBreakdownSummary || (
        order.costBreakdown 
          ? Object.entries(order.costBreakdown).map(([k, v]) => `${k}: ${v}`).join(' | ') 
          : ''
      );
      const noteContent = order.notes || order.description || '';

      return [
        `#${order.serialNumber || order.id}`,
        format(new Date(order.date), 'yyyy-MM-dd'),
        order.serviceType || 'خدمة مخصصة',
        order.clientName,
        order.price,
        actualCost,
        breakdownText,
        noteContent,
        netProfit,
      ];
    });

    // Add Totals row
    rows.push([
      'الإجمالي العام',
      '-',
      '-',
      `${filteredGridOrders.length} طلبية`,
      tableTotals.sumInvoices,
      tableTotals.sumTotalCosts,
      '-',
      '-',
      tableTotals.sumNetProfit,
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_طلبيات_شهر_${format(selectedDate, 'yyyy_MM')}.csv`);
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
                السجل الشهري للطلبيات
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

            {/* Action Buttons: Export Excel & Print */}
            <div className="flex items-center gap-1.5 shrink-0">
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
          <h2 className="text-xl font-bold">تقرير السجل الشهري للطلبيات والمبيعات</h2>
          <p className="text-sm text-slate-600 mt-1">الفترة: {formattedCurrentMonth} | إجمالي الفواتير: {tableTotals.sumInvoices.toLocaleString()} {currency} | صافي الأرباح: {tableTotals.sumNetProfit.toLocaleString()} {currency}</p>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold select-none">
                
                {/* Column 1: رقم الفاتورة */}
                <th scope="col" className="py-2.5 px-3 font-bold border-l border-slate-200/80 dark:border-slate-700 w-24 text-center">
                  رقم الفاتورة
                </th>

                {/* Column 2: تاريخ الطلب */}
                <th scope="col" className="py-2.5 px-3 font-bold border-l border-slate-200/80 dark:border-slate-700 w-24 text-center">
                  تاريخ الطلب
                </th>

                {/* Column 3: نوع الخدمة */}
                <th scope="col" className="py-2.5 px-3 font-bold border-l border-slate-200/80 dark:border-slate-700 min-w-[140px]">
                  نوع الخدمة
                </th>

                {/* Column 4: اسم العميل */}
                <th scope="col" className="py-2.5 px-3 font-bold border-l border-slate-200/80 dark:border-slate-700 min-w-[160px]">
                  اسم العميل
                </th>

                {/* Column 5: إجمالي الفاتورة (Highlighted Header) */}
                <th scope="col" className="py-2.5 px-3 font-black text-slate-900 dark:text-slate-100 bg-slate-200/70 dark:bg-slate-700/60 border-l border-slate-300/80 dark:border-slate-600 min-w-[110px] text-center">
                  إجمالي الفاتورة
                </th>

                {/* Column: تأكيد الدفع السريع */}
                <th scope="col" className="py-2.5 px-2 font-bold text-center border-l border-slate-200/80 dark:border-slate-700 w-16 min-w-[64px] select-none" title="حالة دفع وخلاص الفاتورة">
                  الدفع
                </th>

                {/* Column 6: إجمالي التكلفة */}
                <th scope="col" className="py-2.5 px-3 font-bold text-rose-900 dark:text-rose-300 border-l border-slate-200/80 dark:border-slate-700 min-w-[105px] text-center">
                  إجمالي التكلفة
                </th>

                {/* Column 7: تفاصيل بنود التكلفة */}
                <th scope="col" className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300 border-l border-slate-200/80 dark:border-slate-700 min-w-[170px]">
                  تفاصيل بنود التكلفة
                </th>

                {/* Column 8: الملاحظات (New Column with Truncate & Tooltip) */}
                <th scope="col" className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200/80 dark:border-slate-700 min-w-[160px] max-w-[220px]">
                  الملاحظات
                </th>

                {/* Column 9: صافي المربح (Highlighted Soft Light Green Header) */}
                <th scope="col" className="py-2.5 px-3 font-black text-emerald-900 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/70 border-l border-emerald-300/90 dark:border-emerald-800 min-w-[125px] text-center">
                  صافي المربح
                </th>

                {/* Column 10: خيارات (No-Print) */}
                <th scope="col" className="py-2.5 px-3 font-bold text-center w-28 no-print">
                  خيارات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {filteredGridOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet size={32} className="text-slate-300 dark:text-slate-600" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        لا توجد طلبيات مسجلة في شهر {formattedCurrentMonth}
                      </span>
                      <p className="text-xs text-slate-500">
                        يمكنك إضافة طلبيات جديدة أو اختيار شهر آخر من شريط التنقل أعلاه
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGridOrders.map((order, index) => {
                  const serial = order.serialNumber || order.id;
                  const dCost = order.designCost || 0;
                  const prCost = order.printingCost || 0;
                  const exCost = order.externalCost || 0;
                  const itemCostSum = dCost + prCost + exCost;
                  const actualCost = itemCostSum > 0 ? itemCostSum : (order.cost || 0);
                  const netProfit = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - actualCost);
                  
                  // Extract dynamic breakdown tags
                  const hasBreakdownObject = order.costBreakdown && Object.keys(order.costBreakdown).length > 0;
                  const hasSummaryText = Boolean(order.costBreakdownSummary);

                  // Extract notes text for tooltip & display
                  const orderNotes = order.notes?.trim() || '';
                  const orderDesc = order.description?.trim() || '';
                  const displayNote = orderNotes || orderDesc;

                  return (
                    <tr 
                      key={order.id}
                      className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors ${
                        index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/50'
                      }`}
                    >
                      {/* 1. رقم الفاتورة */}
                      <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                          #{serial}
                        </span>
                      </td>

                      {/* 2. تاريخ الطلب */}
                      <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-center font-mono tabular-nums text-slate-600 dark:text-slate-400 text-[11px]">
                        {format(new Date(order.date), 'dd/MM/yyyy')}
                      </td>

                      {/* 3. نوع الخدمة */}
                      <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold border ${getServiceBadgeClass(order.serviceType)}`}>
                          {order.serviceType || 'خدمة مخصصة'}
                        </span>
                      </td>

                      {/* 4. اسم العميل */}
                      <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 max-w-[180px] truncate" title={order.clientName}>
                        {order.clientName}
                      </td>

                      {/* 5. إجمالي الفاتورة (Highlighted Column) */}
                      <td className="py-2.5 px-3 border-l border-slate-300/80 dark:border-slate-700 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-800/60">
                        {order.price.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{currency}</span>
                      </td>

                      {/* زر تأكيد الدفع السريع (Toggle Payment) */}
                      <td className="py-2.5 px-2 border-l border-slate-200/60 dark:border-slate-800 text-center">
                        <button
                          type="button"
                          onClick={() => onTogglePaid && onTogglePaid(order.id)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 shadow-xs ${
                            order.isPaid
                              ? "bg-amber-400/20 text-amber-500 border border-amber-400/50 hover:bg-amber-400/30 hover:border-amber-400"
                              : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300"
                          }`}
                          title={order.isPaid ? "الفاتورة خالصة ومدفوعة (انقر للإلغاء)" : "تأكيد دفع وخلاص الفاتورة (انقر للتعيين)"}
                        >
                          <Check size={16} strokeWidth={order.isPaid ? 3 : 2} />
                        </button>
                      </td>

                      {/* 6. إجمالي التكلفة */}
                      <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-center font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                        <div className="relative group inline-block">
                          <span className="cursor-help font-bold text-rose-700 dark:text-rose-400">
                            {actualCost.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{currency}</span>
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50 transition-all duration-200 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100">
                            <div className="bg-slate-900/95 dark:bg-slate-900/90 dark:backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700/80 dark:border-slate-600/60 whitespace-nowrap flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">المسؤول:</span>
                              <span className="text-emerald-400 font-bold">{order.assignedEmployee || 'إدارة الورشة'}</span>
                            </div>
                            <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-900/90 border-r border-b border-slate-700/80 dark:border-slate-600/60 transform rotate-45 -mt-1"></div>
                          </div>
                        </div>
                      </td>

                      {/* 7. تفاصيل بنود التكلفة مع التلميحات التفاعلية لأسماء المنفذين */}
                      <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 text-xs">
                        {hasBreakdownObject ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(order.costBreakdown!).map(([item, val]) => {
                              const role = getCostRoleLabel(item);
                              const executor = getCostExecutorName(order, item);
                              return (
                                <CostBadgeWithTooltip
                                  key={item}
                                  label={item}
                                  amount={Number(val)}
                                  role={role}
                                  executor={executor}
                                />
                              );
                            })}
                          </div>
                        ) : hasSummaryText ? (
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block max-w-[160px]" title={order.costBreakdownSummary}>
                            {order.costBreakdownSummary}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {dCost > 0 && (
                              <CostBadgeWithTooltip 
                                label="تصميم" 
                                amount={dCost} 
                                role="المصمم" 
                                executor={order.designerName || getCostExecutorName(order, 'تصميم')} 
                                badgeStyle="bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 hover:border-purple-400" 
                              />
                            )}
                            {prCost > 0 && (
                              <CostBadgeWithTooltip 
                                label="طباعة" 
                                amount={prCost} 
                                role="فني الطباعة" 
                                executor={order.printerName || getCostExecutorName(order, 'طباعة')} 
                                badgeStyle="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:border-amber-400" 
                              />
                            )}
                            {exCost > 0 && (
                              <CostBadgeWithTooltip 
                                label="خارجي" 
                                amount={exCost} 
                                role="الجهة الخارجية" 
                                executor={order.externalExecutor || getCostExecutorName(order, 'خارجي')} 
                                badgeStyle="bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 hover:border-rose-400" 
                              />
                            )}
                            {!dCost && !prCost && !exCost && (
                              <span className="text-slate-400 dark:text-slate-600">تكلفة مباشرة</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. الملاحظات (Clean Truncated Text with Full Tooltip) */}
                      <td className="py-2.5 px-3 border-l border-slate-200/60 dark:border-slate-800 max-w-[200px]">
                        {displayNote ? (
                          <span 
                            className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate block max-w-[190px] cursor-help hover:text-slate-900 dark:hover:text-white"
                            title={displayNote}
                          >
                            {displayNote}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 dark:text-slate-600 select-none">
                            —
                          </span>
                        )}
                      </td>

                      {/* 9. صافي المربح (Highlighted Soft Light Green Column) */}
                      <td className={`py-2.5 px-3 border-l border-emerald-200 dark:border-emerald-800 text-center font-mono tabular-nums font-black ${
                        netProfit >= 0 
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' 
                          : 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                      }`}>
                        {netProfit >= 0 ? `+${netProfit.toLocaleString()}` : netProfit.toLocaleString()} <span className="text-[10px] font-normal opacity-75">{currency}</span>
                      </td>

                      {/* 10. خيارات سريعة (No-Print) */}
                      <td className="py-2.5 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          {onViewOrderDetails && (
                            <button
                              type="button"
                              onClick={() => onViewOrderDetails(order)}
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              title="عرض تفاصيل الطلبية والملاحظات"
                            >
                              <FileText size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onPrintOrder(order)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="طباعة الفاتورة"
                          >
                            <Printer size={13} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => onShareWhatsApp(order)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                            title="مشاركة الفاتورة عبر واتساب"
                          >
                            <Share2 size={13} />
                          </button>

                          {onViewDesign && (
                            <button
                              type="button"
                              onClick={() => onViewDesign(order)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                              title="مرفقات وتصميم الفاتورة"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ========================================================================= */}
            {/* 3. SUMMARY TOTALS ROW (Table Footer) */}
            {/* ========================================================================= */}
            {filteredGridOrders.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200/90 dark:bg-slate-800/95 font-black border-t-2 border-slate-300 dark:border-slate-700 text-xs select-none">
                  
                  {/* Columns 1-4 Label */}
                  <td colSpan={4} className="py-3 px-3 text-right text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700 font-bold">
                    <div className="flex items-center justify-between">
                      <span>إجمالي الشهر ({filteredGridOrders.length} طلبية):</span>
                      <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">
                        مجموع القيم المحسوبة
                      </span>
                    </div>
                  </td>

                  {/* Column 5 Total: إجمالي الفواتير */}
                  <td className="py-3 px-3 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100 bg-slate-300/70 dark:bg-slate-700 border-l border-slate-300 dark:border-slate-600">
                    {tableTotals.sumInvoices.toLocaleString()} <span className="text-[10px] font-normal text-slate-600">{currency}</span>
                  </td>

                  {/* Payment column spacer */}
                  <td className="py-3 px-2 text-center text-slate-400 dark:text-slate-500 border-l border-slate-300 dark:border-slate-700 text-[11px] font-medium">
                    -
                  </td>

                  {/* Column 6 Total: إجمالي التكلفة */}
                  <td className="py-3 px-3 text-center font-mono tabular-nums font-black text-rose-900 dark:text-rose-300 border-l border-slate-300 dark:border-slate-700">
                    {tableTotals.sumTotalCosts.toLocaleString()} <span className="text-[10px] font-normal opacity-70">{currency}</span>
                  </td>

                  {/* Column 7: تفاصيل بنود التكلفة */}
                  <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700">
                    -
                  </td>

                  {/* Column 8: الملاحظات (Footer Spacer) */}
                  <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700">
                    -
                  </td>

                  {/* Column 9 Total: صافي المربح */}
                  <td className={`py-3 px-3 text-center font-mono tabular-nums font-black border-l border-emerald-300 dark:border-emerald-800 ${
                    tableTotals.sumNetProfit >= 0 
                      ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100' 
                      : 'bg-rose-200/80 dark:bg-rose-900/60 text-rose-950 dark:text-rose-100'
                  }`}>
                    {tableTotals.sumNetProfit >= 0 ? `+${tableTotals.sumNetProfit.toLocaleString()}` : tableTotals.sumNetProfit.toLocaleString()} <span className="text-[10px] font-normal opacity-80">{currency}</span>
                  </td>

                  {/* Column 10 (Empty for Actions) */}
                  <td className="py-3 px-3 text-center no-print">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
