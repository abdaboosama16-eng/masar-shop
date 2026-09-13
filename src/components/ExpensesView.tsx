import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, Calendar, ChevronRight, ChevronLeft, 
  Receipt, Check, X, Pencil, FileSpreadsheet, Pin
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import { Expense } from '../types';
import { formatMoney } from '../utils/financialCalculations';
import MonthNavigator from './MonthNavigator';

interface ExpensesViewProps {
  currency?: string;
  onNavigateToProfits?: () => void;
  onNavigateToSales?: () => void;
}

export default function ExpensesView({ 
  currency = 'د.ل',
  onNavigateToProfits,
  onNavigateToSales: _onNavigateToSales
}: ExpensesViewProps) {
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    updateExpense, 
    togglePinExpense, 
    autoCopyPinnedExpensesToMonth, 
    selectedDate, 
    setSelectedDate 
  } = useAppContext();

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

  // Filter Expenses for the selected period
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

  // Sum of Expenses using explicit Number conversion
  const totalExpensesAmount = useMemo(() => {
    return periodExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  }, [periodExpenses]);

  // Fast Inline Entry State (integrated inside table, similar to MonthlySalesGrid)
  const [isAddingExpense, setIsAddingExpense] = useState<boolean>(false);
  const [newExpenseDescription, setNewExpenseDescription] = useState<string>('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>('');
  const [newExpenseNotes, setNewExpenseNotes] = useState<string>('');
  const [newExpenseIsPinned, setNewExpenseIsPinned] = useState<boolean>(false);

  // عدد المصاريف الثابتة من الأشهر الأخرى غير الموجودة بعد في هذا الشهر
  const otherPinnedCount = useMemo(() => {
    if (showAllMonths) return 0;
    const currentMonthDescSet = new Set(
      periodExpenses.map(e => (e.description || '').trim().toLowerCase())
    );
    return expenses.filter(e => e.isPinned && !currentMonthDescSet.has((e.description || '').trim().toLowerCase())).length;
  }, [expenses, periodExpenses, showAllMonths]);

  // التحقق التلقائي عند التواجد في شهر جديد وفارغ
  React.useEffect(() => {
    if (!showAllMonths && periodExpenses.length === 0 && expenses.some(e => e.isPinned)) {
      autoCopyPinnedExpensesToMonth(selectedDate);
    }
  }, [selectedDate, showAllMonths, periodExpenses.length, expenses, autoCopyPinnedExpensesToMonth]);

  // Editing existing expense state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const handleStartAddExpense = () => {
    setIsAddingExpense(true);
    setNewExpenseDescription('');
    setNewExpenseAmount('');
    setNewExpenseNotes('');
    setNewExpenseIsPinned(false);
    setEditingExpenseId(null);
    setTimeout(() => {
      const inputEl = document.getElementById('inline-expense-input-desc');
      if (inputEl) inputEl.focus();
    }, 50);
  };

  const handleCancelAddExpense = () => {
    setIsAddingExpense(false);
    setNewExpenseDescription('');
    setNewExpenseAmount('');
    setNewExpenseNotes('');
    setNewExpenseIsPinned(false);
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

    const expenseDate = showAllMonths 
      ? new Date().toISOString()
      : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), Math.min(new Date().getDate(), 28)).toISOString();

    addExpense({
      description: desc,
      amount: amt,
      notes: newExpenseNotes.trim() || undefined,
      type: 'مصروف',
      date: expenseDate,
      category: 'تشغيلي',
      isPinned: newExpenseIsPinned,
    });

    setNewExpenseDescription('');
    setNewExpenseAmount('');
    setNewExpenseNotes('');
    setNewExpenseIsPinned(false);
    setIsAddingExpense(false);
  };

  const handleStartEdit = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setEditDescription(exp.description);
    setEditAmount(String(exp.amount));
    setEditNotes(exp.notes || '');
    setIsAddingExpense(false);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setEditDescription('');
    setEditAmount('');
    setEditNotes('');
  };

  const handleSaveEdit = (id: string) => {
    const desc = editDescription.trim();
    const amt = parseFloat(editAmount);

    if (!desc) {
      alert('يرجى كتابة بيان المصروف');
      return;
    }

    if (isNaN(amt) || amt <= 0) {
      alert('يرجى إدخال قيمة صحيحة للمصروف');
      return;
    }

    if (updateExpense) {
      updateExpense(id, {
        description: desc,
        amount: amt,
        notes: editNotes.trim() || undefined,
      });
    }

    setEditingExpenseId(null);
    setEditDescription('');
    setEditAmount('');
    setEditNotes('');
  };

  const handleDeleteExpense = (id: string) => {
    if (editingExpenseId === id) {
      setEditingExpenseId(null);
    }
    deleteExpense(id);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* Top Header & Month Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        
        {/* Title and Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-blue-200/60 dark:border-blue-800/60">
            <Receipt size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                سجل المصاريف التشغيلية
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                {periodExpenses.length} بند
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إدخال ومتابعة بنود الصرف وتكاليف التشغيل اليومية بالبيان والقيمة والملاحظات
            </p>
          </div>
        </div>

        {/* Month Selector & Direct Add Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* محدد الأشهر الموحد */}
          <MonthNavigator
            selectedDate={selectedDate}
            onDateChange={(newDate) => {
              setSelectedDate(newDate);
              setShowAllMonths(false);
            }}
            showAllMonths={showAllMonths}
            onToggleShowAllMonths={() => setShowAllMonths(!showAllMonths)}
          />

          {/* زر جلب المصاريف الثابتة من الأشهر السابقة عند الحاجة */}
          {!showAllMonths && otherPinnedCount > 0 && (
            <button
              type="button"
              id="btn-copy-pinned-expenses"
              onClick={() => {
                const count = autoCopyPinnedExpensesToMonth(selectedDate);
                if (count > 0) {
                  alert(`تم بنجاح جلب ونسخ ${count} من المصاريف الثابتة لشهر ${formattedCurrentMonth}`);
                }
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="جلب ونسخ المصاريف الثابتة (مثل الإيجار، المرتبات الثابتة، الإنترنت) من الأشهر السابقة لهذا الشهر"
            >
              <Pin size={14} className="fill-blue-500/40 text-blue-600" />
              <span>جلب المصاريف الثابتة ({otherPinnedCount})</span>
            </button>
          )}

          {/* زر إضافة مصروف مباشر يفتح السطر المضمن أسفل الجدول */}
          <button
            type="button"
            id="btn-add-expense-main"
            onClick={handleStartAddExpense}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>إضافة مصروف</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Card for Expenses */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Receipt size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
              إجمالي المصاريف التشغيلية ({showAllMonths ? 'كافة الأشهر' : formattedCurrentMonth})
            </span>
            <span className="text-[11px] text-blue-700/80 dark:text-blue-400/80">
              تُسحب تلقائياً لحساب صافي الأرباح في صفحة الأرباح
            </span>
          </div>
        </div>

        <div className="text-left">
          <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-blue-700 dark:text-blue-300">
            {formatMoney(totalExpensesAmount)}
          </span>
          <span className="text-xs font-bold text-blue-800/80 dark:text-blue-400 mr-1.5">
            {currency}
          </span>
        </div>
      </div>

      {/* Main Expenses Table (البيان، القيمة، الملاحظات، والإجراءات الموحدة) */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold select-none">
                <th scope="col" className="py-3 px-3 text-center w-12 border-l border-slate-200/80 dark:border-slate-700">#</th>
                <th scope="col" className="py-3 px-4 w-32 border-l border-slate-200/80 dark:border-slate-700 text-center">التاريخ</th>
                <th scope="col" className="py-3 px-4 border-l border-slate-200/80 dark:border-slate-700 min-w-[200px]">البيان (اسم وتفاصيل المصروف)</th>
                <th scope="col" className="py-3 px-4 text-center w-36 border-l border-slate-200/80 dark:border-slate-700 font-black">القيمة ({currency})</th>
                <th scope="col" className="py-3 px-4 border-l border-slate-200/80 dark:border-slate-700 min-w-[200px]">الملاحظات</th>
                <th scope="col" className="py-3 px-2 text-center w-24 print:hidden">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
              {periodExpenses.map((expense, idx) => {
                const isEditing = editingExpenseId === expense.id;

                if (isEditing) {
                  return (
                    <tr key={expense.id} className="bg-blue-50/80 dark:bg-blue-950/40 border-y-2 border-blue-400 dark:border-blue-600">
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600 border-l border-slate-200/60 dark:border-slate-800">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] border-l border-slate-200/60 dark:border-slate-800 text-center">
                        {expense.date ? format(parseISO(expense.date), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="py-2.5 px-4 border-l border-slate-200/60 dark:border-slate-800">
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(expense.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                          placeholder="البيان..."
                          autoFocus
                        />
                      </td>
                      <td className="py-2.5 px-4 border-l border-slate-200/60 dark:border-slate-800">
                        <input
                          type="number"
                          step="any"
                          value={editAmount === '0' ? '' : editAmount}
                          onFocus={(e) => {
                            if (e.target.value === '0' || e.target.value === '.') {
                              setEditAmount('');
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditAmount(val === '.' ? '' : val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(expense.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-full glass-input rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2.5 px-4 border-l border-slate-200/60 dark:border-slate-800">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(expense.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                          placeholder="الملاحظات..."
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(expense.id)}
                            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                            title="حفظ التعديلات (Enter)"
                            aria-label="حفظ"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
                            title="إلغاء (Escape)"
                            aria-label="إلغاء"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isPinned = Boolean(expense.isPinned);

                return (
                  <tr 
                    key={expense.id} 
                    className={`transition-colors group ${
                      isPinned 
                        ? 'bg-blue-50/20 dark:bg-blue-950/15 hover:bg-blue-50/40 dark:hover:bg-blue-950/30' 
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-400 dark:text-slate-500 border-l border-slate-200/60 dark:border-slate-800">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] border-l border-slate-200/60 dark:border-slate-800 whitespace-nowrap text-center">
                      {expense.date ? format(parseISO(expense.date), 'dd/MM/yyyy') : '—'}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-l border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        {isPinned && (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 select-none shadow-2xs shrink-0"
                            title="مصروف ثابت ومثبت: يتكرر تلقائياً في الأشهر الجديدة"
                          >
                            <Pin size={10} className="text-blue-600 dark:text-blue-400 fill-blue-500/40 shrink-0" />
                            <span>مثبت</span>
                          </span>
                        )}
                        <span className="truncate">{expense.description}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-mono tabular-nums font-black text-rose-700 dark:text-rose-400 border-l border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                      {formatMoney(expense.amount)} <span className="text-[10px] font-normal text-slate-400">{currency}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs border-l border-slate-200/60 dark:border-slate-800">
                      {expense.notes ? (
                        <span>{expense.notes}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 select-none">—</span>
                      )}
                    </td>

                    {/* أزرار الإجراءات موحدة مع جدول الفواتير */}
                    <td className="py-3 px-2 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        {/* أولاً: زر تثبيت المصروف (Pinned/Recurring Expense) */}
                        <button
                          type="button"
                          id={`btn-pin-expense-${expense.id}`}
                          onClick={() => togglePinExpense(expense.id)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center ${
                            isPinned 
                              ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/70 dark:text-blue-300 shadow-xs border border-blue-300 dark:border-blue-600' 
                              : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800'
                          }`}
                          title={isPinned ? "مصروف مثبت شهرياً (انقر لإلغاء التثبيت)" : "تثبيت هذا المصروف ليتكرر تلقائياً في الأشهر الجديدة"}
                          aria-label={`تثبيت مصروف ${expense.description}`}
                        >
                          <Pin size={15} className={isPinned ? "text-blue-600 dark:text-blue-300 fill-blue-500/40" : ""} />
                        </button>

                        {/* ثانياً: زر التعديل */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(expense)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="تعديل هذا المصروف"
                          aria-label={`تعديل مصروف ${expense.description}`}
                        >
                          <Pencil size={15} />
                        </button>

                        {/* ثالثاً: زر الحذف */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف مصروف: "${expense.description}"؟`)) {
                              handleDeleteExpense(expense.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                          title="حذف هذا المصروف"
                          aria-label={`حذف مصروف ${expense.description}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* سطر الإدخال السريع المدمج في الجدول عند النقر على إضافة مصروف (نفس نمط وسلوك سجل الفواتير) */}
              {isAddingExpense && (
                <tr className="bg-blue-50/90 dark:bg-blue-950/50 border-y-2 border-blue-400 dark:border-blue-500 animate-in fade-in slide-in-from-bottom-1 duration-150 shadow-inner">
                  {/* # */}
                  <td className="py-2.5 px-3 text-center border-l border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold">
                    +
                  </td>

                  {/* التاريخ */}
                  <td className="py-2.5 px-3 border-l border-blue-200 dark:border-blue-800 text-center font-mono text-[11px] text-slate-500">
                    {format(new Date(), 'dd/MM/yyyy')}
                  </td>

                  {/* البيان */}
                  <td className="py-2.5 px-4 border-l border-blue-200 dark:border-blue-800">
                    <input
                      type="text"
                      id="inline-expense-input-desc"
                      value={newExpenseDescription}
                      onChange={(e) => setNewExpenseDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNewExpense();
                        if (e.key === 'Escape') handleCancelAddExpense();
                      }}
                      placeholder="بيان المصروف (إيجار، وقود، صيانة، فواتير كهرباء)..."
                      className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </td>

                  {/* القيمة */}
                  <td className="py-2.5 px-4 border-l border-blue-200 dark:border-blue-800">
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        id="inline-expense-input-amount"
                        value={newExpenseAmount === '0' ? '' : newExpenseAmount}
                        onFocus={(e) => {
                          if (e.target.value === '0' || e.target.value === '.') {
                            setNewExpenseAmount('');
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewExpenseAmount(val === '.' ? '' : val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewExpense();
                          if (e.key === 'Escape') handleCancelAddExpense();
                        }}
                        placeholder="0"
                        className="w-full glass-input rounded-lg pr-2.5 pl-8 py-1.5 text-xs font-mono font-bold text-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">
                        {currency}
                      </span>
                    </div>
                  </td>

                  {/* الملاحظات */}
                  <td className="py-2.5 px-4 border-l border-blue-200 dark:border-blue-800">
                    <input
                      type="text"
                      id="inline-expense-input-notes"
                      value={newExpenseNotes}
                      onChange={(e) => setNewExpenseNotes(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNewExpense();
                        if (e.key === 'Escape') handleCancelAddExpense();
                      }}
                      placeholder="أي تفاصيل أو ملاحظات خاصة..."
                      className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* أزرار الحفظ والإلغاء السريعة مع زر تثبيت المصروف */}
                  <td className="py-2.5 px-2 text-center print:hidden">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewExpenseIsPinned(!newExpenseIsPinned)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                          newExpenseIsPinned 
                            ? 'text-blue-700 bg-blue-100 dark:bg-blue-900/70 border border-blue-300' 
                            : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
                        }`}
                        title={newExpenseIsPinned ? "سيتم حفظه كمصروف مثبت (يتكرر شهرياً)" : "تثبيت كمصروف شهري متكرر"}
                      >
                        <Pin size={14} className={newExpenseIsPinned ? "fill-blue-500/40 text-blue-600" : ""} />
                      </button>
                      <button
                        type="button"
                        id="btn-inline-save-expense"
                        onClick={handleSaveNewExpense}
                        className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs flex items-center justify-center"
                        title="حفظ المصروف (Enter)"
                        aria-label="حفظ المصروف"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        id="btn-inline-cancel-expense"
                        onClick={handleCancelAddExpense}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                        title="إلغاء (Escape)"
                        aria-label="إلغاء"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {periodExpenses.length === 0 && !isAddingExpense && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet size={32} className="text-slate-300 dark:text-slate-600" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        لا توجد مصاريف مسجلة في {showAllMonths ? 'النظام' : formattedCurrentMonth}
                      </span>
                      <p className="text-xs text-slate-500">
                        انقر على زر "إضافة مصروف" لتسجيل بند جديد في الجدول مباشرة
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleStartAddExpense}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>إضافة أول مصروف</span>
                        </button>
                        {!showAllMonths && otherPinnedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const count = autoCopyPinnedExpensesToMonth(selectedDate);
                              if (count > 0) {
                                alert(`تم بنجاح جلب ونسخ ${count} من المصاريف الثابتة لشهر ${formattedCurrentMonth}`);
                              }
                            }}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Pin size={13} className="fill-blue-500/40 text-blue-600" />
                            <span>نسخ المصاريف الثابتة ({otherPinnedCount})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer Row */}
            {periodExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200/90 dark:bg-slate-800/95 font-black border-t-2 border-slate-300 dark:border-slate-700 text-xs select-none">
                  <td colSpan={3} className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 border-l border-slate-300 dark:border-slate-700">
                    إجمالي المصاريف التشغيلية ({periodExpenses.length} بند):
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums font-black text-rose-700 dark:text-rose-400 border-l border-slate-300 dark:border-slate-700 whitespace-nowrap">
                    {formatMoney(totalExpensesAmount)} <span className="text-[10px] font-normal opacity-80">{currency}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400 border-l border-slate-300 dark:border-slate-700">
                    -
                  </td>
                  <td className="py-3 px-2 text-center text-slate-400 print:hidden font-bold select-none">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Navigation Footer Shortcut */}
      {onNavigateToProfits && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onNavigateToProfits}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <span>الانتقال إلى صفحة الأرباح والملخص المالي</span>
            <ChevronLeft size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
