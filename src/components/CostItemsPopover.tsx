import React, { useState, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check, Trash2, Layers, RotateCcw } from 'lucide-react';
import { Order } from '../types';
import { useAppContext, defaultServicesConfig } from '../context/AppContext';

export interface CostItemRow {
  id: string;
  name: string;
  amount: string;
  executor: string;
  isFromTemplate?: boolean;
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
  const { settings, employees } = useAppContext();

  // الحصول على القالب المعتمد لهذه الخدمة
  const activeTemplate = useMemo(() => {
    const allServices = (settings.servicesConfig && settings.servicesConfig.length > 0)
      ? settings.servicesConfig
      : defaultServicesConfig;
    return allServices.find(s => s.name === order.serviceType) 
      || allServices.find(s => s.name === 'لافتة إعلانية') 
      || allServices[0];
  }, [settings.servicesConfig, order.serviceType]);

  // بناء بنود التكلفة تلقائياً بناءً على قالب الخدمة مع الحفاظ على ما تم إدخاله
  const [costItems, setCostItems] = useState<CostItemRow[]>(() => {
    const allServices = (settings.servicesConfig && settings.servicesConfig.length > 0)
      ? settings.servicesConfig
      : defaultServicesConfig;
    const currentTemplate = allServices.find(s => s.name === order.serviceType) 
      || allServices.find(s => s.name === 'لافتة إعلانية') 
      || allServices[0];

    const templateItems = currentTemplate?.costItems || ['تكلفة التصميم', 'تكلفة الطباعة', 'التكلفة الخارجية', 'مواد خام'];
    const defaultCosts = currentTemplate?.defaultCosts || {};
    const defaultExecutors = currentTemplate?.defaultExecutors || {};

    const rows: CostItemRow[] = [];
    const templateItemSet = new Set(templateItems);

    // 1. إدراج بنود قالب الخدمة أولاً وتعبئة قيمها تلقائياً
    templateItems.forEach(name => {
      let val = '';
      let exec = '';

      // 1.1 البحث داخل كائن costDetails أولاً
      if (order.costDetails && order.costDetails[name] !== undefined) {
        const detail = order.costDetails[name];
        if (typeof detail === 'object' && detail !== null) {
          if (detail.amount !== undefined && detail.amount !== null && detail.amount !== '') {
            val = String(detail.amount);
          }
          if (detail.executor) {
            exec = String(detail.executor);
          }
        } else if (typeof detail === 'number' || typeof detail === 'string') {
          val = String(detail);
        }
      }

      // 1.2 البحث داخل تفصيل التكاليف costBreakdown
      if (!val && order.costBreakdown && order.costBreakdown[name] !== undefined) {
        val = String(order.costBreakdown[name]);
      }
      if (!exec && order.costExecutors && order.costExecutors[name]) {
        exec = order.costExecutors[name];
      }

      // 1.3 التوافق مع الحقول السابقة (Legacy fields)
      if (!val) {
        if ((name.includes('تصميم') || name.includes('مصمم')) && order.designCost) {
          val = String(order.designCost);
        } else if (name.includes('طباعة') && order.printingCost) {
          val = String(order.printingCost);
        } else if (name.includes('خارج') && order.externalCost) {
          val = String(order.externalCost);
        } else if (name.includes('مواد') && order.materialCost) {
          val = String(order.materialCost);
        }
      }
      if (!exec) {
        if ((name.includes('تصميم') || name.includes('مصمم')) && order.designerName) {
          exec = order.designerName;
        } else if (name.includes('طباعة') && order.printerName) {
          exec = order.printerName;
        } else if (name.includes('خارج') && order.externalExecutor) {
          exec = order.externalExecutor;
        }
      }

      // 1.4 إذا لم تكن هناك قيمة مدخلة، نأخذ القيمة الافتراضية من إعدادات القالب أو فارغة كقيمة افتراضية
      if (!val && defaultCosts[name] !== undefined && defaultCosts[name] !== null) {
        val = String(defaultCosts[name]);
      }
      if (!val || val === '0' || val === '0.00' || val === '0.0' || val === '.') {
        val = '';
      }
      if (!exec && defaultExecutors[name]) {
        exec = defaultExecutors[name];
      }

      rows.push({
        id: `template-${name}`,
        name,
        amount: val,
        executor: exec,
        isFromTemplate: true,
      });
    });

    // 2. إدراج أي بنود مخصصة إضافية كانت مسجلة مسبقاً في الفاتورة وليست ضمن القالب
    if (order.costDetails) {
      Object.entries(order.costDetails).forEach(([k, v]) => {
        if (!templateItemSet.has(k)) {
          let amt = '';
          let exec = '';
          if (typeof v === 'object' && v !== null) {
            amt = v.amount !== undefined && v.amount !== null ? String(v.amount) : '';
            exec = v.executor || '';
          } else {
            amt = String(v);
          }
          rows.push({
            id: `custom-${k}`,
            name: k,
            amount: amt,
            executor: exec,
            isFromTemplate: false,
          });
        }
      });
    }

    if (order.costBreakdown) {
      Object.entries(order.costBreakdown).forEach(([k, v]) => {
        if (!templateItemSet.has(k) && !rows.some(r => r.name === k)) {
          rows.push({
            id: `custom-${k}`,
            name: k,
            amount: v !== undefined && v !== null ? String(v) : '',
            executor: order.costExecutors?.[k] || '',
            isFromTemplate: false,
          });
        }
      });
    }

    return rows;
  });

  // حقل إضافة بند جديد حر
  const [newCostName, setNewCostName] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // إغلاق عند الضغط على زر Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // تحديث بيانات أحد البنود
  const handleUpdateItem = (id: string, field: 'amount' | 'executor', value: string) => {
    setCostItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // حذف بند
  const handleRemoveItem = (id: string) => {
    setCostItems(prev => prev.filter(item => item.id !== id));
  };

  // إضافة بند مخصص جديد
  const handleAddCustomItem = () => {
    const trimmed = newCostName.trim();
    if (!trimmed) return;

    // تجنب التكرار
    const exists = costItems.some(i => i.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewCostName('');
      return;
    }

    setCostItems(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: trimmed,
        amount: '',
        executor: '',
        isFromTemplate: false,
      },
    ]);
    setNewCostName('');
  };

  // إعادة التعيين لقيم القالب الافتراضية
  const handleResetToTemplate = () => {
    const templateItems = activeTemplate?.costItems || ['تكلفة التصميم', 'تكلفة الطباعة', 'التكلفة الخارجية', 'مواد خام'];
    const defaultCosts = activeTemplate?.defaultCosts || {};
    const defaultExecutors = activeTemplate?.defaultExecutors || {};

    const resetRows: CostItemRow[] = templateItems.map(name => {
      const defVal = defaultCosts[name] !== undefined ? String(defaultCosts[name]) : '';
      return {
        id: `template-${name}`,
        name,
        amount: (!defVal || defVal === '0' || defVal === '0.00' || defVal === '.') ? '' : defVal,
        executor: defaultExecutors[name] || '',
        isFromTemplate: true,
      };
    });
    setCostItems(resetRows);
  };

  // احتساب إجمالي التكاليف وصافي الربح المتوقع
  const totalCalculatedCost = useMemo(() => {
    return costItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  }, [costItems]);

  const invoicePrice = order.price || 0;
  const expectedProfit = invoicePrice - totalCalculatedCost;

  // حفظ البيانات وتحديث الفاتورة
  const handleSave = () => {
    const dynamicBreakdown: Record<string, number> = {};
    const dynamicExecutors: Record<string, string> = {};
    const dynamicDetails: Record<string, { amount: number; executor: string }> = {};
    const detailsList: string[] = [];

    costItems.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      const exec = item.executor.trim();

      dynamicDetails[item.name] = {
        amount: amt,
        executor: exec,
      };

      if (amt > 0) {
        dynamicBreakdown[item.name] = amt;
      }
      if (exec) {
        dynamicExecutors[item.name] = exec;
      }

      if (amt > 0) {
        detailsList.push(exec ? `${item.name}: ${amt} (${exec})` : `${item.name}: ${amt}`);
      } else {
        detailsList.push(item.name);
      }
    });

    // توافقية الحقول الكلاسيكية
    const designItem = costItems.find(i => i.name.includes('تصميم') || i.name.includes('مصمم'));
    const printingItem = costItems.find(i => i.name.includes('طباعة'));
    const externalItem = costItems.find(i => i.name.includes('خارج') || i.name.includes('ورشة'));
    const materialItem = costItems.find(i => i.name.includes('مواد'));

    const updates: Partial<Order> = {
      costDetails: dynamicDetails,
      costBreakdown: Object.keys(dynamicBreakdown).length > 0 ? dynamicBreakdown : undefined,
      costExecutors: Object.keys(dynamicExecutors).length > 0 ? dynamicExecutors : undefined,
      cost: totalCalculatedCost > 0 ? totalCalculatedCost : 0,
      expectedProfit,
      invoiceDetails: detailsList.length > 0 ? detailsList : undefined,
      designCost: designItem ? (parseFloat(designItem.amount) || 0) : order.designCost,
      designerName: designItem?.executor ? designItem.executor.trim() : order.designerName,
      printingCost: printingItem ? (parseFloat(printingItem.amount) || 0) : order.printingCost,
      printerName: printingItem?.executor ? printingItem.executor.trim() : order.printerName,
      externalCost: externalItem ? (parseFloat(externalItem.amount) || 0) : order.externalCost,
      externalExecutor: externalItem?.executor ? externalItem.executor.trim() : order.externalExecutor,
      materialCost: materialItem ? (parseFloat(materialItem.amount) || 0) : order.materialCost,
    };

    onSave(order.id, updates);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const idPrefix = useId();

  return createPortal(
    <>
      {/* طبقة خلفية للنقر خارج القائمة (Click-outside Backdrop) */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/20 dark:bg-black/40 backdrop-blur-[0.5px]" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* نافذة القائمة المنسدلة العائمة (Popover Content) */}
      <div
        id={`${idPrefix}-popover`}
        style={{ 
          ...(position.bottom !== undefined 
            ? { bottom: `${position.bottom}px` } 
            : { top: `${position.top}px` }),
          left: `${position.left}px`,
          maxHeight: position.maxHeight ? `${position.maxHeight}px` : undefined,
        }}
        className="fixed z-[9999] w-[390px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xl p-4 space-y-3.5 text-right font-sans select-none flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="بنود التكلفة المستدعاة من القالب"
      >
        {/* رأس القائمة */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-1.5">
              <Layers size={14} className="text-amber-500 shrink-0" />
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                بنود التكلفة: {order.serviceType || 'خدمة مخصصة'}
              </h4>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                العميل: <strong className="text-slate-700 dark:text-slate-300">{order.clientName}</strong>
              </span>
              <span className="text-[10px] text-slate-400">•</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                الفاتورة: <strong className="font-mono text-slate-700 dark:text-slate-300">{invoicePrice.toLocaleString()} {currency}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetToTemplate}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
              title="إعادة تعيين البنود لقيم القالب الافتراضية"
              aria-label="إعادة تعيين البنود"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* شبكة إدخال بنود التكلفة المستدعاة من القالب والبنود الحرة */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
          {costItems.map((item) => (
            <div 
              key={item.id} 
              className={`p-2.5 rounded-lg border space-y-1.5 transition-colors ${
                item.isFromTemplate 
                  ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80' 
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate">{item.name}</span>
                  {item.isFromTemplate && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-normal bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      قالب
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">{currency}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 transition-colors"
                    title="حذف هذا البند"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">المبلغ</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={item.amount === '0' ? '' : item.amount}
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '.') {
                        handleUpdateItem(item.id, 'amount', '');
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateItem(item.id, 'amount', val === '.' ? '' : val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                    }}
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">اسم المنفذ / الموظف</label>
                  <select
                    value={item.executor}
                    onChange={(e) => handleUpdateItem(item.id, 'executor', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                    }}
                    className="w-full text-xs px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- اختر المنفذ / الموظف --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} {emp.role ? `(${emp.role})` : ''}
                      </option>
                    ))}
                    {item.executor && !employees.some(e => e.name === item.executor) && (
                      <option value={item.executor}>{item.executor} (مخصص)</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {costItems.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              لا توجد بنود تكلفة محددة لهذه الخدمة، يمكنك إضافة بنود بالأسفل
            </div>
          )}
        </div>

        {/* إضافة بند تكلفة جديد يدوياً */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="إضافة بند تكلفة إضافي..."
              value={newCostName}
              onChange={(e) => setNewCostName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomItem();
                }
              }}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddCustomItem}
              className="bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Plus size={13} />
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {/* ملخص التكاليف وصافي الربح وزر الحفظ */}
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
            className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
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
