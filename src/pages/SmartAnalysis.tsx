import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Brain, TrendingUp, TrendingDown, Users, AlertCircle, ShoppingBag, CheckCircle2, DollarSign, Activity } from 'lucide-react';

export default function SmartAnalysis() {
  const { orders, expenses, customers, settings } = useAppContext();

  // Smart Analysis Logic
  const analysis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter by date
    const getMonthData = (month: number, year: number) => {
      const monthOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });

      const totalSales = monthOrders.reduce((sum, o) => sum + (o.price || 0), 0);
      const totalProfits = monthOrders.reduce((sum, o) => sum + (o.expectedProfit !== undefined ? o.expectedProfit : ((o.price || 0) - (o.cost || 0))), 0);
      const totalExpenses = monthExpenses.filter(e => e.type !== 'وارد').reduce((sum, e) => sum + (e.amount || 0), 0);

      return { totalSales, totalProfits, totalExpenses, ordersCount: monthOrders.length };
    };

    const currentData = getMonthData(currentMonth, currentYear);
    const previousData = getMonthData(previousMonth, previousYear);

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const profitChange = calcChange(currentData.totalProfits, previousData.totalProfits);
    const expenseChange = calcChange(currentData.totalExpenses, previousData.totalExpenses);

    // Most requested services
    const serviceCount: Record<string, number> = {};
    orders.forEach(o => {
      if (o.serviceType) {
        serviceCount[o.serviceType] = (serviceCount[o.serviceType] || 0) + 1;
      }
    });
    const topServices = Object.entries(serviceCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Debtors (Overdue customers)
    const topDebtors = [...customers]
      .sort((a, b) => b.balance - a.balance)
      .filter(c => c.balance > 0)
      .slice(0, 5);

    return {
      currentData,
      previousData,
      profitChange,
      expenseChange,
      topServices,
      topDebtors
    };
  }, [orders, expenses, customers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Brain className="w-6 h-6 text-indigo-600 " />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">التحليل الذكي للمنظومة</h2>
          <p className="text-xs font-bold text-slate-600 mt-1">
            استنتاجات ومؤشرات أداء مالية وإدارية فورية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance indicators */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Profit Change Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100 to-transparent rounded-bl-full opacity-50" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-600 " />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 ">مؤشر الأرباح (الشهر الحالي)</h3>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-black text-slate-900 font-mono tabular-nums">
                  {analysis.currentData.totalProfits.toLocaleString()} <span className="text-sm text-slate-600 font-bold">{settings.shopInfo.currency}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${analysis.profitChange >= 0 ? 'bg-emerald-50 text-emerald-700 ' : 'bg-rose-50 text-rose-700 '}`}>
                  {analysis.profitChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(analysis.profitChange).toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-slate-600">مقارنة بالشهر السابق</span>
              </div>
            </div>

            {/* Expenses Change Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-100 to-transparent rounded-bl-full opacity-50" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-rose-600 " />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 ">مؤشر المصروفات (الشهر الحالي)</h3>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-black text-slate-900 font-mono tabular-nums">
                  {analysis.currentData.totalExpenses.toLocaleString()} <span className="text-sm text-slate-600 font-bold">{settings.shopInfo.currency}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${analysis.expenseChange <= 0 ? 'bg-emerald-50 text-emerald-700 ' : 'bg-amber-50 text-amber-700 '}`}>
                  {analysis.expenseChange <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {Math.abs(analysis.expenseChange).toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-slate-600">مقارنة بالشهر السابق</span>
              </div>
            </div>

          </div>

          {/* Top Services */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
             <div className="flex items-center gap-2 mb-6">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 ">الخدمات الأكثر طلباً</h3>
             </div>
             
             {analysis.topServices.length > 0 ? (
               <div className="space-y-4">
                 {analysis.topServices.map((service, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 ">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-slate-800 ">{service.name}</span>
                     </div>
                     <div className="px-3 py-1 bg-white rounded-lg text-sm font-bold text-slate-600 shadow-sm">
                       {service.count} طلب
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
                <p className="text-xs text-slate-600 font-bold text-center py-4">لا توجد بيانات كافية</p>
             )}
          </div>
        </div>

        {/* Right Sidebar - Debtors Alerts */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                 <AlertCircle className="w-5 h-5 text-rose-500" />
                 <h3 className="text-base font-bold text-slate-900 ">تنبيهات المديونيات</h3>
               </div>
             </div>

             {analysis.topDebtors.length > 0 ? (
               <div className="space-y-3">
                 {analysis.topDebtors.map(debtor => (
                   <div key={debtor.id} className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 :bg-rose-900/20 transition-all duration-150 ease-out ">
                     <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                         <Users className="w-4 h-4 text-rose-600 " />
                       </div>
                       <div className="truncate">
                         <h4 className="text-sm font-bold text-slate-900 truncate">{debtor.name}</h4>
                         <span className="text-[10px] text-slate-600 font-bold">{debtor.phone || 'بدون رقم'}</span>
                       </div>
                     </div>
                     <div className="mt-2 pt-2 border-t border-rose-100 flex justify-between items-center">
                       <span className="text-[11px] font-bold text-rose-700 ">الرصيد المتأخر:</span>
                       <span className="font-mono tabular-nums font-black text-rose-600 text-sm">
                         {debtor.balance.toLocaleString()} {settings.shopInfo.currency}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-xs text-slate-600 font-bold">لا توجد مديونيات متأخرة للعملاء</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
