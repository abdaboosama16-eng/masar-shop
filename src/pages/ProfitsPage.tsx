import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Receipt, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProfitsView from '../components/ProfitsView';

export default function ProfitsPage() {
  const navigate = useNavigate();
  const { settings } = useAppContext();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      
      {/* Top Header Navigation Tabs - فصل شاشات المصاريف والأرباح وسجل الفواتير */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs no-print">
        
        {/* Tab 1: سجل الفواتير */}
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-150 cursor-pointer"
        >
          <FileSpreadsheet size={16} className="text-slate-400" />
          <span>سجل الفواتير</span>
        </button>

        {/* Tab 2: المصاريف */}
        <button
          type="button"
          onClick={() => navigate('/expenses')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-150 cursor-pointer"
        >
          <Receipt size={16} className="text-slate-400" />
          <span>المصاريف</span>
        </button>

        {/* Tab 3: الأرباح (نشط) */}
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm border border-slate-200/80 dark:border-slate-600 transition-all duration-150 cursor-pointer"
        >
          <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>الأرباح</span>
        </button>
      </div>

      {/* المحتوى الحصري لصفحة الأرباح والملخص المالي */}
      <ProfitsView 
        currency={settings.shopInfo?.currency || 'د.ل'} 
        onNavigateToExpenses={() => navigate('/expenses')}
        onNavigateToSales={() => navigate('/sales')}
      />
    </div>
  );
}
