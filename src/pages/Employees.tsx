import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Employee, EmployeeRole, Order } from '../types';
import { 
  Plus, Briefcase, DollarSign, X, FileText, Printer, 
  Coins, TrendingUp, CheckCircle2, Award, Calendar, Layers, ShieldCheck 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Employees() {
  const { employees, addEmployee, updateEmployee, orders, settings } = useAppContext();
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
  
  const getEmployeeStats = (employee: Employee) => {
    const empName = employee.name;
    const baseSalary = employee.salary;
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

    const totalCollected = empOrders.reduce((sum, o) => sum + ((o.deposit || 0) + (o.paymentMethod === 'نقدي' || o.paymentMethod === 'بطاقة' || o.paymentMethod === 'تحويل' ? (o.price - (o.deposit || 0)) : 0)), 0); // basic approximation of collected amount
    
    // Total commissions from employee.commissions array
    const commissions = employee.commissions || [];
    const totalDue = commissions.filter(c => c.status === 'مستحقة').reduce((s, c) => s + c.amount, 0);
    const totalApproved = commissions.filter(c => c.status === 'معتمدة').reduce((s, c) => s + c.amount, 0);
    const totalPaid = commissions.filter(c => c.status === 'مدفوعة').reduce((s, c) => s + c.amount, 0);

    const totalNetDue = baseSalary + totalDue + totalApproved;

    return {
      empOrders,
      totalOrdersCount,
      completedOrdersCount,
      totalSales,
      totalCosts,
      totalProfit,
      totalCollected,
      commissions,
      totalDue,
      totalApproved,
      totalPaid,
      totalNetDue,
    };
  };

  const calculateCommissionAmount = (order: Order) => {
    const basis = settings.commissionBasis || 'صافي الربح';
    const rate = 0.05; // 5% base rate for demo
    if (basis === 'إجمالي المبيعات') return (order.price || 0) * rate;
    if (basis === 'المبلغ المحصل') {
        const collected = (order.deposit || 0) + ((order.price || 0) - (order.remaining || 0));
        return collected * rate;
    }
    const profit = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - (order.cost || 0));
    return Math.max(0, profit * rate);
  };

  const handleUpdateCommissionStatus = (empId: string, commissionId: string, newStatus: 'مستحقة' | 'معتمدة' | 'مدفوعة') => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const updatedCommissions = (emp.commissions || []).map(c => 
      c.id === commissionId ? { ...c, status: newStatus } : c
    );
    updateEmployee(empId, { commissions: updatedCommissions });
    if (selectedEmployeeForStatement?.id === empId) {
        setSelectedEmployeeForStatement({ ...emp, commissions: updatedCommissions });
    }
  };

  const handleGenerateCommissions = (emp: Employee) => {
     // Generate missing commissions for completed orders
     const stats = getEmployeeStats(emp);
     const existingOrderIds = new Set(stats.commissions.map(c => c.orderId));
     
     const newCommissions = stats.empOrders
        .filter(o => o.status === 'تم التسليم' && !existingOrderIds.has(o.id))
        .map(o => ({
           id: Math.random().toString(36).substring(2, 9),
           orderId: o.id,
           amount: calculateCommissionAmount(o),
           status: 'مستحقة' as const,
           date: new Date().toISOString(),
           description: `عمولة طلب #${o.serialNumber || o.id}`
        }));
        
     if (newCommissions.length > 0) {
        const updatedCommissions = [...(emp.commissions || []), ...newCommissions];
        updateEmployee(emp.id, { commissions: updatedCommissions });
        if (selectedEmployeeForStatement?.id === emp.id) {
           setSelectedEmployeeForStatement({ ...emp, commissions: updatedCommissions });
        }
     }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">الموظفين</h2>
          <p className="text-xs text-slate-600 mt-1">
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
        <div className="glass-panel p-6 rounded-xl no-print animate-in fade-in slide-in-from-top-4 border-emerald-500/30 shadow-sm bg-white/95 border border-slate-200/80 ">
          <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100 ">
            <h3 className="font-bold text-base text-slate-900 ">تسجيل بيانات موظف / فني</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 :text-slate-200 p-1">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الثلاثي</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                placeholder="أدخل اسم الموظف..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المسمى الوظيفي / الصلاحية</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as EmployeeRole)}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm appearance-none bg-white "
              >
                <option value="مدير">مدير ورشة / مشرف عام</option>
                <option value="مصمم">مصمم جرافيك ولوافت</option>
                <option value="مركب">فني تصنيع وتركيب ميداني</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الراتب الشهري الأساسي ({settings.shopInfo.currency})
              </label>
              <input
                type="number"
                required
                min="0"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums"
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 ">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 :text-white hover:bg-slate-100 :bg-slate-800 transition-all duration-150 ease-out "
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
          const stats = getEmployeeStats(employee);

          return (
            <div 
              key={employee.id} 
              className="glass-panel p-6 rounded-xl flex flex-col gap-4 hover:shadow-sm transition-all duration-150 ease-out bg-white/95 border border-slate-200/80 "
            >
              <div className="flex items-center gap-3.5">
                {/* Geometric monogram badge */}
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0 border border-slate-700 ">
                  {employee.name.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{employee.name}</h3>
                  <span className={`inline-block text-[11px] font-bold mt-0.5 px-2 py-0.5 rounded-md border w-max
                    ${employee.role === 'مدير' ? 'bg-purple-50 text-purple-700 border-purple-200 ' :
                      employee.role === 'مصمم' ? 'bg-blue-50 text-blue-700 border-blue-200 ' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200 '}`}>
                    {employee.role}
                  </span>
                </div>
              </div>

              {/* Financial & Commissions Stats */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 text-xs">
                
                {/* Base Salary */}
                <div className="flex justify-between items-center text-slate-600 py-1">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-slate-400" />
                    الراتب الأساسي
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-800 ">
                    {employee.salary.toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                {/* 5% Commissions on profits */}
                <div className="flex justify-between items-center py-1 bg-emerald-50/60 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 ">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                    <TrendingUp size={13} className="text-emerald-600" />
                    إجمالي العمولات (5%)
                  </span>
                  <span className="font-mono tabular-nums font-black text-emerald-700 text-xs">
                    +{(stats.totalDue + stats.totalApproved).toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                {/* Total Net Due */}
                <div className="flex justify-between items-center text-slate-700 py-1 font-bold">
                  <span>إجمالي المستحق الشامل</span>
                  <span className="font-mono tabular-nums font-black text-sm text-slate-900 ">
                    {stats.totalNetDue.toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                {/* Orders count */}
                <div className="flex justify-between items-center text-slate-600 text-[11px] pt-1">
                  <span>الطلبيات المسندة:</span>
                  <span className="font-bold text-slate-700 ">
                    {stats.totalOrdersCount} طلبية ({stats.completedOrdersCount} منجز)
                  </span>
                </div>
              </div>
              
              {/* Card Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 mt-auto">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForStatement(employee)}
                  className="w-full glass-button text-xs py-2 rounded-xl text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200 font-bold transition-all duration-150 ease-out flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText size={14} />
                  <span>كشف حساب وعمولات الموظف</span>
                </button>
              </div>
            </div>
          );
        })}
        
        {employees.length === 0 && (
          <div className="col-span-full glass-panel p-16 rounded-xl text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
              <Briefcase size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">لا يوجد موظفون مسجلون</h3>
              <p className="text-xs text-slate-600 ">قم بإضافة فنيين ومصممين لبدء توزيع المهام ومتابعة الرواتب والعمولات.</p>
            </div>
          </div>
        )}
      </div>

      {/* Employee Account Statement Modal (كشف حساب الموظف والعمولات) */}
      {selectedEmployeeForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl bg-white border border-slate-200/80 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80 ">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
                  {selectedEmployeeForStatement.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>كشف حساب الموظف: {selectedEmployeeForStatement.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-normal">
                      {selectedEmployeeForStatement.role}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 ">
                    تقرير مفصل بالأرباح المحققة، ونسبة العمولة 5%، وإجمالي المستحقات المالية
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 "
                >
                  <Printer size={15} />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForStatement(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 :text-slate-200 rounded-xl hover:bg-slate-100 :bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
              {(() => {
                const stats = getEmployeeStats(selectedEmployeeForStatement);

                return (
                  <>
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      
                      {/* 1. Base Salary */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 ">
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">
                          الراتب الشهري الأساسي
                        </span>
                        <div className="font-mono tabular-nums text-lg font-black text-slate-900 ">
                          {selectedEmployeeForStatement.salary.toLocaleString()} {settings.shopInfo.currency}
                        </div>
                      </div>

                      
                      {/* 2. Executed Orders Profit */}
                      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 ">
                        <span className="text-[11px] font-bold text-blue-800 block mb-1">
                          إجمالي أرباح الطلبيات
                        </span>
                        <div className="font-mono tabular-nums text-lg font-black text-blue-700 ">
                          {stats.totalProfit.toLocaleString()} {settings.shopInfo.currency}
                        </div>
                        <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                          من إجمالي {stats.totalOrdersCount} طلبية
                        </span>
                      </div>

                      {/* 3. Total Commissions */}
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 shadow-sm">
                        <span className="text-[11px] font-bold text-emerald-800 block mb-1">
                          إجمالي العمولات المتاحة
                        </span>
                        <div className="font-mono tabular-nums text-xl font-black text-emerald-700 ">
                          +{(stats.totalDue + stats.totalApproved).toLocaleString()} {settings.shopInfo.currency}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                          مستحقة أو معتمدة
                        </span>
                      </div>
{/* 4. Total Net Due */}
                      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          إجمالي المستحق النهائي
                        </span>
                        <div className="font-mono tabular-nums text-xl font-black text-emerald-400">
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
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Layers size={16} className="text-emerald-600" />
                          <span>تفاصيل الطلبيات والعمولات المستحقة لكل طلبية</span>
                        </h4>
                        <span className="text-xs text-slate-600 font-medium">
                          {stats.empOrders.length} طلبية مسجلة
                        </span>
                      </div>

                      <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white ">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80 ">
                              <tr>
                                <th className="p-3.5">رقم الفاتورة</th>
                                <th className="p-3.5">العميل</th>
                                <th className="p-3.5">الخدمة</th>
                                <th className="p-3.5">الحالة</th>
                                <th className="p-3.5 text-left font-mono tabular-nums">سعر الفاتورة</th>
                                <th className="p-3.5 text-left font-mono tabular-nums">تكلفة التنفيذ</th>
                                <th className="p-3.5 text-left font-mono tabular-nums">صافي الربح</th>
                                <th className="p-3.5 text-left font-mono tabular-nums text-emerald-700 font-black">عمولة الموظف (5%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 ">
                              {stats.empOrders.map((order) => {
                                const costVal = order.cost || 0;
                                const profitVal = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - costVal);
                                const commissionVal = Math.max(0, profitVal * 0.05);

                                return (
                                  <tr key={order.id} className="hover:bg-slate-50/50 :bg-slate-800/50 transition-all duration-150 ease-out ">
                                    <td className="p-3.5 font-mono tabular-nums font-bold text-slate-900 ">
                                      #{order.serialNumber || order.id}
                                    </td>
                                    <td className="p-3.5 font-bold text-slate-800 ">
                                      {order.clientName}
                                    </td>
                                    <td className="p-3.5 text-slate-600 ">
                                      {order.serviceType || 'لافتة إعلانية'}
                                    </td>
                                    <td className="p-3.5">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        order.status === 'تم التسليم' ? 'bg-emerald-100 text-emerald-800 ' :
                                        order.status === 'قيد التركيب' ? 'bg-blue-100 text-blue-800 ' :
                                        'bg-slate-100 text-slate-700 '
                                      }`}>
                                        {order.status}
                                      </span>
                                    </td>
                                    <td className="p-3.5 text-left font-mono tabular-nums text-slate-900 font-bold">
                                      {order.price.toLocaleString()} {settings.shopInfo.currency}
                                    </td>
                                    <td className="p-3.5 text-left font-mono tabular-nums text-rose-700 font-bold">
                                      {costVal.toLocaleString()} {settings.shopInfo.currency}
                                    </td>
                                    <td className="p-3.5 text-left font-mono tabular-nums text-slate-900 font-bold">
                                      +{profitVal.toLocaleString()} {settings.shopInfo.currency}
                                    </td>
                                    <td className="p-3.5 text-left font-mono tabular-nums text-emerald-700 font-black text-xs">
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
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/80 flex justify-between items-center">
              <span className="text-[11px] text-slate-600 font-medium">
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
