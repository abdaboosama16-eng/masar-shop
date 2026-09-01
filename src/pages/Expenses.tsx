import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Calendar, 
  CreditCard, 
  Trash2, 
  X, 
  CheckCircle2, 
  FileText, 
  Layers, 
  ArrowUpDown,
  Building2,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { FinancialRecordType, PaymentMethod } from '../types';

export default function Expenses() {
  const { expenses, addExpense, deleteExpense, employees, settings } = useAppContext();

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<FinancialRecordType>('وارد');
  
  // Form fields
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقدي');
  const [employeeId, setEmployeeId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'وارد' | 'مصروف'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Category options based on type
  const inflowCategories = [
    'مقبوضات مبيعات وطلبيات',
    'تحصيل دفعات متبقية',
    'إيداع رأس مال / تمويل',
    'إيرادات خدمات وتصميم',
    'استرداد مالي وتأمينات',
    'واردات أخرى'
  ];

  const outflowCategories = [
    'مصاريف تشغيلية (كهرباء، وقود، إنترنت)',
    'رواتب وسلف العاملين',
    'مشتريات مواد خام ومستلزمات',
    'صيانة ماكينات ومعدات الورشة',
    'إيجار المقر والورشة',
    'ضيافة ونثريات يومية',
    'خدمات شحن وكرين ونقل',
    'مصروفات أخرى'
  ];

  const openFormWith = (type: FinancialRecordType) => {
    setTransactionType(type);
    setCategory(type === 'وارد' ? inflowCategories[0] : outflowCategories[0]);
    setAmount('');
    setDescription('');
    setEmployeeId('');
    setReferenceNumber('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || Number(amount) <= 0) return;

    let finalDesc = description.trim();
    if (transactionType === 'مصروف' && category.includes('رواتب') && employeeId) {
      const emp = employees.find(empItem => empItem.id === employeeId);
      if (emp) {
        finalDesc = `راتب/سلفة: ${emp.name} - ${finalDesc}`;
      }
    }

    addExpense({
      type: transactionType,
      amount: Number(amount),
      description: finalDesc,
      category: category || (transactionType === 'وارد' ? 'واردات أخرى' : 'مصروفات أخرى'),
      paymentMethod,
      employeeId: employeeId || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
    });

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteExpense(id);
    setDeleteConfirmId(null);
  };

  // Calculations
  const totalInflow = useMemo(() => {
    return expenses
      .filter(item => item.type === 'وارد')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  const totalOutflow = useMemo(() => {
    return expenses
      .filter(item => item.type !== 'وارد') // 'مصروف' or default
      .reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  const netCashBalance = totalInflow - totalOutflow;

  const totalInflowCount = useMemo(() => {
    return expenses.filter(item => item.type === 'وارد').length;
  }, [expenses]);

  const totalOutflowCount = useMemo(() => {
    return expenses.filter(item => item.type !== 'وارد').length;
  }, [expenses]);

  // Filtered list
  const filteredList = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    return expenses
      .filter(item => {
        // Type filter
        if (typeFilter !== 'all') {
          const itemType = item.type || 'مصروف';
          if (itemType !== typeFilter) return false;
        }

        // Payment method filter
        if (paymentFilter !== 'all') {
          if (item.paymentMethod && item.paymentMethod !== paymentFilter) return false;
        }

        // Date filter
        if (dateFilter === 'today') {
          if (!item.date || format(new Date(item.date), 'yyyy-MM-dd') !== todayStr) return false;
        } else if (dateFilter === 'month') {
          if (!item.date || new Date(item.date) < monthStart) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCategory = item.category?.toLowerCase().includes(q);
          const matchRef = item.referenceNumber?.toLowerCase().includes(q);
          const matchEmp = item.employeeId && employees.find(e => e.id === item.employeeId)?.name.toLowerCase().includes(q);
          if (!matchDesc && !matchCategory && !matchRef && !matchEmp) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, typeFilter, paymentFilter, dateFilter, searchQuery, employees]);

  return (
    <div className="space-y-6">
      {/* Top Header & Main Action Buttons */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>المالية</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            إدارة التدفقات النقدية، تقييد الواردات والمقبوضات، ومتابعة سندات الصرف والمصروفات
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => openFormWith('وارد')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all duration-150 ease-out cursor-pointer"
          >
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <ArrowDownLeft size={14} className="stroke-[2.5]" />
            </div>
            <span>تسجيل وارد / مبلغ محصل</span>
          </button>

          <button
            onClick={() => openFormWith('مصروف')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold shadow-sm shadow-rose-600/20 transition-all duration-150 ease-out cursor-pointer"
          >
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <ArrowUpRight size={14} className="stroke-[2.5]" />
            </div>
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Highlighted Card: Net Cash Balance (الواردات ناقص المصروفات) */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between border-2 border-emerald-500/40 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-100/30 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 "></span>
                <span className="text-slate-600 text-xs font-bold">رصيد صافي الصندوق</span>
              </div>
              <p className="text-[11px] text-slate-600 ">الواردات ناقص المصروفات</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              netCashBalance >= 0 
                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-300 ' 
                : 'bg-rose-500/15 text-rose-700 border border-rose-300 '
            }`}>
              <Wallet size={20} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black font-mono tabular-nums tracking-tight ${
                netCashBalance >= 0 ? 'text-emerald-700 ' : 'text-rose-700 '
              }`}>
                {netCashBalance.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600 ">{settings.shopInfo.currency || 'د.ل'}</span>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              netCashBalance >= 0 
                ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200 ' 
                : 'bg-rose-100/70 text-rose-800 border-rose-200 '
            }`}>
              {netCashBalance >= 0 ? 'فائض نقدي' : 'عجز في الصندوق'}
            </span>
          </div>

          <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${
            netCashBalance >= 0 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
              : 'bg-gradient-to-r from-rose-500 to-red-400'
          }`} />
        </div>

        {/* Card 2: Total Inflows (الواردات والمقبوضات) */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-slate-600 text-xs font-bold">إجمالي الواردات والمقبوضات</span>
              <p className="text-[11px] text-slate-400">{totalInflowCount} سند قبض مسجل</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <ArrowDownLeft size={18} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono tabular-nums text-emerald-700 ">
                +{totalInflow.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600 ">{settings.shopInfo.currency || 'د.ل'}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-0.5">
              <TrendingUp size={13} />
              <span>مقبوض</span>
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
        </div>

        {/* Card 3: Total Outflows (المصروفات) */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-slate-600 text-xs font-bold">إجمالي المصروفات والمدفوعات</span>
              <p className="text-[11px] text-slate-400">{totalOutflowCount} سند صرف مسجل</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono tabular-nums text-rose-700 ">
                -{totalOutflow.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-600 ">{settings.shopInfo.currency || 'د.ل'}</span>
            </div>
            <span className="text-[11px] text-rose-700 font-bold flex items-center gap-0.5">
              <TrendingDown size={13} />
              <span>مصروف</span>
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-transparent" />
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث في البيان، التصنيف، المرجع، الموظف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input pr-10 pl-4 py-2 text-xs rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Badges & Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Type Filter */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all duration-150 ease-out ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setTypeFilter('وارد')}
              className={`px-3 py-1 rounded-lg font-bold transition-all duration-150 ease-out flex items-center gap-1 ${
                typeFilter === 'وارد'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50 :bg-emerald-950/30'
              }`}
            >
              <ArrowDownLeft size={13} />
              <span>الواردات</span>
            </button>
            <button
              onClick={() => setTypeFilter('مصروف')}
              className={`px-3 py-1 rounded-lg font-bold transition-all duration-150 ease-out flex items-center gap-1 ${
                typeFilter === 'مصروف'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50 :bg-rose-950/30'
              }`}
            >
              <ArrowUpRight size={13} />
              <span>المصروفات</span>
            </button>
          </div>

          {/* Payment Method Selector */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="glass-input text-xs rounded-xl px-3 py-1.5 bg-white font-semibold"
          >
            <option value="all">كافة طرق الدفع</option>
            <option value="نقدي">نقدي</option>
            <option value="تحويل">تحويل مصرفي</option>
            <option value="بطاقة">بطاقة دفع</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="glass-input text-xs rounded-xl px-3 py-1.5 bg-white font-semibold"
          >
            <option value="all">كافة التواريخ</option>
            <option value="today">اليوم فقط</option>
            <option value="month">هذا الشهر</option>
          </select>

        </div>
      </div>

      {/* Operations Table */}
      <div className="glass-panel rounded-xl flex flex-col overflow-hidden shadow-sm border border-slate-200/80 ">
        
        {/* Table Header Details */}
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-600 " />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              جدول التدفقات والعمليات المالية
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-600 ">
            <span>{filteredList.length} حركة معروضة</span>
            <span>•</span>
            <span className="text-slate-700 font-bold">
              صافي الحركات المعروضة: {(
                filteredList.reduce((sum, item) => item.type === 'وارد' ? sum + item.amount : sum - item.amount, 0)
              ).toLocaleString()} {settings.shopInfo.currency || 'د.ل'}
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="text-slate-600 bg-slate-50 border-b border-slate-200/80 font-bold">
              <tr>
                <th className="p-3.5 text-center w-28">نوع الحركة</th>
                <th className="p-3.5">البيان / الوصف والتصنيف</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5 text-left">المبلغ</th>
                <th className="p-3.5 text-center w-16">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {filteredList.map((item) => {
                const isInflow = item.type === 'وارد';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 :bg-slate-800/40 transition-all duration-150 ease-out ">
                    
                    {/* Movement Type Badge */}
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        isInflow
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 '
                          : 'bg-rose-50 text-rose-700 border-rose-200 '
                      }`}>
                        {isInflow ? (
                          <>
                            <ArrowDownLeft size={13} className="shrink-0 text-emerald-600 " />
                            <span>وارد / قبض</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight size={13} className="shrink-0 text-rose-600 " />
                            <span>مصروف / صرف</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Description & Category */}
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 ">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 ">
                          {item.category && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {item.category}
                            </span>
                          )}
                          {item.referenceNumber && (
                            <span className="font-mono tabular-nums text-slate-400">
                              مرجع: #{item.referenceNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        <CreditCard size={12} className="text-slate-400" />
                        <span>{item.paymentMethod || 'نقدي'}</span>
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="p-3.5 text-slate-600 font-mono tabular-nums text-[11px]">
                      {item.date ? format(new Date(item.date), 'yyyy-MM-dd HH:mm') : '—'}
                    </td>

                    {/* Amount */}
                    <td className="p-3.5 text-left font-mono tabular-nums font-black text-sm">
                      <span className={isInflow ? 'text-emerald-700 ' : 'text-rose-700 '}>
                        {isInflow ? '+' : '-'}{item.amount.toLocaleString()} {settings.shopInfo.currency || 'د.ل'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            title="تأكيد الحذف"
                            className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all duration-150 ease-out "
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            title="إلغاء"
                            className="p-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all duration-150 ease-out "
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          title="حذف القيد"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 :bg-rose-950/40 transition-all duration-150 ease-out "
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
                        <Wallet size={26} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                          لا توجد حركات مالية مطابقة
                        </h4>
                        <p className="text-xs text-slate-600 ">
                          {searchQuery || typeFilter !== 'all' || paymentFilter !== 'all' || dateFilter !== 'all'
                            ? 'جرّب تعديل خيارات البحث والتصفية لعرض النتائج'
                            : 'اضغط على أحد الأزرار العلوية لتسجيل أول حركة وارد أو مصروف'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg glass-panel bg-white rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden">
            
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              transactionType === 'وارد'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 '
                : 'bg-rose-50/70 border-rose-200 text-rose-900 '
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                  transactionType === 'وارد' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {transactionType === 'وارد' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {transactionType === 'وارد' ? 'تسجيل وارد / سند قبض محصل' : 'تسجيل مصروف / سند صرف جديد'}
                  </h3>
                  <p className="text-[11px] opacity-80">
                    {transactionType === 'وارد' ? 'إضافة أموال إلى رصيد الصندوق' : 'خصم مبالغ من رصيد الصندوق'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 :text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              {/* Type Switcher in Form */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setTransactionType('وارد');
                    setCategory(inflowCategories[0]);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-150 ease-out ${
                    transactionType === 'وارد'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownLeft size={14} />
                  <span>وارد / مقبوض</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTransactionType('مصروف');
                    setCategory(outflowCategories[0]);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-150 ease-out ${
                    transactionType === 'مصروف'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight size={14} />
                  <span>مصروف / مدفوع</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المبلغ ({settings.shopInfo.currency || 'د.ل'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full glass-input rounded-lg px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold text-slate-900 "
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تاريخ العملية
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 "
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    التصنيف / البند
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 bg-white "
                  >
                    {(transactionType === 'وارد' ? inflowCategories : outflowCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    طريقة الدفع
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 bg-white "
                  >
                    <option value="نقدي">نقدي (كاش الصندوق)</option>
                    <option value="تحويل">تحويل بنكي / صك</option>
                    <option value="بطاقة">بطاقة مصرفية</option>
                  </select>
                </div>

              </div>

              {/* Employee selector for salaries or transactions */}
              {transactionType === 'مصروف' && category.includes('رواتب') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    الموظف المستفيد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 bg-white "
                  >
                    <option value="" disabled>اختر اسم الموظف...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role}) - راتب: {emp.salary} {settings.shopInfo.currency || 'د.ل'}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description / Statement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البيان / الوصف التفصيلي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    transactionType === 'وارد'
                      ? 'مثال: دفعة حساب لافتة صيدلية السلام، تحصيل نقدي...'
                      : 'مثال: فاتورة كهرباء شهر 8، بنزين للمولد، صيانة ماكينة...'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 "
                />
              </div>

              {/* Reference number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم الإيصال / السند المرجعي (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: REC-402, INV-1002, صك 9841..."
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs font-mono tabular-nums text-slate-800 "
                />
              </div>

              {/* Footer / Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 ">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 :bg-slate-800 transition-all duration-150 ease-out "
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition-all duration-150 ease-out flex items-center gap-1.5 ${
                    transactionType === 'وارد'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {transactionType === 'وارد' ? 'حفظ سند القبض' : 'حفظ سند الصرف'}
                  </span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
