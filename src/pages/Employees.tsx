import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Employee, EmployeeRole, Order } from '../types';
import { 
  Plus, Briefcase, DollarSign, X, FileText, Printer, 
  TrendingUp, CheckCircle2, Award, Calendar, Layers, ShieldCheck 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Employees() {
  const { employees, addEmployee, orders, settings } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployeeForStatement, setSelectedEmployeeForStatement] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('مصمم');
  const [salary, setSalary] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salary) return;

    addEmployee({
      name,
      role,
      salary: Number(salary)
    });

    setName('');
    setRole('مصمم');
    setSalary('');
    setShowForm(false);
  };

  // Helper function to calculate orders and 5% commission for an employee
  const getEmployeeStats = (empName: string, baseSalary: number) => {
    const empOrders = orders.filter(
      o => o.assignedEmployee && o.assignedEmployee.trim().toLowerCase() === empName.trim().toLowerCase()
    );

    const totalOrdersCount = empOrders.length;
    const completedOrdersCount = empOrders.filter(o => o.status === 'تم التسليم').length;

    const totalSales = empOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const totalCosts = empOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
    
    // Net profit for linked orders
    const totalProfit = empOrders.reduce((sum, o) => {
      const p = o.expectedProfit !== undefined ? o.expectedProfit : (o.price - (o.cost || 0));
      return sum + p;
    }, 0);

    // 5% Commission on profits
    const commissionRate = 0.05;
    const totalCommission = Math.max(0, totalProfit * commissionRate);
    const totalNetDue = baseSalary + totalCommission;

    return {
      empOrders,
      totalOrdersCount,
      completedOrdersCount,
      totalSales,
      totalCosts,
      totalProfit,
      totalCommission,
      totalNetDue,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">شؤون العاملين وفريق العمل</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة بطاقات الموظفين، الرواتب، واحتساب العمولات المستحقة تلقائياً (5% من أرباح العمليات المنفذة)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm text-xs font-bold"
        >
          <Plus size={16} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <div className="glass-panel p-6 rounded-2xl no-print animate-in fade-in slide-in-from-top-4 border-emerald-500/30 shadow-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">تسجيل بيانات موظف / فني</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">الاسم الثلاثي</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                placeholder="أدخل اسم الموظف..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">المسمى الوظيفي / الصلاحية</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as EmployeeRole)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm appearance-none bg-white dark:bg-slate-800"
              >
                <option value="مدير">مدير ورشة / مشرف عام</option>
                <option value="مصمم">مصمم جرافيك ولوافت</option>
                <option value="مركب">فني تصنيع وتركيب ميداني</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الراتب الشهري الأساسي ({settings.shopInfo.currency})
              </label>
              <input
                type="number"
                required
                min="0"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-sm"
              >
                حفظ بيانات الموظف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 no-print">
        {employees.map(employee => {
          const stats = getEmployeeStats(employee.name, employee.salary);

          return (
            <div 
              key={employee.id} 
              className="glass-panel p-6 rounded-2xl flex flex-col gap-4 hover:shadow-lg transition-all duration-200 bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center gap-3.5">
                {/* Geometric monogram badge */}
                <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0 border border-slate-700 dark:border-slate-600">
                  {employee.name.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{employee.name}</h3>
                  <span className={`inline-block text-[11px] font-bold mt-0.5 px-2 py-0.5 rounded-md border w-max
                    ${employee.role === 'مدير' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                      employee.role === 'مصمم' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}`}>
                    {employee.role}
                  </span>
                </div>
              </div>

              {/* Financial & Commissions Stats */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                
                {/* Base Salary */}
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 py-1">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-slate-400" />
                    الراتب الأساسي
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {employee.salary.toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                {/* 5% Commissions on profits */}
                <div className="flex justify-between items-center py-1 bg-emerald-50/60 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-[11px]">
                    <TrendingUp size={13} className="text-emerald-600" />
                    إجمالي العمولات (5%)
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-xs">
                    +{stats.totalCommission.toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                {/* Total Net Due */}
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 py-1 font-bold">
                  <span>إجمالي المستحق الشامل</span>
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {stats.totalNetDue.toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                {/* Orders count */}
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                  <span>الطلبيات المسندة:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {stats.totalOrdersCount} طلبية ({stats.completedOrdersCount} منجز)
                  </span>
                </div>
              </div>
              
              {/* Card Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForStatement(employee)}
                  className="w-full glass-button text-xs py-2 rounded-xl text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/70 border-emerald-200 dark:border-emerald-800 font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText size={14} />
                  <span>كشف حساب وعمولات الموظف</span>
                </button>
              </div>
            </div>
          );
        })}
        
        {employees.length === 0 && (
          <div className="col-span-full glass-panel p-16 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
              <Briefcase size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">لا يوجد موظفون مسجلون</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">قم بإضافة فنيين ومصممين لبدء توزيع المهام ومتابعة الرواتب والعمولات.</p>
            </div>
          </div>
        )}
      </div>

      {/* Employee Account Statement Modal (كشف حساب الموظف والعمولات) */}
      {selectedEmployeeForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
                  {selectedEmployeeForStatement.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>كشف حساب الموظف: {selectedEmployeeForStatement.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-normal">
                      {selectedEmployeeForStatement.role}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تقرير مفصل بالأرباح المحققة، ونسبة العمولة 5%، وإجمالي المستحقات المالية
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
                >
                  <Printer size={15} />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForStatement(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
              {(() => {
                const stats = getEmployeeStats(selectedEmployeeForStatement.name, selectedEmployeeForStatement.salary);

                return (
                  <>
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      
                      {/* 1. Base Salary */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          الراتب الشهري الأساسي
                        </span>
                        <div className="font-mono text-lg font-black text-slate-900 dark:text-white">
                          {selectedEmployeeForStatement.salary.toLocaleString()} {settings.shopInfo.currency}
                        </div>
                      </div>

                      {/* 2. Executed Orders Profit */}
                      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60">
                        <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block mb-1">
                          إجمالي أرباح الطلبيات
                        </span>
                        <div className="font-mono text-lg font-black text-blue-700 dark:text-blue-400">
                          {stats.totalProfit.toLocaleString()} {settings.shopInfo.currency}
                        </div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                          من إجمالي {stats.totalOrdersCount} طلبية
                        </span>
                      </div>

                      {/* 3. Total Commissions (5%) */}
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                          إجمالي العمولات المستحقة (5%)
                        </span>
                        <div className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-400">
                          +{stats.totalCommission.toLocaleString()} {settings.shopInfo.currency}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                          5% محتسبة من صافي الأرباح
                        </span>
                      </div>

                      {/* 4. Total Net Due */}
                      <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md">
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          إجمالي المستحق النهائي
                        </span>
                        <div className="font-mono text-xl font-black text-emerald-400">
                          {stats.totalNetDue.toLocaleString()} {settings.shopInfo.currency}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                          الراتب + العمولات
                        </span>
                      </div>
                    </div>

                    {/* Assigned Orders Breakdown Table */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Layers size={16} className="text-emerald-600" />
                          <span>تفاصيل الطلبيات والعمولات المستحقة لكل طلبية</span>
                        </h4>
                        <span className="text-xs text-slate-500 font-medium">
                          {stats.empOrders.length} طلبية مسجلة
                        </span>
                      </div>

                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="p-3.5">رقم الفاتورة</th>
                                <th className="p-3.5">العميل</th>
                                <th className="p-3.5">الخدمة</th>
                                <th className="p-3.5">الحالة</th>
                                <th className="p-3.5 text-left font-mono">سعر الفاتورة</th>
                                <th className="p-3.5 text-left font-mono">تكلفة التنفيذ</th>
                                <th className="p-3.5 text-left font-mono">صافي الربح</th>
                                <th className="p-3.5 text-left font-mono text-emerald-700 dark:text-emerald-400 font-black">عمولة الموظف (5%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {stats.empOrders.map((order) => {
                                const costVal = order.cost || 0;
                                const profitVal = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - costVal);
                                const commissionVal = Math.max(0, profitVal * 0.05);

                                return (
                                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                                      #{order.serialNumber || order.id}
                                    </td>
                                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                                      {order.clientName}
                                    </td>
                                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                                      {order.serviceType || 'لافتة إعلانية'}
                                    </td>
                                    <td className="p-3.5">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        order.status === 'تم التسليم' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' :
                                        order.status === 'قيد التركيب' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}>
                                        {order.status}
                                      </span>
                                    </td>
                                    <td className="p-3.5 text-left font-mono text-slate-900 dark:text-white font-bold">
                                      {order.price.toLocaleString()} {settings.shopInfo.currency}
                                    </td>
                                    <td className="p-3.5 text-left font-mono text-rose-700 dark:text-rose-400 font-bold">
                                      {costVal.toLocaleString()} {settings.shopInfo.currency}
                                    </td>
                                    <td className="p-3.5 text-left font-mono text-slate-900 dark:text-white font-bold">
                                      +{profitVal.toLocaleString()} {settings.shopInfo.currency}
                                    </td>
                                    <td className="p-3.5 text-left font-mono text-emerald-700 dark:text-emerald-400 font-black text-xs">
                                      +{commissionVal.toFixed(2)} {settings.shopInfo.currency}
                                    </td>
                                  </tr>
                                );
                              })}

                              {stats.empOrders.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-slate-400">
                                    لا توجد طلبيات مسندة لهذا الموظف حتى الآن
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                * تم إعداد هذا الكشف تلقائياً وفقاً للائحة الحوافز ونسبة الـ 5% من أرباح المشاريع
              </span>
              <button
                type="button"
                onClick={() => setSelectedEmployeeForStatement(null)}
                className="btn-primary px-6 py-2 rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
