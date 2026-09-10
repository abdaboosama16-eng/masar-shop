import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Employee, EmployeeRole, Order } from '../types';
import { 
  Plus, Briefcase, DollarSign, X, FileText, Printer, 
  TrendingUp, CheckCircle2, Calendar, Layers, CheckSquare, Wrench
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface ExecutedTaskItem {
  id: string;
  orderId: string;
  serialNumber?: string;
  clientName: string;
  serviceType: string;
  taskName: string;
  taskRole: string;
  amount: number;
  date?: string;
  status?: string;
}

export default function Employees() {
  const { employees, addEmployee, updateEmployee, orders, settings } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployeeForStatement, setSelectedEmployeeForStatement] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('مصمم');
  const [salary, setSalary] = useState('');

  const currency = settings?.shopInfo?.currency || 'د.ل';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    const parsedSalary = parseFloat(salary);

    if (!cleanName) {
      alert('يرجى إدخال اسم الموظف');
      return;
    }

    if (isNaN(parsedSalary) || parsedSalary < 0) {
      alert('يرجى إدخال قيمة صحيحة للراتب');
      return;
    }

    addEmployee({
      name: cleanName,
      role,
      salary: parsedSalary
    });

    setName('');
    setRole('مصمم');
    setSalary('');
    setShowForm(false);
  };

  // Helper function to extract all tasks, services and orders linked to an employee
  const getEmployeeStats = (employee: Employee) => {
    const empName = employee.name.trim().toLowerCase();
    const baseSalary = Number(employee.salary) || 0;

    // 1. Direct assigned orders
    const empOrders = orders.filter(
      o => o.assignedEmployee && o.assignedEmployee.trim().toLowerCase() === empName
    );

    const totalOrdersCount = empOrders.length;
    const completedOrdersCount = empOrders.filter(o => o.status === 'تم التسليم').length;

    const totalSales = empOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalCosts = empOrders.reduce((sum, o) => sum + (Number(o.cost) || 0), 0);
    
    const totalProfit = empOrders.reduce((sum, o) => {
      const price = Number(o.price) || 0;
      const cost = Number(o.cost) || 0;
      const p = o.expectedProfit !== undefined ? Number(o.expectedProfit) : (price - cost);
      return sum + p;
    }, 0);

    // 2. Extract executed tasks and cost items linked to this employee across ALL orders
    const executedTasks: ExecutedTaskItem[] = [];

    orders.forEach(order => {
      const orderSerial = order.serialNumber || order.id;
      const clientName = order.clientName || 'عميل نقدي';
      const serviceType = order.serviceType || 'خدمة عامة';
      const orderDate = order.date;
      const orderStatus = order.status || 'قيد الانتظار';

      // Check costDetails (from CostItemsPopover)
      if (order.costDetails && typeof order.costDetails === 'object') {
        Object.entries(order.costDetails).forEach(([costKey, costVal]) => {
          if (costVal && typeof costVal === 'object') {
            const itemObj = costVal as { executor?: string; amount?: number | string };
            const executor = (itemObj.executor || '').trim().toLowerCase();
            if (executor && executor === empName) {
              executedTasks.push({
                id: `${order.id}-costDetails-${costKey}`,
                orderId: order.id,
                serialNumber: orderSerial,
                clientName,
                serviceType,
                taskName: costKey,
                taskRole: 'منفذ بند تكلفة',
                amount: Number(itemObj.amount) || 0,
                date: orderDate,
                status: orderStatus
              });
            }
          }
        });
      }

      // Check costExecutors (legacy or alternative storage)
      if (order.costExecutors && typeof order.costExecutors === 'object') {
        Object.entries(order.costExecutors).forEach(([costKey, execName]) => {
          if (typeof execName === 'string' && execName.trim().toLowerCase() === empName) {
            // Check if already captured in costDetails
            const alreadyAdded = executedTasks.some(t => t.orderId === order.id && t.taskName === costKey);
            if (!alreadyAdded) {
              const amount = Number(order.costBreakdown?.[costKey]) || 0;
              executedTasks.push({
                id: `${order.id}-costExec-${costKey}`,
                orderId: order.id,
                serialNumber: orderSerial,
                clientName,
                serviceType,
                taskName: costKey,
                taskRole: 'منفذ تكلفة',
                amount,
                date: orderDate,
                status: orderStatus
              });
            }
          }
        });
      }

      // Check legacy fields
      if (order.designerName && order.designerName.trim().toLowerCase() === empName) {
        const alreadyAdded = executedTasks.some(t => t.orderId === order.id && t.taskName === 'تكلفة التصميم');
        if (!alreadyAdded) {
          executedTasks.push({
            id: `${order.id}-legacy-design`,
            orderId: order.id,
            serialNumber: orderSerial,
            clientName,
            serviceType,
            taskName: 'تصميم جرافيك وتجهيز ملفات',
            taskRole: 'مصمم',
            amount: Number(order.designCost) || 0,
            date: orderDate,
            status: orderStatus
          });
        }
      }

      if (order.printerName && order.printerName.trim().toLowerCase() === empName) {
        const alreadyAdded = executedTasks.some(t => t.orderId === order.id && t.taskName === 'تكلفة الطباعة');
        if (!alreadyAdded) {
          executedTasks.push({
            id: `${order.id}-legacy-print`,
            orderId: order.id,
            serialNumber: orderSerial,
            clientName,
            serviceType,
            taskName: 'أعمال الطباعة والإنتاج',
            taskRole: 'فني طباعة',
            amount: Number(order.printingCost) || 0,
            date: orderDate,
            status: orderStatus
          });
        }
      }

      if (order.externalExecutor && order.externalExecutor.trim().toLowerCase() === empName) {
        const alreadyAdded = executedTasks.some(t => t.orderId === order.id && t.taskName === 'تكلفة خارجية');
        if (!alreadyAdded) {
          executedTasks.push({
            id: `${order.id}-legacy-external`,
            orderId: order.id,
            serialNumber: orderSerial,
            clientName,
            serviceType,
            taskName: 'تنفيذ خارجي / ورشة فنية',
            taskRole: 'فني تركيب / تنفيذ',
            amount: Number(order.externalCost) || 0,
            date: orderDate,
            status: orderStatus
          });
        }
      }

      // If directly assigned as order supervisor/manager
      if (order.assignedEmployee && order.assignedEmployee.trim().toLowerCase() === empName) {
        const hasSpecificTask = executedTasks.some(t => t.orderId === order.id);
        if (!hasSpecificTask) {
          executedTasks.push({
            id: `${order.id}-general-assignment`,
            orderId: order.id,
            serialNumber: orderSerial,
            clientName,
            serviceType,
            taskName: `تنفيذ وإشراف طلبية: ${serviceType}`,
            taskRole: 'المسؤول المباشر عن الطلب',
            amount: Number(order.price) || 0,
            date: orderDate,
            status: orderStatus
          });
        }
      }
    });

    const totalTasksValue = executedTasks.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Commissions calculations
    const commissions = employee.commissions || [];
    const totalDue = commissions.filter(c => c.status === 'مستحقة').reduce((s, c) => s + Number(c.amount), 0);
    const totalApproved = commissions.filter(c => c.status === 'معتمدة').reduce((s, c) => s + Number(c.amount), 0);
    const totalPaid = commissions.filter(c => c.status === 'مدفوعة').reduce((s, c) => s + Number(c.amount), 0);

    const totalNetDue = baseSalary + totalDue + totalApproved;

    return {
      empOrders,
      totalOrdersCount,
      completedOrdersCount,
      totalSales,
      totalCosts,
      totalProfit,
      executedTasks,
      totalTasksValue,
      commissions,
      totalDue,
      totalApproved,
      totalPaid,
      totalNetDue,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">الموظفين</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            إدارة بطاقات الموظفين، ربط المهام المنفذة في الفواتير، ومتابعة الرواتب والعمولات المستحقة
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm text-xs font-bold cursor-pointer"
        >
          <Plus size={16} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <div className="glass-panel p-6 rounded-xl no-print animate-in fade-in slide-in-from-top-4 border-emerald-500/30 shadow-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">تسجيل بيانات موظف / فني</h3>
            <button 
              type="button"
              onClick={() => setShowForm(false)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                placeholder="أدخل اسم الموظف..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">المسمى الوظيفي / الصلاحية</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as EmployeeRole)}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm appearance-none bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
              >
                <option value="مدير">مدير ورشة / مشرف عام</option>
                <option value="مصمم">مصمم جرافيك ولوافت</option>
                <option value="مركب">فني تصنيع وتركيب ميداني</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الراتب الشهري الأساسي ({currency})
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-sm cursor-pointer"
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
              className="glass-panel p-6 rounded-xl flex flex-col gap-4 hover:shadow-md transition-all bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0 border border-slate-700">
                  {employee.name.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{employee.name}</h3>
                  <span className={`inline-block text-[11px] font-bold mt-0.5 px-2 py-0.5 rounded-md border w-max
                    ${employee.role === 'مدير' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                      employee.role === 'مصمم' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                      'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}`}>
                    {employee.role}
                  </span>
                </div>
              </div>

              {/* Financial & Tasks Stats */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                
                {/* Base Salary */}
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 py-1">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-slate-400" />
                    الراتب الأساسي
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                    {Number(employee.salary).toLocaleString()} {currency}
                  </span>
                </div>

                {/* Linked Executed Tasks & Values */}
                <div className="flex justify-between items-center py-1.5 bg-blue-50/70 dark:bg-blue-950/40 px-2.5 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
                  <span className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300 text-[11px]">
                    <Wrench size={13} className="text-blue-600 dark:text-blue-400" />
                    الأعمال والمهام المنفذة
                  </span>
                  <span className="font-mono tabular-nums font-black text-blue-700 dark:text-blue-300 text-xs">
                    {stats.executedTasks.length} مهمة ({stats.totalTasksValue.toLocaleString()} {currency})
                  </span>
                </div>

                {/* Commissions on profits */}
                <div className="flex justify-between items-center py-1.5 bg-emerald-50/60 dark:bg-emerald-950/40 px-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-[11px]">
                    <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400" />
                    العمولات المستحقة (5%)
                  </span>
                  <span className="font-mono tabular-nums font-black text-emerald-700 dark:text-emerald-300 text-xs">
                    +{(stats.totalDue + stats.totalApproved).toLocaleString()} {currency}
                  </span>
                </div>

                {/* Total Net Due */}
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 py-1 font-bold">
                  <span>إجمالي المستحق الشامل</span>
                  <span className="font-mono tabular-nums font-black text-sm text-slate-900 dark:text-slate-100">
                    {stats.totalNetDue.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
              
              {/* Card Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForStatement(employee)}
                  className="w-full glass-button text-xs py-2 rounded-xl text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <FileText size={14} />
                  <span>كشف حساب وتفاصيل المهام المنفذة</span>
                </button>
              </div>
            </div>
          );
        })}
        
        {employees.length === 0 && (
          <div className="col-span-full glass-panel p-16 rounded-xl text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-400">
              <Briefcase size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">لا يوجد موظفون مسجلون</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">قم بإضافة فنيين ومصممين لبدء توزيع المهام ومتابعة الرواتب والأعمال المنفذة.</p>
            </div>
          </div>
        )}
      </div>

      {/* Employee Account Statement Modal (كشف حساب الموظف، الأعمال المنفذة، والعمولات) */}
      {selectedEmployeeForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                  {selectedEmployeeForStatement.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>كشف حساب الموظف: {selectedEmployeeForStatement.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                      {selectedEmployeeForStatement.role}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    سجل المهام والأعمال المنفذة في الفواتير، ونسبة الأرباح المستحقة والراتب الأساسي
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForStatement(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          الراتب الشهري الأساسي
                        </span>
                        <div className="font-mono tabular-nums text-lg font-black text-slate-900 dark:text-slate-100">
                          {Number(selectedEmployeeForStatement.salary).toLocaleString()} {currency}
                        </div>
                      </div>

                      {/* 2. Executed Tasks Value */}
                      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60">
                        <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block mb-1">
                          إجمالي قيمة الأعمال والمهام
                        </span>
                        <div className="font-mono tabular-nums text-lg font-black text-blue-700 dark:text-blue-300">
                          {stats.totalTasksValue.toLocaleString()} {currency}
                        </div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                          {stats.executedTasks.length} مهمة وبند تكلفة مسند
                        </span>
                      </div>

                      {/* 3. Total Commissions */}
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                          العمولات المستحقة (5%)
                        </span>
                        <div className="font-mono tabular-nums text-xl font-black text-emerald-700 dark:text-emerald-300">
                          +{(stats.totalDue + stats.totalApproved).toLocaleString()} {currency}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                          أرباح العمليات المنفذة
                        </span>
                      </div>

                      {/* 4. Total Net Due */}
                      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          إجمالي المستحق النهائي
                        </span>
                        <div className="font-mono tabular-nums text-xl font-black text-emerald-400">
                          {stats.totalNetDue.toLocaleString()} {currency}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                          الراتب + العمولات المعتمدة
                        </span>
                      </div>
                    </div>

                    {/* Section 1: جدول بالأعمال المنفذة وقيمتها المستحقة (المسندة في الفواتير وبنود التكلفة) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Wrench size={16} className="text-blue-600 dark:text-blue-400" />
                          <span>جدول الأعمال والخدمات المنفذة وقيمتها المستحقة</span>
                        </h4>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {stats.executedTasks.length} مهمة مسندة
                        </span>
                      </div>

                      <div className="border border-slate-200/80 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-700">
                              <tr>
                                <th className="p-3"># الفاتورة</th>
                                <th className="p-3">اسم العميل</th>
                                <th className="p-3">نوع الخدمة</th>
                                <th className="p-3">المهمة / البند المنفذ</th>
                                <th className="p-3">نوع التكليف</th>
                                <th className="p-3 text-center">التاريخ</th>
                                <th className="p-3 text-center">حالة الطلب</th>
                                <th className="p-3 text-left font-mono tabular-nums text-blue-700 dark:text-blue-400 font-black">
                                  القيمة المستحقة ({currency})
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {stats.executedTasks.map((task) => (
                                <tr key={task.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                                    #{task.serialNumber || task.orderId}
                                  </td>
                                  <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                    {task.clientName}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    {task.serviceType}
                                  </td>
                                  <td className="p-3 font-bold text-blue-900 dark:text-blue-200">
                                    {task.taskName}
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                                      {task.taskRole}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                    {task.date ? format(parseISO(task.date), 'dd/MM/yyyy') : '—'}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      task.status === 'تم التسليم' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' :
                                      task.status === 'قيد التركيب' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' :
                                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}>
                                      {task.status || 'مسجل'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-left font-mono tabular-nums text-blue-700 dark:text-blue-400 font-black text-xs">
                                    {task.amount.toLocaleString()} {currency}
                                  </td>
                                </tr>
                              ))}

                              {stats.executedTasks.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                                    لا توجد مهام أو بنود تكلفة مسندة لهذا الموظف في الفواتير حتى الآن
                                  </td>
                                </tr>
                              )}
                            </tbody>

                            {stats.executedTasks.length > 0 && (
                              <tfoot>
                                <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-black border-t-2 border-slate-200 dark:border-slate-700 text-xs">
                                  <td colSpan={7} className="p-3 text-right text-slate-900 dark:text-slate-100">
                                    إجمالي قيمة الأعمال والمهام المنفذة:
                                  </td>
                                  <td className="p-3 text-left font-mono tabular-nums text-blue-700 dark:text-blue-300 font-black">
                                    {stats.totalTasksValue.toLocaleString()} {currency}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: تفاصيل الطلبيات والعمولات المستحقة (5%) */}
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Layers size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <span>تفاصيل الطلبيات الخاضعة للعمولة (5% من أرباح المشاريع)</span>
                        </h4>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {stats.empOrders.length} طلبية تحت الإشراف
                        </span>
                      </div>

                      <div className="border border-slate-200/80 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-700">
                              <tr>
                                <th className="p-3">رقم الفاتورة</th>
                                <th className="p-3">العميل</th>
                                <th className="p-3">الخدمة</th>
                                <th className="p-3 text-left font-mono tabular-nums">سعر الفاتورة</th>
                                <th className="p-3 text-left font-mono tabular-nums">التكلفة</th>
                                <th className="p-3 text-left font-mono tabular-nums">صافي الربح</th>
                                <th className="p-3 text-left font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-black">عمولة الموظف (5%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {stats.empOrders.map((order) => {
                                const costVal = Number(order.cost) || 0;
                                const priceVal = Number(order.price) || 0;
                                const profitVal = order.expectedProfit !== undefined ? Number(order.expectedProfit) : (priceVal - costVal);
                                const commissionVal = Math.max(0, profitVal * 0.05);

                                return (
                                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                                      #{order.serialNumber || order.id}
                                    </td>
                                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                      {order.clientName}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400">
                                      {order.serviceType || 'لافتة إعلانية'}
                                    </td>
                                    <td className="p-3 text-left font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                                      {priceVal.toLocaleString()} {currency}
                                    </td>
                                    <td className="p-3 text-left font-mono tabular-nums text-rose-700 dark:text-rose-400 font-bold">
                                      {costVal.toLocaleString()} {currency}
                                    </td>
                                    <td className="p-3 text-left font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                                      +{profitVal.toLocaleString()} {currency}
                                    </td>
                                    <td className="p-3 text-left font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-black text-xs">
                                      +{commissionVal.toFixed(2)} {currency}
                                    </td>
                                  </tr>
                                );
                              })}

                              {stats.empOrders.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                                    لا توجد طلبيات مسندة لهذا الموظف خاضعة لعمولة الأرباح
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
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                * تم إعداد هذا الكشف تلقائياً وفقاً للائحة الحوافز ونسبة الـ 5% من أرباح المشاريع والمهام المسندة
              </span>
              <button
                type="button"
                onClick={() => setSelectedEmployeeForStatement(null)}
                className="btn-primary px-6 py-2 rounded-xl text-xs font-bold cursor-pointer"
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
