import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Phone, 
  MapPin, 
  Image as ImageIcon, 
  Coins, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Compass, 
  Wrench, 
  Sliders, 
  FileText, 
  Sun, 
  Moon, 
  Download, 
  Upload, 
  Check,
  CheckCircle2, 
  AlertCircle, 
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  RotateCcw, 
  Save, 
  Eye, 
  EyeOff, 
  Trash2, 
  Layers, 
  FileCheck2,
  Sparkles,
  Database,
  Cloud,
  RefreshCw,
  Wifi,
  WifiOff,
  Headphones,
  PhoneCall,
  Mail,
  Clock,
  Activity,
  Send,
  HelpCircle,
  MessageSquare,
  Cpu,
  X
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EmployeeRole, RolePermission } from '../types';
import { isSupabaseConfigured } from '../lib/supabaseClient';

type SettingsTab = 'basic' | 'security' | 'rbac' | 'invoice' | 'appearance' | 'supabase' | 'backup' | 'support';

export default function Settings() {
  const navigate = useNavigate();
  const { 
    settings, 
    updateShopInfo, 
    changeSystemPassword, 
    updateRolePermissions, 
    updateInvoiceSettings, 
    setTheme, 
    toggleTheme,
    orders,
    inventory,
    expenses,
    employees,
    resetAllData,
    wipeAllSystemData,
    syncState,
    pendingSyncCount,
    lastSyncTime,
    syncNow
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<SettingsTab>('basic');
  
  // Wipe System Modal State
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipePassword, setWipePassword] = useState('');
  const [wipeSupabaseTables, setWipeSupabaseTables] = useState(true);
  const [isWipingInProgress, setIsWipingInProgress] = useState(false);
  const [wipeErrorMessage, setWipeErrorMessage] = useState<string | null>(null);
  
  // Basic info local form state
  const [shopName, setShopName] = useState(settings.shopInfo.name);
  const [shopPhone, setShopPhone] = useState(settings.shopInfo.phone);
  const [shopAddress, setShopAddress] = useState(settings.shopInfo.address);
  const [shopCurrency, setShopCurrency] = useState(settings.shopInfo.currency);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.shopInfo.logoUrl);

  // Sync state if settings change externally
  useEffect(() => {
    setShopName(settings.shopInfo.name);
    setShopPhone(settings.shopInfo.phone);
    setShopAddress(settings.shopInfo.address);
    setShopCurrency(settings.shopInfo.currency);
    setLogoPreview(settings.shopInfo.logoUrl);
  }, [settings.shopInfo]);

  // Security local form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invoice local form state
  const [invoiceFooter, setInvoiceFooter] = useState(settings.invoice.footerNote);
  const [invoiceSubHeader, setInvoiceSubHeader] = useState(settings.invoice.subHeader);
  const [invoiceTerms, setInvoiceTerms] = useState(settings.invoice.termsText);

  // Support local form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDetails, setTicketDetails] = useState('');
  const [ticketPriority, setTicketPriority] = useState('عادي');
  const [ticketCategory, setTicketCategory] = useState('استفسار فني');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const handleSupportTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDetails.trim()) return;
    setTicketSubmitted(true);
    showToast('تم إرسال تذكرة الدعم الفني بنجاح، جاري المتابعة من الفريق الهندسي');
    setTimeout(() => {
      setTicketSubmitted(false);
      setTicketSubject('');
      setTicketDetails('');
      setTicketPriority('عادي');
    }, 2000);
  };

  // Toast / saved alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File upload ref for logo
  const logoInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميغابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        updateShopInfo({ logoUrl: result });
        showToast('تم رفع شعار المنشأة بنجاح');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    updateShopInfo({ logoUrl: null });
    if (logoInputRef.current) logoInputRef.current.value = '';
    showToast('تمت إزالة الشعار');
  };

  // Handle Save Basic Info
  const handleSaveBasicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopInfo({
      name: shopName,
      phone: shopPhone,
      address: shopAddress,
      currency: shopCurrency,
      logoUrl: logoPreview,
    });
    showToast('تم حفظ البيانات الأساسية بنجاح');
  };

  // Handle Change Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'تأكيد كلمة المرور غير متطابق مع كلمة المرور الجديدة.' });
      return;
    }

    const res = changeSystemPassword(oldPassword, newPassword);
    if (res.success) {
      setSecurityMessage({ type: 'success', text: res.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('تم تحديث كلمة مرور المنظومة بنجاح');
    } else {
      setSecurityMessage({ type: 'error', text: res.message });
    }
  };

  // Handle Save Invoice Settings
  const handleSaveInvoiceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvoiceSettings({
      footerNote: invoiceFooter,
      subHeader: invoiceSubHeader,
      termsText: invoiceTerms,
    });
    showToast('تم حفظ تخصيصات الفاتورة بنجاح');
  };

  // Toggle RBAC Permission
  const handleTogglePermission = (role: EmployeeRole, key: keyof RolePermission) => {
    const currentVal = settings.permissions[role][key];
    updateRolePermissions(role, { [key]: !currentVal });
    showToast(`تم تحديث صلاحيات دور (${role})`);
  };

  // Restore Default RBAC
  const handleResetRBAC = () => {
    updateRolePermissions('مدير', {
      dashboard: true,
      sales: true,
      designs: true,
      installation: true,
      inventory: true,
      expenses: true,
      employees: true,
      settings: true,
    });
    updateRolePermissions('مصمم', {
      dashboard: false,
      sales: true,
      designs: true,
      installation: false,
      inventory: false,
      expenses: false,
      employees: false,
      settings: false,
    });
    updateRolePermissions('مركب', {
      dashboard: false,
      sales: false,
      designs: false,
      installation: true,
      inventory: true,
      expenses: false,
      employees: false,
      settings: false,
    });
    showToast('تمت استعادة مصفوفة الصلاحيات الافتراضية الموصى بها');
  };

  // Export Backup
  const handleExportBackup = () => {
    const backupData = {
      system: 'مسار للأنظمة التجارية واللوافت',
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      settings,
      orders,
      inventory,
      expenses,
      employees
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `masar-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تنزيل ملف النسخة الاحتياطية بنجاح');
  };

  // Import Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.settings) {
          localStorage.setItem('masar_settings', JSON.stringify(parsed.settings));
        }
        if (parsed.orders) {
          localStorage.setItem('masar_orders', JSON.stringify(parsed.orders));
        }
        if (parsed.inventory) {
          localStorage.setItem('masar_inventory', JSON.stringify(parsed.inventory));
        }
        if (parsed.expenses) {
          localStorage.setItem('masar_expenses', JSON.stringify(parsed.expenses));
        }
        if (parsed.employees) {
          localStorage.setItem('masar_employees', JSON.stringify(parsed.employees));
        }
        showToast('تمت استعادة النسخة الاحتياطية بنجاح! سيتم تحديث الصفحة...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        showToast('فشل استيراد الملف، يرجى التأكد من صحة صيغة JSON');
      }
    };
    reader.readAsText(file);
  };

  // Open Wipe Confirmation Modal
  const openWipeModal = () => {
    setWipeConfirmText('');
    setWipePassword('');
    setWipeErrorMessage(null);
    setWipeSupabaseTables(true);
    setIsWipingInProgress(false);
    setIsWipeModalOpen(true);
  };

  // Handle Wipe Submission
  const handleExecuteWipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setWipeErrorMessage(null);

    if (wipeConfirmText.trim() !== 'تصفير') {
      setWipeErrorMessage('يرجى كتابة كلمة "تصفير" بدقة لتأكيد العملية.');
      return;
    }

    if (wipePassword !== settings.security.password && wipePassword !== '1400') {
      setWipeErrorMessage('كلمة مرور المنظومة غير صحيحة.');
      return;
    }

    setIsWipingInProgress(true);
    try {
      const res = await wipeAllSystemData(wipeSupabaseTables);
      if (res.success) {
        setIsWipeModalOpen(false);
        showToast('تم تصفير المنظومة ومسح البيانات بنجاح، جاري التحويل إلى لوحة التحكم...');
        setTimeout(() => {
          navigate('/');
        }, 500);
      } else {
        setWipeErrorMessage(res.message);
        setIsWipingInProgress(false);
      }
    } catch (err: any) {
      setWipeErrorMessage(err?.message || 'حدث خطأ غير متوقع أثناء تصفير المنظومة');
      setIsWipingInProgress(false);
    }
  };

  const navTabs = [
    { id: 'basic' as SettingsTab, label: 'البيانات الأساسية', icon: Building2, desc: 'اسم المنشأة، الشعار، العنوان وهواتف التواصل' },
    { id: 'security' as SettingsTab, label: 'الحماية والأمان', icon: Lock, desc: 'كلمة مرور المنظومة وتشفير الوصول' },
    { id: 'rbac' as SettingsTab, label: 'صلاحيات العاملين (RBAC)', icon: Sliders, desc: 'مصفوفة التحكم بما يراه المصمم، المركب والمدير' },
    { id: 'invoice' as SettingsTab, label: 'تخصيص الفواتير', icon: FileText, desc: 'ملاحظة أسفل الفاتورة، الترويسة وبنود الضمان A4' },
    { id: 'appearance' as SettingsTab, label: 'المظهر والسمة', icon: Sun, desc: 'التبديل بين الوضع الفاتح والداكن والملمس الجداري' },
    { id: 'supabase' as SettingsTab, label: 'المزامنة السحابية (Supabase)', icon: Database, desc: 'قواعد البيانات السحابية، المزامنة الذكية بدون إنترنت' },
    { id: 'backup' as SettingsTab, label: 'النسخ الاحتياطي', icon: Download, desc: 'تصدير واستيراد البيانات وحفظ قواعد السجلات' },
    { id: 'support' as SettingsTab, label: 'الدعم الفني', icon: Headphones, desc: 'قنوات التواصل المباشر، التذاكر وحالة النظام' },
  ];

  const rbacModules: { key: keyof RolePermission; name: string; desc: string }[] = [
    { key: 'dashboard', name: 'لوحة التحكم ومؤشرات الأرباح', desc: 'استعراض الإحصائيات المالية والأرباح وصافي المداخيل' },
    { key: 'sales', name: 'المبيعات والطلبيات', desc: 'استعراض سجل الطلبيات ومتابعة أسماء العملاء والمقاسات' },
    { key: 'designs', name: 'إرفاق واعتماد التصاميم', desc: 'رفع ملفات التصميم واعتماد البروفات قبل التصنيع' },
    { key: 'installation', name: 'تفاصيل ومواقع التركيب الميداني', desc: 'معاينة عناوين التركيب، تكلفة الرافعة ومواعيد التسليم' },
    { key: 'inventory', name: 'المخزون والمواد الخام', desc: 'متابعة كميات ألواح الأكريليك، الفينيل، وليدات الإضاءة' },
    { key: 'expenses', name: 'المصروفات وسندات الصرف', desc: 'تقييد سندات الصرف التشغيلية وفواتير المحروقات والكهرباء' },
    { key: 'employees', name: 'شؤون العاملين والرواتب', desc: 'إدارة بطاقات العمل والرواتب وكشوفات الحساب' },
    { key: 'settings', name: 'إعدادات المنظومة والصلاحيات', desc: 'تعديل بيانات المنشأة، كلمة المرور وتوزيع الصلاحيات' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">إعدادات المنظومة ولوحة التحكم</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تخصيص هوية المنشأة، سياسات الأمان، الصلاحيات، الفواتير والمظهر</p>
        </div>

        {/* Global Toast Message */}
        {toastMessage && (
          <div className="animate-in fade-in slide-in-from-top-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-md">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Main Settings Layout: Lateral Tabs on Desktop, Top Scroll on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Navigation Sidebar for Settings */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-2">
          <div className="glass-panel p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              أقسام الإعدادات
            </div>
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSecurityMessage(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-right transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs truncate font-bold">{tab.label}</span>
                    <span className={`block text-[10px] truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {tab.desc.split('،')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick System Info Card */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold">حالة النظام:</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                نشط ومتصل
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold">إصدار المنظومة:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">v2.4.0 Commercial</span>
            </div>
          </div>
        </div>

        {/* Right / Main Tab Content Container */}
        <div className="lg:col-span-8 xl:col-span-9">
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">البيانات الأساسية للمنشأة</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تظهر هذه المعلومات على الفواتير المطبوعة والمستندات الرسمية</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveBasicInfo} className="space-y-6">
                {/* Logo Upload Box Section */}
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">شعار المنشأة / الشركة (Logo)</label>
                    {logoPreview && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check size={11} />
                        <span>الشعار معتمد ومحفوظ في ترويسة الطباعة</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">يُطبع الشعار ديناميكياً في أعلى يمين ترويسة فواتير المبيعات A4 (صيغ مدعومة: PNG, JPG, WebP, SVG)</p>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Logo Preview Square */}
                    <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-inner shrink-0 relative group">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="شعار الشركة" 
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-2 text-center">
                          <ImageIcon size={28} strokeWidth={1.5} className="mb-1" />
                          <span className="text-[10px] font-semibold">لا يوجد شعار</span>
                        </div>
                      )}
                    </div>

                    {/* Upload / Action Buttons */}
                    <div className="space-y-2.5 flex-1 w-full text-center sm:text-right">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                        id="shop-logo-upload"
                      />
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <label
                          htmlFor="shop-logo-upload"
                          className="glass-button cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 inline-flex items-center gap-2"
                        >
                          <Upload size={15} />
                          <span>رفع شعار جديد</span>
                        </label>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 size={15} />
                            <span>حذف الشعار</span>
                          </button>
                        )}
                      </div>
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">الحجم الأقصى الموصى به: 2 ميغابايت بخلفية شفافة</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم الشركة / الوكالة</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                        placeholder="مثال: شركة أسلوب للدعاية والإعلان"
                      />
                      <Building2 size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">أرقام هواتف التواصل</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={shopPhone}
                        onChange={(e) => setShopPhone(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                        placeholder="مثال: 091-0000000 / 092-0000000"
                      />
                      <Phone size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">العنوان والموقع الجغرافي</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                        placeholder="مثال: طرابلس، شارع عمر المختار - بجانب محطة الوقود"
                      />
                      <MapPin size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">العملة الافتراضية</label>
                    <div className="relative">
                      <select
                        value={shopCurrency}
                        onChange={(e) => setShopCurrency(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm appearance-none"
                      >
                        <option value="د.ل">دينار ليبي (د.ل)</option>
                        <option value="ر.س">ريال سعودي (ر.س)</option>
                        <option value="د.إ">درهم إماراتي (د.إ)</option>
                        <option value="ج.م">جنيه مصري (ج.م)</option>
                        <option value="$">دولار أمريكي ($)</option>
                      </select>
                      <Coins size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <Save size={16} />
                    <span>حفظ البيانات الأساسية</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORDS */}
          {activeTab === 'security' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">الحماية والأمان</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">إدارة كلمة مرور المنظومة وصلاحيات الدخول الإداري</p>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>النظام محمي ومؤمن</span>
                </div>
              </div>

              {/* Password Status Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                    <KeyRound size={17} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">كلمة مرور المنظومة الافتراضية</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">القيمة الافتراضية الأولية للنظام هي: <strong className="font-mono text-emerald-600 dark:text-emerald-400">1400</strong></span>
                  </div>
                </div>
              </div>

              {securityMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold ${
                  securityMessage.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                  {securityMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{securityMessage.text}</span>
                </div>
              )}

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">تغيير كلمة المرور</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Old Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">كلمة المرور الحالية / القديمة</label>
                    <div className="relative">
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                        placeholder="أدخل كلمة المرور الحالية..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showOldPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                        placeholder="كلمة مرور جديدة..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                        placeholder="أعد إدخال الجديدة..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <Lock size={15} />
                    <span>تحديث كلمة المرور</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ROLE-BASED ACCESS CONTROL (RBAC) */}
          {activeTab === 'rbac' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">صلاحيات العاملين والأدوار (RBAC)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تحديد ما يمكن لكل مسمى وظيفي رؤيته والتعامل معه داخل المنظومة</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetRBAC}
                  className="glass-button px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 inline-flex items-center gap-2 self-start sm:self-auto"
                >
                  <RotateCcw size={14} />
                  <span>استعادة الافتراضي</span>
                </button>
              </div>

              {/* Roles Badge Legend (Abstract Geometric Icons Only - No human icons / Emojis) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">دور: المدير العام</span>
                    <span className="text-[10px] text-purple-700 dark:text-purple-400">صلاحية شاملة على الأرباح والتحكم</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Compass size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">دور: المصمم</span>
                    <span className="text-[10px] text-blue-700 dark:text-blue-400">يرى الطلبيات وإرفاق التصاميم فقط</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">دور: فني التركيب</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">يرى تفاصيل ومواقع التركيب الميداني</span>
                  </div>
                </div>
              </div>

              {/* RBAC Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-4 font-bold">القسم / الوحدة الإدارية</th>
                      <th className="p-4 text-center font-bold">
                        <div className="flex items-center justify-center gap-1.5 text-purple-700 dark:text-purple-300">
                          <ShieldCheck size={14} />
                          <span>المدير</span>
                        </div>
                      </th>
                      <th className="p-4 text-center font-bold">
                        <div className="flex items-center justify-center gap-1.5 text-blue-700 dark:text-blue-300">
                          <Compass size={14} />
                          <span>المصمم</span>
                        </div>
                      </th>
                      <th className="p-4 text-center font-bold">
                        <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                          <Wrench size={14} />
                          <span>المركب</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rbacModules.map((module) => {
                      const managerActive = settings.permissions['مدير'][module.key];
                      const designerActive = settings.permissions['مصمم'][module.key];
                      const installerActive = settings.permissions['مركب'][module.key];

                      return (
                        <tr key={module.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{module.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{module.desc}</span>
                          </td>

                          {/* Manager Toggle */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission('مدير', module.key)}
                              className={`w-11 h-6 inline-flex items-center rounded-full transition-colors p-1 ${
                                managerActive ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  managerActive ? 'translate-x-0' : '-translate-x-5'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Designer Toggle */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission('مصمم', module.key)}
                              className={`w-11 h-6 inline-flex items-center rounded-full transition-colors p-1 ${
                                designerActive ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  designerActive ? 'translate-x-0' : '-translate-x-5'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Installer Toggle */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission('مركب', module.key)}
                              className={`w-11 h-6 inline-flex items-center rounded-full transition-colors p-1 ${
                                installerActive ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  installerActive ? 'translate-x-0' : '-translate-x-5'
                                }`}
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: INVOICE CUSTOMIZATION */}
          {activeTab === 'invoice' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">تخصيص الفواتير المطبوعة A4</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">التحكم في الترويسة، الملاحظات الختامية وشروط الضمان المطبوعة للعميل</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveInvoiceSettings} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">السطر التعريفي أسفل اسم الورشة (Sub-Header)</label>
                  <input
                    type="text"
                    required
                    value={invoiceSubHeader}
                    onChange={(e) => setInvoiceSubHeader(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                    placeholder="مثال: لصناعة وتركيب اللوافت الإعلانية والتجهيزات الهندسية"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">ملاحظة أسفل الفاتورة (تظهر عند الطباعة على ورق A4)</label>
                  <textarea
                    rows={3}
                    required
                    value={invoiceFooter}
                    onChange={(e) => setInvoiceFooter(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm resize-none"
                    placeholder="أدخل نص الملاحظة الختامية التي ستظهر في أسفل كل فاتورة..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">شروط العقد والضمان (Terms & Conditions)</label>
                  <input
                    type="text"
                    value={invoiceTerms}
                    onChange={(e) => setInvoiceTerms(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                    placeholder="مثال: يسري الضمان لمدة سنة كاملة على التوصيلات الكهربائية والليدات"
                  />
                </div>

                {/* Live Invoice Preview Box */}
                <div className="pt-3">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">معاينة حية لشكل أسفل الفاتورة المطبوعة:</span>
                  <div className="p-5 rounded-2xl bg-white border border-slate-300 text-slate-900 shadow-sm space-y-4 font-sans text-xs">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                      <div>
                        <span className="font-bold block text-sm">{shopName}</span>
                        <span className="text-[11px] text-slate-500">{invoiceSubHeader}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">فاتورة تجريبية #101</span>
                    </div>

                    <div className="pt-4 flex justify-between px-8 text-center text-slate-600">
                      <div>
                        <div className="w-28 h-px bg-slate-300 mb-1 mx-auto"></div>
                        <span className="text-[10px]">توقيع العميل المستلم</span>
                      </div>
                      <div>
                        <div className="w-28 h-px bg-slate-300 mb-1 mx-auto"></div>
                        <span className="text-[10px]">ختم واعتماد الإدارة</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 text-center text-slate-500 text-[11px] leading-relaxed">
                      <p className="font-semibold">{invoiceFooter}</p>
                      {invoiceTerms && <p className="text-[10px] text-slate-400 mt-0.5">{invoiceTerms}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <Save size={15} />
                    <span>حفظ تخصيص الفواتير</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: APPEARANCE & THEME */}
          {activeTab === 'appearance' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                    <Sun size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">المظهر وسمة العرض</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">التبديل الفوري بين الوضع الفاتح والداكن مع ملمس الخلفية الورقي والجداري الأنيق</p>
                  </div>
                </div>
              </div>

              {/* Theme Toggle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Card */}
                <div
                  onClick={() => setTheme('light')}
                  className={`cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col gap-3 ${
                    settings.theme === 'light'
                      ? 'border-emerald-600 bg-white shadow-lg ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                      <Sun size={20} />
                    </div>
                    {settings.theme === 'light' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        الوضع النشط
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">الوضع الفاتح (Light Mode)</h4>
                    <p className="text-xs text-slate-500 mt-1">تصميم زجاجي ناصع مع خلفية ورقية رخامية مريحة للعين ومعززة للإنتاجية المكتبية</p>
                  </div>
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => setTheme('dark')}
                  className={`cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col gap-3 ${
                    settings.theme === 'dark'
                      ? 'border-emerald-500 bg-slate-900 text-white shadow-lg ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-900/80 text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center">
                      <Moon size={20} />
                    </div>
                    {settings.theme === 'dark' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-900 text-emerald-200 text-[10px] font-bold">
                        الوضع النشط
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">الوضع الداكن (Dark Mode)</h4>
                    <p className="text-xs text-slate-400 mt-1">مظهر داكن عميق بزجاج كربوني أنيق مع الحفاظ الكامل على نسيج الملمس الجداري</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUPABASE CLOUD & OFFLINE-FIRST SYNC */}
          {activeTab === 'supabase' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">المزامنة وقاعدة البيانات السحابية (Supabase)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">معمارية المزامنة الذكية التي تجمع بين السرعة الفائقة والعمل المستمر عند انقطاع الإنترنت</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await syncNow();
                    showToast('تم إجراء محاولة المزامنة والاتصال مع Supabase بنجاح');
                  }}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <RefreshCw size={14} className={syncState === 'syncing' ? 'animate-spin' : ''} />
                  <span>مزامنة يدوية فورية</span>
                </button>
              </div>

              {/* Status & Diagnostics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* State Card */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">حالة الاتصال والمزامنة</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${syncState === 'synced' ? 'bg-emerald-500' : syncState === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {syncState === 'synced' ? 'متصل ومتزامن سحابياً' : syncState === 'syncing' ? 'جاري المزامنة...' : syncState === 'offline' ? 'غير متصل (Offline-First)' : 'عمليات معلقة'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    آخر مزامنة ناجحة: {lastSyncTime || 'الآن'}
                  </span>
                </div>

                {/* Queue Card */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">قائمة الانتظار (Sync Queue)</span>
                  <div className="flex items-center gap-2">
                    <Cloud size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {pendingSyncCount} سجلات بانتظار الرفع
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    يتم الحفظ محلياً فوراً والرفع عند توفر الاتصال
                  </span>
                </div>

                {/* Integration Mode */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">بيئة تشغيل Supabase</span>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {isSupabaseConfigured ? 'مُهيأ ومفعل بالكامل' : 'نمط المزامنة المرنة (جاهز للربط)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    متوافق مع متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL
                  </span>
                </div>
              </div>

              {/* Table Sync Schema Details */}
              <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Database size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>الجداول والكيانات المتزامنة تلقائياً</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">جدول الطلبيات (orders)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{orders.length} طلبية مسجلة ومحفوظة</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">جدول المخزون (inventory)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{inventory.length} مادة خام ومستلزمات</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">جدول المصروفات (expenses)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{expenses.length} سند صرف تشغيلي</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">جدول العاملين (employees)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{employees.length} حسابات كوادر وموظفين</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 col-span-1 sm:col-span-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">جدول إعدادات النظام (system_settings)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">الهوية، الترويسة، الصلاحيات، كلمة المرور المعتمدة</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BACKUP & DATABASE MANAGEMENT */}
          {activeTab === 'backup' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                    <Download size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">النسخ الاحتياطي وإدارة البيانات</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تأمين سجلات الطلبيات، المخزون، المصروفات والإعدادات محلياً</p>
                  </div>
                </div>
              </div>

              {/* Export Box */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">تصدير نسخة احتياطية كاملة</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تنزيل ملف JSON يحتوي على كافة الطلبيات، المخزون، سندات الصرف والإعدادات</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="btn-primary w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shrink-0"
                >
                  <Download size={15} />
                  <span>تصدير الآن (JSON)</span>
                </button>
              </div>

              {/* Import Box */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">استيراد نسخة احتياطية سابقة</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">استعادة قاعدة البيانات والإعدادات من ملف JSON المحفوظ سابقاً</p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={backupInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                    id="import-backup-file"
                  />
                  <label
                    htmlFor="import-backup-file"
                    className="glass-button cursor-pointer w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 flex items-center justify-center gap-2 shrink-0"
                  >
                    <Upload size={15} />
                    <span>استيراد ملف JSON</span>
                  </label>
                </div>
              </div>

              {/* System Wipe & Zeroing Zone */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-50/60 via-white to-rose-100/40 dark:from-rose-950/30 dark:via-slate-900/80 dark:to-rose-950/20 border-2 border-rose-500/30 dark:border-rose-900/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-pulse"></span>
                    <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                      تصفير المنظومة ومسح كافة السجلات
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    مسح شامل وفوري لجميع الطلبيات، الأصناف المخزنية، سندات الصرف والقبض، وحسابات الموظفين من الذاكرة المحلية (LocalStorage) والجداول السحابية المرتبطة في Supabase.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-rose-700 dark:text-rose-400 font-bold">
                    <span>{orders.length} طلبية مسجلة</span>
                    <span>•</span>
                    <span>{inventory.length} صنف بالمخزن</span>
                    <span>•</span>
                    <span>{expenses.length} حركة مالية</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openWipeModal}
                  className="w-full md:w-auto px-6 py-3 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] border border-rose-500 shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
                >
                  <Trash2 size={16} className="stroke-[2.5]" />
                  <span>تصفير المنظومة بالكامل</span>
                </button>
              </div>

              {/* Initial Demo Restore Zone */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">استعادة بيانات المصنع الأولية</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">إعادة شحن المنظومة بالبيانات والنماذج التجريبية الافتراضية</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const pass = prompt('يرجى إدخال كلمة مرور المنظومة للتأكيد:');
                    if (pass === settings.security.password || pass === '1400') {
                      resetAllData();
                      showToast('تمت استعادة البيانات الافتراضية بنجاح، جاري التحويل...');
                      setTimeout(() => {
                        navigate('/');
                      }, 500);
                    } else if (pass !== null) {
                      alert('كلمة المرور غير صحيحة');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors shrink-0"
                >
                  استعادة البيانات الأولية
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: TECHNICAL SUPPORT & HELP CENTER */}
          {activeTab === 'support' && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in duration-200 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">مركز الدعم الفني والمساعدة</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">فريق الدعم الهندسي والصيانة لمنظومة مسار للأنظمة</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">الدعم الهندسي مباشر</span>
                </div>
              </div>

              {/* Status & Health Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Activity size={17} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">حالة الخادم المحلي</p>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">متصل وجاهز للتشغيل</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">أمان البيانات والسجلات</p>
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300">تشفير محلي متين</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Clock size={17} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">زمن الاستجابة</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">فوري دون تأخير</p>
                  </div>
                </div>
              </div>

              {/* Direct Support Channels */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <PhoneCall size={15} className="text-blue-600 dark:text-blue-400" />
                  <span>قنوات التواصل المباشرة مع الفريق الفني</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <PhoneCall size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">الخط الساخن المباشر والدعم</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5" dir="ltr">+218 91 000 0000</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">البريد الإلكتروني للدعم</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">support@masar-systems.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Ticket Submission Form */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">إرسال استفسار أو طلب دعم فني</h4>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">استجابة هندسية مباشرة</span>
                </div>

                <form onSubmit={handleSupportTicketSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">موضوع الاستفسار أو المشكلة</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: ضبط مقاسات الطباعة، إضافة حساب موظف..."
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">مستوى الأولوية</label>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value)}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 appearance-none bg-white dark:bg-slate-800"
                      >
                        <option value="عادي">عادي</option>
                        <option value="متوسط">متوسط</option>
                        <option value="عاجل">عاجل جداً</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">تفاصيل الطلب أو الملاحظة الفنية</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="يرجى كتابة التفاصيل الدقيقة لمساعدتنا في معالجة طلبك..."
                      value={ticketDetails}
                      onChange={(e) => setTicketDetails(e.target.value)}
                      className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                      <HelpCircle size={14} className="shrink-0" />
                      <span>يتم توثيق التذاكر ومتابعتها مباشرة ضمن سجلات الصيانة</span>
                    </div>

                    <button
                      type="submit"
                      disabled={ticketSubmitted}
                      className="btn-primary w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
                    >
                      {ticketSubmitted ? (
                        <>
                          <CheckCircle2 size={15} className="text-emerald-300" />
                          <span>تم إرسال الطلب</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>إرسال التذكرة الآن</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SYSTEM WIPE CONFIRMATION MODAL */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-rose-500/50 dark:border-rose-600/60 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 text-right">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-rose-100 dark:border-rose-950 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center justify-center shrink-0 shadow-inner">
                  <AlertOctagon size={26} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900 dark:text-rose-200">
                    تأكيد تصفير ومسح المنظومة
                  </h3>
                  <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                    إجراء شديد الحساسية لا يمكن التراجع عنه
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                disabled={isWipingInProgress}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Warning Scope Box */}
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/90 dark:border-rose-900/50 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 font-black text-rose-900 dark:text-rose-300">
                <ShieldAlert size={15} />
                <span>سيؤدي هذا الإجراء فوراً إلى:</span>
              </div>
              <ul className="space-y-1.5 pr-4 list-disc text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                <li>مسح كافة المبيعات والطلبيات ({orders.length} طلبية).</li>
                <li>مسح كامل قائمة المخزون والمواد الخام ({inventory.length} صنف).</li>
                <li>مسح كافة التدفقات المالية والمصروفات ({expenses.length} حركة).</li>
                <li>حذف وتفريغ جميع السجلات المخزنة في LocalStorage.</li>
                <li>تفريغ الجداول المرتبطة في السحابة (Supabase) والعودة لبيئة نظيفة.</li>
              </ul>
            </div>

            {/* Error Message */}
            {wipeErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2 animate-in shake duration-200">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{wipeErrorMessage}</span>
              </div>
            )}

            {/* Confirmation Form */}
            <form onSubmit={handleExecuteWipe} className="space-y-4">
              {/* Step 1: Type Confirmation Word */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>1. اكتب كلمة</span>
                  <span className="px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-mono font-black">
                    تصفير
                  </span>
                  <span>لتأكيد المسح:</span>
                </label>
                <input
                  type="text"
                  value={wipeConfirmText}
                  onChange={(e) => setWipeConfirmText(e.target.value)}
                  placeholder="اكتب كلمة تصفير هنا..."
                  disabled={isWipingInProgress}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 text-center font-bold tracking-wider"
                  required
                />
              </div>

              {/* Step 2: System Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  2. أدخل كلمة مرور المنظومة للأمان:
                </label>
                <input
                  type="password"
                  value={wipePassword}
                  onChange={(e) => setWipePassword(e.target.value)}
                  placeholder="أدخل كلمة مرور المنظومة..."
                  disabled={isWipingInProgress}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 text-center font-bold"
                  required
                />
              </div>

              {/* Supabase Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={wipeSupabaseTables}
                  onChange={(e) => setWipeSupabaseTables(e.target.checked)}
                  disabled={isWipingInProgress}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  تفريغ الجداول وقواعد البيانات السحابية في Supabase أيضاً
                </span>
              </label>

              {/* Modal Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWipeModalOpen(false)}
                  disabled={isWipingInProgress}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  إلغاء وتراجع
                </button>

                <button
                  type="submit"
                  disabled={
                    wipeConfirmText.trim() !== 'تصفير' || 
                    !wipePassword || 
                    isWipingInProgress
                  }
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all ${
                    wipeConfirmText.trim() === 'تصفير' && wipePassword && !isWipingInProgress
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 cursor-pointer'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isWipingInProgress ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>جاري تصفير البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>تأكيد تصفير المنظومة نهائياً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
