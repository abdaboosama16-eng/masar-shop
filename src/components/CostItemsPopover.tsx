import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check, Trash2 } from 'lucide-react';
import { Order } from '../types';

interface CustomCostItem {
  id: string;
  name: string;
  amount: string;
  executor: string;
}

interface CostItemsPopoverProps {
  order: Order;
  currency: string;
  position: { top?: number; bottom?: number; left: number; maxHeight?: number };
  onClose: () => void;
  onSave: (orderId: string, updates: Partial<Order>) => void;
}

export default function CostItemsPopover({
  order,
  currency,
  position,
  onClose,
  onSave,
}: CostItemsPopoverProps) {
  // 1. تكلفة التصميم
  const [designAmount, setDesignAmount] = useState<string>(() => {
    const val = order.designCost ?? order.costBreakdown?.['تكلفة التصميم'];
    return val !== undefined && val !== null ? String(val) : '';
  });
  const [designExecutor, setDesignExecutor] = useState<string>(() => {
    return order.designerName ?? order.costExecutors?.['تكلفة التصميم'] ?? '';
  });

  // 2. تكلفة الطباعة
  const [printingAmount, setPrintingAmount] = useState<string>(() => {
    const val = order.printingCost ?? order.costBreakdown?.['تكلفة الطباعة'];
    return val !== undefined && val !== null ? String(val) : '';
  });
  const [printingExecutor, setPrintingExecutor] = useState<string>(() => {
    return order.printerName ?? order.costExecutors?.['تكلفة الطباعة'] ?? '';
  });

  // 3. التكلفة الخارجية
  const [externalAmount, setExternalAmount] = useState<string>(() => {
    const val = order.externalCost ?? order.costBreakdown?.['التكلفة الخارجية'];
    return val !== undefined && val !== null ? String(val) : '';
  });
  const [externalExecutor, setExternalExecutor] = useState<string>(() => {
    return order.externalExecutor ?? order.costExecutors?.['التكلفة الخارجية'] ?? '';
  });

  // 4. مواد خام
  const [materialAmount, setMaterialAmount] = useState<string>(() => {
    const val = order.materialCost ?? order.costBreakdown?.['مواد خام'];
    return val !== undefined && val !== null ? String(val) : '';
  });
  const [materialExecutor, setMaterialExecutor] = useState<string>(() => {
    return order.costExecutors?.['مواد خام'] ?? '';
  });

  // 5. بنود إضافية مخصصة
  const [customItems, setCustomItems] = useState<CustomCostItem[]>(() => {
    const standardKeys = new Set(['تكلفة التصميم', 'تكلفة الطباعة', 'التكلفة الخارجية', 'مواد خام']);
    const list: CustomCostItem[] = [];
    if (order.costBreakdown) {
      Object.entries(order.costBreakdown).forEach(([key, val]) => {
        if (!standardKeys.has(key)) {
          list.push({
            id: `custom-${key}`,
            name: key,
            amount: val !== undefined && val !== null ? String(val) : '',
            executor: order.costExecutors?.[key] || '',
          });
        }
      });
    }
    return list;
  });

  // حقل البند الإضافي الحر
  const [newCostName, setNewCostName] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // إغلاق عند الضغط على Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // إضافة بند مخصص جديد
  const handleAddCustomItem = () => {
    const trimmed = newCostName.trim();
    if (!trimmed) return;
    
    // تجنب التكرار
    const exists = customItems.some(i => i.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewCostName('');
      return;
    }

    setCustomItems(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: trimmed,
        amount: '',
        executor: '',
      },
    ]);
    setNewCostName('');
  };

  // حذف بند مخصص
  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
  };

  // تحديث بند مخصص
  const handleUpdateCustomItem = (id: string, field: 'amount' | 'executor', value: string) => {
    setCustomItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // احتساب إجمالي التكاليف وصافي الربح
  const parsedDesign = parseFloat(designAmount) || 0;
  const parsedPrinting = parseFloat(printingAmount) || 0;
  const parsedExternal = parseFloat(externalAmount) || 0;
  const parsedMaterial = parseFloat(materialAmount) || 0;
  const parsedCustomSum = customItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  const totalCalculatedCost = parsedDesign + parsedPrinting + parsedExternal + parsedMaterial + parsedCustomSum;
  const invoicePrice = order.price || 0;
  const expectedProfit = invoicePrice - totalCalculatedCost;

  // حفظ البيانات وتحديث الطلبية
  const handleSave = () => {
    const dynamicBreakdown: Record<string, number> = {};
    const dynamicExecutors: Record<string, string> = {};

    if (parsedDesign > 0) dynamicBreakdown['تكلفة التصميم'] = parsedDesign;
    if (designExecutor.trim()) dynamicExecutors['تكلفة التصميم'] = designExecutor.trim();

    if (parsedPrinting > 0) dynamicBreakdown['تكلفة الطباعة'] = parsedPrinting;
    if (printingExecutor.trim()) dynamicExecutors['تكلفة الطباعة'] = printingExecutor.trim();

    if (parsedExternal > 0) dynamicBreakdown['التكلفة الخارجية'] = parsedExternal;
    if (externalExecutor.trim()) dynamicExecutors['التكلفة الخارجية'] = externalExecutor.trim();

    if (parsedMaterial > 0) dynamicBreakdown['مواد خام'] = parsedMaterial;
    if (materialExecutor.trim()) dynamicExecutors['مواد خام'] = materialExecutor.trim();

    customItems.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      if (amt > 0) {
        dynamicBreakdown[item.name] = amt;
      }
      if (item.executor.trim()) {
        dynamicExecutors[item.name] = item.executor.trim();
      }
    });

    const updates: Partial<Order> = {
      designCost: parsedDesign,
      designerName: designExecutor.trim() || undefined,
      printingCost: parsedPrinting,
      printerName: printingExecutor.trim() || undefined,
      externalCost: parsedExternal,
      externalExecutor: externalExecutor.trim() || undefined,
      materialCost: parsedMaterial,
      costBreakdown: Object.keys(dynamicBreakdown).length > 0 ? dynamicBreakdown : undefined,
      costExecutors: Object.keys(dynamicExecutors).length > 0 ? dynamicExecutors : undefined,
      cost: totalCalculatedCost > 0 ? totalCalculatedCost : 0,
      expectedProfit,
    };

    onSave(order.id, updates);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const idPrefix = useId();

  return createPortal(
    <>
      {/* طبقة خلفية للنقر خارج القائمة (Click-outside Backdrop) */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/10 dark:bg-black/30 backdrop-blur-[0.5px]" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* نافذة القائمة المنسدلة العائمة (Popover Content) المنبثقة للأعلى */}
      <div
        id={`${idPrefix}-popover`}
        style={{ 
          ...(position.bottom !== undefined 
            ? { bottom: `${position.bottom}px` } 
            : { top: `${position.top}px` }),
          left: `${position.left}px`,
          maxHeight: position.maxHeight ? `${position.maxHeight}px` : undefined,
        }}
        className="fixed z-50 z-[9999] w-[370px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xl p-4 space-y-3.5 text-right font-sans select-none flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="بنود التكلفة الديناميكية"
      >
        {/* رأس القائمة */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
              بنود التكلفة: {order.clientName}
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              إجمالي الفاتورة: {invoicePrice.toLocaleString()} {currency}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X size={15} />
          </button>
        </div>

        {/* شبكة إدخال بنود التكلفة الديناميكية (Input Grid) */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
          
          {/* 1. تكلفة التصميم */}
          <div className="p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200">
              <span>تكلفة التصميم</span>
              <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="المبلغ..."
                value={designAmount}
                onChange={(e) => setDesignAmount(e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="اسم المصمم..."
                value={designExecutor}
                onChange={(e) => setDesignExecutor(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 2. تكلفة الطباعة */}
          <div className="p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200">
              <span>تكلفة الطباعة</span>
              <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="المبلغ..."
                value={printingAmount}
                onChange={(e) => setPrintingAmount(e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="اسم فني الطباعة..."
                value={printingExecutor}
                onChange={(e) => setPrintingExecutor(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 3. التكلفة الخارجية */}
          <div className="p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200">
              <span>التكلفة الخارجية</span>
              <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="المبلغ..."
                value={externalAmount}
                onChange={(e) => setExternalAmount(e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="الجهة المنفذة..."
                value={externalExecutor}
                onChange={(e) => setExternalExecutor(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 4. مواد خام */}
          <div className="p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200">
              <span>مواد خام</span>
              <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="المبلغ..."
                value={materialAmount}
                onChange={(e) => setMaterialAmount(e.target.value)}
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="اسم المنفذ..."
                value={materialExecutor}
                onChange={(e) => setMaterialExecutor(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* البنود الإضافية المخصصة (إن وجدت) */}
          {customItems.map((item) => (
            <div key={item.id} className="p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200">
                <span className="truncate">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomItem(item.id)}
                    className="text-rose-500 hover:text-rose-700 p-0.5"
                    title="حذف البند"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="المبلغ..."
                  value={item.amount}
                  onChange={(e) => handleUpdateCustomItem(item.id, 'amount', e.target.value)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="اسم المنفذ..."
                  value={item.executor}
                  onChange={(e) => handleUpdateCustomItem(item.id, 'executor', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
                />
              </div>
            </div>
          ))}
        </div>

        {/* زر الإضافة الحر في أسفل القائمة */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="اسم بند إضافي..."
              value={newCostName}
              onChange={(e) => setNewCostName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomItem();
                }
              }}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddCustomItem}
              className="bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Plus size={13} />
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {/* ملخص الأرقام وزر الحفظ */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              إجمالي التكلفة: <strong className="text-slate-900 dark:text-slate-100 font-mono">{totalCalculatedCost.toLocaleString()} {currency}</strong>
            </div>
            <div className="text-[11px] font-bold">
              صافي الربح: <span className={`font-mono ${expectedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {expectedProfit >= 0 ? `+${expectedProfit.toLocaleString()}` : expectedProfit.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              isSaved 
                ? 'bg-emerald-600 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
            }`}
          >
            {isSaved ? <Check size={14} /> : null}
            <span>{isSaved ? 'تم الحفظ' : 'حفظ'}</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
