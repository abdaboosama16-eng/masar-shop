import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, 
  Search, 
  Plus, 
  ArrowLeft, 
  Printer, 
  Receipt, 
  MapPin, 
  Check, 
  Trash2, 
  Edit, 
  X, 
  DollarSign, 
  TrendingUp, 
  Layers,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { Workshop, WorkshopTransaction } from '../types';

export default function Workshops() {
  const { 
    workshops, 
    setWorkshops,
    addWorkshop, 
    updateWorkshop, 
    deleteWorkshop, 
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
      try {
        localStorage.setItem('masar_workshops', JSON.stringify(updated));
      } catch {
        // ignore
      }
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
      const sourceIdx = prev.findIndex((w) => w.id === draggedWorkshopId);
      const targetIdx = prev.findIndex((w) => w.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);

      try {
        localStorage.setItem('masar_workshops', JSON.stringify(updated));
      } catch {
        // ignore
      }
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

  // Totals for the selected workshop statement
  const statementTotals = useMemo(() => {
    if (!selectedWorkshop) return { totalCost: 0, totalPaid: 0, totalRemaining: 0 };
    const txs = selectedWorkshop.transactions || [];
    let totalCost = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    txs.forEach((t) => {
      const cost = Number(t.cost) || 0;
      const paid = Number(t.paid) || 0;
      const remaining = Math.max(0, cost - paid);
      totalCost += cost;
      totalPaid += paid;
      totalRemaining += remaining;
    });

    return { totalCost, totalPaid, totalRemaining };
  }, [selectedWorkshop]);

  // Save changes to workshop transactions
  const saveWorkshopTransactions = (newTransactions: WorkshopTransaction[]) => {
    if (!selectedWorkshop) return;
    const totalCost = newTransactions.reduce((acc, t) => acc + (Number(t.cost) || 0), 0);
    const totalPaid = newTransactions.reduce((acc, t) => acc + (Number(t.paid) || 0), 0);
    const balance = totalCost - totalPaid;

    updateWorkshop(selectedWorkshop.id, {
      transactions: newTransactions,
      totalCost,
      totalPaid,
      balance,
      lastTransactionDate: new Date().toISOString()
    });
  };

  // Add new empty row to statement
  const [newlyAddedRowId, setNewlyAddedRowId] = useState<string | null>(null);

  const handleAddNewRow = () => {
    if (!selectedWorkshop) return;
    const newId = 'tx-' + Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
    const newRow: WorkshopTransaction = {
      id: newId,
      date: new Date().toISOString(),
      description: '',
      workType: '',
      cost: 0,
      paid: 0,
      isPaid: false,
      notes: '',
      balanceAfter: 0
    };

    const currentTxs = selectedWorkshop.transactions || [];
    const updated = [...currentTxs, newRow];
    saveWorkshopTransactions(updated);
    setNewlyAddedRowId(newId);
  };

  // Update existing row in statement
  const handleUpdateRow = (txId: string, updates: Partial<WorkshopTransaction>) => {
    if (!selectedWorkshop) return;
    const currentTxs = selectedWorkshop.transactions || [];
    const updated = currentTxs.map((t) => {
      if (t.id !== txId) return t;
      return { ...t, ...updates };
    });
    saveWorkshopTransactions(updated);
  };

  // Delete row in statement
  const handleDeleteRow = (txId: string) => {
    if (!selectedWorkshop) return;
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا البند من كشف الحساب؟')) {
      const currentTxs = selectedWorkshop.transactions || [];
      const updated = currentTxs.filter((t) => t.id !== txId);
      saveWorkshopTransactions(updated);
    }
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

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Detail Ledger View (كشف الحساب التفصيلي) */}
      {selectedWorkshop ? (
        <div className="space-y-6">
          
          {/* Header Bar & Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-back-to-workshops"
                onClick={() => setSelectedWorkshopId(null)}
                className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-500/10 transition-colors"
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
                id="btn-edit-current-workshop"
                onClick={() => setEditingWorkshop(selectedWorkshop)}
                className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit size={15} />
                تعديل البيانات
              </button>

              <button
                type="button"
                id="btn-print-statement-ledger"
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
                <h3 className="text-lg font-bold text-slate-900">كشف حساب تفصيلي للجهة / الورشة</h3>
                <p className="text-sm font-semibold text-slate-800">{selectedWorkshop.name}</p>
                <p className="text-xs text-slate-600">تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')}</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* 1. إجمالي التكلفة */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  الإجمالي العام للتكلفة
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums tracking-tight">
                  {statementTotals.totalCost.toLocaleString()} <span className="text-xs font-semibold text-slate-400 mr-1">{settings.shopInfo.currency}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  إجمالي قيمة كافة بنود الأعمال المطلوبة
                </p>
              </div>
            </div>

            {/* 2. إجمالي المدفوع */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  إجمالي المدفوع
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign size={20} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums tracking-tight">
                  {statementTotals.totalPaid.toLocaleString()} <span className="text-xs font-semibold text-slate-400 mr-1">{settings.shopInfo.currency}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  مجموع المبالغ المسددة لهذه الجهة
                </p>
              </div>
            </div>

            {/* 3. إجمالي المتبقي */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  إجمالي المتبقي
                </span>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Receipt size={20} />
                </div>
              </div>
              <div>
                <div className={`text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight ${
                  statementTotals.totalRemaining > 0 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {statementTotals.totalRemaining.toLocaleString()} <span className="text-xs font-semibold text-slate-400 mr-1">{settings.shopInfo.currency}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  {statementTotals.totalRemaining > 0 ? 'متبقي مستحق الدفع للورشة' : 'تم تسوية كامل المستحقات'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Info strip */}
          {(selectedWorkshop.address || selectedWorkshop.notes) && (
            <div className="p-4 rounded-xl glass-panel text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-6 shadow-xs">
              {selectedWorkshop.address && (
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{selectedWorkshop.address}</span>
                </span>
              )}
              {selectedWorkshop.notes && (
                <span className="text-slate-500 dark:text-slate-400">
                  ملاحظات عامة: {selectedWorkshop.notes}
                </span>
              )}
            </div>
          )}

          {/* Simplified Data Grid: كشف الحساب التفصيلي */}
          <div className="glass-panel rounded-2xl shadow-xs overflow-hidden border border-slate-200/80 dark:border-slate-800">
            {/* Top Toolbar */}
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-500/5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    جدول بنود كشف الحساب
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {selectedWorkshop.transactions?.length || 0} بنود مسجلة
                  </span>
                </div>
              </div>

              {/* Blue Clean + Add Item Button */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-add-statement-row"
                  onClick={handleAddNewRow}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs font-bold w-full sm:w-auto cursor-pointer"
                  title="إضافة بند"
                  aria-label="إضافة بند"
                >
                  <Plus size={16} className="text-white" />
                  <span>+ إضافة بند</span>
                </button>
              </div>
            </div>

            {/* Table with Exclusively the 6 Specified Columns */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold text-xs border-b border-slate-200/80 dark:border-slate-700/80">
                  <tr>
                    <th className="px-5 py-3.5 text-right min-w-[200px]">نوع العمل</th>
                    <th className="px-5 py-3.5 text-center w-36">إجمالي التكلفة</th>
                    <th className="px-5 py-3.5 text-center w-36">المدفوع</th>
                    <th className="px-5 py-3.5 text-center w-36">المتبقي</th>
                    <th className="px-5 py-3.5 text-right min-w-[180px]">ملاحظات</th>
                    <th className="px-5 py-3.5 text-center w-48 no-print">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(!selectedWorkshop.transactions || selectedWorkshop.transactions.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center text-slate-400 dark:text-slate-500 text-xs">
                        لا توجد بنود مسجلة في كشف حساب هذه الجهة حتى الآن. اضغط على زر «+ إضافة بند» في الأعلى لإضافة سطر جديد والبدء في الإدخال مباشرة.
                      </td>
                    </tr>
                  ) : (
                    selectedWorkshop.transactions.map((tx) => {
                      const costNum = Number(tx.cost) || 0;
                      const paidNum = Number(tx.paid) || 0;
                      const remaining = Math.max(0, costNum - paidNum);
                      const isRowPaid = Boolean(tx.isPaid || (costNum > 0 && paidNum >= costNum));

                      return (
                        <tr 
                          key={tx.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* 1. نوع العمل */}
                          <td className="px-4 py-2.5">
                            <input
                              type="text"
                              id={`input-work-type-${tx.id}`}
                              placeholder="أدخل نوع العمل..."
                              autoFocus={newlyAddedRowId === tx.id}
                              value={tx.description || tx.workType || ''}
                              onChange={(e) => handleUpdateRow(tx.id, { description: e.target.value, workType: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-500/60 text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-sm transition-colors outline-none"
                            />
                          </td>

                          {/* 2. إجمالي التكلفة */}
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              id={`input-cost-${tx.id}`}
                              min="0"
                              step="any"
                              placeholder="0"
                              value={tx.cost === 0 && !tx.isPaid ? '' : tx.cost}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                if (isRowPaid) {
                                  handleUpdateRow(tx.id, { cost: val, paid: val });
                                } else {
                                  handleUpdateRow(tx.id, { cost: val });
                                }
                              }}
                              className="w-full px-3 py-1.5 text-center font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-500/60 rounded-lg transition-colors outline-none"
                            />
                          </td>

                          {/* 3. المدفوع */}
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              id={`input-paid-${tx.id}`}
                              min="0"
                              step="any"
                              placeholder="0"
                              value={tx.paid === 0 ? '' : tx.paid}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                const isNowPaid = val > 0 && val >= (Number(tx.cost) || 0);
                                handleUpdateRow(tx.id, { paid: val, isPaid: isNowPaid });
                              }}
                              className="w-full px-3 py-1.5 text-center font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-500/60 rounded-lg transition-colors outline-none"
                            />
                          </td>

                          {/* 4. المتبقي */}
                          <td className="px-4 py-2.5 text-center">
                            <div className="font-mono font-bold text-xs sm:text-sm whitespace-nowrap">
                              <span className={remaining > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                                {remaining.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 font-sans mr-1">{settings.shopInfo.currency}</span>
                            </div>
                          </td>

                          {/* 5. ملاحظات */}
                          <td className="px-4 py-2.5">
                            <input
                              type="text"
                              id={`input-notes-${tx.id}`}
                              placeholder="ملاحظات..."
                              value={tx.notes || ''}
                              onChange={(e) => handleUpdateRow(tx.id, { notes: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-500/60 text-slate-600 dark:text-slate-300 text-xs transition-colors outline-none"
                            />
                          </td>

                          {/* 6. الإجراءات (مربع تم الدفع + سلة المهملات SVG) */}
                          <td className="px-4 py-2.5 text-center no-print whitespace-nowrap">
                            <div className="flex items-center justify-center gap-3">
                              {/* Checkbox تم الدفع */}
                              <label 
                                id={`chk-paid-${tx.id}`}
                                className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="تحديد البند كمدفوع بالكامل"
                              >
                                <input
                                  type="checkbox"
                                  checked={isRowPaid}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    if (checked) {
                                      handleUpdateRow(tx.id, { isPaid: true, paid: Number(tx.cost) || 0 });
                                    } else {
                                      handleUpdateRow(tx.id, { isPaid: false, paid: 0 });
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                />
                                <span className={isRowPaid ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400"}>
                                  تم الدفع
                                </span>
                              </label>

                              {/* Delete SVG Icon */}
                              <button
                                type="button"
                                id={`btn-delete-row-${tx.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm('هل تريد حذف هذا البند؟')) handleDeleteRow(tx.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="حذف البند"
                                aria-label="حذف هذا البند"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Fixed Totals Row (الصف الثابت في نهاية الجدول) */}
                <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm">
                  <tr>
                    {/* نوع العمل */}
                    <td className="px-5 py-4 text-slate-800 dark:text-slate-200 font-extrabold">
                      الإجمالي العام ({selectedWorkshop.transactions?.length || 0} بنود)
                    </td>

                    {/* إجمالي التكلفة */}
                    <td className="px-4 py-4 text-center font-mono text-slate-900 dark:text-slate-100 font-extrabold whitespace-nowrap">
                      {statementTotals.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                    </td>

                    {/* المدفوع */}
                    <td className="px-4 py-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-extrabold whitespace-nowrap">
                      {statementTotals.totalPaid.toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.shopInfo.currency}</span>
                    </td>

                    {/* المتبقي */}
                    <td className="px-4 py-4 text-center font-mono whitespace-nowrap">
                      <span className={statementTotals.totalRemaining > 0 ? "text-rose-600 dark:text-rose-400 font-black text-sm sm:text-base" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                        {statementTotals.totalRemaining.toLocaleString()}
                      </span>
                      <span className="text-xs font-normal text-slate-400 mr-1">{settings.shopInfo.currency}</span>
                    </td>

                    {/* ملاحظات */}
                    <td className="px-5 py-4 text-slate-400 text-xs">-</td>

                    {/* الإجراءات */}
                    <td className="px-4 py-4 text-center text-slate-400 text-xs no-print">-</td>
                  </tr>
                </tfoot>
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
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, workshop.id);
                                }}
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
                                id={`btn-open-statement-${workshop.id}`}
                                onClick={() => setSelectedWorkshopId(workshop.id)}
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

    </div>
  );
}
