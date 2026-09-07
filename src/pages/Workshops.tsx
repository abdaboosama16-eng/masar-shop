import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, 
  Search, 
  Plus, 
  ArrowLeft, 
  Printer, 
  Receipt, 
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
  Layers,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Workshop, WorkshopTransaction } from '../types';

export interface WorkshopStatementItem {
  id: string;
  workshopId: string;
  workType: string;    // نوع العمل (مثال: طباعة، حدادة، تركيب...)
  clientName: string;  // اسم العميل (العميل المرتبط بهذا العمل)
  cost: number;        // التكلفة (إجمالي تكلفة العمل)
  paid: number;        // المدفوع (ما تم تسديده للورشة)
  remaining: number;   // المتبقي (الرصيد المتبقي من هذا العمل)
  month: string;       // الشهر (الشهر الذي تمت فيه المعاملة)
}

const DEFAULT_STATEMENT_MOCK_DATA: Record<string, WorkshopStatementItem[]> = {
  'ws-1': [
    {
      id: 'st-1-1',
      workshopId: 'ws-1',
      workType: 'حدادة شاسيهات وتيوبات حديد',
      clientName: 'مستشفى الأمل التخصصي',
      cost: 4500,
      paid: 3000,
      remaining: 1500,
      month: 'مايو 2026'
    },
    {
      id: 'st-1-2',
      workshopId: 'ws-1',
      workType: 'تصنيع هيكل واجهة رئيسية 3D',
      clientName: 'مجمع النورس التجاري',
      cost: 6000,
      paid: 4000,
      remaining: 2000,
      month: 'يونيو 2026'
    },
    {
      id: 'st-1-3',
      workshopId: 'ws-1',
      workType: 'دعامات حديدية وقواعد تثبيت أعمدة',
      clientName: 'مطاعم الضيافة الذهبية',
      cost: 4000,
      paid: 2500,
      remaining: 1500,
      month: 'يوليو 2026'
    }
  ],
  'ws-2': [
    {
      id: 'st-2-1',
      workshopId: 'ws-2',
      workType: 'طباعة فليكس مضيء عالي الوضوح',
      clientName: 'صيدليات الشفاء الحديثة',
      cost: 5200,
      paid: 3000,
      remaining: 2200,
      month: 'مايو 2026'
    },
    {
      id: 'st-2-2',
      workshopId: 'ws-2',
      workType: 'طباعة بنر خارجي 12×4م مقاوم للشمس',
      clientName: 'شركة الأفق للاستيراد',
      cost: 8500,
      paid: 6000,
      remaining: 2500,
      month: 'يونيو 2026'
    },
    {
      id: 'st-2-3',
      workshopId: 'ws-2',
      workType: 'طباعة ستيكر سيارات مع سلوفان حماية',
      clientName: 'مكتب تاكسي الأمان',
      cost: 2800,
      paid: 1500,
      remaining: 1300,
      month: 'يونيو 2026'
    },
    {
      id: 'st-2-4',
      workshopId: 'ws-2',
      workType: 'طباعة رول أب وبوسترات دعائية',
      clientName: 'معرض التقنية للمؤتمرات',
      cost: 3500,
      paid: 2500,
      remaining: 1000,
      month: 'يوليو 2026'
    }
  ],
  'ws-3': [
    {
      id: 'st-3-1',
      workshopId: 'ws-3',
      workType: 'قص ليزر أحرف أكريليك بارزة مضيئة',
      clientName: 'معرض الفخامة للمفروشات',
      cost: 4800,
      paid: 4800,
      remaining: 0,
      month: 'يونيو 2026'
    },
    {
      id: 'st-3-2',
      workshopId: 'ws-3',
      workType: 'تفريغ ألواح ألمنيوم وشعارات مذهبة',
      clientName: 'فندق شيراتون بلازا',
      cost: 6400,
      paid: 6400,
      remaining: 0,
      month: 'يوليو 2026'
    },
    {
      id: 'st-3-3',
      workshopId: 'ws-3',
      workType: 'حفر وقص ستاندات عرض أكريليك',
      clientName: 'شركة الرواد للتسويق',
      cost: 3200,
      paid: 3200,
      remaining: 0,
      month: 'يوليو 2026'
    }
  ],
  'ws-4': [
    {
      id: 'st-4-1',
      workshopId: 'ws-4',
      workType: 'رافعة هيدروليكية لتركيب لافتة برجين',
      clientName: 'بنك التجارة الوطني',
      cost: 3800,
      paid: 2500,
      remaining: 1300,
      month: 'مايو 2026'
    },
    {
      id: 'st-4-2',
      workshopId: 'ws-4',
      workType: 'تركيبات واجهات ليلية واستبدال سبوتات',
      clientName: 'أسواق المزرعة المركزية',
      cost: 2700,
      paid: 1500,
      remaining: 1200,
      month: 'يونيو 2026'
    },
    {
      id: 'st-4-3',
      workshopId: 'ws-4',
      workType: 'فريق صيانة وتثبيت واجهات كلادينج',
      clientName: 'وكالة الأهرام للسيارات',
      cost: 3500,
      paid: 2000,
      remaining: 1500,
      month: 'يوليو 2026'
    }
  ]
};

export default function Workshops() {
  const { 
    workshops, 
    setWorkshops,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_balance' | 'settled'>('all');

  // Row Ordering State (Drag & Drop + Up/Down Arrows)
  const [draggedWorkshopId, setDraggedWorkshopId] = useState<string | null>(null);
  const [dragOverWorkshopId, setDragOverWorkshopId] = useState<string | null>(null);

  // Modal: Account Statement (كشف الحساب التفصيلي)
  const [statementModalWorkshop, setStatementModalWorkshop] = useState<Workshop | null>(null);
  const [statementRecords, setStatementRecords] = useState<Record<string, WorkshopStatementItem[]>>(() => {
    const saved = localStorage.getItem('masar_workshop_statement_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // fallback
      }
    }
    return DEFAULT_STATEMENT_MOCK_DATA;
  });

  useEffect(() => {
    localStorage.setItem('masar_workshop_statement_records', JSON.stringify(statementRecords));
  }, [statementRecords]);

  // Filters within Statement Modal
  const [statementSearch, setStatementSearch] = useState('');
  const [statementMonthFilter, setStatementMonthFilter] = useState('الكل');

  // Add Item inside Statement Modal
  const [isAddingStatementItem, setIsAddingStatementItem] = useState(false);
  const [newWorkType, setNewWorkType] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newPaid, setNewPaid] = useState('');
  const [newMonth, setNewMonth] = useState('يونيو 2026');
  const [statementError, setStatementError] = useState('');

  // Row Ordering Handler
  const handleMoveRow = (workshopId: string, direction: 'up' | 'down') => {
    setWorkshops((prev) => {
      const idx = prev.findIndex((w) => w.id === workshopId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, moved);
      return updated;
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWorkshopId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetId !== dragOverWorkshopId) {
      setDragOverWorkshopId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWorkshopId || draggedWorkshopId === targetId) {
      setDraggedWorkshopId(null);
      setDragOverWorkshopId(null);
      return;
    }
    setWorkshops((prev) => {
      const fromIdx = prev.findIndex((w) => w.id === draggedWorkshopId);
      const toIdx = prev.findIndex((w) => w.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
    setDraggedWorkshopId(null);
    setDragOverWorkshopId(null);
  };

  const handleDragEnd = () => {
    setDraggedWorkshopId(null);
    setDragOverWorkshopId(null);
  };

  // Modal: Add New External Party
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
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
  const filteredWorkshops = useMemo(() => {
    return workshops.filter(w => {
      const matchSearch = 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.address && w.address.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'has_balance' ? (w.balance > 0) :
        (w.balance <= 0);

      return matchSearch && matchStatus;
    });
  }, [workshops, searchTerm, statusFilter]);

  const countWithDebt = useMemo(() => {
    return workshops.filter(w => (Number(w.balance) || 0) > 0).length;
  }, [workshops]);

  // Statement Calculations for the active workshop modal
  const currentStatementItems = useMemo(() => {
    if (!statementModalWorkshop) return [];
    const items = statementRecords[statementModalWorkshop.id];
    if (items && items.length > 0) return items;
    return [
      {
        id: `st-gen-1-${statementModalWorkshop.id}`,
        workshopId: statementModalWorkshop.id,
        workType: 'خدمات وأعمال توريد خارجية',
        clientName: 'مؤسسة الرواد للتجارة',
        cost: 3200,
        paid: 2000,
        remaining: 1200,
        month: 'يونيو 2026'
      },
      {
        id: `st-gen-2-${statementModalWorkshop.id}`,
        workshopId: statementModalWorkshop.id,
        workType: 'تركيب وتجهيز موقعي',
        clientName: 'شركة النور للمقاولات',
        cost: 2800,
        paid: 1800,
        remaining: 1000,
        month: 'يوليو 2026'
      }
    ];
  }, [statementModalWorkshop, statementRecords]);

  const filteredStatementItems = useMemo(() => {
    return currentStatementItems.filter((item) => {
      const matchSearch =
        item.workType.toLowerCase().includes(statementSearch.toLowerCase()) ||
        item.clientName.toLowerCase().includes(statementSearch.toLowerCase());
      const matchMonth = statementMonthFilter === 'الكل' || item.month === statementMonthFilter;
      return matchSearch && matchMonth;
    });
  }, [currentStatementItems, statementSearch, statementMonthFilter]);

  const statementTotals = useMemo(() => {
    const totalCost = currentStatementItems.reduce((acc, it) => acc + (Number(it.cost) || 0), 0);
    const totalPaid = currentStatementItems.reduce((acc, it) => acc + (Number(it.paid) || 0), 0);
    const totalRemaining = currentStatementItems.reduce((acc, it) => acc + (Number(it.remaining) || 0), 0);
    return { totalCost, totalPaid, totalRemaining };
  }, [currentStatementItems]);

  const statementMonths = useMemo(() => {
    const set = new Set<string>();
    currentStatementItems.forEach((it) => {
      if (it.month) set.add(it.month);
    });
    return Array.from(set);
  }, [currentStatementItems]);

  const handleAddStatementItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementModalWorkshop) return;
    if (!newWorkType.trim()) {
      setStatementError('يرجى تحديد نوع العمل');
      return;
    }
    if (!newClientName.trim()) {
      setStatementError('يرجى إدخال اسم العميل');
      return;
    }
    const costNum = Number(newCost) || 0;
    const paidNum = Number(newPaid) || 0;
    if (costNum <= 0) {
      setStatementError('يرجى إدخال تكلفة صالحة أكبر من صفر');
      return;
    }

    const newItem: WorkshopStatementItem = {
      id: 'st-' + Date.now().toString(),
      workshopId: statementModalWorkshop.id,
      workType: newWorkType.trim(),
      clientName: newClientName.trim(),
      cost: costNum,
      paid: paidNum,
      remaining: Math.max(0, costNum - paidNum),
      month: newMonth.trim() || 'يونيو 2026'
    };

    setStatementRecords((prev) => {
      const existing = prev[statementModalWorkshop.id] || currentStatementItems;
      return {
        ...prev,
        [statementModalWorkshop.id]: [newItem, ...existing]
      };
    });

    setNewWorkType('');
    setNewClientName('');
    setNewCost('');
    setNewPaid('');
    setStatementError('');
    setIsAddingStatementItem(false);
  };

  const handleDeleteStatementItem = (itemId: string) => {
    if (!statementModalWorkshop) return;
    setStatementRecords((prev) => {
      const existing = prev[statementModalWorkshop.id] || currentStatementItems;
      return {
        ...prev,
        [statementModalWorkshop.id]: existing.filter((it) => it.id !== itemId)
      };
    });
  };

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
      address: newPartyAddress.trim(),
      notes: newPartyNotes.trim(),
      initialBalance: Number(newPartyInitialBalance) || 0
    });

    setNewPartyName('');
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

          {/* Quick Info strip */}
          {(selectedWorkshop.address || selectedWorkshop.notes) && (
            <div className="p-5 rounded-2xl glass-panel text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-6 shadow-xs">
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

          {/* Search & Status Filters Toolbar */}
          <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="ابحث باسم الورشة أو الشركة..."
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
          </div>

          {/* Master Data Grid Table (واجهة السجل الرئيسي) */}
          <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-500/5 text-slate-500 dark:text-slate-400 font-bold text-xs">
                  <tr>
                    <th className="px-3 py-5 w-[8%] text-center whitespace-nowrap">الترتيب</th>
                    <th className="px-6 py-5 w-[34%] min-w-[200px]">اسم الورشة / الشركة</th>
                    <th className="px-6 py-5 w-[15%] text-slate-800 dark:text-slate-200 whitespace-nowrap">إجمالي التكلفة</th>
                    <th className="px-6 py-5 w-[15%] text-emerald-700 dark:text-emerald-400 whitespace-nowrap">المسدد</th>
                    <th className="px-6 py-5 w-[16%] text-rose-700 dark:text-rose-400 font-extrabold whitespace-nowrap">الرصيد المتبقي</th>
                    <th className="px-6 py-5 w-[12%] text-center whitespace-nowrap">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {filteredWorkshops.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-7 py-16 text-center text-slate-400 dark:text-slate-500">
                        لم يتم العثور على أي جهة خارجية مطابقة لبحثك. يمكنك النقر على «جهة خارجية جديدة» لإضافة ورشة.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkshops.map((workshop) => {
                      const workshopIndex = workshops.findIndex((w) => w.id === workshop.id);
                      const isFirst = workshopIndex === 0;
                      const isLast = workshopIndex === workshops.length - 1;

                      return (
                        <tr 
                          key={workshop.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, workshop.id)}
                          onDragOver={(e) => handleDragOver(e, workshop.id)}
                          onDrop={(e) => handleDrop(e, workshop.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedWorkshopId(workshop.id)}
                          className={`hover:bg-slate-500/5 cursor-pointer transition-all duration-150 group ${
                            draggedWorkshopId === workshop.id ? 'opacity-30 bg-emerald-500/10' : ''
                          } ${
                            dragOverWorkshopId === workshop.id && draggedWorkshopId !== workshop.id 
                              ? 'border-t-2 border-emerald-500 dark:border-emerald-400 bg-slate-500/5' 
                              : ''
                          }`}
                        >
                          {/* 0. عمود الترتيب (أيقونة سحب + أسهم أعلى/أسفل) */}
                          <td 
                            className="px-3 py-5 text-center whitespace-nowrap" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              {/* أيقونة سحب الصف Drag Handle */}
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, workshop.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                title="اسحب لتغيير ترتيب الصف"
                                aria-label={`اسحب لتغيير ترتيب ${workshop.name}`}
                              >
                                <GripVertical size={16} />
                              </div>

                              {/* أسهم الترتيب أعلى / أسفل */}
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => handleMoveRow(workshop.id, 'up')}
                                  className={`p-0.5 rounded transition-all ${
                                    isFirst 
                                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-30' 
                                      : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-500/15 cursor-pointer active:scale-95'
                                  }`}
                                  title="تحريك لأعلى"
                                  aria-label="تحريك لأعلى"
                                >
                                  <ChevronUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => handleMoveRow(workshop.id, 'down')}
                                  className={`p-0.5 rounded transition-all ${
                                    isLast 
                                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-30' 
                                      : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-500/15 cursor-pointer active:scale-95'
                                  }`}
                                  title="تحريك لأسفل"
                                  aria-label="تحريك لأسفل"
                                >
                                  <ChevronDown size={13} />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 1. اسم الورشة / الشركة */}
                          <td className="px-6 py-5 font-bold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-emerald-500/15 group-hover:text-emerald-600 transition-colors shrink-0">
                                <Building2 size={18} />
                              </span>
                              <div>
                                <div className="text-sm font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {workshop.name}
                                </div>
                                {workshop.address ? (
                                  <div className="text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                                    <MapPin size={11} className="inline text-slate-400 shrink-0" />
                                    <span>{workshop.address}</span>
                                  </div>
                                ) : workshop.transactions.length > 0 ? (
                                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                    {workshop.transactions.length} حركات مسجلة
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* 2. إجمالي التكلفة */}
                          <td className="px-6 py-5 font-bold text-slate-900 dark:text-slate-100 font-mono whitespace-nowrap">
                            {workshop.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                          </td>

                          {/* 3. المسدد */}
                          <td className="px-6 py-5 font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                            {workshop.totalPaid.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                          </td>

                          {/* 4. الرصيد المتبقي (إجمالي المديونية المستحقة لهذه الجهة) */}
                          <td className="px-6 py-5 whitespace-nowrap">
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

                          {/* 5. الإجراء */}
                          <td className="px-6 py-5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setStatementModalWorkshop(workshop);
                                  setIsAddingStatementItem(false);
                                  setStatementSearch('');
                                  setStatementMonthFilter('الكل');
                                }}
                                className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:border-emerald-500/40 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="عرض كشف حساب تفصيلي"
                              >
                                <Receipt size={13} className="text-emerald-600 dark:text-emerald-400" />
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
                      );
                    })
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

      {/* Modal: Account Statement (كشف الحساب التفصيلي) */}
      {statementModalWorkshop && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl glass-panel rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Receipt size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      كشف حساب الالتزامات والخدمات
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      {statementModalWorkshop.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    سجل المطالبات المالية والأعمال المنفذة والمدفوعات والمتبقي المرتبط بالجهة
                  </p>
                </div>
              </div>

              {/* Header Right / Balance Summary & Close */}
              <div className="flex items-center gap-3">
                {/* إجمالي الرصيد المتبقي لها */}
                <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-2xs text-right">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                    إجمالي الرصيد المتبقي لها
                  </span>
                  <div className="flex items-center gap-1.5 font-mono mt-0.5">
                    <span className={`text-xl font-black ${
                      statementTotals.totalRemaining > 0 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {statementTotals.totalRemaining.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-sans">
                      {settings.shopInfo.currency}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStatementModalWorkshop(null)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-500/10 transition-colors cursor-pointer"
                  title="إغلاق النافذة"
                  aria-label="إغلاق"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Summary Cards (KPIs) */}
            <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-200/60 dark:border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">إجمالي التكلفة</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                  {statementTotals.totalCost.toLocaleString()} {settings.shopInfo.currency}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">إجمالي المدفوع</span>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {statementTotals.totalPaid.toLocaleString()} {settings.shopInfo.currency}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">صافي المتبقي</span>
                <span className={`text-sm font-bold font-mono ${
                  statementTotals.totalRemaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {statementTotals.totalRemaining.toLocaleString()} {settings.shopInfo.currency}
                </span>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">العمليات المسجلة</span>
                <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                  {filteredStatementItems.length} بند
                </span>
              </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="p-6 pb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex flex-1 items-center gap-3">
                {/* البحث في الكشف */}
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="بحث بنوع العمل أو اسم العميل..."
                    value={statementSearch}
                    onChange={(e) => setStatementSearch(e.target.value)}
                    className="w-full pl-3.5 pr-9 py-2 rounded-xl text-xs glass-input"
                  />
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* تصفية حسب الشهر */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    الشهر:
                  </span>
                  <select
                    value={statementMonthFilter}
                    onChange={(e) => setStatementMonthFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs glass-input bg-transparent"
                  >
                    <option value="الكل">كافة الأشهر</option>
                    {statementMonths.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* أزرار الإجراءات في الترويسة */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStatementItem(!isAddingStatementItem)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    isAddingStatementItem
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isAddingStatementItem ? <X size={14} /> : <Plus size={14} />}
                  {isAddingStatementItem ? 'إلغاء الإضافة' : 'إضافة عمل جديد'}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs text-slate-700 dark:text-slate-300"
                  title="طباعة كشف الحساب"
                >
                  <Printer size={14} />
                  طباعة الكشف
                </button>
              </div>
            </div>

            {/* Quick Add Statement Item Collapsible Form */}
            {isAddingStatementItem && (
              <form 
                onSubmit={handleAddStatementItem}
                className="mx-6 mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Plus size={14} />
                    تسجيل عمل / التزام جديد لهذا الحساب
                  </span>
                  {statementError && (
                    <span className="text-xs text-rose-500 font-medium">{statementError}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      نوع العمل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: طباعة بنر، حدادة..."
                      value={newWorkType}
                      onChange={(e) => setNewWorkType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs glass-input"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      اسم العميل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="العميل المرتبط بالعمل..."
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs glass-input"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      التكلفة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold glass-input"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      المدفوع
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newPaid}
                      onChange={(e) => setNewPaid(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold glass-input"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      الشهر
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: يونيو 2026"
                      value={newMonth}
                      onChange={(e) => setNewMonth(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs glass-input"
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    المتبقي المحسوب: <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {Math.max(0, (Number(newCost) || 0) - (Number(newPaid) || 0)).toLocaleString()} {settings.shopInfo.currency}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStatementItem(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Check size={14} />
                      حفظ العمل
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Sub-Table Container (الجدول الفرعي التفصيلي) */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-100/75 dark:bg-slate-800/75 text-slate-600 dark:text-slate-300 font-bold text-xs border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5 whitespace-nowrap">نوع العمل</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">اسم العميل</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">التكلفة</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">المدفوع</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">المتبقي</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">الشهر</th>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap w-16">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredStatementItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                          لا توجد بنود مطابقة في كشف حساب هذه الجهة حالياً. يمكنك إضافة بنود جديدة عبر زر «إضافة عمل جديد».
                        </td>
                      </tr>
                    ) : (
                      filteredStatementItems.map((item) => (
                        <tr 
                          key={item.id} 
                          className="hover:bg-slate-500/5 transition-colors group"
                        >
                          {/* 1. نوع العمل */}
                          <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {item.workType}
                          </td>

                          {/* 2. اسم العميل */}
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.clientName}
                          </td>

                          {/* 3. التكلفة */}
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {item.cost.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                          </td>

                          {/* 4. المدفوع */}
                          <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {item.paid.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                          </td>

                          {/* 5. المتبقي */}
                          <td className="px-5 py-3.5 font-mono font-bold whitespace-nowrap">
                            <span className={item.remaining > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}>
                              {item.remaining.toLocaleString()}
                            </span>
                            <span className="text-xs font-normal text-slate-400 mr-1">{settings.shopInfo.currency}</span>
                          </td>

                          {/* 6. الشهر */}
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                              {item.month}
                            </span>
                          </td>

                          {/* 7. إجراء */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteStatementItem(item.id)}
                              className="text-slate-300 group-hover:text-rose-500 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="حذف هذا البند من الكشف"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Totals Row in Table Footer */}
                  {filteredStatementItems.length > 0 && (
                    <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold text-xs border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={2} className="px-5 py-3.5 text-slate-800 dark:text-slate-200">
                          الإجمالي الكلي للبنود المعروضة ({filteredStatementItems.length})
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {filteredStatementItems.reduce((acc, it) => acc + (Number(it.cost) || 0), 0).toLocaleString()} {settings.shopInfo.currency}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {filteredStatementItems.reduce((acc, it) => acc + (Number(it.paid) || 0), 0).toLocaleString()} {settings.shopInfo.currency}
                        </td>
                        <td className="px-5 py-3.5 font-mono whitespace-nowrap">
                          <span className={filteredStatementItems.reduce((acc, it) => acc + (Number(it.remaining) || 0), 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600'}>
                            {filteredStatementItems.reduce((acc, it) => acc + (Number(it.remaining) || 0), 0).toLocaleString()} {settings.shopInfo.currency}
                          </span>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                منظومة مسار التجارية - كشف حساب التزامات الجهات الخارجية
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const id = statementModalWorkshop.id;
                    setStatementModalWorkshop(null);
                    setSelectedWorkshopId(id);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                >
                  فتح السجل الكامل للمعاملات
                </button>
                <button
                  type="button"
                  onClick={() => setStatementModalWorkshop(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer shadow-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
