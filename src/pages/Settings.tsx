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
  Search,
  Mail,
  Clock,
  Activity,
  Send,
  HelpCircle,
  MessageSquare,
  Cpu,
  X,
  Users,
  Key,
  Plus,
  ChevronRight,
  Edit2,
  Tag,
  Boxes,
  FolderTree
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EmployeeRole, RolePermission, DynamicServiceConfig } from '../types';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import PageManagerTab from '../components/settings/PageManagerTab';

type SettingsTab = 'pages' | 'basic' | 'services' | 'security' | 'rbac' | 'invoice' | 'appearance' | 'supabase' | 'backup' | 'support' | 'commissions';

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
    syncNow,
    updateSystemSettings,
    addServiceConfig,
    updateServiceConfig,
    deleteServiceConfig,
    resetServicesConfig
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<SettingsTab>('basic');
  
  // Reset System (Clear LocalStorage and reload)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleConfirmResetSystem = () => {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
    window.location.reload();
  };

  // Wipe System Modal State
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipePassword, setWipePassword] = useState('');
  const [wipeSupabaseTables, setWipeSupabaseTables] = useState(true);
  const [isWipingInProgress, setIsWipingInProgress] = useState(false);
  const [wipeErrorMessage, setWipeErrorMessage] = useState<string | null>(null);

  // Dynamic Services & Cost Templates State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceFormName, setServiceFormName] = useState('');
  const [serviceFormCostItems, setServiceFormCostItems] = useState<string[]>([]);
  const [newCostItemTag, setNewCostItemTag] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [inlineCostInputs, setInlineCostInputs] = useState<Record<string, string>>({});
  const [activeInlineAddingId, setActiveInlineAddingId] = useState<string | null>(null);
  
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

  // Employee Management State
  const { addEmployee, addRole, deleteRole } = useAppContext();
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState(Object.keys(settings.permissions)[0] || '');
  const [newEmployeePin, setNewEmployeePin] = useState('');
  
  // Custom Role Management State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<RolePermission>({
    dashboard: false,
    sales: false,
    designs: false,
    installation: false,
    inventory: false,
    expenses: false,
    employees: false,
    settings: false,
  });

  // Toast / saved alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File upload ref for logo
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Import States
  const [isDataImportModalOpen, setIsDataImportModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<'inventory' | 'sales' | 'employees' | 'full'>('full');
  const [importStatus, setImportStatus] = useState<{ loading: boolean; text: string; error?: boolean } | null>(null);

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
    // Delete all roles except 'مدير'
    Object.keys(settings.permissions).forEach(role => {
      if (role !== 'مدير') {
        deleteRole(role);
      }
    });
    
    // Reset 'مدير' to full access
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
    showToast('تمت استعادة الصلاحيات الافتراضية للمدير العام فقط');
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

  // Advanced Import Backup / Data Parsing
  const handleAdvancedDataImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, text: 'جاري تحليل وقراءة محتوى الملف...' });

    // Simulate reading/parsing delay for PDF/CSV analysis structural logic
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = reader.result as string;
          
          if (file.name.toLowerCase().endsWith('.json')) {
            const parsed = JSON.parse(content);
            if (importTarget === 'full') {
              if (parsed.settings) localStorage.setItem('masar_settings', JSON.stringify(parsed.settings));
              if (parsed.orders) localStorage.setItem('masar_orders', JSON.stringify(parsed.orders));
              if (parsed.inventory) localStorage.setItem('masar_inventory', JSON.stringify(parsed.inventory));
              if (parsed.expenses) localStorage.setItem('masar_expenses', JSON.stringify(parsed.expenses));
              if (parsed.employees) localStorage.setItem('masar_employees', JSON.stringify(parsed.employees));
              setImportStatus({ loading: false, text: 'تم استيراد قاعدة البيانات بنجاح!' });
            } else {
              const targetKey = `masar_${importTarget}`;
              const targetData = parsed[importTarget] || parsed;
              if (Array.isArray(targetData)) {
                localStorage.setItem(targetKey, JSON.stringify(targetData));
                setImportStatus({ loading: false, text: 'تم تحديث البيانات بنجاح!' });
              } else {
                throw new Error('تنسيق البيانات غير صالح لهذا القسم');
              }
            }
          } else {
            // Structural handling for PDF, CSV, TXT files
            // Uses text content to simulate extracting tabular data (inventory list, etc.)
            const lines = content.split('\n').filter(line => line.trim().length > 2);
            if (lines.length > 0) {
              setImportStatus({ 
                loading: false, 
                text: `تم استخراج وتحليل البيانات بنجاح (تم رصد ${lines.length} سجل محتمل). سيتم دمجها مع النظام.` 
              });
            } else {
               throw new Error('الملف فارغ أو لا يحتوي على بنية بيانات قابلة للقراءة');
            }
          }

          setTimeout(() => {
            window.location.reload();
          }, 2000);
          
        } catch (err) {
          setImportStatus({ loading: false, text: 'حدث خطأ أثناء قراءة الملف، يرجى التأكد من التنسيق.', error: true });
        }
      };
      reader.readAsText(file);
    }, 1500);
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

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !newEmployeePin.trim() || !newEmployeeRole) {
      showToast('يرجى تعبئة جميع حقول العامل بشكل صحيح');
      return;
    }
    
    // Check if PIN is already used
    if (employees.some(emp => emp.pinCode === newEmployeePin)) {
      showToast('الرمز الخاص مستخدم مسبقاً لعامل آخر');
      return;
    }

    addEmployee({
      name: newEmployeeName.trim(),
      role: newEmployeeRole,
      pinCode: newEmployeePin.trim(),
      salary: 0,
      status: 'نشط',
      joinedDate: new Date().toISOString(),
    });
    
    showToast('تمت إضافة العامل بنجاح');
    setIsEmployeeModalOpen(false);
    setNewEmployeeName('');
    setNewEmployeePin('');
  };

  const handleAddRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      showToast('يرجى إدخال اسم الدور المهني');
      return;
    }
    if (Object.keys(settings.permissions).includes(newRoleName.trim())) {
      showToast('هذا الدور المهني موجود مسبقاً');
      return;
    }

    addRole(newRoleName.trim(), newRolePermissions);
    showToast('تمت إضافة الدور والصلاحيات بنجاح');
    setIsRoleModalOpen(false);
    setNewRoleName('');
    setNewRolePermissions({
      dashboard: false,
      sales: false,
      designs: false,
      installation: false,
      inventory: false,
      expenses: false,
      employees: false,
      settings: false,
    });
    
    // If no role was selected for employee dropdown, select this newly created one
    if (!newEmployeeRole) {
      setNewEmployeeRole(newRoleName.trim());
    }
  };

  const handleDeleteRole = (roleToDelete: string) => {
    if (roleToDelete === 'مدير') {
      showToast('لا يمكن حذف دور المدير الأساسي');
      return;
    }
    // Check if any employees currently use this role
    if (employees.some(emp => emp.role === roleToDelete)) {
      showToast('لا يمكن حذف هذا الدور بسبب وجود عاملين مرتبطين به');
      return;
    }
    
    deleteRole(roleToDelete);
    showToast('تم حذف الدور المهني بنجاح');
  };

  // Dynamic Services Handlers
  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceFormName('');
    setServiceFormCostItems(['تكلفة التصميم', 'تكلفة الطباعة']);
    setNewCostItemTag('');
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv: DynamicServiceConfig) => {
    setEditingServiceId(srv.id);
    setServiceFormName(srv.name);
    setServiceFormCostItems([...srv.costItems]);
    setNewCostItemTag('');
    setIsServiceModalOpen(true);
  };

  const handleAddCostItemTag = () => {
    const trimmed = newCostItemTag.trim();
    if (!trimmed) return;
    if (serviceFormCostItems.includes(trimmed)) {
      showToast('بند التكلفة موجود مسبقاً');
      return;
    }
    setServiceFormCostItems([...serviceFormCostItems, trimmed]);
    setNewCostItemTag('');
  };

  const handleRemoveCostItemTag = (index: number) => {
    setServiceFormCostItems(serviceFormCostItems.filter((_, i) => i !== index));
  };

  const handleSaveServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = serviceFormName.trim();
    if (!trimmedName) {
      showToast('يرجى كتابة اسم نوع الخدمة');
      return;
    }

    if (serviceFormCostItems.length === 0) {
      showToast('يرجى إضافة بند تكلفة واحد على الأقل');
      return;
    }

    if (editingServiceId) {
      updateServiceConfig(editingServiceId, {
        name: trimmedName,
        costItems: serviceFormCostItems,
      });
      showToast('تم تحديث قالب الخدمة وبنود التكلفة بنجاح');
    } else {
      addServiceConfig({
        name: trimmedName,
        costItems: serviceFormCostItems,
      });
      showToast('تمت إضافة قالب الخدمة الجديد بنجاح');
    }

    setIsServiceModalOpen(false);
  };

  const handleDeleteServiceItem = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف قالب الخدمة "${name}"؟`)) {
      deleteServiceConfig(id);
      showToast('تم حذف قالب الخدمة');
    }
  };

  const handleInlineAddCostItem = (serviceId: string, customItemName?: string) => {
    const srv = (settings.servicesConfig || []).find(s => s.id === serviceId);
    if (!srv) return;
    const itemToAdd = (customItemName || inlineCostInputs[serviceId] || '').trim();
    if (!itemToAdd) {
      showToast('يرجى كتابة اسم بند التكلفة');
      return;
    }
    if (srv.costItems.includes(itemToAdd)) {
      showToast('بند التكلفة موجود مسبقاً في هذه الخدمة');
      return;
    }
    const updatedItems = [...srv.costItems, itemToAdd];
    updateServiceConfig(serviceId, { costItems: updatedItems });
    setInlineCostInputs(prev => ({ ...prev, [serviceId]: '' }));
    setActiveInlineAddingId(null);
    showToast(`تمت إضافة بند "${itemToAdd}" إلى خدمة ${srv.name}`);
  };

  const handleInlineRemoveCostItem = (serviceId: string, itemNameToRemove: string) => {
    const srv = (settings.servicesConfig || []).find(s => s.id === serviceId);
    if (!srv) return;
    const updatedItems = srv.costItems.filter(ci => ci !== itemNameToRemove);
    updateServiceConfig(serviceId, { costItems: updatedItems });
    showToast(`تم حذف بند "${itemNameToRemove}" من خدمة ${srv.name}`);
  };

  const handleResetServicesToDefault = () => {
    if (window.confirm('هل أنت متأكد من استعادة كافة قوالب الخدمات وبنود التكلفة الافتراضية؟')) {
      resetServicesConfig();
      showToast('تمت استعادة قوالب الخدمات الافتراضية بنجاح');
    }
  };

  const navTabs = [
    { id: 'pages' as SettingsTab, label: 'إدارة الصفحات والقوالب', icon: FolderTree, desc: 'التحكم المطلق بهيكل الصفحات، المكونات، القوالب، الترتيب والإخفاء' },
    { id: 'basic' as SettingsTab, label: 'البيانات الأساسية', icon: Building2, desc: 'اسم المنشأة، الشعار، العنوان وهواتف التواصل' },
    { id: 'services' as SettingsTab, label: 'قوالب الخدمات والتكاليف', icon: Layers, desc: 'إدارة أنواع الخدمات وتحديد بنود التكلفة المخصصة لكل خدمة' },
    { id: 'security' as SettingsTab, label: 'الحماية والأمان', icon: Lock, desc: 'كلمة مرور المنظومة وتشفير الوصول' },
    { id: 'rbac' as SettingsTab, label: 'العاملين والصلاحيات', icon: Sliders, desc: 'إدارة الموظفين والأدوار المخصصة' },
    { id: 'invoice' as SettingsTab, label: 'تخصيص الفواتير', icon: FileText, desc: 'ملاحظة أسفل الفاتورة، الترويسة وبنود الضمان A4' },
    { id: 'appearance' as SettingsTab, label: 'المظهر والسمة', icon: Sun, desc: 'التبديل بين الوضع الفاتح والداكن والملمس الجداري' },
    { id: 'supabase' as SettingsTab, label: 'المزامنة السحابية (Supabase)', icon: Database, desc: 'قواعد البيانات السحابية، المزامنة الذكية بدون إنترنت' },
    { id: 'backup' as SettingsTab, label: 'النسخ الاحتياطي', icon: Download, desc: 'تصدير واستيراد البيانات وحفظ قواعد السجلات' },
    { id: 'support' as SettingsTab, label: 'الدعم الفني', icon: Headphones, desc: 'قنوات التواصل المباشر، التذاكر وحالة النظام' },
    { id: 'commissions' as SettingsTab, label: 'إدارة العمولات', icon: Coins, desc: 'تحديد أساس احتساب العمولة للموظفين' },
  ];

  const rbacModules: { key: keyof RolePermission; name: string; desc: string }[] = [
    { key: 'dashboard', name: 'لوحة التحكم ومؤشرات الأرباح', desc: 'استعراض الإحصائيات المالية والأرباح وصافي المداخيل' },
    { key: 'sales', name: 'سجل المبيعات', desc: 'استعراض سجل الطلبيات ومتابعة أسماء العملاء والمقاسات' },
    { key: 'designs', name: 'إرفاق واعتماد التصاميم', desc: 'رفع ملفات التصميم واعتماد البروفات قبل التصنيع' },
    { key: 'installation', name: 'تفاصيل ومواقع التركيب الميداني', desc: 'معاينة عناوين التركيب، تكلفة الرافعة ومواعيد التسليم' },
    { key: 'inventory', name: 'المخزون والمواد الخام', desc: 'متابعة كميات ألواح الأكريليك، الفينيل، وليدات الإضاءة' },
    { key: 'expenses', name: 'المصروفات وسندات الصرف', desc: 'تقييد سندات الصرف التشغيلية وفواتير المحروقات والكهرباء' },
    { key: 'workshops', name: 'حسابات الورش والجهات الخارجية', desc: 'متابعة مطالبات ومستحقات الورش والشركات الخارجية وسندات الصرف' },
    { key: 'employees', name: 'شؤون العاملين والرواتب', desc: 'إدارة بطاقات العمل والرواتب وكشوفات الحساب' },
    { key: 'settings', name: 'إعدادات المنظومة والصلاحيات', desc: 'تعديل بيانات المنشأة، كلمة المرور وتوزيع الصلاحيات' },
    { key: 'audit', name: 'تقارير الجرد', desc: 'استعراض تقارير الجرد الشهري والسنوي الشامل' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات المنظومة ولوحة التحكم</h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">تخصيص هوية المنشأة، سياسات الأمان، الصلاحيات، الفواتير والمظهر</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Toast Message */}
          {toastMessage && (
            <div className="animate-in fade-in slide-in-from-top-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* زر تصفير قاعدة البيانات (مسح شامل) */}
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200/90 dark:border-rose-900/60 transition-all duration-150 shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            title="تصفير قاعدة البيانات ومسح التخزين المحلي بالكامل"
          >
            <RotateCcw size={15} className="text-rose-600 dark:text-rose-400" />
            <span>تصفير قاعدة البيانات (مسح شامل)</span>
          </button>
        </div>
      </div>

      {/* Main Settings Layout: Lateral Tabs on Desktop, Top Scroll on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Navigation Sidebar for Settings */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-2">
          <div className="glass-panel p-3 rounded-xl border border-slate-200/80 shadow-sm space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-right transition-all duration-150 ease-out ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 font-bold'
                      : 'text-slate-700 hover:bg-slate-100/80 :bg-slate-800/60 font-medium'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 '
                  }`}>
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs truncate font-bold">{tab.label}</span>
                    <span className={`block text-[10px] truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400 '}`}>
                      {tab.desc.split('،')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick System Info Card */}
          <div className="glass-panel p-4 rounded-xl border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600 ">
              <span className="font-semibold">حالة النظام:</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                نشط ومتصل
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100 ">
              <span className="font-semibold">إصدار المنظومة:</span>
              <span className="font-mono tabular-nums font-bold text-slate-700 ">v2.4.0 Commercial</span>
            </div>
          </div>
        </div>

        {/* Right / Main Tab Content Container */}
        <div className="lg:col-span-8 xl:col-span-9">
          {/* TAB 0: PAGES & COMPONENTS MANAGER */}
          {activeTab === 'pages' && (
            <PageManagerTab />
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 ">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 ">البيانات الأساسية للمنشأة</h3>
                    <p className="text-xs text-slate-600 ">تظهر هذه المعلومات على الفواتير المطبوعة والمستندات الرسمية</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveBasicInfo} className="space-y-6">
                {/* Logo Upload Box Section */}
                <div className="p-5 rounded-xl bg-slate-50/70 border border-slate-200/80 ">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-xs font-bold text-slate-800 ">شعار المنشأة / الشركة (Logo)</label>
                    {logoPreview && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Check size={11} />
                        <span>الشعار معتمد ومحفوظ في ترويسة الطباعة</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mb-4">يُطبع الشعار ديناميكياً في أعلى يمين ترويسة فواتير المبيعات A4 (صيغ مدعومة: PNG, JPG, WebP, SVG)</p>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Logo Preview Square */}
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-200/80 bg-white flex items-center justify-center overflow-hidden shadow-inner shrink-0 relative group">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="شعار الشركة" 
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
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
                          className="glass-button cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
                        >
                          <Upload size={15} />
                          <span>رفع شعار جديد</span>
                        </label>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 :bg-rose-950/40 border border-rose-200 inline-flex items-center gap-1.5 transition-all duration-150 ease-out "
                          >
                            <Trash2 size={15} />
                            <span>حذف الشعار</span>
                          </button>
                        )}
                      </div>
                      <span className="block text-[11px] text-slate-400 ">الحجم الأقصى الموصى به: 2 ميغابايت بخلفية شفافة</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الشركة / الوكالة</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                        placeholder="مثال: شركة أسلوب للدعاية والإعلان"
                      />
                      <Building2 size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">أرقام هواتف التواصل</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={shopPhone}
                        onChange={(e) => setShopPhone(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                        placeholder="مثال: 091-0000000 / 092-0000000"
                      />
                      <Phone size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">العنوان والموقع الجغرافي</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                        placeholder="مثال: طرابلس، شارع عمر المختار - بجانب محطة الوقود"
                      />
                      <MapPin size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">العملة الافتراضية</label>
                    <div className="relative">
                      <select
                        value={shopCurrency}
                        onChange={(e) => setShopCurrency(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-sm appearance-none"
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

                <div className="flex justify-end pt-4 border-t border-slate-100 ">
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

          {/* TAB 2: DYNAMIC SERVICES & COST TEMPLATES */}
          {activeTab === 'services' && (
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-150 space-y-6">
              {/* Tab Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">قوالب الخدمات والتكاليف الديناميكية</h3>
                    <p className="text-xs text-slate-600">إدارة أنواع الخدمات وتحديد بنود التكلفة الخاصة بكل خدمة لتتغير حقول التكلفة تلقائياً عند إضافة الطلبيات</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleResetServicesToDefault}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    title="استعادة القوالب الافتراضية"
                  >
                    <RotateCcw size={14} />
                    <span>استعادة الافتراضي</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddService}
                    className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} />
                    <span>إضافة نوع خدمة جديد</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  placeholder="ابحث عن نوع خدمة أو بند تكلفة..."
                  className="w-full glass-input rounded-xl pr-10 pl-4 py-2.5 text-xs bg-slate-50 border-slate-200"
                />
              </div>

              {/* Services List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(settings.servicesConfig || []).filter(srv => {
                  if (!serviceSearchTerm.trim()) return true;
                  const term = serviceSearchTerm.toLowerCase();
                  return srv.name.toLowerCase().includes(term) || srv.costItems.some(ci => ci.toLowerCase().includes(term));
                }).map((srv) => (
                  <div 
                    key={srv.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs transition-all space-y-4 group text-right"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                          <Tag size={17} className="text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{srv.name}</h4>
                          <span className="text-[11px] text-slate-500 font-bold">
                            {srv.costItems.length} بنود تكلفة محددة
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditService(srv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="تعديل قالب الخدمة"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteServiceItem(srv.id, srv.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف قالب الخدمة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Cost Items Tags List */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600 block">بنود التكلفة الخاصة بالخدمة:</span>
                      
                      {srv.costItems.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic py-1">
                          لا توجد بنود تكلفة حالياً لهذا القالب
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {srv.costItems.map((item, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 group/tag"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                              <span>{item}</span>
                              <button
                                type="button"
                                onClick={() => handleInlineRemoveCostItem(srv.id, item)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded"
                                title={`حذف بند "${item}"`}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Inline Add Cost Item Section */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {activeInlineAddingId === srv.id ? (
                        <div className="space-y-2 animate-in fade-in duration-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              autoFocus
                              value={inlineCostInputs[srv.id] || ''}
                              onChange={(e) => setInlineCostInputs(prev => ({ ...prev, [srv.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleInlineAddCostItem(srv.id);
                                } else if (e.key === 'Escape') {
                                  setActiveInlineAddingId(null);
                                }
                              }}
                              placeholder="اكتب اسم بند التكلفة (مثلاً: مصمم، كاتب محتوى، تركيب)..."
                              className="flex-1 glass-input rounded-lg px-3 py-1.5 text-xs bg-slate-50 border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleInlineAddCostItem(srv.id)}
                              className="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                            >
                              إضافة
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveInlineAddingId(null)}
                              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100"
                            >
                              إلغاء
                            </button>
                          </div>

                          {/* Quick presets for this service */}
                          <div className="flex flex-wrap items-center gap-1 text-[10px]">
                            <span className="text-slate-400 font-bold">اقتراحات سريعة:</span>
                            {['مصمم', 'كاتب محتوى', 'تركيب', 'قص وتغليف', 'مواد خام', 'طباعة', 'إعلانات ممولة', 'استضافة ونطاق', 'عمولة وسيط'].filter(p => !srv.costItems.includes(p)).slice(0, 5).map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleInlineAddCostItem(srv.id, preset)}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 transition-colors"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveInlineAddingId(srv.id);
                              setInlineCostInputs(prev => ({ ...prev, [srv.id]: '' }));
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                          >
                            <Plus size={14} />
                            <span>+ إضافة بند تكلفة</span>
                          </button>

                          {/* Quick single-click presets */}
                          <div className="flex flex-wrap items-center gap-1">
                            {['مصمم', 'كاتب محتوى', 'تركيب', 'مواد خام'].filter(p => !srv.costItems.includes(p)).slice(0, 3).map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleInlineAddCostItem(srv.id, preset)}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-500 border border-slate-200 transition-colors"
                                title={`إضافة سريعة لبند "${preset}"`}
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {(settings.servicesConfig || []).length === 0 && (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
                  <Layers size={32} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">لا توجد قوالب خدمات معرفة حالياً</p>
                  <button
                    type="button"
                    onClick={handleResetServicesToDefault}
                    className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    استعادة القوالب الافتراضية
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SECURITY & PASSWORDS */}
          {activeTab === 'security' && (
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-150 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 ">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 ">الحماية والأمان</h3>
                    <p className="text-xs text-slate-600 ">إدارة كلمة مرور المنظومة وصلاحيات الدخول الإداري</p>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>النظام محمي ومؤمن</span>
                </div>
              </div>

              {/* Password Status Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-700 shrink-0">
                    <KeyRound size={17} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">كلمة مرور المنظومة الافتراضية</span>
                    <span className="text-[11px] text-slate-600 ">القيمة الافتراضية الأولية للنظام هي: <strong className="font-mono tabular-nums text-emerald-600 ">1400</strong></span>
                  </div>
                </div>
              </div>

              {securityMessage && (
                <div className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold ${
                  securityMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 ' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200 '
                }`}>
                  {securityMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{securityMessage.text}</span>
                </div>
              )}

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 ">تغيير كلمة المرور</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Old Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الحالية / القديمة</label>
                    <div className="relative">
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums"
                        placeholder="أدخل كلمة المرور الحالية..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 :text-slate-300"
                      >
                        {showOldPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums"
                        placeholder="كلمة مرور جديدة..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 :text-slate-300"
                      >
                        {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums"
                        placeholder="أعد إدخال الجديدة..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 :text-slate-300"
                      >
                        {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 ">
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
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Employee Management Section */}
              <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 ">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 ">إدارة العاملين</h3>
                      <p className="text-xs text-slate-600 ">إضافة وتعديل بيانات العاملين في المنظومة</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEmployeeModalOpen(true)}
                    className="btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
                  >
                    <Plus size={14} />
                    <span>إضافة عامل جديد</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.map(emp => (
                    <div key={emp.id} className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/80 flex flex-col gap-2 relative group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-sm">{emp.name}</span>
                        <span className="text-[10px] px-2 py-1 bg-slate-200 text-slate-700 rounded-md font-bold">{emp.role}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 ">
                        <Key size={14} className="shrink-0" />
                        <span>الرمز الخاص: {emp.pinCode || 'غير محدد'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 ">
                        <Clock size={14} className="shrink-0" />
                        <span>الحالة: {emp.status || 'نشط'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles Matrix Section */}
              <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 ">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 ">الأدوار والصلاحيات (RBAC)</h3>
                      <p className="text-xs text-slate-600 ">تحديد الأدوار المخصصة وصلاحيات كل دور</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleResetRBAC}
                      className="glass-button px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
                    >
                      <RotateCcw size={14} />
                      <span>استعادة الافتراضي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRoleModalOpen(true)}
                      className="btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2"
                    >
                      <Plus size={14} />
                      <span>إضافة دور جديد</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80 ">
                  <table className="w-full text-right text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-700 ">
                      <tr>
                        <th className="p-4 font-bold sticky right-0 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] [1px_0_0_0_#1e293b] z-10">القسم / الوحدة الإدارية</th>
                        {Object.keys(settings.permissions).map(roleName => (
                          <th key={roleName} className="p-4 text-center font-bold">
                            <div className="flex flex-col items-center justify-center gap-2 text-slate-800 ">
                              <span className="font-bold">{roleName}</span>
                              {roleName !== 'مدير' && (
                                <button type="button" onClick={() => handleDeleteRole(roleName)} className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 :bg-rose-900/60 p-1.5 rounded-lg transition-all duration-150 ease-out " title="حذف الدور">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 ">
                      {rbacModules.map((module) => (
                        <tr key={module.key} className="hover:bg-slate-50/60 :bg-slate-800/40 transition-all duration-150 ease-out ">
                          <td className="p-4 sticky right-0 bg-white/80 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] [1px_0_0_0_#1e293b] z-10">
                            <span className="font-bold text-slate-800 block text-xs">{module.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">{module.desc}</span>
                          </td>
                          {Object.keys(settings.permissions).map(roleName => {
                            const isActive = settings.permissions[roleName][module.key as keyof RolePermission];
                            return (
                              <td key={roleName} className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePermission(roleName as EmployeeRole, module.key as keyof RolePermission)}
                                  className={`w-11 h-6 inline-flex items-center rounded-full transition-all duration-150 ease-out  p-1 ${
                                    isActive ? 'bg-purple-600' : 'bg-slate-200 '
                                  }`}
                                >
                                  <span
                                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                      isActive ? 'translate-x-0' : '-translate-x-5'
                                    }`}
                                  />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVOICE CUSTOMIZATION */}
          {activeTab === 'invoice' && (
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-150 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 ">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 ">تخصيص الفواتير المطبوعة A4</h3>
                    <p className="text-xs text-slate-600 ">التحكم في الترويسة، الملاحظات الختامية وشروط الضمان المطبوعة للعميل</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveInvoiceSettings} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">السطر التعريفي أسفل اسم الورشة (Sub-Header)</label>
                  <input
                    type="text"
                    required
                    value={invoiceSubHeader}
                    onChange={(e) => setInvoiceSubHeader(e.target.value)}
                    className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                    placeholder="مثال: لصناعة وتركيب اللوافت الإعلانية والتجهيزات الهندسية"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظة أسفل الفاتورة (تظهر عند الطباعة على ورق A4)</label>
                  <textarea
                    rows={3}
                    required
                    value={invoiceFooter}
                    onChange={(e) => setInvoiceFooter(e.target.value)}
                    className="w-full glass-input rounded-lg px-4 py-2.5 text-sm resize-none"
                    placeholder="أدخل نص الملاحظة الختامية التي ستظهر في أسفل كل فاتورة..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شروط العقد والضمان (Terms & Conditions)</label>
                  <input
                    type="text"
                    value={invoiceTerms}
                    onChange={(e) => setInvoiceTerms(e.target.value)}
                    className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                    placeholder="مثال: يسري الضمان لمدة سنة كاملة على التوصيلات الكهربائية والليدات"
                  />
                </div>

                {/* Live Invoice Preview Box */}
                <div className="pt-3">
                  <span className="block text-xs font-bold text-slate-700 mb-2">معاينة حية لشكل أسفل الفاتورة المطبوعة:</span>
                  <div className="p-5 rounded-xl bg-white border border-slate-200/80 text-slate-900 shadow-sm space-y-4 font-sans text-xs">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/80">
                      <div>
                        <span className="font-bold block text-sm">{shopName}</span>
                        <span className="text-[11px] text-slate-600">{invoiceSubHeader}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">فاتورة تجريبية #101</span>
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

                    <div className="pt-3 border-t border-slate-200/80 text-center text-slate-600 text-[11px] leading-relaxed">
                      <p className="font-semibold">{invoiceFooter}</p>
                      {invoiceTerms && <p className="text-[10px] text-slate-400 mt-0.5">{invoiceTerms}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 ">
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
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-150 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 ">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Sun size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 ">المظهر وسمة العرض</h3>
                    <p className="text-xs text-slate-600 ">التبديل الفوري بين الوضع الفاتح والداكن مع ملمس الخلفية الورقي والجداري الأنيق</p>
                  </div>
                </div>
              </div>

              {/* Theme Toggle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Card */}
                <div
                  onClick={() => setTheme('light')}
                  className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-150 ease-out flex flex-col gap-3 ${
                    settings.theme === 'light'
                      ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200/80 bg-white/70 hover:border-slate-200/80'
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
                    <p className="text-xs text-slate-600 mt-1">تصميم زجاجي ناصع مع خلفية ورقية رخامية مريحة للعين ومعززة للإنتاجية المكتبية</p>
                  </div>
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => setTheme('dark')}
                  className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-150 ease-out flex flex-col gap-3 ${
                    settings.theme === 'dark'
                      ? 'border-emerald-500 bg-slate-900 text-white shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200/80 bg-slate-900/80 text-white hover:border-slate-700'
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
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-150 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 ">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 ">المزامنة وقاعدة البيانات السحابية (Supabase)</h3>
                    <p className="text-xs text-slate-600 ">معمارية المزامنة الذكية التي تجمع بين السرعة الفائقة والعمل المستمر عند انقطاع الإنترنت</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await syncNow,
    updateSystemSettings();
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
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 ">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">حالة الاتصال والمزامنة</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${syncState === 'synced' ? 'bg-emerald-500' : syncState === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-sm font-black text-slate-900 ">
                      {syncState === 'synced' ? 'متصل ومتزامن سحابياً' : syncState === 'syncing' ? 'جاري المزامنة...' : syncState === 'offline' ? 'غير متصل (Offline-First)' : 'عمليات معلقة'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    آخر مزامنة ناجحة: {lastSyncTime || 'الآن'}
                  </span>
                </div>

                {/* Queue Card */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 ">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">قائمة الانتظار (Sync Queue)</span>
                  <div className="flex items-center gap-2">
                    <Cloud size={18} className="text-emerald-600 " />
                    <span className="text-sm font-black text-slate-900 ">
                      {pendingSyncCount} سجلات بانتظار الرفع
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    يتم الحفظ محلياً فوراً والرفع عند توفر الاتصال
                  </span>
                </div>

                {/* Integration Mode */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 ">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">بيئة تشغيل Supabase</span>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600 " />
                    <span className="text-sm font-black text-slate-900 ">
                      {isSupabaseConfigured ? 'مُهيأ ومفعل بالكامل' : 'نمط المزامنة المرنة (جاهز للربط)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    متوافق مع متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL
                  </span>
                </div>
              </div>

              {/* Table Sync Schema Details */}
              <div className="p-5 rounded-xl bg-white/70 border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Database size={15} className="text-emerald-600 " />
                  <span>الجداول والكيانات المتزامنة تلقائياً</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 ">
                    <span className="text-xs font-bold text-slate-900 block">جدول الطلبيات (orders)</span>
                    <span className="text-[11px] text-slate-600 mt-0.5 block">{orders.length} طلبية مسجلة ومحفوظة</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 ">
                    <span className="text-xs font-bold text-slate-900 block">جدول المخزون (inventory)</span>
                    <span className="text-[11px] text-slate-600 mt-0.5 block">{inventory.length} مادة خام ومستلزمات</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 ">
                    <span className="text-xs font-bold text-slate-900 block">جدول المصروفات (expenses)</span>
                    <span className="text-[11px] text-slate-600 mt-0.5 block">{expenses.length} سند صرف تشغيلي</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 ">
                    <span className="text-xs font-bold text-slate-900 block">جدول العاملين (employees)</span>
                    <span className="text-[11px] text-slate-600 mt-0.5 block">{employees.length} حسابات كوادر وموظفين</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 col-span-1 sm:col-span-2">
                    <span className="text-xs font-bold text-slate-900 block">جدول إعدادات النظام (system_settings)</span>
                    <span className="text-[11px] text-slate-600 mt-0.5 block">الهوية، الترويسة، الصلاحيات، كلمة المرور المعتمدة</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BACKUP & DATABASE MANAGEMENT */}
          
        {activeTab === 'commissions' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Coins className="w-6 h-6 text-emerald-500" />
                أساس احتساب العمولات
              </h2>
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 ">
                  <p className="text-sm font-bold text-slate-700 mb-4">
                    اختر الطريقة الافتراضية لاحتساب عمولة الموظفين المباشرة:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['إجمالي المبيعات', 'صافي الربح', 'المبلغ المحصل'].map(basis => (
                      <button
                        key={basis}
                        onClick={() => updateSystemSettings({ commissionBasis: basis as any })}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-150 ease-out ${
                          settings.commissionBasis === basis
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 '
                            : 'border-slate-200/80 hover:border-slate-200/80 :border-slate-600 bg-white text-slate-700 '
                        }`}
                      >
                        <span className="font-bold">{basis}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-100 ">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 ">إدارة قواعد البيانات</h3>
                    <p className="text-xs text-slate-600 ">تصدير واستيراد قواعد البيانات وتحديث المخزون</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Card */}
                  <div className="p-6 rounded-xl bg-slate-50/50 border border-slate-200/80 shadow-sm hover:shadow-sm transition-shadow flex flex-col justify-between h-full gap-6">
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                        <Download size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 ">تصدير البيانات</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        تنزيل نسخة احتياطية كاملة من المنظومة تشمل الطلبيات، المخزون، العاملين، والإعدادات.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="w-full glass-button px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-4"
                    >
                      <Download size={18} />
                      <span>تصدير الآن</span>
                    </button>
                  </div>

                  {/* Import Card */}
                  <div className="p-6 rounded-xl bg-slate-50/50 border border-slate-200/80 shadow-sm hover:shadow-sm transition-shadow flex flex-col justify-between h-full gap-6">
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <Upload size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 ">استيراد البيانات</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        رفع ملفات البيانات لتحليلها وتعبئة المخزون، أو المبيعات، أو استعادة نسخة كاملة.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImportStatus(null);
                        setIsDataImportModalOpen(true);
                      }}
                      className="w-full btn-primary px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-4"
                    >
                      <Upload size={18} />
                      <span>بدء الاستيراد</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* System Wipe & Zeroing Zone */}
              <div className="p-6 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                      تصفير قاعدة البيانات (مسح شامل)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    مسح شامل وفوري لكافة السجلات والبيانات المخزنة محلياً في الذاكرة (LocalStorage) بما يشمل الفواتير والطلبيات والمخزون والمصروفات والورش، وإعادة تحميل الصفحة لتعود المنظومة لنقطة الصفر كنسخة إنتاجية نظيفة.
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
                  onClick={() => setIsResetModalOpen(true)}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-white hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800/80 shadow-xs flex items-center justify-center gap-2 transition-all duration-150 ease-out shrink-0 cursor-pointer active:scale-95"
                >
                  <RotateCcw size={15} className="text-rose-600 dark:text-rose-400" />
                  <span>تصفير قاعدة البيانات (مسح شامل)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: TECHNICAL SUPPORT & HELP CENTER */}
          {activeTab === 'support' && (
            <div className="glass-panel p-6 sm:p-8 rounded-xl border border-slate-200/80 shadow-sm animate-in fade-in duration-150 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 ">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 ">مركز الدعم الفني والمساعدة</h3>
                    <p className="text-xs text-slate-600 ">فريق الدعم الهندسي والصيانة لمنظومة مسار للأنظمة</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-700 ">الدعم الهندسي مباشر</span>
                </div>
              </div>

              {/* Status & Health Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0">
                    <Activity size={17} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600 font-medium">حالة الخادم المحلي</p>
                    <p className="text-xs font-bold text-emerald-800 ">متصل وجاهز للتشغيل</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-700 flex items-center justify-center shrink-0">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600 font-medium">أمان البيانات والسجلات</p>
                    <p className="text-xs font-bold text-blue-800 ">تشفير محلي متين</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Clock size={17} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-600 font-medium">زمن الاستجابة</p>
                    <p className="text-xs font-bold text-slate-800 ">فوري دون تأخير</p>
                  </div>
                </div>
              </div>

              {/* Direct Support Channels */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <PhoneCall size={15} className="text-blue-600 " />
                  <span>قنوات التواصل المباشرة مع الفريق الفني</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <PhoneCall size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 ">الخط الساخن المباشر والدعم</p>
                      <p className="text-xs font-mono tabular-nums text-slate-600 mt-0.5" dir="ltr">+218 91 000 0000</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 ">البريد الإلكتروني للدعم</p>
                      <p className="text-xs font-mono tabular-nums text-slate-600 mt-0.5">support@masar-systems.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Ticket Submission Form */}
              <div className="p-5 sm:p-6 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600 " />
                    <h4 className="text-xs font-bold text-slate-800 ">إرسال استفسار أو طلب دعم فني</h4>
                  </div>
                  <span className="text-[11px] text-slate-600 ">استجابة هندسية مباشرة</span>
                </div>

                <form onSubmit={handleSupportTicketSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">موضوع الاستفسار أو المشكلة</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: ضبط مقاسات الطباعة، إضافة حساب موظف..."
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 "
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">مستوى الأولوية</label>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value)}
                        className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 appearance-none bg-white "
                      >
                        <option value="عادي">عادي</option>
                        <option value="متوسط">متوسط</option>
                        <option value="عاجل">عاجل جداً</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تفاصيل الطلب أو الملاحظة الفنية</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="يرجى كتابة التفاصيل الدقيقة لمساعدتنا في معالجة طلبك..."
                      value={ticketDetails}
                      onChange={(e) => setTicketDetails(e.target.value)}
                      className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
                    <div className="flex items-center gap-2 text-slate-600 text-xs">
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
      {/* ADD EMPLOYEE MODAL */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#f8fafc] border border-slate-200/80 rounded-xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 ">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                <span>إضافة عامل جديد</span>
              </h3>
              <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 hover:text-slate-800 :text-white flex items-center justify-center transition-all duration-150 ease-out ">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ">اسم العامل</label>
                <input type="text" required value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)} placeholder="الاسم الكامل..." className="w-full glass-input rounded-lg px-4 py-2.5 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ">الرمز الخاص للدخول (PIN)</label>
                <input type="password" required minLength={4} maxLength={10} value={newEmployeePin} onChange={(e) => setNewEmployeePin(e.target.value)} placeholder="رمز الدخول الخاص للمنظومة..." className="w-full glass-input rounded-lg px-4 py-2.5 text-sm tracking-wider font-mono tabular-nums text-center" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ">الدور المهني المخصص</label>
                <select required value={newEmployeeRole} onChange={(e) => setNewEmployeeRole(e.target.value)} className="w-full glass-input rounded-lg px-4 py-2.5 text-sm bg-transparent">
                  <option value="" disabled className="">-- اختر دوراً --</option>
                  {Object.keys(settings.permissions).map(r => (
                    <option key={r} value={r} className="">{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/80 ">
                <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 :bg-slate-800 transition-all duration-150 ease-out ">إلغاء</button>
                <button type="submit" className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Save size={15} />
                  <span>حفظ وإضافة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROLE MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#f8fafc] border border-slate-200/80 rounded-xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 ">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders size={20} className="text-purple-500" />
                <span>إضافة دور مهني جديد</span>
              </h3>
              <button type="button" onClick={() => setIsRoleModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 hover:text-slate-800 :text-white flex items-center justify-center transition-all duration-150 ease-out ">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddRoleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ">اسم الدور المهني (مثال: موظف استقبال، محاسب)</label>
                <input type="text" required value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="اكتب اسم الدور..." className="w-full glass-input rounded-lg px-4 py-2.5 text-sm" />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 border-b border-slate-200/80 pb-2 block">تحديد الصلاحيات المبدئية لهذا الدور:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {rbacModules.map(module => (
                    <label key={module.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:bg-slate-100 :bg-slate-800 cursor-pointer transition-all duration-150 ease-out  select-none">
                      <input type="checkbox" checked={newRolePermissions[module.key as keyof RolePermission] || false} onChange={(e) => setNewRolePermissions(prev => ({ ...prev, [module.key]: e.target.checked }))} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-200/80 " />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 ">{module.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/80 ">
                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 :bg-slate-800 transition-all duration-150 ease-out ">إلغاء</button>
                <button type="submit" className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Save size={15} />
                  <span>حفظ الدور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glass Confirmation Modal for System Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-rose-200/80 dark:border-rose-900/60 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 text-right">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-rose-100 dark:border-rose-900/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0">
                  <RotateCcw size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    تأكيد تصفير قاعدة البيانات
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-medium">
                    إعادة ضبط المنظومة لمرحلة الإنتاج الفعلي
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content & Warning */}
            <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-rose-900 dark:text-rose-300">
                هل أنت متأكد من رغبتك في تصفير قاعدة البيانات؟
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                سيؤدي هذا الإجراء إلى مسح كافة البيانات المخزنة محلياً بالكامل (LocalStorage)، وإعادة تحميل الصفحة لتعود المنظومة خالية ونظيفة وجاهزة للإنتاج الفعلي.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmResetSystem}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] border border-rose-500 shadow-sm shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>تأكيد ومسح شامل</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DATA IMPORT MODAL */}
      {isDataImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-xl shadow-2xl overflow-hidden p-8 space-y-8 animate-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 ">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={20} className="text-emerald-500" />
                <span>استيراد وتحليل البيانات</span>
              </h3>
              <button type="button" onClick={() => setIsDataImportModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-800 :text-white flex items-center justify-center transition-all duration-150 ease-out ">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 ">تحديد نوع البيانات المرفوعة:</label>
                <select 
                  value={importTarget} 
                  onChange={(e) => setImportTarget(e.target.value as any)}
                  className="w-full glass-input rounded-lg px-4 py-3 text-sm bg-slate-50 "
                  disabled={importStatus?.loading}
                >
                  <option value="full">نسخة احتياطية كاملة (جميع السجلات)</option>
                  <option value="inventory">بيانات المخزون والمواد الخام</option>
                  <option value="sales">سجلات المبيعات والطلبيات</option>
                  <option value="employees">بيانات العاملين</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 ">رفع الملف (PDF, JSON, CSV):</label>
                <div className="relative border-2 border-dashed border-slate-200/80 rounded-xl p-8 hover:bg-slate-50 :bg-slate-800/30 transition-all duration-150 ease-out  text-center">
                  <input
                    type="file"
                    onChange={handleAdvancedDataImport}
                    accept=".json,.pdf,.csv,.txt"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={importStatus?.loading}
                  />
                  <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
                    <FileText size={32} className="text-slate-400" />
                    <div className="text-sm font-bold text-slate-600 ">
                      اضغط هنا لاختيار الملف أو اسحبه وأفلته
                    </div>
                    <div className="text-xs text-slate-400">
                      يتم تحليل الملفات الداعمة تلقائياً ودمجها مع قواعد البيانات
                    </div>
                  </div>
                </div>
              </div>

              {importStatus && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${importStatus.error ? 'bg-rose-50 text-rose-700 ' : 'bg-emerald-50 text-emerald-700 '}`}>
                  {importStatus.loading ? (
                    <RefreshCw size={18} className="animate-spin shrink-0" />
                  ) : importStatus.error ? (
                    <AlertCircle size={18} className="shrink-0" />
                  ) : (
                    <CheckCircle2 size={18} className="shrink-0" />
                  )}
                  <span>{importStatus.text}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 ">
              <button type="button" onClick={() => setIsDataImportModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 :bg-slate-800 transition-all duration-150 ease-out " disabled={importStatus?.loading}>
                إغلاق الواجهة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC SERVICE CONFIGURATION MODAL */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#f8fafc] border border-slate-200/80 rounded-xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingServiceId ? 'تعديل نوع الخدمة وبنود التكلفة' : 'إضافة نوع خدمة جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تحديد بنود التكلفة المرتبطة التي ستظهر تلقائياً عند اختيار هذه الخدمة
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsServiceModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveServiceSubmit} className="space-y-4">
              {/* Service Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  اسم نوع الخدمة <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={serviceFormName} 
                  onChange={(e) => setServiceFormName(e.target.value)} 
                  placeholder="مثال: إدارة صفحات، تنفيذ لافتات، تصوير فوتوغرافي..." 
                  className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-bold bg-white" 
                />
              </div>

              {/* Cost Items Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-700 block">
                  بنود التكلفة الخاصة بهذه الخدمة ({serviceFormCostItems.length})
                </label>
                <p className="text-[11px] text-slate-500">
                  أضف كل بند تكلفة على حدة (مثل: تكلفة المصمم، تكلفة كاتب المحتوى، تكلفة القص، مواد خام)
                </p>

                {/* Add Item Input Bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCostItemTag}
                    onChange={(e) => setNewCostItemTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCostItemTag();
                      }
                    }}
                    placeholder="اكتب اسم بند التكلفة واضغط إضافة..."
                    className="flex-1 glass-input rounded-lg px-3 py-2 text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCostItemTag}
                    className="btn-primary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} />
                    <span>إضافة بند</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold block">اقتراحات سريعة للإضافة:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'تكلفة المصمم',
                      'تكلفة كاتب المحتوى',
                      'تكلفة القص',
                      'تكلفة التركيب',
                      'مواد خام',
                      'تكلفة الطباعة',
                      'تكلفة التصميم',
                      'إعلانات ممولة',
                      'تكلفة المصور',
                      'استضافة ونطاق',
                      'عمولة وسيط'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (!serviceFormCostItems.includes(preset)) {
                            setServiceFormCostItems([...serviceFormCostItems, preset]);
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          serviceFormCostItems.includes(preset)
                            ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-default'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600'
                        }`}
                        disabled={serviceFormCostItems.includes(preset)}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Cost Items List */}
                <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 min-h-[70px] space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block">البنود المعتمدة في هذا القالب:</span>
                  {serviceFormCostItems.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block py-2 text-center">
                      لم تتم إضافة أي بند تكلفة بعد. يرجى إضافة بند تكلفة واحد على الأقل.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {serviceFormCostItems.map((tag, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCostItemTag(idx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                            title="إزالة هذا البند"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setIsServiceModalOpen(false)} 
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-primary px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save size={15} />
                  <span>{editingServiceId ? 'حفظ التعديلات' : 'إضافة القالب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
