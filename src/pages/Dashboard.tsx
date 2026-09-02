import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  DollarSign, TrendingDown, Wallet, AlertTriangle, Inbox, 
  Calendar, Clock, Layers, BarChart3, Award, CheckCircle2, 
  Briefcase, TrendingUp, Sparkles, Filter, CalendarDays,
  ArrowUpDown, ArrowUpRight
} from 'lucide-react';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, Cell 
} from 'recharts';

type TimeFilterRange = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function Dashboard() {
  const { orders, expenses, inventory, employees, settings, pagesConfig } = useAppContext();
  
  const dashboardConfig = useMemo(() => {
    return pagesConfig?.find(p => p.id === 'dashboard') || {
      name: 'لوحة التحكم',
      components: []
    };
  }, [pagesConfig]);

  const isComponentVisible = (compId: string, defaultVal = true) => {
    if (!dashboardConfig.components || dashboardConfig.components.length === 0) return defaultVal;
    const comp = dashboardConfig.components.find(c => c.id === compId);
    return comp ? comp.visible !== false : defaultVal;
  };

  // Interactive Time Filter State
  const [timeFilter, setTimeFilter] = useState<TimeFilterRange>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Filter orders and expenses based on active time filter
  const { filteredOrders, filteredExpenses, periodLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let oList = orders;
    let eList = expenses;
    let label = 'جميع الفترات';

    if (timeFilter === 'today') {
      label = 'اليوم (' + todayStr + ')';
      oList = orders.filter(o => o.date && format(new Date(o.date), 'yyyy-MM-dd') === todayStr);
      eList = expenses.filter(e => e.date && format(new Date(e.date), 'yyyy-MM-dd') === todayStr);
    } else if (timeFilter === 'week') {
      label = 'هذا الأسبوع (آخر 7 أيام)';
      oList = orders.filter(o => o.date && new Date(o.date) >= weekAgo);
      eList = expenses.filter(e => e.date && new Date(e.date) >= weekAgo);
    } else if (timeFilter === 'month') {
      label = 'هذا الشهر (' + format(now, 'MMMM yyyy') + ')';
      oList = orders.filter(o => o.date && new Date(o.date) >= monthStart);
      eList = expenses.filter(e => e.date && new Date(e.date) >= monthStart);
    } else if (timeFilter === 'custom') {
      label = `فترة مخصصة من ${customStartDate} إلى ${customEndDate}`;
      if (customStartDate) {
        const s = new Date(customStartDate);
        oList = oList.filter(o => o.date && new Date(o.date) >= s);
        eList = eList.filter(e => e.date && new Date(e.date) >= s);
      }
      if (customEndDate) {
        const eEnd = new Date(customEndDate);
        eEnd.setHours(23, 59, 59, 999);
        oList = oList.filter(o => o.date && new Date(o.date) <= eEnd);
        eList = eList.filter(e => e.date && new Date(e.date) <= eEnd);
      }
    }

    return { filteredOrders: oList, filteredExpenses: eList, periodLabel: label };
  }, [orders, expenses, timeFilter, customStartDate, customEndDate]);

  // Overall Financial Calculations for Filtered Period
  const totalSales = useMemo(() => filteredOrders.reduce((sum, order) => sum + order.price, 0), [filteredOrders]);
  
  const totalDirectExpenses = useMemo(() => filteredExpenses.filter(exp => exp.type !== 'وارد').reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);
  const totalOrderCosts = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.cost || 0), 0), [filteredOrders]);
  const totalCraneCosts = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.craneCost || 0), 0), [filteredOrders]);
  const totalExpenses = totalDirectExpenses + totalOrderCosts + totalCraneCosts;
  
  // Net profit based on orders profit margin & direct expenses
  const ordersTotalProfit = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const p = o.expectedProfit !== undefined ? o.expectedProfit : (o.price - (o.cost || 0));
      return sum + p;
    }, 0);
  }, [filteredOrders]);

  const netProfit = totalSales - totalExpenses;

  const lowStockItems = useMemo(() => inventory.filter(item => item.quantity <= item.minLimit), [inventory]);
  
  const upcomingDeliveries = useMemo(() => orders
    .filter(o => o.status !== 'تم التسليم' && o.targetDeliveryDate)
    .sort((a, b) => new Date(a.targetDeliveryDate!).getTime() - new Date(b.targetDeliveryDate!).getTime())
    .slice(0, 5)
  , [orders]);

  // Data for Net Profit Bar Chart by Service Type in Filtered Range
  const profitByServiceData = useMemo(() => {
    const serviceTypes = [
      'لافتة إعلانية',
      'إدارة صفحات سوشيال ميديا',
      'تصميم موقع إلكتروني',
      'خدمات طباعة'
    ];

    return serviceTypes.map(service => {
      const serviceOrders = filteredOrders.filter(o => (o.serviceType || 'لافتة إعلانية') === service);
      const sales = serviceOrders.reduce((sum, o) => sum + o.price, 0);
      const costs = serviceOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
      const profit = serviceOrders.reduce((sum, o) => {
        const p = o.expectedProfit !== undefined ? o.expectedProfit : (o.price - (o.cost || 0));
        return sum + p;
      }, 0);

      // Short label for chart display
      let shortName = service;
      if (service === 'إدارة صفحات سوشيال ميديا') shortName = 'سوشيال ميديا';
      if (service === 'تصميم موقع إلكتروني') shortName = 'مواقع ويب';

      return {
        name: shortName,
        fullName: service,
        مبيعات: sales,
        تكاليف: costs,
        صافي_الربح: profit,
        count: serviceOrders.length
      };
    });
  }, [filteredOrders]);

  // Ranking of Executing Parties (Employees / Staff) in Filtered Range
  const employeeRankings = useMemo(() => {
    const performerMap: { [key: string]: { totalOrders: number; completedOrders: number; totalSales: number; totalProfit: number; role?: string } } = {};

    // Initialize with all listed employees
    employees.forEach(emp => {
      performerMap[emp.name] = {
        totalOrders: 0,
        completedOrders: 0,
        totalSales: 0,
        totalProfit: 0,
        role: emp.role
      };
    });

    // Populate from filtered orders
    filteredOrders.forEach(order => {
      const performer = order.assignedEmployee || 'إدارة الورشة';
      if (!performerMap[performer]) {
        performerMap[performer] = {
          totalOrders: 0,
          completedOrders: 0,
          totalSales: 0,
          totalProfit: 0,
          role: 'فريق العمل'
        };
      }

      performerMap[performer].totalOrders += 1;
      performerMap[performer].totalSales += order.price;
      const p = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - (order.cost || 0));
      performerMap[performer].totalProfit += p;

      if (order.status === 'تم التسليم') {
        performerMap[performer].completedOrders += 1;
      }
    });

    // Convert to array and sort by completed orders then total delivered profit
    const list = Object.entries(performerMap).map(([name, data]) => ({
      name,
      ...data,
      completionRate: data.totalOrders > 0 ? Math.round((data.completedOrders / data.totalOrders) * 100) : 0
    }));

    return list.sort((a, b) => b.completedOrders - a.completedOrders || b.totalProfit - a.totalProfit);
  }, [employees, filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Top Header & Interactive Time Filtering Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/90 p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{dashboardConfig.name || 'لوحة التحكم'}</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ">
              {filteredOrders.length} طلبية بالفترة
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            الفترة الحالية المعروضة: <strong className="text-slate-800 ">{periodLabel}</strong>
          </p>
        </div>

        {/* Time Filtering Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ease-out ${
                timeFilter === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('week')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ease-out ${
                timeFilter === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('month')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ease-out ${
                timeFilter === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('custom')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ease-out ${
                timeFilter === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مخصص
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ease-out ${
                timeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
          </div>

          {/* Custom Date Range Picker (Shown when 'custom' is active) */}
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200/80 animate-in fade-in text-xs">
              <span className="text-slate-600 text-[11px] font-bold">من:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200/80 rounded-lg px-2 py-1 text-xs font-mono tabular-nums text-slate-800 "
              />
              <span className="text-slate-600 text-[11px] font-bold">إلى:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200/80 rounded-lg px-2 py-1 text-xs font-mono tabular-nums text-slate-800 "
              />
            </div>
          )}
        </div>
      </div>

      {/* Primary Financial Stats Grid (Updating Dynamically) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Sales Card */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 transition-all duration-150 ease-out group cursor-default bg-white/90 border border-slate-200/80 ">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">إجمالي المبيعات بالفترة</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-700 font-mono tabular-nums tracking-tight">
              {totalSales.toLocaleString()} <span className="text-sm font-semibold text-slate-600 ">{settings.shopInfo.currency}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">إجمالي الفواتير المسجلة لـ {filteredOrders.length} طلبية</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-l from-emerald-500 to-transparent opacity-70"></div>
        </div>

        {/* Total Expenses Card */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 transition-all duration-150 ease-out group cursor-default bg-white/90 border border-slate-200/80 ">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">إجمالي المصروفات والتكاليف</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center">
              <TrendingDown size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-rose-700 font-mono tabular-nums tracking-tight">
              {totalExpenses.toLocaleString()} <span className="text-sm font-semibold text-slate-600 ">{settings.shopInfo.currency}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">تشمل تكاليف التنفيذ، المواد المستهلكة، والمصاريف المباشرة</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-l from-rose-500 to-transparent opacity-70"></div>
        </div>

        {/* Net Profit Card */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 transition-all duration-150 ease-out group cursor-default bg-white/90 border border-slate-200/80 ">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">صافي الربح الفعلي بالفترة</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <div>
            <div className={`text-3xl font-black font-mono tabular-nums tracking-tight ${netProfit >= 0 ? 'text-slate-900 ' : 'text-rose-700 '}`}>
              {netProfit.toLocaleString()} <span className="text-sm font-semibold text-slate-600 ">{settings.shopInfo.currency}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              هامش ربح الطلبيات: +{ordersTotalProfit.toLocaleString()} {settings.shopInfo.currency}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-l from-slate-900 to-transparent opacity-70"></div>
        </div>
      </div>

      {/* Analytics Section: Net Profit Bar Chart & Employee Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Net Profit Bar Chart (7 Cols on desktop) */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-xl border border-slate-200/80 bg-white/95 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 ">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <BarChart3 size={17} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 ">تحليل صافي الأرباح والمبيعات حسب نوع الخدمة</h3>
                <p className="text-[11px] text-slate-600 ">مقارنة الإيرادات والتكاليف وصافي الأرباح المستخرجة من الفواتير للفترة المحددة</p>
              </div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-72 w-full pt-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={profitByServiceData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    const formatted = Number(value).toLocaleString();
                    const label = name === 'صافي_الربح' ? 'صافي الربح' : name === 'مبيعات' ? 'المبيعات' : 'التكاليف';
                    return [`${formatted} ${settings.shopInfo.currency}`, label];
                  }}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  formatter={(val) => {
                    if (val === 'صافي_الربح') return 'صافي الربح';
                    if (val === 'مبيعات') return 'إجمالي المبيعات';
                    return 'تكاليف التنفيذ';
                  }}
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                />
                <Bar dataKey="مبيعات" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="تكاليف" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="صافي_الربح" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-2 border-t border-slate-100 text-center text-xs">
            {profitByServiceData.map((item) => (
              <div key={item.name} className="p-2 rounded-xl bg-slate-50 ">
                <span className="text-[10px] text-slate-600 block truncate">{item.name}</span>
                <span className="font-mono tabular-nums text-xs font-black text-emerald-700 ">
                  +{item.صافي_الربح.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance Leaderboard (5 Cols on desktop) */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-xl border border-slate-200/80 bg-white/95 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 ">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Award size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 ">ترتيب وتقييم أداء المنفذين</h3>
                  <p className="text-[11px] text-slate-600 ">حسب إنجاز الطلبيات وصافي الأرباح المحققة بالفترة</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {employeeRankings.slice(0, 5).map((performer, idx) => (
                <div 
                  key={performer.name}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-3 hover:bg-slate-100/70 :bg-slate-800 transition-all duration-150 ease-out "
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono tabular-nums text-xs font-black shrink-0 ${
                      idx === 0 
                        ? 'bg-amber-500 text-white shadow-sm' 
                        : idx === 1 
                        ? 'bg-slate-300 text-slate-800 ' 
                        : idx === 2 
                        ? 'bg-amber-700 text-white' 
                        : 'bg-slate-100 text-slate-600 '
                    }`}>
                      #{idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {performer.name}
                        </span>
                        {performer.role && (
                          <span className="text-[10px] text-slate-600 ">
                            ({performer.role})
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5">
                        <span>إنجاز: <strong className="text-slate-800 ">{performer.completedOrders}/{performer.totalOrders}</strong></span>
                        <span>•</span>
                        <span>نسبة: <strong className="text-emerald-700 ">{performer.completionRate}%</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0 font-mono tabular-nums">
                    <span className="text-[10px] text-slate-400 block font-sans">صافي الربح</span>
                    <span className="text-xs font-black text-emerald-700 ">
                      +{performer.totalProfit.toLocaleString()} {settings.shopInfo.currency}
                    </span>
                  </div>
                </div>
              ))}

              {employeeRankings.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  لا توجد بيانات موظفين مسجلة للفترة المحددة
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-600 ">
            <span>* يتم الاحتساب تلقائياً بناءً على فواتير المبيعات</span>
            <span className="font-bold text-slate-700 ">{employeeRankings.length} منفذ مسجل</span>
          </div>
        </div>

      </div>

      {/* Alerts Section (Low Stock) */}
      {lowStockItems.length > 0 && (
        <div className="glass-panel rounded-xl p-5 border-r-4 border-r-rose-600 bg-rose-50/30 border border-slate-200/80 ">
          <div className="flex items-center space-x-2 space-x-reverse mb-3">
            <AlertTriangle size={18} className="text-rose-600 " />
            <h3 className="font-bold text-slate-900 text-sm">
              تنبيهات نواقص المخزن ({lowStockItems.length} أصناف دون الحد الأدنى)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-white border border-rose-200/80 p-3.5 rounded-xl flex flex-col gap-1 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 ">{item.name}</span>
                  <span className="text-[11px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-md">حرج</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>المتبقي: <strong className="text-rose-700 font-mono tabular-nums">{item.quantity} {item.unit}</strong></span>
                  <span>الحد الأدنى: <span className="font-mono tabular-nums">{item.minLimit}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid for Recent Orders and Upcoming Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Deliveries */}
        <div className="glass-panel rounded-xl flex flex-col overflow-hidden border-t-2 border-t-amber-500 bg-white/95 border border-slate-200/80 ">
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900 ">
              <Clock size={18} className="text-amber-600 " />
              طلبيات اقترب موعد تسليمها
            </h3>
            <span className="text-xs text-slate-600 font-medium">{upcomingDeliveries.length} طلبيات</span>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            {upcomingDeliveries.map(order => {
              const daysLeft = Math.ceil((new Date(order.targetDeliveryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 2;
              return (
                <div key={order.id} className={`p-3.5 rounded-xl flex items-center justify-between border transition-all duration-150 ease-out ${isUrgent ? 'bg-amber-50/80 border-amber-300 shadow-sm' : 'bg-white border-slate-200/80 '}`}>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 ">{order.clientName}</h4>
                    <p className="text-xs text-slate-600 line-clamp-1">{order.description}</p>
                    {order.dimensions?.width && order.dimensions?.height && (
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5 inline-block">
                        {order.dimensions.height}م × {order.dimensions.width}م
                      </span>
                    )}
                  </div>
                  <div className="text-left flex flex-col items-end shrink-0">
                    <span className={`text-xs font-bold flex items-center gap-1 ${isUrgent ? 'text-amber-700 ' : 'text-slate-800 '}`}>
                      <Calendar size={13} />
                      {format(new Date(order.targetDeliveryDate!), 'yyyy-MM-dd')}
                    </span>
                    <span className={`text-[11px] font-semibold mt-1 px-2 py-0.5 rounded-md ${daysLeft > 0 ? (isUrgent ? 'bg-amber-100 text-amber-800 ' : 'bg-slate-100 text-slate-600 ') : 'bg-rose-100 text-rose-700 '}`}>
                      {daysLeft > 0 ? `متبقي ${daysLeft} يوم` : 'فات الموعد'}
                    </span>
                  </div>
                </div>
              );
            })}
            {upcomingDeliveries.length === 0 && (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-2 flex-1">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
                  <Calendar size={22} />
                </div>
                <span className="text-slate-600 text-xs font-medium">لا توجد تسليمات معلقة قريبة</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity (Orders) in Filtered Range */}
        <div className="glass-panel rounded-xl flex flex-col overflow-hidden bg-white/95 border border-slate-200/80 ">
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 ">فواتير وطلبيات الفترة</h3>
            <span className="text-xs text-slate-600 font-medium">{filteredOrders.length} طلبية مسجلة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-xs text-slate-600 bg-slate-50/80 border-b border-slate-200/80 ">
                <tr>
                  <th className="p-3.5 font-bold">العميل</th>
                  <th className="p-3.5 font-bold text-left">المبلغ</th>
                  <th className="p-3.5 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 ">
                {filteredOrders.slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/60 :bg-slate-800/50 transition-all duration-150 ease-out ">
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block text-xs">{order.clientName}</span>
                      <span className="text-[11px] text-slate-400 line-clamp-1">{order.description}</span>
                    </td>
                    <td className="p-3.5 text-left font-mono tabular-nums font-bold text-slate-900 text-xs">
                      {order.price.toLocaleString()} {settings.shopInfo.currency}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${
                        order.status === 'تم التسليم' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ' :
                        order.status === 'قيد التركيب' ? 'bg-blue-50 text-blue-700 border-blue-200 ' :
                        order.status === 'قيد الطباعة' ? 'bg-amber-50 text-amber-700 border-amber-200 ' :
                        order.status === 'قيد التصميم' || order.status === 'بانتظار اعتماد التصميم' ? 'bg-purple-50 text-purple-700 border-purple-200 ' :
                        'bg-slate-50 text-slate-700 border-slate-200/80 '
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
                          <Inbox size={22} />
                        </div>
                        <span className="text-slate-600 text-xs">لا توجد طلبيات مسجلة في هذه الفترة الزمنية</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
