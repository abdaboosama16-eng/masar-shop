import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Receipt, 
  Wallet,
  Building2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import { Expense, Order } from '../types';

interface ExpensesAndProfitsProps {
  orders: Order[];
  currency: string;
}

export default function ExpensesAndProfits({ orders, currency }: ExpensesAndProfitsProps) {
  const { expenses, addExpense, deleteExpense, updateExpense } = useAppContext();

  // Selected Month State (defaults to current month)
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfMonth(new Date()));
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  // Month navigation
  const currentMonthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const currentMonthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);
  const formattedMonthName = useMemo(() => format(selectedDate, 'MMMM yyyy', { locale: ar }), [selectedDate]);

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

  // 1. Filter Orders for the selected period
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

  // Orders financial calculations using Number() to prevent string concatenation
  const totalInvoiceSales = useMemo(() => {
    return periodOrders.reduce((acc, order) => acc + (Number(order.price) || 0), 0);
  }, [periodOrders]);

  const totalInvoiceCosts = useMemo(() => {
    return periodOrders.reduce((acc, order) => {
      const directCost = Number(order.cost) || 0;
      if (directCost > 0) return acc + directCost;
      if (order.items && order.items.length > 0) {
        const itemsCost = order.items.reduce((sum, item) => sum + ((Number(item.cost) || 0) * (Number(item.quantity) || 1)), 0);
        return acc + itemsCost;
      }
      return acc;
    }, 0);
  }, [periodOrders]);

  // 2. Filter Expenses for the selected period
  const periodExpenses = useMemo(() => {
    if (showAllMonths) return expenses;
    return expenses.filter(expense => {
      if (!expense.date) return true; // Keep undated expenses in current view
      try {
        const expDate = parseISO(expense.date);
        return isWithinInterval(expDate, { start: currentMonthStart, end: currentMonthEnd });
      } catch {
        return true;
      }
    });
  }, [expenses, showAllMonths, currentMonthStart, currentMonthEnd]);

  // Sum of Expenses from Section 1
  const totalExpensesAmount = useMemo(() => {
    return periodExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  }, [periodExpenses]);

  // Section 2 Financial Metrics (Read-only Automatic Calculations)
  // 1. هامش الربح الشهري: (إجمالي مبيعات الفواتير - إجمالي تكاليف الفواتير)
  const monthlyProfitMargin = Number(totalInvoiceSales) - Number(totalInvoiceCosts);

  // 2. حساب المصاريف: المجموع الكلي للمصاريف من جدول المصاريف التشغيلية
  const calculatedExpenses = Number(totalExpensesAmount);

  // 3. الأرباح: (هامش الربح الشهري - حساب المصاريف)
  const netProfits = Number(monthlyProfitMargin) - Number(calculatedExpenses);

  // دالة حذف البند وتحديث State و LocalStorage فوراً
  const handleDelete = (id: string) => {
    if (editingExpenseId === id) {
      setEditingExpenseId(null);
    }
    deleteExpense(id);
  };

  // New Expense Inline Row State
  const [isAddingExpense, setIsAddingExpense] = useState<boolean>(false);
  const [newExpenseDescription, setNewExpenseDescription] = useState<string>('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>('');

  // Editing existing expense state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');

  const handleStartAddExpense = () => {
    setIsAddingExpense(true);
    setNewExpenseDescription('');
    setNewExpenseAmount('');
    setEditingExpenseId(null);
  };

  const handleCancelAddExpense = () => {
    setIsAddingExpense(false);
    setNewExpenseDescription('');
    setNewExpenseAmount('');
  };

  const handleSaveNewExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const desc = newExpenseDescription.trim();
    const amt = parseFloat(newExpenseAmount);

    if (!desc) {
      alert('يرجى كتابة بيان أو اسم المصروف');
      return;
    }

    if (isNaN(amt) || amt <= 0) {
      alert('يرجى إدخال قيمة صحيحة للمصروف');
      return;
    }

    // Expense date set to current day or middle of the selected month
    const expenseDate = showAllMonths 
      ? new Date().toISOString()
      : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), Math.min(new Date().getDate(), 28)).toISOString();

    addExpense({
      description: desc,
      amount: amt,
      type: 'مصروف',
      date: expenseDate,
      category: 'تشغيلي',
    });

    setNewExpenseDescription('');
    setNewExpenseAmount('');
    setIsAddingExpense(false);
  };

  const handleStartEdit = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setEditDescription(exp.description);
    setEditAmount(String(exp.amount));
    setIsAddingExpense(false);
  };

  const handleSaveEdit = (id: string) => {
    const desc = editDescription.trim();
    const amt = parseFloat(editAmount);

    if (!desc) {
      alert('يرجى كتابة بيان أو اسم المصروف');
      return;
    }

    if (isNaN(amt) || amt <= 0) {
      alert('يرجى إدخال قيمة صحيحة للمصروف');
      return;
    }

    updateExpense(id, {
      description: desc,
      amount: amt,
    });

    setEditingExpenseId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Header & Month Switcher Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        
        {/* Title and Scope Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0">
            <Calculator size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              شاشة المصاريف والأرباح
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              نموذج الحسابات المعتمد: إدارة بنود المصاريف واحتساب هوامش الربح وصافي الأرباح تلقائياً
            </p>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title="الشهر السابق"
              aria-label="الشهر السابق"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              id="btn-current-month"
              onClick={handleCurrentMonth}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                !showAllMonths 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar size={13} className="text-slate-500 dark:text-slate-400" />
              <span>{formattedMonthName}</span>
            </button>

            <button
              type="button"
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title="الشهر القادم"
              aria-label="الشهر القادم"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <button
            type="button"
            id="btn-toggle-all-months"
            onClick={() => setShowAllMonths(prev => !prev)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              showAllMonths
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            {showAllMonths ? 'عرض الشهر المحدد' : 'كافة الفترات'}
          </button>
        </div>
      </div>

      {/* Main Two-Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* القسم الأول: جدول المصاريف (إدخال يدوي) */}
        {/* ========================================================================= */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
          
          {/* Section Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <Receipt size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  القسم الأول: جدول المصاريف (إدخال يدوي)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  تسجيل بنود المصاريف التشغيلية ومجموعها التلقائي
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
              {periodExpenses.length} بند
            </span>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs" id="table-expenses">
              <thead>
                <tr className="bg-slate-100/75 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">البيان / اسم المصروف</th>
                  <th className="py-3 px-4 w-36 text-center">القيمة ({currency})</th>
                  <th className="py-3 px-4 w-20 text-center">إجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {periodExpenses.length === 0 && !isAddingExpense && (
                  <tr>
                    <td colSpan={4} className="py-12 px-4 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt size={24} className="opacity-40" />
                        <p className="font-medium text-xs">لا توجد مصاريف مسجلة لهذه الفترة.</p>
                        <p className="text-[11px] text-slate-400">انقر على زر «+ إضافة مصروف» بالأسفل لإدراج بند جديد.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Existing Expenses Rows */}
                {periodExpenses.map((expense, idx) => {
                  const isEditing = editingExpenseId === expense.id;

                  if (isEditing) {
                    return (
                      <tr key={expense.id} className="bg-blue-50/70 dark:bg-blue-950/40">
                        <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(expense.id);
                              if (e.key === 'Escape') setEditingExpenseId(null);
                            }}
                            autoFocus
                            placeholder="البيان / اسم المصروف..."
                            className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(expense.id);
                              if (e.key === 'Escape') setEditingExpenseId(null);
                            }}
                            placeholder="0.00"
                            className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700"
                          />
                        </td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(expense.id)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              title="حفظ التعديل"
                            >
                              <Check size={13} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingExpenseId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
                              title="إلغاء"
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={expense.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 dark:text-slate-500">
                        {idx + 1}
                      </td>
                      <td 
                        className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                        onClick={() => handleStartEdit(expense)}
                        title="انقر لتعديل البيان"
                      >
                        {expense.description}
                      </td>
                      <td 
                        className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap cursor-pointer"
                        onClick={() => handleStartEdit(expense)}
                        title="انقر لتعديل القيمة"
                      >
                        {Number(expense.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          id={`btn-delete-expense-${expense.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm('هل تريد حذف هذا البند؟')) handleDelete(expense.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="حذف هذا البند"
                          aria-label={`حذف مصروف ${expense.description}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Inline Row for Adding a New Expense */}
                {isAddingExpense && (
                  <tr className="bg-emerald-50/60 dark:bg-emerald-950/30 border-y-2 border-emerald-400 dark:border-emerald-600 animate-in fade-in duration-100">
                    <td className="py-2.5 px-4 text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      +
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        id="expense-input-desc"
                        value={newExpenseDescription}
                        onChange={(e) => setNewExpenseDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewExpense();
                          if (e.key === 'Escape') handleCancelAddExpense();
                        }}
                        autoFocus
                        placeholder="أدخل البيان / اسم المصروف..."
                        className="w-full glass-input rounded-lg px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        id="expense-input-amount"
                        step="any"
                        min="0"
                        value={newExpenseAmount}
                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewExpense();
                          if (e.key === 'Escape') handleCancelAddExpense();
                        }}
                        placeholder="0.00"
                        className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-center bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          id="btn-confirm-add-expense"
                          onClick={handleSaveNewExpense}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                          title="حفظ المصروف"
                        >
                          <Check size={14} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          id="btn-cancel-add-expense"
                          onClick={handleCancelAddExpense}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                          title="إلغاء"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer: إجمالي المصاريف الظاهر بوضوح والمميز بخط عريض ولون خلفية مختلف */}
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100 text-xs">
                    إجمالي المصاريف التشغيلية
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                    {totalExpensesAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">{currency}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                    -
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom Bar: زر "+ إضافة مصروف" البسيط أسفل الجدول */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            {!isAddingExpense ? (
              <button
                type="button"
                id="btn-add-expense"
                onClick={handleStartAddExpense}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>+ إضافة مصروف</span>
              </button>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>أدخل البيان والقيمة ثم اضغط على أيقونة الحفظ.</span>
              </div>
            )}

            <div className="hidden sm:block text-[11px] text-slate-400 font-medium">
              القيم تحفظ وتحدث الحسابات تلقائياً
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* القسم الثاني: جدول الإدارة (عمليات حسابية تلقائية) */}
        {/* ========================================================================= */}
        <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
          
          {/* Section Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  القسم الثاني: جدول الإدارة (عمليات حسابية تلقائية)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ملخص مالي شهري معتمد برمجياً (Read-only)
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              حساب آلي
            </span>
          </div>

          {/* Management / Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs" id="table-management-summary">
              <thead>
                <tr className="bg-slate-100/75 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800">
                  <th className="py-3 px-5">البند المالي</th>
                  <th className="py-3 px-5 text-center">طريقة الاحتساب</th>
                  <th className="py-3 px-5 text-left font-mono">القيمة المحسوبة ({currency})</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                
                {/* 1. هامش الربح الشهري */}
                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-5 font-bold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>هامش الربح الشهري</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
                    (إجمالي مبيعات الفواتير - إجمالي تكاليف الفواتير)
                  </td>
                  <td className="py-4 px-5 text-left font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {monthlyProfitMargin.toLocaleString()}
                  </td>
                </tr>

                {/* Sub-breakdown: Details of Invoice Sales & Costs */}
                <tr className="bg-slate-50/40 dark:bg-slate-900/30 text-[11px] text-slate-500 dark:text-slate-400">
                  <td colSpan={3} className="py-2 px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-r-2 border-blue-400/60 pr-2">
                      <span>إجمالي مبيعات الفواتير: <strong className="font-mono text-slate-700 dark:text-slate-300">{totalInvoiceSales.toLocaleString()} {currency}</strong></span>
                      <span>إجمالي تكاليف الفواتير: <strong className="font-mono text-rose-600 dark:text-rose-400">{totalInvoiceCosts.toLocaleString()} {currency}</strong></span>
                      <span>عدد الفواتير المحسوبة: <strong className="font-mono text-slate-700 dark:text-slate-300">{periodOrders.length} فاتورة</strong></span>
                    </div>
                  </td>
                </tr>

                {/* 2. حساب المصاريف */}
                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-5 font-bold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span>حساب المصاريف</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
                    المجموع الكلي للمصاريف من جدول المصاريف التشغيلية
                  </td>
                  <td className="py-4 px-5 text-left font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                    {calculatedExpenses.toLocaleString()}
                  </td>
                </tr>

                {/* 3. الأرباح */}
                <tr className="bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 transition-colors font-bold border-t border-emerald-500/20">
                  <td className="py-4 px-5 text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-sm font-black">الأرباح</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center text-[11px] text-slate-600 dark:text-slate-400">
                    (هامش الربح الشهري - حساب المصاريف)
                  </td>
                  <td className="py-4 px-5 text-left font-mono font-black text-base">
                    <span className={netProfits >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {netProfits.toLocaleString()}
                    </span>
                    <span className="text-xs font-normal text-slate-400 mr-1.5">{currency}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Note */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Calculator size={14} className="text-slate-500 dark:text-slate-400" />
              <span>النتائج المالية تُحسب آلياً وفورياً اعتماداً على سجل الفواتير والمصاريف.</span>
            </div>
            <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {showAllMonths ? 'الفترة: كافة الفترات' : `الفترة: ${formattedMonthName}`}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
