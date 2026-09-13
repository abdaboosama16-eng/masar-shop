import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Calendar, ChevronRight, ChevronLeft, 
  DollarSign, Receipt, PieChart, ArrowUpRight, ArrowDownRight,
  Calculator, CheckCircle2, ChevronDown, Layers
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import MonthNavigator from './MonthNavigator';
import { Order } from '../types';
import { 
  getOrderTotalDetailCosts, 
  getOrderNetProfit, 
  formatMoney 
} from '../utils/financialCalculations';

interface ProfitsViewProps {
  currency?: string;
  onNavigateToExpenses?: () => void;
  onNavigateToSales?: () => void;
}

export default function ProfitsView({
  currency = 'د.ل',
  onNavigateToExpenses,
  onNavigateToSales
}: ProfitsViewProps) {
  const { orders, expenses, selectedDate, setSelectedDate } = useAppContext();

  // Selected Month State
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  // Month navigation helpers
  const currentMonthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const currentMonthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);
  const formattedCurrentMonth = useMemo(() => {
    return format(selectedDate, 'MMMM yyyy', { locale: ar });
  }, [selectedDate]);

  const handlePrevMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
    setShowAllMonths(false);
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
    setShowAllMonths(false);
  };

  const handleCurrentMonth = () => {
    setSelectedDate(startOfMonth(new Date()));
    setShowAllMonths(false);
  };

  // 1. تصفية الفواتير حسب الفترة المحددة
  const periodOrders = useMemo(() => {
    if (showAllMonths) return orders;
    return orders.filter(order => {
      if (!order.date) return false;
      try {
        const orderDate = parseISO(order.date);
        return isWithinInterval(orderDate, { start: currentMonthStart, end: currentMonthEnd });
      } catch {
        return false;
      }
    });
  }, [orders, showAllMonths, currentMonthStart, currentMonthEnd]);

  // 2. تصفية المصاريف حسب الفترة المحددة
  const periodExpenses = useMemo(() => {
    if (showAllMonths) return expenses;
    return expenses.filter(expense => {
      if (!expense.date) return true;
      try {
        const expDate = parseISO(expense.date);
        return isWithinInterval(expDate, { start: currentMonthStart, end: currentMonthEnd });
      } catch {
        return true;
      }
    });
  }, [expenses, showAllMonths, currentMonthStart, currentMonthEnd]);

  // =========================================================================
  // الحسابات المالية الدقيقة باستخدام Number() و parseFloat() لمنع تداخل النصوص
  // =========================================================================

  // إجمالي مبيعات الفواتير
  const totalInvoiceSales = useMemo(() => {
    return periodOrders.reduce((acc, order) => {
      const p = typeof order.price === 'number' ? order.price : (parseFloat(String(order.price || 0)) || 0);
      return Number((acc + p).toFixed(2));
    }, 0);
  }, [periodOrders]);

  // إجمالي تكاليف بنود الفواتير (المصمم، الطباعة، الخارجية، المواد، إلخ)
  const totalInvoiceDetailCosts = useMemo(() => {
    return periodOrders.reduce((acc, order) => {
      const c = getOrderTotalDetailCosts(order);
      return Number((acc + c).toFixed(2));
    }, 0);
  }, [periodOrders]);

  // 1. هامش الربح الشهري = إجمالي الفواتير - مجموع تكاليف بنود التفاصيل
  const monthlyProfitMargin = useMemo(() => {
    return Number((totalInvoiceSales - totalInvoiceDetailCosts).toFixed(2));
  }, [totalInvoiceSales, totalInvoiceDetailCosts]);

  // 2. إجمالي المصاريف مسحوبة تلقائياً من جدول المصاريف التشغيلية
  const totalOperatingExpenses = useMemo(() => {
    return periodExpenses.reduce((acc, exp) => {
      const amt = typeof exp.amount === 'number' ? exp.amount : (parseFloat(String(exp.amount || 0)) || 0);
      return Number((acc + amt).toFixed(2));
    }, 0);
  }, [periodExpenses]);

  // 3. صافي الأرباح النهائي = هامش الربح الشهري - إجمالي المصاريف التشغيلية
  const finalNetProfit = useMemo(() => {
    return Number((monthlyProfitMargin - totalOperatingExpenses).toFixed(2));
  }, [monthlyProfitMargin, totalOperatingExpenses]);

  // نسبة هامش الربح من إجمالي المبيعات
  const marginPercentage = useMemo(() => {
    if (totalInvoiceSales <= 0) return 0;
    return Number(((monthlyProfitMargin / totalInvoiceSales) * 100).toFixed(1));
  }, [monthlyProfitMargin, totalInvoiceSales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        
        {/* Title and Icon */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                جدول الإدارة والملخص المالي
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {periodOrders.length} فاتورة
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              احتساب هوامش الربح وإجمالي المصاريف التلقائية وصافي الأرباح النهائي
            </p>
          </div>
        </div>

        {/* Month Selector Controls: Unified MonthNavigator */}
        <div className="flex items-center gap-2 flex-wrap">
          <MonthNavigator
            selectedDate={selectedDate}
            onDateChange={(newDate) => {
              setSelectedDate(newDate);
              setShowAllMonths(false);
            }}
          />

          <button
            type="button"
            onClick={() => setShowAllMonths(!showAllMonths)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
              showAllMonths
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            عرض كافة الأشهر
          </button>

          {onNavigateToExpenses && (
            <button
              type="button"
              onClick={onNavigateToExpenses}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/60 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Receipt size={14} />
              <span>إدارة المصاريف</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* الملخص المالي: البطاقات الرئيسية الثلاث وفق المعايير المطلوبة */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. هامش الربح الشهري */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              هامش الربح الشهري
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calculator size={16} />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
              monthlyProfitMargin >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {monthlyProfitMargin >= 0 ? `+${formatMoney(monthlyProfitMargin)}` : formatMoney(monthlyProfitMargin)}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {currency}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
            <span>إجمالي الفواتير: <strong className="text-slate-900 dark:text-slate-200 font-mono">{formatMoney(totalInvoiceSales)}</strong></span>
            <span>تكاليف البنود: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatMoney(totalInvoiceDetailCosts)}</strong></span>
          </div>
        </div>

        {/* 2. إجمالي المصاريف مسحوبة تلقائياً */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي المصاريف (مسحوبة تلقائياً)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {formatMoney(totalOperatingExpenses)}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {currency}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
            <span>عدد بنود المصاريف: <strong className="text-slate-900 dark:text-slate-200 font-mono">{periodExpenses.length}</strong></span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">مستخرجة من صفحة المصاريف</span>
          </div>
        </div>

        {/* 3. صافي الأرباح النهائي */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              صافي الأرباح النهائي
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              finalNetProfit >= 0 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              <TrendingUp size={16} />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
              finalNetProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              {finalNetProfit >= 0 ? `+${formatMoney(finalNetProfit)}` : formatMoney(finalNetProfit)}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {currency}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
            <span>المعادلة: هامش الربح - المصاريف</span>
            <span className={`font-bold font-mono ${finalNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {marginPercentage}% من المبيعات
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* جدول الإدارة المالي للفواتير (تفاصيل كل فاتورة وصافي ربحها) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              جدول تفصيل أرباح الفواتير ({showAllMonths ? 'كافة الأشهر' : formattedCurrentMonth})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            صافي الربح = إجمالي الفاتورة - مجموع تكاليف بنود التفاصيل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-700 font-bold">
                <th className="py-3 px-3 text-center w-12 border-l border-slate-200/80 dark:border-slate-700">#</th>
                <th className="py-3 px-4 w-32 border-l border-slate-200/80 dark:border-slate-700">رقم الفاتورة</th>
                <th className="py-3 px-4 border-l border-slate-200/80 dark:border-slate-700">اسم العميل</th>
                <th className="py-3 px-4 border-l border-slate-200/80 dark:border-slate-700 text-center">نوع الخدمة</th>
                <th className="py-3 px-4 text-center border-l border-slate-200/80 dark:border-slate-700">إجمالي الفاتورة</th>
                <th className="py-3 px-4 text-center border-l border-slate-200/80 dark:border-slate-700">تكاليف بنود التفاصيل</th>
                <th className="py-3 px-4 text-center">صافي الربح</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
              {periodOrders.map((order, idx) => {
                const detailCosts = getOrderTotalDetailCosts(order);
                const netProfit = getOrderNetProfit(order);
                const p = typeof order.price === 'number' ? order.price : (parseFloat(String(order.price || 0)) || 0);

                return (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-400 dark:text-slate-500 border-l border-slate-200/60 dark:border-slate-800">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300 border-l border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                      {order.serialNumber || order.id}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-l border-slate-200/60 dark:border-slate-800">
                      {order.clientName}
                    </td>

                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 border-l border-slate-200/60 dark:border-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700">
                        {order.serviceType || 'لافتة إعلانية'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100 border-l border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                      {formatMoney(p)} <span className="text-[10px] font-normal text-slate-400">{currency}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400 border-l border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                      {formatMoney(detailCosts)} <span className="text-[10px] font-normal text-slate-400">{currency}</span>
                    </td>

                    <td className={`py-3 px-4 text-center font-mono tabular-nums font-black whitespace-nowrap ${
                      netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {netProfit >= 0 ? `+${formatMoney(netProfit)}` : formatMoney(netProfit)} <span className="text-[10px] font-normal opacity-80">{currency}</span>
                    </td>
                  </tr>
                );
              })}

              {periodOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calculator size={32} className="text-slate-300 dark:text-slate-600" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        لا توجد فواتير مسجلة في {showAllMonths ? 'النظام' : formattedCurrentMonth}
                      </span>
                      <p className="text-xs text-slate-500">
                        يمكنك إضافة فواتير جديدة من سجل الفواتير لحساب هوامش الربح تلقائياً
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer Row */}
            {periodOrders.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-black border-t-2 border-slate-300 dark:border-slate-700 text-xs select-none">
                  <td colSpan={4} className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700">
                    المجموع الكلي ({periodOrders.length} فاتورة):
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums font-black text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700 whitespace-nowrap">
                    {formatMoney(totalInvoiceSales)} <span className="text-[10px] font-normal opacity-80">{currency}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums font-black text-rose-700 dark:text-rose-400 border-l border-slate-300 dark:border-slate-700 whitespace-nowrap">
                    {formatMoney(totalInvoiceDetailCosts)} <span className="text-[10px] font-normal opacity-80">{currency}</span>
                  </td>
                  <td className={`py-3 px-4 text-center font-mono tabular-nums font-black whitespace-nowrap ${
                    monthlyProfitMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {monthlyProfitMargin >= 0 ? `+${formatMoney(monthlyProfitMargin)}` : formatMoney(monthlyProfitMargin)} <span className="text-[10px] font-normal opacity-80">{currency}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Navigation Shortcut */}
      {onNavigateToSales && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onNavigateToSales}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <span>العودة إلى سجل الفواتير</span>
            <ChevronLeft size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
