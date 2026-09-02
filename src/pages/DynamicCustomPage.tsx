import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import DynamicIcon from '../components/DynamicIcon';
import { 
  Plus, 
  Settings, 
  Layers, 
  FileText, 
  CheckSquare, 
  BarChart2, 
  Table, 
  LayoutGrid, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function DynamicCustomPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { pagesConfig, orders, expenses, inventory, employees, settings } = useAppContext();

  // Find page configuration
  const page = pagesConfig.find(p => p.id === pageId || p.path === `/page/${pageId}` || p.path === `/${pageId}`);

  // Local interactive states for custom widgets
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [customFormValues, setCustomFormValues] = useState<Record<string, string>>({});
  const [submittedForms, setSubmittedForms] = useState<Array<{ id: string; title: string; date: string; data: any }>>([]);

  if (!page) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto my-12">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">الصفحة غير موجودة</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          قد تكون هذه الصفحة قد حُذفت أو تم تعطيلها من إعدادات النظام.
        </p>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
        >
          <Settings size={15} />
          <span>الذهاب لإدارة الصفحات</span>
        </button>
      </div>
    );
  }

  const activeComponents = (page.components || [])
    .filter(c => c.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const toggleCheckItem = (itemId: string) => {
    setChecklistState(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCustomFormSubmit = (componentId: string, formTitle: string) => {
    const textVal = customFormValues[componentId];
    if (!textVal?.trim()) return;

    setSubmittedForms(prev => [
      {
        id: Math.random().toString(36).substring(2, 9),
        title: formTitle,
        date: new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' }),
        data: textVal
      },
      ...prev
    ]);

    setCustomFormValues(prev => ({ ...prev, [componentId]: '' }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Page Header Card */}
      <div className="p-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/80 dark:border-emerald-800 shrink-0">
            <DynamicIcon name={page.icon} size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">{page.name}</h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {activeComponents.length} قالب نشط
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {page.description || 'صفحة مخصصة ضمن منظومة مسار التجارية'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Sliders size={14} />
            <span>تخصيص قوالب الصفحة</span>
          </button>
        </div>
      </div>

      {/* Components Grid */}
      {activeComponents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Layers size={22} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">لا توجد قوالب مضافة بعد لهذه الصفحة</h4>
          <p className="text-xs text-slate-500 mb-5">
            يمكنك إضافة بطاقات إحصائيات، جداول بيانات، نماذج مدخلات، أو قوائم متابعة عبر إعدادات الصفحة.
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>إضافة قوالب لهذه الصفحة</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {activeComponents.map((comp) => {
            const colSpan = 
              comp.width === 'full' ? 'lg:col-span-12 md:col-span-2' :
              comp.width === 'two_thirds' ? 'lg:col-span-8 md:col-span-2' :
              comp.width === 'third' ? 'lg:col-span-4 md:col-span-1' :
              'lg:col-span-6 md:col-span-1';

            return (
              <div
                key={comp.id}
                className={`${colSpan} bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between`}
              >
                {/* Component Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                      {comp.type === 'metric_card' ? 'مؤشر أداء رقمي' :
                       comp.type === 'chart' ? 'رسم وتحليل بياني' :
                       comp.type === 'table' ? 'جدول بيانات تنفيذي' :
                       comp.type === 'checklist' ? 'قائمة مهام ومتابعة' :
                       comp.type === 'banner_note' ? 'ملاحظة وتعليمات' :
                       comp.type === 'form_field' ? 'نموذج إدخال مباشر' :
                       'قالب تشغيلي مخصص'}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{comp.title}</h3>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    {comp.type === 'metric_card' ? <DollarSign size={16} /> :
                     comp.type === 'chart' ? <BarChart2 size={16} /> :
                     comp.type === 'table' ? <Table size={16} /> :
                     comp.type === 'checklist' ? <CheckSquare size={16} /> :
                     comp.type === 'banner_note' ? <FileText size={16} /> :
                     <LayoutGrid size={16} />}
                  </div>
                </div>

                {/* Component Body by Type */}
                <div className="flex-1">
                  {/* Metric Card */}
                  {comp.type === 'metric_card' && (
                    <div className="py-3">
                      <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                        {comp.settings?.value || orders.length.toLocaleString()} <span className="text-xs font-semibold text-slate-500">{comp.settings?.unit || settings.shopInfo.currency}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {comp.description || 'مؤشر أداء يتم تحديثه تلقائياً وفق بيانات المنظومة'}
                      </p>
                    </div>
                  )}

                  {/* Banner / Instructions Note */}
                  {comp.type === 'banner_note' && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {comp.description || comp.settings?.text || 'هذه المساحة مخصصة للتعليمات التشغيلية والملاحظات الإدارية الخاصة بهذا القسم.'}
                    </div>
                  )}

                  {/* Checklist Widget */}
                  {comp.type === 'checklist' && (
                    <div className="space-y-2 py-1">
                      {[
                        { id: `${comp.id}-1`, label: 'مراجعة ومطابقة القيود مع الخزينة' },
                        { id: `${comp.id}-2`, label: 'التأكد من جاهزية ملفات التصميم والطباعة' },
                        { id: `${comp.id}-3`, label: 'تحديث أرصدة المواد في المخزن' },
                        { id: `${comp.id}-4`, label: 'تأكيد مواعيد التركيب مع العملاء' }
                      ].map(item => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 cursor-pointer transition-colors text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={!!checklistState[item.id]}
                            onChange={() => toggleCheckItem(item.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className={`font-semibold ${checklistState[item.id] ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Form Field / Quick Input */}
                  {comp.type === 'form_field' && (
                    <div className="space-y-3">
                      <textarea
                        rows={2}
                        value={customFormValues[comp.id] || ''}
                        onChange={(e) => setCustomFormValues(prev => ({ ...prev, [comp.id]: e.target.value }))}
                        placeholder="أدخل نصاً أو قيداً أو بياناً ليتم حفظه..."
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCustomFormSubmit(comp.id, comp.title)}
                          className="btn-primary px-3.5 py-1.5 rounded-lg text-xs font-bold"
                        >
                          حفظ الإدخال
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table Widget */}
                  {comp.type === 'table' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-xs text-right">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-2.5">المعرف</th>
                            <th className="p-2.5">البيان</th>
                            <th className="p-2.5 text-left">القيمة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {orders.slice(0, 3).map(o => (
                            <tr key={o.id}>
                              <td className="p-2.5 font-mono font-bold">{o.serialNumber || o.id}</td>
                              <td className="p-2.5">{o.clientName}</td>
                              <td className="p-2.5 text-left font-mono font-bold text-emerald-600">
                                {o.price.toLocaleString()} {settings.shopInfo.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Generic / Other widgets */}
                  {comp.type !== 'metric_card' && comp.type !== 'banner_note' && comp.type !== 'checklist' && comp.type !== 'form_field' && comp.type !== 'table' && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      {comp.description || 'قالب تنفيذي مهيأ للتشغيل السريع'}
                    </div>
                  )}
                </div>

                {/* Component Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span>نشط في الواجهة</span>
                  </span>
                  <span>الترتيب: #{comp.order}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submitted Live Records (if any) */}
      {submittedForms.length > 0 && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">المدخلات والبيانات المسجلة حديثاً:</h4>
          <div className="space-y-2">
            {submittedForms.map(item => (
              <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">{item.title}</span>
                  <span className="text-slate-600 dark:text-slate-400">{item.data}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
