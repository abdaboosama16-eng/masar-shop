import React, { useState, useEffect } from 'react';
import { DollarSign, X, Check, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';

interface ExchangeRateModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function ExchangeRateModal({ forceOpen = false, onClose }: ExchangeRateModalProps) {
  const { 
    selectedDate, 
    exchangeRates, 
    setMonthExchangeRate, 
    settings 
  } = useAppContext();

  const monthKey = format(selectedDate, 'yyyy-MM');
  const monthNameArabic = format(selectedDate, 'MMMM yyyy', { locale: ar });
  const currency = settings?.shopInfo?.currency || 'د.ل';

  const [isOpen, setIsOpen] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [dismissedMonths, setDismissedMonths] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // تحقق تلقائي عند تغير الشهر/السنة: إذا لم يكن سعر الصرف مسجلاً مسبقاً، افتح النافذة تلقائياً
  useEffect(() => {
    if (forceOpen) {
      const existingRate = exchangeRates[monthKey];
      setRateInput(existingRate ? String(existingRate) : '');
      setIsOpen(true);
      setErrorMsg('');
      return;
    }

    const hasRate = exchangeRates[monthKey] !== undefined && exchangeRates[monthKey] > 0;
    const isDismissed = dismissedMonths.has(monthKey);

    if (!hasRate && !isDismissed) {
      setRateInput('');
      setIsOpen(true);
      setErrorMsg('');
    } else if (!forceOpen) {
      setIsOpen(false);
    }
  }, [selectedDate, monthKey, exchangeRates, forceOpen, dismissedMonths]);

  const handleClose = () => {
    setIsOpen(false);
    setDismissedMonths(prev => new Set(prev).add(monthKey));
    if (onClose) onClose();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseFloat(rateInput);

    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('يرجى إدخال سعر صرف صحيح أكبر من الصفر');
      return;
    }

    setIsSaving(true);
    try {
      await setMonthExchangeRate(monthKey, parsed);
      setIsOpen(false);
      if (onClose) onClose();
    } catch {
      setErrorMsg('حدث خطأ أثناء حفظ سعر الصرف');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="exchange-rate-modal"
        className="glass-panel w-full max-w-md rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden text-right animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>تحديد سعر صرف الدولار المعتمد</span>
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold mt-0.5">
                شهر: {monthNameArabic}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-exchange-rate-modal"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ArrowLeftRight size={14} className="text-blue-600 shrink-0" />
              <span>سعر صرف الدولار المعتمد لشهر {monthNameArabic}</span>
            </p>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              يستخدم هذا السعر لحساب تكلفة الإعلانات الممولة بالدولار ($) وضربها تلقائياً بالعملة المحلية ({currency}) في الفواتير.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              سعر صرف 1 دولار أمريكي ($) بالعملة المحلية ({currency})
            </label>
            <div className="relative">
              <input
                type="number"
                id="input-exchange-rate-value"
                step="any"
                min="0.001"
                required
                autoFocus
                value={rateInput}
                onChange={(e) => {
                  setRateInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="مثال: 7.25"
                className="w-full glass-input rounded-xl px-4 py-3 text-base font-black font-mono text-center text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 pointer-events-none">
                {currency} / 1$
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5 font-bold">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick suggestions */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">قيم مقترحة سريعة:</span>
            {[7.00, 7.15, 7.25, 7.50].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRateInput(String(val))}
                className="px-2 py-1 text-[11px] font-mono font-bold rounded-md bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {val.toFixed(2)}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              type="button"
              id="btn-skip-exchange-rate"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              تخطي الآن
            </button>
            <button
              type="submit"
              id="btn-save-exchange-rate"
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              <Check size={16} className="stroke-[3]" />
              <span>{isSaving ? 'جارِ الحفظ...' : 'تأكيد وحفظ سعر الصرف'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
