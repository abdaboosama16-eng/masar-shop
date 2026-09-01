import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  FileBarChart, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Activity, 
  PieChart, 
  Users, 
  AlertCircle,
  PackageX,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { Order, Expense } from '../types';

export default function Audit() {
  const { orders, expenses, currentUser, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual'>('monthly');

  const hasAccess = currentUser?.role === 'مدير' || settings.permissions[currentUser?.role || '']?.audit;
  
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-150">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">صلاحية غير متوفرة</h2>
        <p className="text-slate-600 text-center max-w-md">
          عذراً، لا تملك الصلاحيات الكافية للوصول إلى تقارير الجرد المالي. يرجى مراجعة مدير النظام.
        </p>
      </div>
    );
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };
  
  const isThisYear = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === currentYear;
  };

  // --- Data Filtering ---
  const periodOrders = useMemo(() => {
    return activeTab === 'monthly' ? orders.filter(o => isThisMonth(o.date)) : orders.filter(o => isThisYear(o.date));
  }, [orders, activeTab, currentMonth, currentYear]);

  const periodExpenses = useMemo(() => {
    return activeTab === 'monthly' ? expenses.filter(e => isThisMonth(e.date)) : expenses.filter(e => isThisYear(e.date));
  }, [expenses, activeTab, currentMonth, currentYear]);

  // --- Calculations ---
  const stats = useMemo(() => {
    // Basic Sums
    const totalSales = periodOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const totalDirectCosts = periodOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
    const totalOrderProfits = periodOrders.reduce((sum, o) => sum + (o.expectedProfit || (o.price - (o.cost || 0))), 0);
    
    // Expenses table (Ward / Masrouf)
    const totalOperatingExpenses = periodExpenses.filter(e => e.type === 'مصروف' || !e.type).reduce((sum, e) => sum + e.amount, 0);
    const totalOtherIncomes = periodExpenses.filter(e => e.type === 'وارد').reduce((sum, e) => sum + e.amount, 0);

    // Cash flow / Debts
    const totalDebts = periodOrders.reduce((sum, o) => sum + (o.remaining || 0), 0);
    const cashCollectedFromOrders = totalSales - totalDebts;
    
    // Net values
    const netProfit = totalOrderProfits + totalOtherIncomes - totalOperatingExpenses;
    const treasuryBalance = cashCollectedFromOrders + totalOtherIncomes - totalOperatingExpenses; // صافي الخزينة

    // Service Analysis
    const serviceStats = periodOrders.reduce((acc, o) => {
      const type = o.serviceType || 'غير محدد';
      if (!acc[type]) acc[type] = { count: 0, revenue: 0, profit: 0 };
      acc[type].count += 1;
      acc[type].revenue += (o.price || 0);
      acc[type].profit += (o.expectedProfit || (o.price - (o.cost || 0)));
      return acc;
    }, {} as Record<string, { count: number; revenue: number; profit: number }>);

    const serviceArray = Object.entries(serviceStats).map(([name, data]: [string, any]) => ({
      name,
      ...data,
      profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
    }));

    const mostRequestedServices = [...serviceArray].sort((a, b) => b.count - a.count).slice(0, 5);
    const leastProfitableServices = [...serviceArray].sort((a, b) => a.profitMargin - b.profitMargin).slice(0, 5);

    // Client Analysis
    const clientStats = periodOrders.reduce((acc, o) => {
      const client = o.clientName || 'غير محدد';
      if (!acc[client]) acc[client] = { count: 0, revenue: 0, profit: 0, debt: 0 };
      acc[client].count += 1;
      acc[client].revenue += (o.price || 0);
      acc[client].profit += (o.expectedProfit || (o.price - (o.cost || 0)));
      acc[client].debt += (o.remaining || 0);
      return acc;
    }, {} as Record<string, { count: number; revenue: number; profit: number; debt: number }>);

    const clientArray = Object.entries(clientStats).map(([name, data]: [string, any]) => ({ name, ...data }));
    
    const topProfitableClients = [...clientArray].sort((a, b) => b.profit - a.profit).slice(0, 5);
    const topDebtors = [...clientArray].filter(c => c.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 5);

    return {
      totalSales,
      totalOperatingExpenses,
      totalOtherIncomes,
      totalDebts,
      cashCollectedFromOrders,
      netProfit,
      treasuryBalance,
      mostRequestedServices,
      leastProfitableServices,
      topProfitableClients,
      topDebtors
    };
  }, [periodOrders, periodExpenses]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileBarChart size={22} />
            </div>
            تقارير الجرد المالي
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            مؤشرات مالية متقدمة، وتحليل شامل لأداء المنظومة والتدفقات النقدية.
          </p>
        </div>

        {/* Period Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ease-out ${
              activeTab === 'monthly'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 :text-white'
            }`}
          >
            الجرد الشهري
          </button>
          <button
            onClick={() => setActiveTab('annual')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ease-out ${
              activeTab === 'annual'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 :text-white'
            }`}
          >
            الجرد السنوي
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="إجمالي المبيعات" 
          value={stats.totalSales} 
          icon={<TrendingUp size={20} />} 
          colorClass="text-emerald-600 bg-emerald-50 " 
        />
        <MetricCard 
          title="صافي الأرباح" 
          value={stats.netProfit} 
          icon={<PieChart size={20} />} 
          colorClass="text-blue-600 bg-blue-50 " 
        />
        <MetricCard 
          title="صافي الخزينة (النقد المتوفر)" 
          value={stats.treasuryBalance} 
          icon={<Wallet size={20} />} 
          colorClass="text-indigo-600 bg-indigo-50 " 
        />
        <MetricCard 
          title="إجمالي المصروفات" 
          value={stats.totalOperatingExpenses} 
          icon={<TrendingDown size={20} />} 
          colorClass="text-rose-600 bg-rose-50 " 
        />
      </div>

      {/* Two Column Layout for Complex Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Services Analysis */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-800 ">تحليل الخدمات والمنتجات</h3>
          </div>
          
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">الأكثر طلباً واستخداماً</h4>
              <div className="space-y-3">
                {stats.mostRequestedServices.length > 0 ? stats.mostRequestedServices.map(service => (
                  <div key={service.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-800 ">{service.name}</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">{service.count} طلب</span>
                  </div>
                )) : <div className="text-sm text-slate-600">لا توجد بيانات متاحة</div>}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">الخدمات الأقل ربحية (هامش الربح)</h4>
              <div className="space-y-3">
                {stats.leastProfitableServices.length > 0 ? stats.leastProfitableServices.map(service => (
                  <div key={service.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 ">{service.name}</span>
                      <span className="text-xs text-slate-600">إجمالي الأرباح: {service.profit.toLocaleString()} د.ل</span>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md">
                      {service.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                )) : <div className="text-sm text-slate-600">لا توجد بيانات متاحة</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Clients & Debts Analysis */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-800 ">العملاء والديون</h3>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-600 block">إجمالي الديون المعلقة</span>
              <span className="text-lg font-black text-rose-600">{stats.totalDebts.toLocaleString()} د.ل</span>
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">العملاء الأكثر ربحية</h4>
              <div className="space-y-3">
                {stats.topProfitableClients.length > 0 ? stats.topProfitableClients.map(client => (
                  <div key={client.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 ">{client.name}</span>
                      <span className="text-xs text-slate-600">{client.count} طلبات</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 ">
                      {client.profit.toLocaleString()} د.ل
                    </span>
                  </div>
                )) : <div className="text-sm text-slate-600">لا توجد بيانات متاحة</div>}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-4 border-b border-slate-100 pb-2">موقف الديون (أكبر الأرصدة المعلقة)</h4>
              <div className="space-y-3">
                {stats.topDebtors.length > 0 ? stats.topDebtors.map(client => (
                  <div key={client.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-800 ">{client.name}</span>
                    <span className="text-sm font-bold text-rose-600 ">
                      {client.debt.toLocaleString()} د.ل
                    </span>
                  </div>
                )) : <div className="text-sm text-slate-600">لا توجد ديون معلقة</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, colorClass }: { title: string, value: number, icon: React.ReactNode, colorClass: string }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold text-slate-600 ">{title}</h3>
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">
        {value.toLocaleString()} <span className="text-sm text-slate-600 font-bold ml-1">د.ل</span>
      </div>
    </div>
  );
}
