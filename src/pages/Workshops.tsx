import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, 
  Search, 
  Plus, 
  ArrowLeft, 
  Printer, 
  Receipt, 
  Phone, 
  MapPin, 
  Calendar, 
  Check, 
  Trash2, 
  Edit, 
  X, 
  DollarSign, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle,
  Clock,
  Filter,
  Layers
} from 'lucide-react';
import { Workshop, WorkshopTransaction } from '../types';

export default function Workshops() {
  const { 
    workshops, 
    addWorkshop, 
    updateWorkshop, 
    deleteWorkshop, 
    addWorkshopTransaction, 
    deleteWorkshopTransaction,
    settings, 
    currentUser 
  } = useAppContext();

  // Selected Workshop for Detail Ledger
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);

  // Search and Filter in Master View
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_balance' | 'settled'>('all');

  // Modal: Add New External Party
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyActivity, setNewPartyActivity] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyInitialBalance, setNewPartyInitialBalance] = useState('');
  const [newPartyNotes, setNewPartyNotes] = useState('');

  // Modal: Edit Workshop
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);

  // New Transaction Form State (In Detail Ledger)
  const [txType, setTxType] = useState<'مطالبة' | 'دفعة' | 'مزدوج'>('مطالبة');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [txDescription, setTxDescription] = useState('');
  const [txCost, setTxCost] = useState('');
  const [txPaid, setTxPaid] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txError, setTxError] = useState('');

  // Check RBAC permission
  const hasAccess = 
    currentUser?.role === 'مدير' || 
    settings.permissions[currentUser?.role || '']?.workshops || 
    settings.permissions[currentUser?.role || '']?.suppliers;

  const selectedWorkshop = useMemo(() => {
    if (!selectedWorkshopId) return null;
    return workshops.find(w => w.id === selectedWorkshopId) || null;
  }, [workshops, selectedWorkshopId]);

  // Master View Calculations & Filtering
  const uniqueActivities = useMemo(() => {
    const set = new Set<string>();
    workshops.forEach(w => {
      if (w.activity && w.activity.trim()) {
        set.add(w.activity.trim());
      }
    });
    return Array.from(set);
  }, [workshops]);

  const filteredWorkshops = useMemo(() => {
    return workshops.filter(w => {
      const matchSearch = 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.activity && w.activity.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (w.phone && w.phone.includes(searchTerm));

      const matchActivity = activityFilter === 'الكل' || w.activity === activityFilter;

      const matchStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'has_balance' ? (w.balance > 0) :
        (w.balance <= 0);

      return matchSearch && matchActivity && matchStatus;
    });
  }, [workshops, searchTerm, activityFilter, statusFilter]);

  const countWithDebt = useMemo(() => {
    return workshops.filter(w => (Number(w.balance) || 0) > 0).length;
  }, [workshops]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-150">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-6">
          <X size={32} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">صلاحية غير متوفرة</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          عذراً، لا تملك الصلاحيات الكافية للوصول إلى قسم جهات ذات العلاقة.
        </p>
      </div>
    );
  }

  // Handle Adding New External Entity
  const handleCreateExternalParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    addWorkshop({
      name: newPartyName.trim(),
      activity: newPartyActivity.trim(),
      phone: newPartyPhone.trim(),
      address: newPartyAddress.trim(),
      notes: newPartyNotes.trim(),
      initialBalance: Number(newPartyInitialBalance) || 0
    });

    setNewPartyName('');
    setNewPartyActivity('');
    setNewPartyPhone('');
    setNewPartyAddress('');
    setNewPartyInitialBalance('');
    setNewPartyNotes('');
    setIsAddModalOpen(false);
  };

  // Handle Editing Workshop
  const handleSaveEditWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkshop || !editingWorkshop.name.trim()) return;

    updateWorkshop(editingWorkshop.id, {
      name: editingWorkshop.name.trim(),
      activity: editingWorkshop.activity?.trim() || '',
      phone: editingWorkshop.phone?.trim() || '',
      address: editingWorkshop.address?.trim() || '',
      notes: editingWorkshop.notes?.trim() || ''
    });

    setEditingWorkshop(null);
  };

  // Handle Adding Transaction to Workshop Ledger
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError('');

    if (!selectedWorkshop) return;
    if (!txDescription.trim()) {
      setTxError('يرجى كتابة البيان أو تفاصيل الحركة.');
      return;
    }

    const costNum = Math.max(0, parseFloat(txCost) || 0);
    const paidNum = Math.max(0, parseFloat(txPaid) || 0);

    if (costNum === 0 && paidNum === 0) {
      setTxError('يجب إدخال إجمالي التكلفة أو المبلغ المدفوع.');
      return;
    }

    // Determine normalized transaction type
    let actualType: 'مطالبة' | 'دفعة' | 'تسوية' = 'مطالبة';
    if (costNum === 0 && paidNum > 0) {
      actualType = 'دفعة';
    } else if (costNum > 0 && paidNum === 0) {
      actualType = 'مطالبة';
    } else {
      actualType = 'تسوية';
    }

    addWorkshopTransaction(selectedWorkshop.id, {
      date: txDate ? new Date(txDate).toISOString() : new Date().toISOString(),
      description: txDescription.trim(),
      cost: costNum,
      paid: paidNum,
      type: actualType,
      notes: txNotes.trim() || undefined
    });

    // Reset Form
    setTxDescription('');
    setTxCost('');
    setTxPaid('');
    setTxNotes('');
    setTxError('');
  };

  // Quick Description suggestions
  const commonDescriptions = [
    'تركيب لافتة واجهة',
    'شاسيه حديد وتيوبات',
    'قص ليزر وحفر أكريليك',
    'طباعة فليكس وبنر',
    'رافعة وونش هيدروليكي',
    'تفصيل زنكور مجلفن',
    'دفعة نقدية مسددة',
    'حوالة مصرفية مسددة'
  ];

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Detail Ledger View */}
      {selectedWorkshop ? (
        <div className="space-y-6">
          
          {/* Header Bar & Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedWorkshopId(null)}
                className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <ArrowLeft size={16} className="rotate-180" />
                العودة إلى سجل الورش
              </button>
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  كشف الحساب التفصيلي
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {selectedWorkshop.name}
                  {selectedWorkshop.activity && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 rounded-lg">
                      {selectedWorkshop.activity}
                    </span>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingWorkshop(selectedWorkshop)}
                className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Edit size={15} />
                تعديل البيانات
              </button>

              <button
                type="button"
                onClick={handlePrintLedger}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-xs shadow-emerald-600/20 cursor-pointer"
              >
                <Printer size={15} />
                طباعة كشف الحساب
              </button>
            </div>
          </div>

          {/* Printable Header (Visible ONLY during print) */}
          <div className="hidden print:block mb-6 p-4 border-b border-slate-300">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{settings.shopInfo.name}</h2>
                <p className="text-xs text-slate-600">{settings.shopInfo.address || 'كشف الحسابات والتعاملات المالية'}</p>
                <p className="text-xs text-slate-600">هاتف: {settings.shopInfo.phone || '---'}</p>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-900">كشف حساب جهة خارجية</h3>
                <p className="text-sm font-semibold text-slate-800">{selectedWorkshop.name}</p>
                <p className="text-xs text-slate-600">تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')}</p>
              </div>
            </div>
          </div>

          {/* Summary Cards of Selected Workshop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            
            {/* Primary Remaining Balance Card */}
            <div className="glass-panel p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group cursor-default shadow-xs hover:shadow-md">
              <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-rose-500/10 blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  الرصيد المتبقي (المديونية المستحقة لهم)
                </span>
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-transform group-hover:scale-110 duration-200 shadow-2xs shrink-0">
                  <Receipt size={20} />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums tracking-tight">
                  {selectedWorkshop.balance.toLocaleString()} <span className="text-sm font-semibold text-slate-500 mr-1.5">{settings.shopInfo.currency}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  {selectedWorkshop.balance > 0 ? 'مبلغ مستحق السداد لهذه الجهة' : 'الحساب خالص ومصفى بالكامل'}
                </p>
              </div>
            </div>

            {/* Total Cost / Claims Card */}
            <div className="glass-panel p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group cursor-default shadow-xs hover:shadow-md">
              <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  إجمالي التكاليف (المطالبات)
                </span>
                <div className="w-11 h-11 rounded-2xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-transform group-hover:scale-110 duration-200 shadow-2xs shrink-0">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums tracking-tight">
                  {selectedWorkshop.totalCost.toLocaleString()} <span className="text-sm font-semibold text-slate-500 mr-1.5">{settings.shopInfo.currency}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  مجموع قيمة الأعمال والخدمات المسجلة
                </p>
              </div>
            </div>

            {/* Total Paid Card */}
            <div className="glass-panel p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 group cursor-default shadow-xs hover:shadow-md">
              <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  إجمالي المبالغ المسددة
                </span>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110 duration-200 shadow-2xs shrink-0">
                  <DollarSign size={20} />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums tracking-tight">
                  {selectedWorkshop.totalPaid.toLocaleString()} <span className="text-sm font-semibold text-slate-500 mr-1.5">{settings.shopInfo.currency}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  مجموع الدفعات المسددة للجهة
                </p>
              </div>
            </div>

          </div>

          {/* Quick Info & Contact strip */}
          {(selectedWorkshop.phone || selectedWorkshop.address || selectedWorkshop.notes) && (
            <div className="p-5 rounded-2xl glass-panel text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-6 shadow-xs">
              {selectedWorkshop.phone && (
                <span className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span className="font-semibold">{selectedWorkshop.phone}</span>
                </span>
              )}
              {selectedWorkshop.address && (
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{selectedWorkshop.address}</span>
                </span>
              )}
              {selectedWorkshop.notes && (
                <span className="text-slate-500 dark:text-slate-400">
                  ملاحظة: {selectedWorkshop.notes}
                </span>
              )}
            </div>
          )}

          {/* New Transaction Form (أعلى جدول البيانات) */}
          <div className="glass-panel rounded-2xl p-7 shadow-xs no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus size={18} className="text-emerald-600" />
                  تسجيل حركة جديدة في كشف الحساب
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  إضافة مطالبة جديدة بتكلفة عمل من الورشة، أو تسجيل دفعة مالية مسددة لهم
                </p>
              </div>

              {/* Transaction Mode Selector */}
              <div className="flex items-center p-1.5 bg-slate-500/10 dark:bg-slate-800/60 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('مطالبة');
                    setTxPaid('0');
                  }}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    txType === 'مطالبة'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  مطالبة / عمل جديد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('دفعة');
                    setTxCost('0');
                  }}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    txType === 'دفعة'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  تسجيل دفعة مسددة
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('مزدوج')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    txType === 'مزدوج'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  مطالبة مع دفعة فورية
                </button>
              </div>
            </div>

            {txError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} />
                {txError}
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Date */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    البيان / تفاصيل العمل أو الخدمة
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تركيب لافتة واجهة، قص زنكور، لحام شاسيه..."
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                {/* Quick Cost / Paid inputs depending on txType */}
                {txType === 'مطالبة' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      إجمالي التكلفة (المطالبة المستحقة)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={txCost}
                        onChange={(e) => setTxCost(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold glass-input text-rose-600 dark:text-rose-400"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        {settings.shopInfo.currency}
                      </span>
                    </div>
                  </div>
                )}

                {txType === 'دفعة' && (
                  <div>
                    <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1.5">
                      المبلغ المدفوع (المسدد لهم)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={txPaid}
                        onChange={(e) => setTxPaid(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold glass-input text-emerald-600 dark:text-emerald-400"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        {settings.shopInfo.currency}
                      </span>
                    </div>
                  </div>
                )}

                {txType === 'مزدوج' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        إجمالي التكلفة (المطالبة)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={txCost}
                          onChange={(e) => setTxCost(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold glass-input"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          {settings.shopInfo.currency}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1.5">
                        المدفوع الفوري
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={txPaid}
                          onChange={(e) => setTxPaid(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold glass-input text-emerald-600 dark:text-emerald-400"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          {settings.shopInfo.currency}
                        </span>
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Quick suggestion tags for faster entry */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 font-semibold ml-1">اقتراحات سريعة:</span>
                {commonDescriptions.map((desc) => (
                  <button
                    key={desc}
                    type="button"
                    onClick={() => {
                      setTxDescription(desc);
                      if (desc.includes('مسددة')) {
                        setTxType('دفعة');
                        setTxCost('0');
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {desc}
                  </button>
                ))}
              </div>

              {/* Actions & Submit */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {txType === 'مطالبة' && 'سيتم زيادة رصيد المديونية المستحق لهذه الورشة بمقدار التكلفة.'}
                  {txType === 'دفعة' && 'سيتم خصم المبلغ المدفوع من رصيد المديونية المستحق لهم.'}
                  {txType === 'مزدوج' && 'سيتم إضافة صافي المتبقي إلى مديونية الورشة.'}
                </span>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  حفظ الحركة
                </button>
              </div>
            </form>
          </div>

          {/* Data Grid: كشف الحساب التفصيلي */}
          <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
            <div className="p-6 sm:p-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-500/5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Receipt size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    سجل الحركات المالية والمطالبات
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {selectedWorkshop.transactions.length} حركات مسجلة
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                الرصيد المتبقي الحالي: <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm mr-1">{selectedWorkshop.balance.toLocaleString()} {settings.shopInfo.currency}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-500/5 text-slate-500 dark:text-slate-400 font-bold text-xs">
                  <tr>
                    <th className="px-7 py-5 w-36">التاريخ</th>
                    <th className="px-7 py-5 min-w-[220px]">البيان / التفاصيل</th>
                    <th className="px-7 py-5 w-40 text-slate-800 dark:text-slate-200">إجمالي التكلفة</th>
                    <th className="px-7 py-5 w-40 text-emerald-700 dark:text-emerald-400">المبلغ المدفوع</th>
                    <th className="px-7 py-5 w-44 text-rose-700 dark:text-rose-400 font-extrabold">الرصيد المتبقي</th>
                    <th className="px-6 py-5 w-20 text-center no-print">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {selectedWorkshop.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-7 py-16 text-center text-slate-400 dark:text-slate-500">
                        لا توجد حركات مالية مسجلة لهذه الجهة حتى الآن. استخدم النموذج أعلاه لإضافة أول حركة.
                      </td>
                    </tr>
                  ) : (
                    selectedWorkshop.transactions.map((tx) => (
                      <tr 
                        key={tx.id}
                        className="hover:bg-slate-500/5 transition-colors"
                      >
                        {/* التاريخ */}
                        <td className="px-7 py-5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">
                          {tx.date ? new Date(tx.date).toLocaleDateString('ar-LY') : '---'}
                        </td>

                        {/* البيان / التفاصيل */}
                        <td className="px-7 py-5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {tx.description}
                          </div>
                          {tx.notes && (
                            <div className="text-[11px] text-slate-400 mt-1">
                              {tx.notes}
                            </div>
                          )}
                        </td>

                        {/* إجمالي التكلفة */}
                        <td className="px-7 py-5 font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {tx.cost > 0 ? (
                            <span>{tx.cost.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span></span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>

                        {/* المبلغ المدفوع */}
                        <td className="px-7 py-5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {tx.paid > 0 ? (
                            <span>{tx.paid.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span></span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>

                        {/* الرصيد المتبقي (المديونية) */}
                        <td className="px-7 py-5 font-black text-rose-600 dark:text-rose-400 font-mono text-base">
                          {typeof tx.balanceAfter === 'number' ? (
                            <span>{tx.balanceAfter.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span></span>
                          ) : (
                            '---'
                          )}
                        </td>

                        {/* Actions (Delete) */}
                        <td className="px-6 py-5 text-center no-print">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('هل أنت متأكد من حذف هذه الحركة؟ سيتم إعادة احتساب الرصيد تلقائياً.')) {
                                deleteWorkshopTransaction(selectedWorkshop.id, tx.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="حذف الحركة"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {selectedWorkshop.transactions.length > 0 && (
                  <tfoot className="bg-slate-500/5 font-bold text-xs">
                    <tr>
                      <td colSpan={2} className="px-7 py-5 text-slate-800 dark:text-slate-200">
                        المجموع الكلي للحساب
                      </td>
                      <td className="px-7 py-5 text-slate-900 dark:text-slate-100 font-mono">
                        {selectedWorkshop.totalCost.toLocaleString()} {settings.shopInfo.currency}
                      </td>
                      <td className="px-7 py-5 text-emerald-600 dark:text-emerald-400 font-mono">
                        {selectedWorkshop.totalPaid.toLocaleString()} {settings.shopInfo.currency}
                      </td>
                      <td className="px-7 py-5 text-rose-600 dark:text-rose-400 text-sm font-black font-mono">
                        {selectedWorkshop.balance.toLocaleString()} {settings.shopInfo.currency}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        </div>
      ) : (
        
        /* Master View (واجهة السجل الرئيسي) */
        <div className="space-y-6">

          {/* Top Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 flex items-center justify-center shadow-sm">
                  <Building2 size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    جهات ذات العلاقة
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    إدارة ومتابعة مطالبات الموردين والورش الخارجية وسندات الصرف وأرصدة المديونية
                  </p>
                </div>
              </div>
            </div>

            {/* Simple Add External Entity Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all duration-150 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              جهة خارجية جديدة
            </button>
          </div>

          {/* Search, Activity Filters & Actions Toolbar */}
          <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="ابحث باسم الورشة، الشركة، أو نوع النشاط..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-10 py-3 rounded-xl text-xs glass-input"
                />
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-500/10 dark:bg-slate-800/60 p-1.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  الكل ({workshops.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('has_balance')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'has_balance'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  عليها مستحقات ({countWithDebt})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('settled')}
                  className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'settled'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  مصفاة ({workshops.length - countWithDebt})
                </button>
              </div>

            </div>

            {/* Activity Pills */}
            {uniqueActivities.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 font-semibold ml-1">تصنيف النشاط:</span>
                <button
                  type="button"
                  onClick={() => setActivityFilter('الكل')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    activityFilter === 'الكل'
                      ? 'bg-slate-800 text-white dark:bg-emerald-600 dark:text-white shadow-2xs'
                      : 'bg-slate-500/10 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-500/15'
                  }`}
                >
                  الكل
                </button>
                {uniqueActivities.map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setActivityFilter(act)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                      activityFilter === act
                        ? 'bg-slate-800 text-white dark:bg-emerald-600 dark:text-white shadow-2xs'
                        : 'bg-slate-500/10 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-500/15'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Master Data Grid Table (واجهة السجل الرئيسي) */}
          <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-500/5 text-slate-500 dark:text-slate-400 font-bold text-xs">
                  <tr>
                    <th className="px-7 py-5">اسم الورشة / الشركة</th>
                    <th className="px-7 py-5">النشاط / التخصص</th>
                    <th className="px-7 py-5">هاتف التواصل</th>
                    <th className="px-7 py-5 text-slate-800 dark:text-slate-200">إجمالي التكلفة</th>
                    <th className="px-7 py-5 text-emerald-700 dark:text-emerald-400">المسدد</th>
                    <th className="px-7 py-5 text-rose-700 dark:text-rose-400 font-extrabold">الرصيد المتبقي</th>
                    <th className="px-7 py-5 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {filteredWorkshops.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-7 py-16 text-center text-slate-400 dark:text-slate-500">
                        لم يتم العثور على أي جهة خارجية مطابقة لبحثك. يمكنك النقر على «جهة خارجية جديدة» لإضافة ورشة.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkshops.map((workshop) => (
                      <tr 
                        key={workshop.id}
                        onClick={() => setSelectedWorkshopId(workshop.id)}
                        className="hover:bg-slate-500/5 cursor-pointer transition-colors group"
                      >
                        {/* Name */}
                        <td className="px-7 py-5 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-emerald-500/15 group-hover:text-emerald-600 transition-colors shrink-0">
                              <Building2 size={17} />
                            </span>
                            <div>
                              <div className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {workshop.name}
                              </div>
                              {workshop.transactions.length > 0 && (
                                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                  {workshop.transactions.length} حركات مسجلة
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Activity */}
                        <td className="px-7 py-5 text-xs text-slate-600 dark:text-slate-300">
                          {workshop.activity ? (
                            <span className="px-3 py-1 rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300 font-medium">
                              {workshop.activity}
                            </span>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="px-7 py-5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                          {workshop.phone || '---'}
                        </td>

                        {/* Total Cost */}
                        <td className="px-7 py-5 font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {workshop.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                        </td>

                        {/* Total Paid */}
                        <td className="px-7 py-5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {workshop.totalPaid.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                        </td>

                        {/* الرصيد المتبقي (إجمالي المديونية المستحقة لهذه الجهة) */}
                        <td className="px-7 py-5">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={`text-base font-black ${
                              workshop.balance > 0 
                                ? 'text-rose-600 dark:text-rose-400' 
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {workshop.balance.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-400 font-sans">
                              {settings.shopInfo.currency}
                            </span>
                          </div>
                          {workshop.balance > 0 ? (
                            <span className="text-[10px] text-rose-500/90 font-medium block mt-0.5">
                              مستحق السداد
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600/90 font-medium block mt-0.5">
                              مصفى بالكامل
                            </span>
                          )}
                        </td>

                        {/* Action Button */}
                        <td className="px-7 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedWorkshopId(workshop.id)}
                              className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                            >
                              <Receipt size={13} />
                              كشف الحساب
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingWorkshop(workshop)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer"
                              title="تعديل بيانات الجهة"
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف حساب ${workshop.name} وكافة سجل معاملاته؟`)) {
                                  deleteWorkshop(workshop.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="حذف الجهة"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Modal: Add New External Party (جهة خارجية جديدة) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-panel rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            
            <div className="px-6 pt-6 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    إضافة جهة خارجية جديدة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تسجيل ورشة أو شركة موردة لإدارة مطالباتها وكشف حسابها
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExternalParty} className="px-6 pb-6 space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  اسم الورشة أو الشركة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة وليد للتركيبات، ورشة الحدادة، مطبعة النجوم..."
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    النشاط / التخصص
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: أعمال حدادة، رافعات، قص ليزر..."
                    value={newPartyActivity}
                    onChange={(e) => setNewPartyActivity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    placeholder="مثال: 091-2345678"
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    العنوان أو الموقع
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: المنطقة الصناعية السراج"
                    value={newPartyAddress}
                    onChange={(e) => setNewPartyAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    الرصيد الافتتاحي السابق (إن وجد)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newPartyInitialBalance}
                      onChange={(e) => setNewPartyInitialBalance(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold glass-input font-mono"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                      {settings.shopInfo.currency}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل خاصة بالتعامل أو شروط السداد..."
                  value={newPartyNotes}
                  onChange={(e) => setNewPartyNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  حفظ الجهة الخارجية
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Workshop Details */}
      {editingWorkshop && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-panel rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            
            <div className="px-6 pt-6 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Edit size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    تعديل بيانات الجهة الخارجية
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تحديث الاسم ومعلومات الاتصال
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingWorkshop(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditWorkshop} className="px-6 pb-6 space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  اسم الورشة أو الشركة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingWorkshop.name}
                  onChange={(e) => setEditingWorkshop({ ...editingWorkshop, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    النشاط / التخصص
                  </label>
                  <input
                    type="text"
                    value={editingWorkshop.activity || ''}
                    onChange={(e) => setEditingWorkshop({ ...editingWorkshop, activity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={editingWorkshop.phone || ''}
                    onChange={(e) => setEditingWorkshop({ ...editingWorkshop, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  العنوان أو الموقع
                </label>
                <input
                  type="text"
                  value={editingWorkshop.address || ''}
                  onChange={(e) => setEditingWorkshop({ ...editingWorkshop, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  ملاحظات
                </label>
                <textarea
                  rows={2}
                  value={editingWorkshop.notes || ''}
                  onChange={(e) => setEditingWorkshop({ ...editingWorkshop, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  تحديث البيانات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingWorkshop(null)}
                  className="px-5 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
