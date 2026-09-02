import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  ChevronLeft, 
  Sliders, 
  RotateCcw, 
  ExternalLink,
  LayoutDashboard,
  BarChart3,
  Table as TableIcon,
  FileText,
  Filter,
  Grid,
  Sparkles,
  Info,
  CheckCircle2,
  FolderTree
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { PageConfig, PageComponentConfig, PageComponentType } from '../../types';
import DynamicIcon, { availableIconsList } from '../DynamicIcon';
import { useNavigate } from 'react-router-dom';

const COMPONENT_TYPE_LABELS: Record<PageComponentType, { label: string; icon: React.ReactNode; desc: string }> = {
  metric_card: {
    label: 'بطاقة مؤشر رقمي (KPI)',
    icon: <BarChart3 size={15} />,
    desc: 'عرض رقم إحصائي أو مالي مع نسبة النمو أو المؤشر المقارن',
  },
  table: {
    label: 'جدول بيانات تفصيلي',
    icon: <TableIcon size={15} />,
    desc: 'عرض سجلات الجداول والعمليات مع إمكانية الفرز والتصفية',
  },
  chart: {
    label: 'مخطط ورسم بياني',
    icon: <BarChart3 size={15} />,
    desc: 'رسم بياني توضيحي للمقارنات الزمنية وتحليل الإيرادات والتكاليف',
  },
  form_field: {
    label: 'نموذج إدخال وعمليات',
    icon: <FileText size={15} />,
    desc: 'حقول إدخال بيانات جديدة أو نماذج تسجيل فواتير وسندات',
  },
  filter_bar: {
    label: 'شريط تصفية وبحث',
    icon: <Filter size={15} />,
    desc: 'أزرار تصفية زمنية أو تصنيفية للتحكم في معطيات الصفحة',
  },
  action_grid: {
    label: 'لوحة تفاعلية وكانبان',
    icon: <Grid size={15} />,
    desc: 'مساحة عمل لإدارة المراحل والبطاقات التفاعلية وسير العمل',
  },
  banner_note: {
    label: 'شريط تنبيهات وإشعارات',
    icon: <Info size={15} />,
    desc: 'لوحة إشعار أو تنبيه بارز بالتعليمات والتوجيهات',
  },
  checklist: {
    label: 'قائمة مهام ومتابعة',
    icon: <CheckCircle2 size={15} />,
    desc: 'قوائم تدقيق المهام وإجراءات الفحص والتركيب',
  },
  custom_widget: {
    label: 'أداة وظيفية مخصصة',
    icon: <Sparkles size={15} />,
    desc: 'أداة تنفيذية كالحاسبات التلقائية أو محولات القياسات والوحدات',
  },
};

const WIDTH_LABELS: Record<NonNullable<PageComponentConfig['width']>, string> = {
  full: 'عرض كامل (100%)',
  half: 'نصف العرض (50%)',
  third: 'ثلث العرض (33%)',
  two_thirds: 'ثلثين (66%)',
};

export default function PageManagerTab() {
  const navigate = useNavigate();
  const { 
    pagesConfig, 
    addPage, 
    updatePage, 
    deletePage, 
    reorderPages, 
    addPageComponent, 
    updatePageComponent, 
    deletePageComponent, 
    reorderPageComponents, 
    resetPagesConfig 
  } = useAppContext();

  // Active selected page for inspecting components
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  // Modals state
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageConfig | null>(null);
  
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<{ pageId: string; comp: PageComponentConfig } | null>(null);

  // New Page Form State
  const [newPageName, setNewPageName] = useState('');
  const [newPageIcon, setNewPageIcon] = useState('LayoutDashboard');
  const [newPageDesc, setNewPageDesc] = useState('');
  const [newPageTemplate, setNewPageTemplate] = useState<'blank' | 'dashboard' | 'table' | 'form'>('dashboard');

  // New Component Form State
  const [newCompTitle, setNewCompTitle] = useState('');
  const [newCompType, setNewCompType] = useState<PageComponentType>('metric_card');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompWidth, setNewCompWidth] = useState<PageComponentConfig['width']>('full');

  // Notification / Feedback State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
  };

  const selectedPage = pagesConfig.find(p => p.id === selectedPageId) || null;

  // Sorting pages by order
  const sortedPages = [...pagesConfig].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Handler: Move Page Up / Down
  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedPages.length) return;

    const newPagesList = [...sortedPages];
    const [moved] = newPagesList.splice(index, 1);
    newPagesList.splice(targetIndex, 0, moved);

    reorderPages(newPagesList.map(p => p.id));
    showFeedback('تم تحديث ترتيب الصفحات بنجاح');
  };

  // Handler: Create Page
  const handleCreatePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;

    let initialComponents: PageComponentConfig[] = [];
    if (newPageTemplate === 'dashboard') {
      initialComponents = [
        {
          id: 'comp_' + Math.random().toString(36).substring(2, 8),
          title: 'مؤشر العمليات النشطة',
          type: 'metric_card',
          description: 'إحصائية فورية بالعمليات المسجلة',
          visible: true,
          order: 1,
          width: 'half',
        },
        {
          id: 'comp_' + Math.random().toString(36).substring(2, 8),
          title: 'إجمالي المبالغ والتحصيلات',
          type: 'metric_card',
          description: 'القيمة المالية المحصلة خلال الفترة',
          visible: true,
          order: 2,
          width: 'half',
        },
        {
          id: 'comp_' + Math.random().toString(36).substring(2, 8),
          title: 'جدول تفصيلي للبيانات',
          type: 'table',
          description: 'عرض السجلات والبيانات',
          visible: true,
          order: 3,
          width: 'full',
        },
      ];
    } else if (newPageTemplate === 'table') {
      initialComponents = [
        {
          id: 'comp_' + Math.random().toString(36).substring(2, 8),
          title: 'جدول العمليات والبيانات',
          type: 'table',
          description: 'جدول تفصيلي للعمليات والبيانات',
          visible: true,
          order: 1,
          width: 'full',
        },
      ];
    } else if (newPageTemplate === 'form') {
      initialComponents = [
        {
          id: 'comp_' + Math.random().toString(36).substring(2, 8),
          title: 'نموذج تسجيل بيانات جديدة',
          type: 'form_field',
          description: 'حقول إدخال وحفظ المعاملات',
          visible: true,
          order: 1,
          width: 'full',
        },
      ];
    }

    addPage({
      name: newPageName.trim(),
      icon: newPageIcon,
      description: newPageDesc.trim() || 'صفحة مخصصة في المنظومة',
      visible: true,
      components: initialComponents,
    });

    setIsAddPageModalOpen(false);
    setNewPageName('');
    setNewPageDesc('');
    showFeedback(`تمت إضافة صفحة "${newPageName.trim()}" بنجاح وربطها بالقائمة الجانبية`);
  };

  // Handler: Save Edited Page
  const handleSaveEditedPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;

    updatePage(editingPage.id, {
      name: editingPage.name.trim(),
      icon: editingPage.icon,
      description: editingPage.description,
    });

    setEditingPage(null);
    showFeedback('تم حفظ تعديلات الصفحة بنجاح');
  };

  // Handler: Delete Page
  const handleDeletePage = (page: PageConfig) => {
    if (page.id === 'dashboard') {
      alert('لا يمكن حذف الصفحة الرئيسية للمنظومة.');
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف صفحة "${page.name}" بالكامل من النظام؟`)) {
      deletePage(page.id);
      if (selectedPageId === page.id) {
        setSelectedPageId(null);
      }
      showFeedback(`تم حذف صفحة "${page.name}"`);
    }
  };

  // Handler: Move Component Up / Down
  const handleMoveComponent = (pageId: string, compIndex: number, direction: 'up' | 'down') => {
    if (!selectedPage || !selectedPage.components) return;
    const comps = [...selectedPage.components].sort((a, b) => (a.order || 0) - (b.order || 0));
    const targetIndex = direction === 'up' ? compIndex - 1 : compIndex + 1;
    if (targetIndex < 0 || targetIndex >= comps.length) return;

    const [moved] = comps.splice(compIndex, 1);
    comps.splice(targetIndex, 0, moved);

    reorderPageComponents(pageId, comps.map(c => c.id));
    showFeedback('تم تحديث ترتيب المكون');
  };

  // Handler: Add Component Submit
  const handleAddComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPageId || !newCompTitle.trim()) return;

    addPageComponent(selectedPageId, {
      title: newCompTitle.trim(),
      type: newCompType,
      description: newCompDesc.trim() || 'مكون مخصص داخل الصفحة',
      width: newCompWidth || 'full',
      visible: true,
    });

    setIsAddComponentModalOpen(false);
    setNewCompTitle('');
    setNewCompDesc('');
    showFeedback(`تمت إضافة المكون "${newCompTitle.trim()}" إلى الصفحة`);
  };

  // Handler: Save Edited Component
  const handleSaveEditedComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent) return;

    updatePageComponent(editingComponent.pageId, editingComponent.comp.id, {
      title: editingComponent.comp.title.trim(),
      description: editingComponent.comp.description,
      type: editingComponent.comp.type,
      width: editingComponent.comp.width,
    });

    setEditingComponent(null);
    showFeedback('تم حفظ تعديلات المكون');
  };

  // Handler: Delete Component
  const handleDeleteComponent = (pageId: string, comp: PageComponentConfig) => {
    if (window.confirm(`هل أنت متأكد من حذف مكون "${comp.title}"؟`)) {
      deletePageComponent(pageId, comp.id);
      showFeedback(`تم حذف المكون "${comp.title}"`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Header / Control Center Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <FolderTree size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">محرك التحكم المركزي بالصفحات والقوالب</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                تحكم مطلق في هيكل المنظومة: إضافة وحذف وإعادة تسمية الصفحات، وإدارة المكونات والقوالب الداخلية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('هل ترغب حقاً في استعادة التنسيق والهيكل الافتراضي لكافة صفحات وقوالب المنظومة؟')) {
                resetPagesConfig();
                showFeedback('تمت استعادة الهيكل الافتراضي لجميع الصفحات');
              }
            }}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <RotateCcw size={14} />
            <span>استعادة الهيكل الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddPageModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus size={15} />
            <span>إضافة صفحة جديدة</span>
          </button>
        </div>
      </div>

      {/* Two-Column Layout / Component Inspector Mode */}
      {selectedPage ? (
        /* Component-Level View for Selected Page */
        <div className="space-y-4">
          {/* Breadcrumb / Back Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedPageId(null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft size={15} className="rotate-180" />
                <span>العودة لقائمة الصفحات</span>
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <DynamicIcon name={selectedPage.icon} size={15} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{selectedPage.name}</h4>
                  <span className="text-[11px] text-slate-600">{selectedPage.path}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate(selectedPage.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                <ExternalLink size={13} />
                <span>معاينة الصفحة الحية</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddComponentModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <Plus size={14} />
                <span>إضافة مكون جديد</span>
              </button>
            </div>
          </div>

          {/* Nested Cards: List of Components */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                مكونات وقوالب الصفحة ({selectedPage.components?.length || 0})
              </h5>
              <span className="text-[11px] text-slate-600">
                يمكنك إعادة ترتيب المكونات بتحريكها للأعلى أو للأسفل وحذفها أو تعديلها
              </span>
            </div>

            {(!selectedPage.components || selectedPage.components.length === 0) ? (
              <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                  <Sliders size={22} />
                </div>
                <h6 className="text-sm font-bold text-slate-800">لا توجد مكونات بعد في هذه الصفحة</h6>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  أضف بطاقات إحصائية، جداول بيانات، نماذج، أو رسوم بيانية لبناء هذه الصفحة بشكل مخصص.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddComponentModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  <Plus size={14} />
                  <span>إضافة المكون الأول</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedPage.components
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((comp, compIdx) => {
                    const typeInfo = COMPONENT_TYPE_LABELS[comp.type] || COMPONENT_TYPE_LABELS.metric_card;
                    return (
                      <div
                        key={comp.id}
                        className={`bg-white p-4 rounded-xl border transition-all duration-150 ${
                          comp.visible === false 
                            ? 'border-slate-200 opacity-60 bg-slate-50/50' 
                            : 'border-slate-200 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0 mt-0.5 sm:mt-0">
                              {typeInfo.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h6 className="text-sm font-black text-slate-900">{comp.title}</h6>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  {typeInfo.label}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  {WIDTH_LABELS[comp.width || 'full']}
                                </span>
                                {comp.visible === false && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    مخفي
                                  </span>
                                )}
                              </div>
                              {comp.description && (
                                <p className="text-xs text-slate-600 mt-1">{comp.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {/* Reorder Up */}
                            <button
                              type="button"
                              disabled={compIdx === 0}
                              onClick={() => handleMoveComponent(selectedPage.id, compIdx, 'up')}
                              className={`p-1.5 rounded-lg border text-xs ${
                                compIdx === 0 
                                  ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                                  : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="تحريك للأعلى"
                            >
                              <ArrowUp size={14} />
                            </button>

                            {/* Reorder Down */}
                            <button
                              type="button"
                              disabled={compIdx === (selectedPage.components?.length || 0) - 1}
                              onClick={() => handleMoveComponent(selectedPage.id, compIdx, 'down')}
                              className={`p-1.5 rounded-lg border text-xs ${
                                compIdx === (selectedPage.components?.length || 0) - 1 
                                  ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                                  : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title="تحريك للأسفل"
                            >
                              <ArrowDown size={14} />
                            </button>

                            {/* Visibility Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                updatePageComponent(selectedPage.id, comp.id, {
                                  visible: comp.visible === false ? true : false,
                                });
                                showFeedback(comp.visible === false ? `تم إظهار مكون "${comp.title}"` : `تم إخفاء مكون "${comp.title}"`);
                              }}
                              className={`p-1.5 rounded-lg border text-xs ${
                                comp.visible === false
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={comp.visible === false ? 'إظهار المكون' : 'إخفاء المكون'}
                            >
                              {comp.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>

                            {/* Edit Component */}
                            <button
                              type="button"
                              onClick={() => setEditingComponent({ pageId: selectedPage.id, comp: { ...comp } })}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs"
                              title="تعديل المكون"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete Component */}
                            <button
                              type="button"
                              onClick={() => handleDeleteComponent(selectedPage.id, comp)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs"
                              title="حذف المكون"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Page-Level View (List of All System Pages) */
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              قائمة صفحات المنظومة ({sortedPages.length})
            </h5>
            <span className="text-[11px] text-slate-600">
              انقر على اسم أي صفحة للتحكم في مكوناتها وقوالبها الداخلية
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedPages.map((page, pageIdx) => {
              const compCount = page.components?.length || 0;
              const isFirstDashboard = page.id === 'dashboard';

              return (
                <div
                  key={page.id}
                  className={`bg-white p-4 rounded-xl border transition-all duration-150 ${
                    page.visible === false 
                      ? 'border-slate-200 opacity-60 bg-slate-50/50' 
                      : 'border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left details / Clickable page title */}
                    <div 
                      onClick={() => setSelectedPageId(page.id)}
                      className="flex items-start md:items-center gap-3 cursor-pointer group flex-1"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <DynamicIcon name={page.icon} size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {page.name}
                          </h4>
                          {isFirstDashboard && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              الصفحة الرئيسية
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {compCount} مكونات
                          </span>
                          <span className="text-[10px] font-mono text-slate-600">
                            {page.path}
                          </span>
                          {page.visible === false && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              مخفية من القائمة الجانبية
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                          {page.description || 'صفحة ضمن النظام'}
                        </p>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-1.5 self-end md:self-center">
                      {/* Manage components button */}
                      <button
                        type="button"
                        onClick={() => setSelectedPageId(page.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <Sliders size={13} />
                        <span>إدارة القوالب</span>
                      </button>

                      {/* Move Page Up */}
                      <button
                        type="button"
                        disabled={pageIdx === 0}
                        onClick={() => handleMovePage(pageIdx, 'up')}
                        className={`p-1.5 rounded-lg border text-xs ${
                          pageIdx === 0 
                            ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="تحريك للأعلى في القائمة الجانبية"
                      >
                        <ArrowUp size={14} />
                      </button>

                      {/* Move Page Down */}
                      <button
                        type="button"
                        disabled={pageIdx === sortedPages.length - 1}
                        onClick={() => handleMovePage(pageIdx, 'down')}
                        className={`p-1.5 rounded-lg border text-xs ${
                          pageIdx === sortedPages.length - 1 
                            ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="تحريك للأسفل في القائمة الجانبية"
                      >
                        <ArrowDown size={14} />
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          updatePage(page.id, {
                            visible: page.visible === false ? true : false,
                          });
                          showFeedback(page.visible === false ? `تم إظهار صفحة "${page.name}" في القائمة` : `تم إخفاء صفحة "${page.name}" من القائمة`);
                        }}
                        className={`p-1.5 rounded-lg border text-xs ${
                          page.visible === false
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={page.visible === false ? 'إظهار الصفحة في القائمة' : 'إخفاء الصفحة'}
                      >
                        {page.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>

                      {/* Edit Page Info */}
                      <button
                        type="button"
                        onClick={() => setEditingPage({ ...page })}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs"
                        title="تعديل اسم وبيانات الصفحة"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Delete Page */}
                      {!isFirstDashboard && (
                        <button
                          type="button"
                          onClick={() => handleDeletePage(page)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs"
                          title="حذف الصفحة بالكامل"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Add New Page */}
      {isAddPageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">إضافة صفحة جديدة للمنظومة</h4>
                  <p className="text-[11px] text-slate-600">ستضاف الصفحة فوراً إلى القائمة الجانبية ومسارات التطبيق</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePageSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  اسم الصفحة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder="مثال: متابعة التركيبات، قسم التصميم، إدارة العقود"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الأيقونة
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {availableIconsList.map(iconItem => (
                    <button
                      key={iconItem.key}
                      type="button"
                      onClick={() => setNewPageIcon(iconItem.key)}
                      className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all ${
                        newPageIcon === iconItem.key 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <DynamicIcon name={iconItem.key} size={18} />
                      <span className="text-[9px] truncate w-full text-center">{iconItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  وصف مختصر
                </label>
                <input
                  type="text"
                  value={newPageDesc}
                  onChange={(e) => setNewPageDesc(e.target.value)}
                  placeholder="بيان مختصر لمهام ووظائف هذه الصفحة"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  القالب الأولي المبدئي
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPageTemplate('dashboard')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      newPageTemplate === 'dashboard' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">لوحة إحصائيات ومؤشرات</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">بطاقات رقمية وجدول عمليات</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPageTemplate('table')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      newPageTemplate === 'table' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">جدول بيانات كامل</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">سجل بيانات مع تصفية</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPageTemplate('form')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      newPageTemplate === 'form' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">نموذج تسجيل عمليات</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">حقول إدخال وحفظ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPageTemplate('blank')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      newPageTemplate === 'blank' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">صفحة فارغة مخصصة</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">إضافة المكونات يدوياً</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  حفظ وإنشاء الصفحة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Page */}
      {editingPage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">تعديل بيانات الصفحة</h4>
                  <p className="text-[11px] text-slate-600">تحديث الاسم والأيقونة والوصف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPage} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  اسم الصفحة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingPage.name}
                  onChange={(e) => setEditingPage({ ...editingPage, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الأيقونة
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {availableIconsList.map(iconItem => (
                    <button
                      key={iconItem.key}
                      type="button"
                      onClick={() => setEditingPage({ ...editingPage, icon: iconItem.key })}
                      className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all ${
                        editingPage.icon === iconItem.key 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <DynamicIcon name={iconItem.key} size={18} />
                      <span className="text-[9px] truncate w-full text-center">{iconItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الوصف
                </label>
                <input
                  type="text"
                  value={editingPage.description || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Component to Selected Page */}
      {isAddComponentModalOpen && selectedPage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">إضافة مكون جديد إلى "{selectedPage.name}"</h4>
                  <p className="text-[11px] text-slate-600">اختر نوع المكون وحدد مواصفاته وعرضه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddComponentModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddComponentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عنوان المكون <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCompTitle}
                  onChange={(e) => setNewCompTitle(e.target.value)}
                  placeholder="مثال: إجمالي التركيبات، كشف الفواتير الآجلة، حاسبة المساحات"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  نوع المكون
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {(Object.keys(COMPONENT_TYPE_LABELS) as PageComponentType[]).map((typeKey) => {
                    const info = COMPONENT_TYPE_LABELS[typeKey];
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setNewCompType(typeKey)}
                        className={`p-3 rounded-xl border text-right transition-all ${
                          newCompType === typeKey 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          {info.icon}
                          <span>{info.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1 line-clamp-2">
                          {info.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عرض المكون بالصفحة
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(WIDTH_LABELS) as (keyof typeof WIDTH_LABELS)[]).map((wKey) => (
                    <button
                      key={wKey}
                      type="button"
                      onClick={() => setNewCompWidth(wKey)}
                      className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                        newCompWidth === wKey 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {wKey === 'full' && '100% (كامل)'}
                      {wKey === 'half' && '50% (نصف)'}
                      {wKey === 'third' && '33% (ثلث)'}
                      {wKey === 'two_thirds' && '66% (ثلثين)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  وصف توضيحي للمكون
                </label>
                <input
                  type="text"
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value)}
                  placeholder="وصف لوظيفة المكون والبيانات المعروضة فيه"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddComponentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  إضافة المكون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Component */}
      {editingComponent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">تعديل المكون</h4>
                  <p className="text-[11px] text-slate-600">تعديل العنوان والنوع والعرض والوصف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingComponent(null)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedComponent} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عنوان المكون <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingComponent.comp.title}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    comp: { ...editingComponent.comp, title: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  نوع المكون
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {(Object.keys(COMPONENT_TYPE_LABELS) as PageComponentType[]).map((typeKey) => {
                    const info = COMPONENT_TYPE_LABELS[typeKey];
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setEditingComponent({
                          ...editingComponent,
                          comp: { ...editingComponent.comp, type: typeKey }
                        })}
                        className={`p-2.5 rounded-xl border text-right transition-all ${
                          editingComponent.comp.type === typeKey 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          {info.icon}
                          <span>{info.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عرض المكون
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(WIDTH_LABELS) as (keyof typeof WIDTH_LABELS)[]).map((wKey) => (
                    <button
                      key={wKey}
                      type="button"
                      onClick={() => setEditingComponent({
                        ...editingComponent,
                        comp: { ...editingComponent.comp, width: wKey }
                      })}
                      className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                        editingComponent.comp.width === wKey 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {wKey === 'full' && '100%'}
                      {wKey === 'half' && '50%'}
                      {wKey === 'third' && '33%'}
                      {wKey === 'two_thirds' && '66%'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الوصف
                </label>
                <input
                  type="text"
                  value={editingComponent.comp.description || ''}
                  onChange={(e) => setEditingComponent({
                    ...editingComponent,
                    comp: { ...editingComponent.comp, description: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingComponent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
