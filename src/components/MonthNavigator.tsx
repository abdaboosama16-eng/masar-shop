import React, { useMemo } from 'react';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface MonthNavigatorProps {
  selectedDate: Date;
  onDateChange: (newDate: Date) => void;
  showAllMonths?: boolean;
  onToggleShowAllMonths?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * مكون موحد لتنقل واختيار الأشهر في كافة شاشات المنظومة
 * التصميم المعتمد:
 * - زر سهم لليمين (ChevronRight) للتنقل للشهر السابق (أو القادم حسب الاتجاه)
 * - نص الشهر والسنة في المنتصف (مثال: "سبتمبر 2026") مع أيقونة التقويم والنقر للعودة للشهر الحالي
 * - زر سهم لليسار (ChevronLeft) للتنقل للشهر القادم
 */
export default function MonthNavigator({
  selectedDate,
  onDateChange,
  showAllMonths = false,
  onToggleShowAllMonths,
  className = '',
  size = 'md',
}: MonthNavigatorProps) {
  const formattedMonth = useMemo(() => {
    try {
      return format(selectedDate, 'MMMM yyyy', { locale: ar });
    } catch {
      return '';
    }
  }, [selectedDate]);

  const handlePrev = () => {
    onDateChange(subMonths(selectedDate, 1));
  };

  const handleNext = () => {
    onDateChange(addMonths(selectedDate, 1));
  };

  const handleCurrent = () => {
    onDateChange(startOfMonth(new Date()));
  };

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
        {/* زر سهم لليمين (>) */}
        <button
          type="button"
          id="month-nav-btn-prev"
          onClick={handlePrev}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          title="الشهر السابق"
          aria-label="الشهر السابق"
        >
          <ChevronRight size={size === 'sm' ? 14 : 16} />
        </button>

        {/* نص الشهر والسنة في المنتصف (مثال: "سبتمبر 2026") */}
        <button
          type="button"
          id="month-nav-btn-current"
          onClick={handleCurrent}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            !showAllMonths
              ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="انقر للرجوع إلى الشهر الحالي"
          aria-label={`الشهر المعروض: ${formattedMonth} - انقر للرجوع إلى الشهر الحالي`}
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
            <span className="font-black">{formattedMonth}</span>
          </span>
        </button>

        {/* زر سهم لليسار (<) */}
        <button
          type="button"
          id="month-nav-btn-next"
          onClick={handleNext}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          title="الشهر القادم"
          aria-label="الشهر القادم"
        >
          <ChevronLeft size={size === 'sm' ? 14 : 16} />
        </button>
      </div>

      {/* خيار "كافة الأشهر" عند توفره */}
      {onToggleShowAllMonths && (
        <button
          type="button"
          id="month-nav-btn-all"
          onClick={onToggleShowAllMonths}
          className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
            showAllMonths
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
        >
          كافة الأشهر
        </button>
      )}
    </div>
  );
}
