import React, { useState, useRef, useMemo } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Calculator, 
  Check, 
  Receipt, 
  Sparkles, 
  Wallet, 
  Calendar,
  MessageSquare,
  Building,
  Sliders,
  Database,
  BrainCircuit,
  Eye,
  ArrowRight
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { 
  extractRawTextFromDocx, 
  sendRawTextToGemini, 
  processGeminiResponseData, 
  ProcessedFinancialResult, 
  ProcessedInvoiceItem, 
  ProcessedExpenseItem,
  ProcessedMonthData
} from '../../utils/geminiDocxExtractor';
import { isSponsoredAds } from '../../utils/financialCalculations';
import { Order, Expense } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

interface DocxSmartImporterProps {
  onSuccess?: (summary: { invoicesCount: number; expensesCount: number; monthsCount: number }) => void;
}

export default function DocxSmartImporter({ onSuccess }: DocxSmartImporterProps) {
  const { 
    setOrders, 
    employees, 
    setEmployees, 
    addEmployee,
    updateEmployee,
    setExpenses,
    addExpense,
    currency,
    getNextSerialNumber,
    selectedDate
  } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // نتيجة المعالجة الذكية بواسطة Gemini
  const [financialResult, setFinancialResult] = useState<ProcessedFinancialResult | null>(null);

  // نسبة هامش الربح الافتراضية المطبقة لتوليد Total و Profit (افتراضياً 32% ليعطي 680 -> 1000 total و 320 profit)
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(32);

  // تصفية المعاينة بحسب الشهر المحدد (أو 'all' لجميع الأشهر)
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<'all' | number>('all');

  // التحكم في النافذة والتبويبات
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses' | 'notes' | 'rawText'>('invoices');
  const [isCommitting, setIsCommitting] = useState(false);

  // معالجة قراءة وتحليل ملف الوورد (.docx) بواسطة الذكاء الاصطناعي Google Gemini
  const processUploadedFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setErrorMessage('يرجى اختيار ملف وورد بصيغة (.docx) مدعوم فقط.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('جارِ استخراج النص الخام (Raw Text) من ملف الوورد عبر Mammoth...');
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      // 1. استخدام مكتبة mammoth فقط لاستخراج النص الخام (Raw Text) بدون محاولة قراءة الجداول برمجياً
      const rawText = await extractRawTextFromDocx(file);
      if (!rawText || rawText.trim().length === 0) {
        throw new Error('لم يتم العثور على أي نص داخل ملف الوورد المرفوع.');
      }

      // 2. إرسال النص الخام إلى Google Gemini API
      setProcessingStep('جارِ إرسال النص الخام وتحليله بواسطة Google Gemini API وفهم سياق الأشهر والمصاريف...');
      const geminiData = await sendRawTextToGemini(rawText);

      // 3. معالجة البيانات وتطبيق معادلات المنظومة الحالية
      setProcessingStep('جارِ تطبيق معادلات المنظومة الحسابية وحساب الإجماليات وهوامش الربح الصافية...');
      const defaultYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
      const processed = processGeminiResponseData(
        geminiData,
        file.name,
        rawText,
        defaultYear,
        profitMarginPercent
      );

      const hasInvoices = processed.allInvoices.length > 0;
      const hasExpenses = processed.allExpenses.length > 0;
      const hasNotes = Object.values(processed.monthsData).some(m => m.notes && m.notes.length > 0);

      if (!hasInvoices && !hasExpenses && !hasNotes) {
        setErrorMessage('قام الذكاء الاصطناعي بتحليل الملف لكن لم يعثر على بنود مبيعات أو مصاريف صالحة للاستخراج.');
        setIsProcessing(false);
        return;
      }

      setFinancialResult(processed);
      setSelectedMonthFilter('all');

      if (hasInvoices) {
        setActiveTab('invoices');
      } else if (hasExpenses) {
        setActiveTab('expenses');
      } else {
        setActiveTab('notes');
      }

      setIsPreviewModalOpen(true);
    } catch (err: any) {
      console.error('Gemini Docx extraction error:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء معالجة المستند عبر Google Gemini API.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // إعادة احتساب الإجماليات وهوامش الربح عند تعديل نسبة الهامش يدوياً
  const handleMarginChange = (newMargin: number) => {
    setProfitMarginPercent(newMargin);
    if (!financialResult) return;

    const marginRatio = Math.max(0.01, Math.min(0.9, newMargin / 100));

    // تحديث الفواتير الحالية بناء على النسبة الجديدة
    const updatedInvoices = financialResult.allInvoices.map(inv => {
      const calculatedPrice = inv.netCost > 0 ? Math.round(inv.netCost / (1 - marginRatio)) : 0;
      const profitMargin = Math.max(0, calculatedPrice - inv.netCost);
      const profitPercent = calculatedPrice > 0 ? Math.round((profitMargin / calculatedPrice) * 100) : 0;
      return {
        ...inv,
        calculatedPrice,
        profitMargin,
        profitPercent,
      };
    });

    // تحديث الأشهر
    const updatedMonthsData = { ...financialResult.monthsData };
    Object.keys(updatedMonthsData).forEach(mStr => {
      const mNum = Number(mStr);
      const mInvs = updatedInvoices.filter(i => i.month === mNum);
      const totalSalesCost = mInvs.reduce((sum, inv) => sum + inv.netCost, 0);
      const totalSalesPrice = mInvs.reduce((sum, inv) => sum + inv.calculatedPrice, 0);
      const totalSalesProfit = mInvs.reduce((sum, inv) => sum + inv.profitMargin, 0);

      updatedMonthsData[mNum] = {
        ...updatedMonthsData[mNum],
        invoices: mInvs,
        totalSalesCost,
        totalSalesPrice,
        totalSalesProfit,
      };
    });

    setFinancialResult({
      ...financialResult,
      allInvoices: updatedInvoices,
      monthsData: updatedMonthsData,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // الفواتير المصفاة بحسب الشهر المختار
  const filteredInvoices = useMemo(() => {
    if (!financialResult) return [];
    if (selectedMonthFilter === 'all') return financialResult.allInvoices;
    return financialResult.allInvoices.filter(inv => inv.month === selectedMonthFilter);
  }, [financialResult, selectedMonthFilter]);

  // المصاريف المصفاة بحسب الشهر المختار
  const filteredExpenses = useMemo(() => {
    if (!financialResult) return [];
    if (selectedMonthFilter === 'all') return financialResult.allExpenses;
    return financialResult.allExpenses.filter(exp => exp.month === selectedMonthFilter);
  }, [financialResult, selectedMonthFilter]);

  // ملخص إحصائيات المعاينة الحالية
  const summaryStats = useMemo(() => {
    if (!financialResult) {
      return {
        totalInvoices: 0,
        totalNetCost: 0,
        totalPrice: 0,
        totalProfit: 0,
        avgProfitPercent: 0,
        totalExpenses: 0,
        totalNotesCount: 0,
      };
    }

    const invList = filteredInvoices;
    const expList = filteredExpenses;

    const totalNetCost = invList.reduce((sum, inv) => sum + inv.netCost, 0);
    const totalPrice = invList.reduce((sum, inv) => sum + inv.calculatedPrice, 0);
    const totalProfit = invList.reduce((sum, inv) => sum + inv.profitMargin, 0);
    const avgProfitPercent = totalPrice > 0 ? Number(((totalProfit / totalPrice) * 100).toFixed(1)) : 0;
    const totalExpenses = expList.reduce((sum, exp) => sum + exp.amount, 0);

    const totalNotesCount = (Object.values(financialResult.monthsData) as ProcessedMonthData[]).filter(m => !!m.notes).length;

    return {
      totalInvoices: invList.length,
      totalNetCost: Math.round(totalNetCost),
      totalPrice: Math.round(totalPrice),
      totalProfit: Math.round(totalProfit),
      avgProfitPercent,
      totalExpenses: Math.round(totalExpenses),
      totalNotesCount,
    };
  }, [financialResult, filteredInvoices, filteredExpenses]);

  // اعتماد وحفظ البيانات في المنظومة وقاعدة بيانات Supabase
  const handleCommitData = async () => {
    if (!financialResult) return;

    setIsCommitting(true);
    setErrorMessage(null);

    try {
      const startingSerial = parseInt(getNextSerialNumber(), 10) || 1001;

      // 1. إنشاء الفواتير بعد احتساب Total و Profit بناء على معادلات المنظومة الحالية:
      // - السعر المباشر بالدينار في price
      // - التكلفة الصافية القادمة من Gemini في cost و costBreakdown و costDetails
      // - صافي الربح = السعر - التكلفة الصافية
      // - تاريخ الفاتورة date مرتبط برقم الشهر الخاص بها (month) القادم من الـ JSON حصراً
      const ordersToInsert: Order[] = financialResult.allInvoices.map((inv, idx) => {
        const serial = (startingSerial + idx).toString();
        const isSponsored = isSponsoredAds(inv.serviceType);

        return {
          id: serial,
          serialNumber: serial,
          serviceType: inv.serviceType,
          clientName: inv.clientName,
          description: inv.rawServiceDesc || inv.serviceType,
          price: inv.calculatedPrice, // إجمالي بالدينار
          cost: inv.netCost, // التكلفة الصافية المباشرة بالدينار دون ضرب
          expectedProfit: inv.profitMargin, // هامش الربح
          costBreakdown: {
            [inv.serviceType || 'تكلفة']: inv.netCost,
          },
          costDetails: {
            [inv.serviceType || 'تكلفة']: {
              amount: inv.netCost,
              executor: '',
            },
          },
          invoiceDetails: [
            `${inv.serviceType}: ${inv.netCost.toLocaleString()} ${currency}`,
          ],
          adBudgetUsd: isSponsored ? inv.netCost : undefined,
          notes: inv.notes ? inv.notes.trim() : '',
          status: 'بانتظار اعتماد التصميم',
          paymentMethod: 'نقدي',
          date: inv.date, // مربوط بالشهر الخاص به (YYYY-MM-15T12:00:00.000Z) القادم من الـ JSON
          pendingSync: true,
        };
      });

      // 2. إعداد المصروفات التشغيلية (الرواتب، إيجار المكتب، الفواتير... إلخ):
      // - ترتبط كل مصروفة برقم الشهر وتاريخه الخاص به
      const expensesToInsert: Expense[] = financialResult.allExpenses.map((exp, idx) => ({
        id: `exp-${exp.month}-${Date.now()}-${idx + 1}`,
        type: 'مصروف',
        category: exp.category,
        description: exp.description,
        amount: exp.amount, // صافي بالدينار
        date: exp.date, // تاريخ الشهر الخاص بها القادم من الـ JSON
        notes: '',
        pendingSync: true,
      }));

      // 3. تحديث الموظفين إذا كان المصروف من فئة الرواتب
      const updatedEmployeesList = [...employees];
      const salaryExpenses = financialResult.allExpenses.filter(e => e.category === 'رواتب');

      salaryExpenses.forEach(sal => {
        const empName = (sal.employeeName || sal.description.replace(/راتب|مرتب|رواتب/gi, '')).trim();
        if (!empName) return;
        const existingIdx = updatedEmployeesList.findIndex(e => e.name.trim() === empName);
        if (existingIdx !== -1) {
          updatedEmployeesList[existingIdx] = {
            ...updatedEmployeesList[existingIdx],
            salary: sal.amount,
          };
        } else {
          updatedEmployeesList.push({
            id: `emp-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: empName,
            role: 'إدارة',
            salary: sal.amount,
            status: 'نشط',
            joinedDate: sal.date,
            pendingSync: true,
          });
        }
      });

      // 4. حفظ الملاحظات العامة للشهر (Outside Table General Notes) المكتشفة من Gemini
      for (const mData of Object.values(financialResult.monthsData) as ProcessedMonthData[]) {
        const mKey = mData.monthKey;
        const notesToAppend = mData.notes;
        if (!notesToAppend) continue;

        try {
          const existingNotes = localStorage.getItem(`masar_monthly_notes_${mKey}`) || '';
          const finalNotes = existingNotes ? `${existingNotes}\n\n${notesToAppend}` : notesToAppend;
          localStorage.setItem(`masar_monthly_notes_${mKey}`, finalNotes);

          // حفظ في Supabase إن كان متصلاً
          if (isSupabaseConfigured) {
            await supabase.from('monthly_notes').upsert({
              id: `note-${mKey}`,
              month_key: mKey,
              month: mData.month,
              year: mData.year,
              notes: finalNotes,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'month_key' });
          }

          // إرسال حدث تحديث فوري للشاشة (MonthlySalesGrid)
          window.dispatchEvent(new CustomEvent('masar_notes_updated', { detail: { monthKey: mKey } }));
        } catch (noteErr) {
          console.warn('Failed saving monthly note:', noteErr);
        }
      }

      // إرسال حدث تخزين عام
      window.dispatchEvent(new Event('storage'));

      // 5. الحفظ في الحالة المحلية والتخزين المتصفح
      if (ordersToInsert.length > 0) {
        setOrders(prev => {
          const updated = [...ordersToInsert, ...prev];
          try {
            localStorage.setItem('masar_orders', JSON.stringify(updated));
            localStorage.setItem('masar_invoices', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      if (expensesToInsert.length > 0) {
        if (typeof setExpenses === 'function') {
          setExpenses(prev => {
            const updated = [...expensesToInsert, ...prev];
            try {
              localStorage.setItem('masar_expenses', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        } else if (typeof addExpense === 'function') {
          expensesToInsert.forEach(exp => addExpense(exp));
        }
      }

      if (salaryExpenses.length > 0) {
        if (typeof setEmployees === 'function') {
          setEmployees(updatedEmployeesList);
          try {
            localStorage.setItem('masar_employees', JSON.stringify(updatedEmployeesList));
          } catch {}
        } else {
          salaryExpenses.forEach(sal => {
            const empName = (sal.employeeName || sal.description.replace(/راتب|مرتب|رواتب/gi, '')).trim();
            const existing = employees.find(e => e.name.trim() === empName);
            if (existing && typeof updateEmployee === 'function') {
              updateEmployee({ ...existing, salary: sal.amount });
            } else if (!existing && typeof addEmployee === 'function') {
              addEmployee({
                id: `emp-auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: empName,
                role: 'إدارة',
                salary: sal.amount,
                status: 'نشط',
                joinedDate: sal.date,
              });
            }
          });
        }
      }

      // 6. مزامنة سحابية مع قاعدة بيانات Supabase
      if (isSupabaseConfigured) {
        try {
          if (ordersToInsert.length > 0) {
            await supabase.from('orders').upsert(ordersToInsert, { onConflict: 'id' });
          }
          if (expensesToInsert.length > 0) {
            await supabase.from('expenses').upsert(expensesToInsert, { onConflict: 'id' });
          }
          if (salaryExpenses.length > 0) {
            await supabase.from('employees').upsert(updatedEmployeesList, { onConflict: 'id' });
          }
        } catch (cloudErr) {
          console.warn('Supabase sync warning:', cloudErr);
        }
      }

      // إشعار نجاح
      const monthsListStr = financialResult.detectedMonths.map(m => `شهر ${m}`).join(' و ');
      const toastMsg = `تم استيراد ${ordersToInsert.length} فاتورة و ${expensesToInsert.length} بند مصروف وملاحظات عامة لـ (${monthsListStr}) وتوزيعها بدقة على الأشهر المعنية.`;
      setSuccessToast(toastMsg);
      setIsPreviewModalOpen(false);
      setFinancialResult(null);

      if (onSuccess) {
        onSuccess({
          invoicesCount: ordersToInsert.length,
          expensesCount: expensesToInsert.length,
          monthsCount: financialResult.detectedMonths.length,
        });
      }
    } catch (err: any) {
      console.error('Commit data error:', err);
      setErrorMessage('حدث خطأ أثناء حفظ البيانات المستوردة: ' + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* إشعار النجاح */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-bold">{successToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast(null)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* تنبيه الخطأ */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-sm font-bold leading-relaxed">{errorMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-700 dark:text-rose-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* بطاقة منطقة رفع الملفات الأساسية */}
      <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <BrainCircuit size={22} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>الاستيراد الذكي المدعوم بالذكاء الاصطناعي (Google Gemini)</span>
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              استخراج النص الخام عبر Mammoth وتحليله عبر نموذج Gemini لفهم الجداول المعقدة، فرز الأشهر، استخراج المصاريف، وحساب الأرباح تلقائياً.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 shadow-xs">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Google Gemini AI Engine</span>
            </span>
          </div>
        </div>

        {/* المبادئ والضوابط الصارمة المطبقة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-right space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
              <Calendar size={14} className="text-blue-500" />
              <span>تقسيم البيانات حسب الأشهر</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              يقوم الذكاء الاصطناعي برصد الأشهر (شهر 1، شهر 2...) وتقسيم الفواتير والمصاريف بدقة في الـ JSON.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-right space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
              <Calculator size={14} className="text-emerald-500" />
              <span>التكلفة الصافية بالدينار</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              استخراج التكلفة الصافية وتجريد كلمات الدينار/الدولار، مع معالجة الآلاف (مثل 6.660 تصبح 6660).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-right space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
              <Building size={14} className="text-amber-500" />
              <span>قائمة المصاريف التشغيلية</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              التعرف التلقائي على بنود المصاريف (مثل إيجار المكتب 1000) واستخراجها كقائمة منفصلة (item, cost).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-right space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
              <MessageSquare size={14} className="text-indigo-500" />
              <span>الملاحظات العامة للشهر</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              التقاط النصوص الحرة (مثل: «كيان تبي نرجعلهم 840 دينار») وربطها بالملاحظات العامة لذلك الشهر.
            </p>
          </div>
        </div>

        {/* منطقة السحب والإفلات */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 ring-4 ring-indigo-500/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-indigo-500/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing}
          />

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              {isProcessing ? (
                <RefreshCw size={32} className="animate-spin text-indigo-600" />
              ) : (
                <BrainCircuit size={32} />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-indigo-600" />
                    <span>{processingStep || 'جارِ التحليل بالذكاء الاصطناعي...'}</span>
                  </span>
                ) : (
                  'اضغط لاختيار مستند Word أو اسحب الملف وأفلته هنا'
                )}
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                الصيغة المدعومة: <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">DOCX.</span> فقط. سيتم استخراج النص الخام وتحليله عبر Gemini ثم عرض نافذة المعاينة الزجاجية للمراجعة والاعتماد.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs">
              <Sparkles size={14} className="text-indigo-500" />
              <span>استخراج ذكي بدون أخطاء الجداول مع تتبع الأشهر والمصاريف</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* نافذة المعاينة والاعتماد الزجاجية (Glassmorphism Preview Modal)             */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && financialResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-right animate-in zoom-in-95 duration-150">
            
            {/* الترويسة العلوية للنافذة الزجاجية */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <BrainCircuit size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    معاينة البيانات المستخرجة بذكاء اصطناعي (Google Gemini)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                    {financialResult.fileName}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  تم استخراج البيانات وتقسيمها حسب الأشهر مع توليد الإجمالي (Total) وصافي الربح (Profit) وفق معادلات المنظومة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                disabled={isCommitting}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            {/* شريط التحكم السريع في نسبة هامش الربح والفلترة بالأشهر */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-4">
              {/* شريط فلترة الأشهر */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
                  <Calendar size={14} className="text-blue-500" />
                  <span>تصفية حسب الشهر:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedMonthFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  جميع الأشهر ({financialResult.detectedMonths.length})
                </button>

                {financialResult.detectedMonths.map(m => {
                  const mData = financialResult.monthsData[m];
                  const invCount = mData?.invoices?.length || 0;
                  const expCount = mData?.expenses?.length || 0;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonthFilter(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        selectedMonthFilter === m
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>شهر {m}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 font-mono">
                        {invCount} فاتورة / {expCount} مصروف
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* أداة ضبط نسبة هامش الربح لتوليد Total و Profit */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Sliders size={14} className="text-indigo-500 shrink-0" />
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  نسبة هامش الربح المعتمدة:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="5"
                    max="80"
                    step="1"
                    value={profitMarginPercent}
                    onChange={(e) => handleMarginChange(Number(e.target.value) || 32)}
                    className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">%</span>
                </div>
                <span className="text-[11px] text-slate-700 dark:text-slate-300">
                  (معادلة: السعر = التكلفة / (1 - {profitMarginPercent}%))
                </span>
              </div>
            </div>

            {/* بطاقات الإحصائيات العامة للمعاينة */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 text-right">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Receipt size={12} />
                  <span>الفواتير المستخرجة</span>
                </span>
                <div className="text-lg font-black text-blue-900 dark:text-blue-100 font-mono mt-1">
                  {summaryStats.totalInvoices}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-right">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calculator size={12} />
                  <span>التكلفة الصافية (Cost)</span>
                </span>
                <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
                  {summaryStats.totalNetCost.toLocaleString()} <span className="text-xs font-normal">{currency}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-right">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Wallet size={12} />
                  <span>إجمالي المبيعات (Total)</span>
                </span>
                <div className="text-lg font-black text-indigo-900 dark:text-indigo-100 font-mono mt-1">
                  {summaryStats.totalPrice.toLocaleString()} <span className="text-xs font-normal">{currency}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-right">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>صافي الربح (Profit)</span>
                </span>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                  +{summaryStats.totalProfit.toLocaleString()} <span className="text-xs font-normal">{currency}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800 text-right">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                  <Building size={12} />
                  <span>المصاريف التشغيلية</span>
                </span>
                <div className="text-lg font-black text-rose-900 dark:text-rose-100 font-mono mt-1">
                  {summaryStats.totalExpenses.toLocaleString()} <span className="text-xs font-normal">{currency}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-right">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <MessageSquare size={12} />
                  <span>أشهر بها ملاحظات</span>
                </span>
                <div className="text-lg font-black text-amber-900 dark:text-amber-100 font-mono mt-1">
                  {summaryStats.totalNotesCount} شهر
                </div>
              </div>
            </div>

            {/* شريط تبويبات المعاينة */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 flex items-center gap-6 bg-slate-50 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'invoices'
                    ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                    : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Receipt size={16} />
                <span>فواتير المبيعات المحتسبة ({filteredInvoices.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'expenses'
                    ? 'border-rose-600 text-rose-700 dark:text-rose-400'
                    : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building size={16} />
                <span>المصاريف التشغيلية المستخرجة ({filteredExpenses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'notes'
                    ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare size={16} />
                <span>الملاحظات العامة للأشهر</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rawText')}
                className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'rawText'
                    ? 'border-slate-600 text-slate-800 dark:text-slate-200'
                    : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye size={16} />
                <span>النص الخام المستخرج</span>
              </button>
            </div>

            {/* محتوى التبويبات القابل للتمرير */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[50vh]">
              {/* تبويب الفواتير */}
              {activeTab === 'invoices' && (
                <div className="space-y-3">
                  {filteredInvoices.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs">
                      لا توجد فواتير مبيعات للشهر المختار.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">الشهر المستخرج</th>
                            <th className="p-3">اسم العميل</th>
                            <th className="p-3">نوع الخدمة</th>
                            <th className="p-3 text-left">التكلفة الصافية (Cost)</th>
                            <th className="p-3 text-left">إجمالي الفاتورة (Total)</th>
                            <th className="p-3 text-left">هامش الربح (Profit)</th>
                            <th className="p-3 text-center">النسبة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {filteredInvoices.map((inv, idx) => (
                            <tr key={inv.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{idx + 1}</td>
                              <td className="p-3 font-bold text-blue-700 dark:text-blue-400">
                                شهر {inv.month}
                              </td>
                              <td className="p-3 font-black text-slate-900 dark:text-white">
                                {inv.clientName}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                                  {inv.serviceType}
                                </span>
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-slate-900 dark:text-slate-100">
                                {inv.netCost.toLocaleString()} {currency}
                              </td>
                              <td className="p-3 text-left font-mono font-black text-indigo-700 dark:text-indigo-400">
                                {inv.calculatedPrice.toLocaleString()} {currency}
                              </td>
                              <td className="p-3 text-left font-mono font-black text-emerald-700 dark:text-emerald-400">
                                +{inv.profitMargin.toLocaleString()} {currency}
                              </td>
                              <td className="p-3 text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                                {inv.profitPercent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* تبويب المصاريف التشغيلية */}
              {activeTab === 'expenses' && (
                <div className="space-y-3">
                  {filteredExpenses.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs">
                      لا توجد بنود مصاريف تشغيلية للشهر المختار.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">الشهر المستخرج</th>
                            <th className="p-3">بند المصروف (Item)</th>
                            <th className="p-3">التصنيف المعتمد</th>
                            <th className="p-3 text-left">القيمة بالدينار (Cost)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {filteredExpenses.map((exp, idx) => (
                            <tr key={exp.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{idx + 1}</td>
                              <td className="p-3 font-bold text-rose-700 dark:text-rose-400">
                                شهر {exp.month}
                              </td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">
                                {exp.description}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold text-[11px]">
                                  {exp.category}
                                </span>
                              </td>
                              <td className="p-3 text-left font-mono font-black text-rose-700 dark:text-rose-400">
                                {exp.amount.toLocaleString()} {currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* تبويب الملاحظات العامة للأشهر */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {(Object.values(financialResult.monthsData) as ProcessedMonthData[]).filter(m => !!m.notes).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs">
                      لم يتم العثور على أي نصوص حرة أو ملاحظات عامة للأشهر في هذا المستند.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.values(financialResult.monthsData) as ProcessedMonthData[])
                        .filter(m => !!m.notes)
                        .map((mData) => (
                          <div 
                            key={mData.month}
                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                              <span className="inline-flex items-center gap-1.5 font-black text-xs text-blue-700 dark:text-blue-300">
                                <Calendar size={14} />
                                <span>الملاحظات العامة لـ شهر {mData.month}</span>
                              </span>
                              <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{mData.monthKey}</span>
                            </div>

                            <div className="bg-white dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {mData.notes}
                            </div>

                            <div className="text-[11px] text-slate-700 dark:text-slate-300">
                              سيتم حفظها في خانة الملاحظات العامة لشهر {mData.month} تلقائياً.
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* تبويب النص الخام المستخرج للتدقيق */}
              {activeTab === 'rawText' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                    هذا هو النص الخام المستخرج من ملف الوورد عبر Mammoth والذي تم إرساله إلى Google Gemini للتحليل المالي:
                  </div>
                  <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed border border-slate-800">
                    {financialResult.rawText}
                  </pre>
                </div>
              )}
            </div>

            {/* التذييل السفلي وأزرار الاعتماد */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>
                  سيتم حفظ {financialResult.allInvoices.length} فاتورة و {financialResult.allExpenses.length} مصروف وملاحظات الأشهر مع توزيعها بدقة على كل شهر.
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  disabled={isCommitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleCommitData}
                  disabled={isCommitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>جارِ الحفظ في المنظومة وقاعدة البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>اعتماد وحفظ البيانات لجميع الأشهر</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
