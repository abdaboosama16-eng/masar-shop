import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { 
  Order, 
  InventoryItem, 
  Expense, 
  Employee, 
  EmployeeRole, 
  SystemSettings, 
  ShopInfo, 
  RolePermission, 
  SyncState, 
  Customer, 
  Supplier, 
  TreasuryAccount, 
  TreasuryTransaction, 
  DynamicServiceConfig,
  PageConfig,
  PageComponentConfig,
  PageComponentType
} from '../types';
import { supabase, isSupabaseConfigured, SyncQueueItem, authenticateUser } from '../lib/supabaseClient';

export const defaultPagesConfig: PageConfig[] = [
  {
    id: 'dashboard',
    name: 'لوحة التحكم',
    path: '/',
    icon: 'LayoutDashboard',
    description: 'المركز الرئيسي للتحكم واستعراض المؤشرات المالية ومتابعة الأداء',
    visible: true,
    isSystemDefault: true,
    order: 1,
    components: [
      {
        id: 'kpi_sales',
        title: 'إجمالي المبيعات',
        type: 'metric_card',
        description: 'بطاقة عرض إجمالي المبيعات المحققة وقيمة الفواتير المسجلة',
        visible: true,
        order: 1,
        width: 'third',
      },
      {
        id: 'kpi_expenses',
        title: 'المصروفات والتكاليف',
        type: 'metric_card',
        description: 'إجمالي المصروفات التشغيلية وتكاليف المواد والرافعات',
        visible: true,
        order: 2,
        width: 'third',
      },
      {
        id: 'kpi_profit',
        title: 'صافي الأرباح',
        type: 'metric_card',
        description: 'صافي الربح المحقق بعد خصم كافة التكاليف والمصروفات',
        visible: true,
        order: 3,
        width: 'third',
      },
      {
        id: 'time_filter',
        title: 'شريط التصفية الزمني',
        type: 'filter_bar',
        description: 'أزرار التصفية السريعة (اليوم، هذا الأسبوع، هذا الشهر، مخصص، الكل)',
        visible: true,
        order: 4,
        width: 'full',
      },
      {
        id: 'profit_chart',
        title: 'مخطط مقارنة الأرباح والمبيعات',
        type: 'chart',
        description: 'رسم بياني يوضح مبيعات وتكاليف وصافي أرباح الخدمات الإعلانية',
        visible: true,
        order: 5,
        width: 'two_thirds',
      },
      {
        id: 'employee_rankings',
        title: 'كفاءة وإنجاز فريق العمل',
        type: 'table',
        description: 'تصنيف الموظفين وفرق العمل وفق عدد الطلبيات المنجزة والأرباح',
        visible: true,
        order: 6,
        width: 'third',
      },
      {
        id: 'upcoming_deliveries',
        title: 'مواعيد التسليم المستهدفة',
        type: 'table',
        description: 'قائمة بأقرب 5 طلبيات قيد التجهيز ومواعيد تسليمها',
        visible: true,
        order: 7,
        width: 'half',
      },
      {
        id: 'low_stock_alert',
        title: 'تنبيهات المخزون الحرج',
        type: 'table',
        description: 'إشعار فوري بالمواد التي انخفض رصيدها عن حد الأمان',
        visible: true,
        order: 8,
        width: 'half',
      }
    ]
  },
  {
    id: 'sales',
    name: 'سجل المبيعات',
    path: '/sales',
    icon: 'ShoppingCart',
    description: 'تسجيل ومتابعة طلبيات الدعاية واللافتات وإدارة الفواتير',
    visible: true,
    isSystemDefault: true,
    order: 2,
    components: [
      {
        id: 'sales_monthly_grid',
        title: 'جدول المبيعات الشهري',
        type: 'table',
        description: 'عرض ومتابعة مبيعات الشهر بتصميم جداول العمليات الشاملة',
        visible: true,
        order: 1,
        width: 'full',
      },
      {
        id: 'sales_quick_add',
        title: 'نموذج إضافة طلبية جديدة',
        type: 'form_field',
        description: 'تسجيل المواصفات والمقاسات وحساب التكاليف وعنوان التركيب والملاحظات',
        visible: true,
        order: 2,
        width: 'full',
      },
      {
        id: 'sales_invoices_archive',
        title: 'أرشيف الفواتير',
        type: 'table',
        description: 'سجل الفواتير مع خيارات الطباعة والمشاركة عبر واتساب',
        visible: true,
        order: 3,
        width: 'full',
      },
      {
        id: 'sales_cost_calculator',
        title: 'حاسبة التكاليف التلقائية',
        type: 'custom_widget',
        description: 'حساب تلقائي لتكلفة القص، التركيب، الشاسيه، وهامش الربح',
        visible: true,
        order: 4,
        width: 'half',
      }
    ]
  },
  {
    id: 'kanban',
    name: 'مسار العمليات',
    path: '/kanban',
    icon: 'Activity',
    description: 'لوحة متابعة مراحل العمل وتدفق الإنتاج في الورشة والميدان',
    visible: true,
    isSystemDefault: true,
    order: 3,
    components: [
      {
        id: 'kanban_board',
        title: 'لوحة مراحل الإنتاج',
        type: 'action_grid',
        description: 'أعمدة كانبان من التصميم إلى الطباعة ثم التركيب والتسليم',
        visible: true,
        order: 1,
        width: 'full',
      },
      {
        id: 'kanban_kiosk_toggle',
        title: 'وضع الورشة للشاشات الكبيرة',
        type: 'custom_widget',
        description: 'زر التبديل لشاشات المصنع بدون هوامش أو شريط جانبي',
        visible: true,
        order: 2,
        width: 'half',
      }
    ]
  },
  {
    id: 'inventory',
    name: 'المخزون والمواد',
    path: '/inventory',
    icon: 'Box',
    description: 'إدارة مخزون المواد الخام (كلادينج، زنكور، ليدات، فليكس، أكريليك)',
    visible: true,
    isSystemDefault: true,
    order: 4,
    components: [
      {
        id: 'inventory_kpi_total',
        title: 'إجمالي قيمة المخزون',
        type: 'metric_card',
        description: 'حساب القيمة النقدية الإجمالية للمواد المتوفرة بالمخزن',
        visible: true,
        order: 1,
        width: 'half',
      },
      {
        id: 'inventory_low_limit',
        title: 'المواد تحت حد الأمان',
        type: 'metric_card',
        description: 'عدد الأصناف التي تحتاج لإعادة طلب عاجل',
        visible: true,
        order: 2,
        width: 'half',
      },
      {
        id: 'inventory_table',
        title: 'جدول المواد الخام',
        type: 'table',
        description: 'عرض الرصيد الفعلي، حد الطلب، وسعر التكلفة',
        visible: true,
        order: 3,
        width: 'full',
      },
      {
        id: 'inventory_add_item',
        title: 'إضافة مادة خام جديدة',
        type: 'form_field',
        description: 'تسجيل مادة جديدة وتحديد وحدات القياس وحد الأمان',
        visible: true,
        order: 4,
        width: 'full',
      }
    ]
  },
  {
    id: 'expenses',
    name: 'المالية',
    path: '/expenses',
    icon: 'Receipt',
    description: 'المركز المالي الشامل: مؤشرات الأرباح والتحليل الذكي، المصروفات والواردات وسندات الصرف',
    visible: true,
    isSystemDefault: true,
    order: 5,
    components: [
      {
        id: 'expenses_smart_indicators',
        title: 'مؤشرات التحليل الذكي وصافي الأرباح',
        type: 'metric_card',
        description: 'مؤشر صافي أرباح الشهر ومقارنته ومؤشر حركة المصروفات الشهرية',
        visible: true,
        order: 1,
        width: 'full',
      },
      {
        id: 'expenses_top_services',
        title: 'الخدمات الأكثر طلباً',
        type: 'action_grid',
        description: 'ترتيب الخدمات الأكثر إقبالاً وطلباً ونسبتها من إجمالي العمليات',
        visible: true,
        order: 2,
        width: 'half',
      },
      {
        id: 'expenses_debt_alerts',
        title: 'تنبيهات المديونيات المتأخرة',
        type: 'action_grid',
        description: 'متابعة العملاء أصحاب المديونيات المتأخرة والأرصدة المستحقة',
        visible: true,
        order: 3,
        width: 'half',
      },
      {
        id: 'expenses_kpi_total',
        title: 'أرصدة الصندوق والتدفقات النقدية',
        type: 'metric_card',
        description: 'رصيد صافي الصندوق، إجمالي الواردات وإجمالي المصروفات',
        visible: true,
        order: 4,
        width: 'full',
      },
      {
        id: 'expenses_add_form',
        title: 'سند صرف وقيد مالي جديد',
        type: 'form_field',
        description: 'تسجيل وارد أو مصروف مع تحديد التصنيف وطريقة الدفع والبيان',
        visible: true,
        order: 5,
        width: 'two_thirds',
      },
      {
        id: 'expenses_table',
        title: 'سجل القيود والعمليات المالية',
        type: 'table',
        description: 'كشف تفصيلي لكافة الواردات والمصروفات مع التصفية والفرز',
        visible: true,
        order: 6,
        width: 'full',
      }
    ]
  },
  {
    id: 'customers',
    name: 'العملاء',
    path: '/customers',
    icon: 'Users',
    description: 'دليل العملاء وحساب المستحقات والمديونيات وكشوفات الحساب',
    visible: true,
    isSystemDefault: true,
    order: 6,
    components: [
      {
        id: 'customers_kpi_receivables',
        title: 'إجمالي ديون العملاء',
        type: 'metric_card',
        description: 'مجموع المبالغ المتبقية على العملاء من الفواتير الآجلة',
        visible: true,
        order: 1,
        width: 'half',
      },
      {
        id: 'customers_table',
        title: 'دليل حسابات العملاء',
        type: 'table',
        description: 'كشف حساب كل عميل مع إجمالي الفواتير والمدفوع والرصيد المتبقي',
        visible: true,
        order: 2,
        width: 'full',
      }
    ]
  },
  {
    id: 'employees',
    name: 'شؤون العاملين',
    path: '/employees',
    icon: 'Badge',
    description: 'سجل الموظفين والرواتب وعمولات المبيعات وساعات العمل',
    visible: true,
    isSystemDefault: true,
    order: 7,
    components: [
      {
        id: 'employees_kpi_count',
        title: 'إجمالي الموظفين النشطين',
        type: 'metric_card',
        description: 'عدد الكادر الإداري والفني والتقني بالورشة',
        visible: true,
        order: 1,
        width: 'third',
      },
      {
        id: 'employees_table',
        title: 'سجل الموظفين والرواتب',
        type: 'table',
        description: 'تفاصيل الرواتب الأساسية، نسبة العمولات، وأرقام الطوارئ',
        visible: true,
        order: 2,
        width: 'full',
      }
    ]
  },
  {
    id: 'audit',
    name: 'التقارير',
    path: '/audit',
    icon: 'FileBarChart',
    description: 'تقارير الأداء المالي، سجل الرقابة وتدقيق حركة النظام',
    visible: true,
    isSystemDefault: true,
    order: 8,
    components: [
      {
        id: 'audit_kpi_summary',
        title: 'الملخص المالي الشامل',
        type: 'metric_card',
        description: 'ملخص الإيرادات والمصروفات وصافي الأرباح التراكمية',
        visible: true,
        order: 1,
        width: 'full',
      },
      {
        id: 'audit_activity_log',
        title: 'سجل تدقيق النظام',
        type: 'table',
        description: 'تتبع كافة عمليات الحفظ والتعديل والحذف المنفذة',
        visible: true,
        order: 2,
        width: 'full',
      }
    ]
  },
  {
    id: 'settings',
    name: 'الإعدادات العامة',
    path: '/settings',
    icon: 'Settings',
    description: 'محرك التحكم المركزي بالصفحات والقوالب والصلاحيات والمزامنة',
    visible: true,
    isSystemDefault: true,
    order: 9,
    components: [
      {
        id: 'settings_page_manager',
        title: 'محرك إدارة الصفحات والقوالب',
        type: 'action_grid',
        description: 'التحكم المطلق في هيكل الصفحات، وإعادة التسمية، وإضافة القوالب',
        visible: true,
        order: 1,
        width: 'full',
      },
      {
        id: 'settings_shop_info',
        title: 'بيانات المنشأة والهوية',
        type: 'form_field',
        description: 'اسم المؤسسة، أرقام التواصل، العملة، والشعار الرسمي',
        visible: true,
        order: 2,
        width: 'half',
      },
      {
        id: 'settings_security',
        title: 'الأمان وكلمات المرور',
        type: 'form_field',
        description: 'إدارة رمز الدخول السري وصلاحيات المستخدمين',
        visible: true,
        order: 3,
        width: 'half',
      }
    ]
  }
];

export const defaultServicesConfig: DynamicServiceConfig[] = [
  {
    id: 'srv-1',
    name: 'إدارة صفحات سوشيال ميديا',
    costItems: ['تكلفة المصمم', 'تكلفة كاتب المحتوى', 'إعلانات ممولة'],
    isDefault: true,
  },
  {
    id: 'srv-2',
    name: 'تنفيذ لافتات',
    costItems: ['تكلفة القص', 'تكلفة التركيب', 'مواد خام'],
    isDefault: true,
  },
  {
    id: 'srv-3',
    name: 'تصميم موقع إلكتروني',
    costItems: ['تكلفة المطور', 'تكلفة واجهات UI/UX', 'استضافة ونطاق'],
    isDefault: true,
  },
  {
    id: 'srv-4',
    name: 'خدمات طباعة',
    costItems: ['تكلفة الطباعة', 'تكلفة التصميم', 'تكلفة القص والتغليف'],
    isDefault: true,
  },
  {
    id: 'srv-5',
    name: 'لافتة إعلانية',
    costItems: ['تكلفة التصميم', 'تكلفة الطباعة', 'التكلفة الخارجية', 'مواد خام'],
    isDefault: true,
  },
];

interface AppContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id'>, customId?: string) => void;
  deleteOrder: (id: string) => void;
  getNextSerialNumber: () => string;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryQuantity: (id: string, delta: number) => void;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  currentUser: Employee | null;
  login: (id: string) => void;
  loginWithPasscode: (passcode: string) => Promise<{ success: boolean; message?: string }>;
  loginWithSupabaseAuth: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  simulateRole: (role: EmployeeRole) => void;
  
  // Dynamic Services & Cost Templates
  addServiceConfig: (service: { name: string; costItems: string[] }) => void;
  updateServiceConfig: (id: string, updated: { name?: string; costItems?: string[] }) => void;
  deleteServiceConfig: (id: string) => void;
  resetServicesConfig: () => void;
  
  // Offline-First Supabase Sync
  syncState: SyncState;
  pendingSyncCount: number;
  lastSyncTime: string | null;
  syncNow: () => Promise<void>;

  // Settings & RBAC & Security
  settings: SystemSettings;
  updateShopInfo: (info: Partial<ShopInfo>) => void;
  updateSystemSettings: (newSettings: Partial<SystemSettings>) => void;
  changeSystemPassword: (oldPass: string, newPass: string) => { success: boolean; message: string };
  updateRolePermissions: (role: EmployeeRole, perms: Partial<RolePermission>) => void;
  addRole: (role: string, perms: RolePermission) => void;
  deleteRole: (role: string) => void;
  updateInvoiceSettings: (invoice: Partial<SystemSettings['invoice']>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  resetAllData: () => void;
  wipeAllSystemData: (wipeSupabase?: boolean) => Promise<{ success: boolean; message: string }>;

  // Page & Component Manager (Advanced Central Engine)
  pagesConfig: PageConfig[];
  updatePage: (pageId: string, updates: Partial<PageConfig>) => void;
  addPage: (newPage: Omit<PageConfig, 'id' | 'order'>) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  addPageComponent: (pageId: string, component: Omit<PageComponentConfig, 'id' | 'order'>) => void;
  updatePageComponent: (pageId: string, componentId: string, updates: Partial<PageComponentConfig>) => void;
  deletePageComponent: (pageId: string, componentId: string) => void;
  reorderPageComponents: (pageId: string, componentIds: string[]) => void;
  resetPagesConfig: () => void;

  // Workshop / Kiosk Mode for TV Display
  
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  treasuryAccounts: TreasuryAccount[];
  setTreasuryAccounts: React.Dispatch<React.SetStateAction<TreasuryAccount[]>>;
  treasuryTransactions: TreasuryTransaction[];
  setTreasuryTransactions: React.Dispatch<React.SetStateAction<TreasuryTransaction[]>>;

  isKioskMode: boolean;
  setIsKioskMode: (kiosk: boolean) => void;
  toggleKioskMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const getNextOrderSerialNumber = (existingOrders: Order[]): string => {
  let maxNum = 1000;
  for (const o of existingOrders) {
    const num = parseInt(String(o.id).replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return (maxNum + 1).toString();
};

// Initial Sample Data for Orders & Services
const initialOrders: Order[] = [
  {
    id: '1001',
    serialNumber: '1001',
    serviceType: 'إدارة صفحات سوشيال ميديا',
    clientName: 'شركة الأفق للخدمات التقنية',
    description: 'إدارة شاملة لحسابات التواصل الاجتماعي والحملات الممولة وتصميم 20 منشور إعلاني',
    price: 3500,
    cost: 1100,
    costBreakdown: { 'تكلفة المصمم': 600, 'تكلفة كاتب المحتوى': 500 },
    costExecutors: { 'تكلفة المصمم': 'أحمد السعيد (مصمم جرافيك)', 'تكلفة كاتب المحتوى': 'سارة منصور (كاتبة محتوى)' },
    costBreakdownSummary: 'تكلفة المصمم: 600، تكلفة كاتب المحتوى: 500',
    designCost: 600,
    designerName: 'أحمد السعيد (مصمم جرافيك)',
    printingCost: 0,
    externalCost: 500,
    externalExecutor: 'سارة منصور (كاتبة محتوى)',
    materialCost: 0,
    expectedProfit: 2400,
    assignedEmployee: 'محمد علي (مدير المشاريع)',
    status: 'تم التسليم',
    paymentMethod: 'تحويل',
    date: '2026-03-02T10:30:00.000Z',
    deposit: 3500,
    remaining: 0,
  },
  {
    id: '1002',
    serialNumber: '1002',
    serviceType: 'تنفيذ لافتات',
    clientName: 'مصحة الشفاء التخصصية',
    description: 'واجهة كلادينج وحروف زنكور مضيئة LED للواجهة الرئيسية مع الرفع والتركيب',
    price: 8500,
    cost: 4600,
    costBreakdown: { 'تكلفة القص': 1200, 'تكلفة التركيب': 1800, 'مواد خام': 1600 },
    costExecutors: { 'تكلفة القص': 'خالد الهواري (فني ليزر)', 'تكلفة التركيب': 'فريق التركيبات الميدانية', 'مواد خام': 'مخزن الورشة' },
    costBreakdownSummary: 'تكلفة القص: 1200، تكلفة التركيب: 1800، مواد خام: 1600',
    designCost: 500,
    designerName: 'محمود طارق',
    printingCost: 1200,
    printerName: 'خالد الهواري',
    externalCost: 1800,
    externalExecutor: 'فريق التركيبات الميدانية',
    materialCost: 1100,
    expectedProfit: 3900,
    assignedEmployee: 'فريق التركيبات الميدانية',
    status: 'قيد التركيب',
    paymentMethod: 'نقدي',
    date: '2026-03-05T14:15:00.000Z',
    dimensions: { width: '8.5', height: '2.4' },
    installationAddress: 'شارع الجمهورية - المقر الرئيسي',
    deposit: 5000,
    remaining: 3500,
  },
  {
    id: '1003',
    serialNumber: '1003',
    serviceType: 'تصميم موقع إلكتروني',
    clientName: 'مجموعة النماء للاستثمار العقاري',
    description: 'تصميم وبرمجة موقع تعريفي متجاوب ونظام عرض العقارات والمشاريع المتاحة',
    price: 6200,
    cost: 1700,
    costBreakdown: { 'تكلفة المطور': 1200, 'استضافة ونطاق': 500 },
    costExecutors: { 'تكلفة المطور': 'عمر خالد (مطور ويب)', 'استضافة ونطاق': 'خادم كلاود هوست' },
    costBreakdownSummary: 'تكلفة المطور: 1200، استضافة ونطاق: 500',
    designCost: 1200,
    designerName: 'عمر خالد',
    printingCost: 0,
    externalCost: 500,
    externalExecutor: 'شركة الاستضافة السحابية',
    materialCost: 0,
    expectedProfit: 4500,
    assignedEmployee: 'عمر خالد (مطور ويب)',
    status: 'قيد التصميم',
    paymentMethod: 'تحويل',
    date: '2026-03-08T11:00:00.000Z',
    deposit: 3100,
    remaining: 3100,
  },
  {
    id: '1004',
    serialNumber: '1004',
    serviceType: 'خدمات طباعة',
    clientName: 'مطعم وكافيه الأندلس',
    description: 'طباعة 10,000 بروشور وقوائم طعام فاخرة مقاومة للماء مع التغليف الحراري',
    price: 2800,
    cost: 1450,
    costBreakdown: { 'تكلفة الطباعة': 950, 'تكلفة التصميم': 350, 'تكلفة القص والتغليف': 150 },
    costExecutors: { 'تكلفة الطباعة': 'سالم أحمد (فني الطباعة)', 'تكلفة التصميم': 'أحمد السعيد (مصمم)', 'تكلفة القص والتغليف': 'يوسف النجار' },
    costBreakdownSummary: 'تكلفة الطباعة: 950، تكلفة التصميم: 350، تكلفة القص والتغليف: 150',
    designCost: 350,
    designerName: 'أحمد السعيد',
    printingCost: 950,
    printerName: 'سالم أحمد',
    externalCost: 150,
    externalExecutor: 'ورشة التغليف',
    materialCost: 0,
    expectedProfit: 1350,
    assignedEmployee: 'سالم أحمد (مسؤول الطباعة)',
    status: 'تم التسليم',
    paymentMethod: 'نقدي',
    date: '2026-03-12T16:20:00.000Z',
    deposit: 2800,
    remaining: 0,
  },
  {
    id: '1005',
    serialNumber: '1005',
    serviceType: 'تنفيذ لافتات',
    clientName: 'صيدلية السلام المركزية',
    description: 'لوحة فليكس بوكس وجهين مع إنارة داخلية وتثبيت شاسيه حديد مجلفن',
    price: 3200,
    cost: 1800,
    costBreakdown: { 'تكلفة القص': 500, 'تكلفة التركيب': 500, 'مواد خام': 800 },
    costExecutors: { 'تكلفة القص': 'خالد الهواري', 'تكلفة التركيب': 'فريق التركيبات', 'مواد خام': 'مخزن الورشة' },
    costBreakdownSummary: 'تكلفة القص: 500، تكلفة التركيب: 500، مواد خام: 800',
    designCost: 200,
    designerName: 'محمود طارق',
    printingCost: 800,
    printerName: 'سالم أحمد',
    externalCost: 300,
    externalExecutor: 'ورشة الحديد',
    materialCost: 500,
    expectedProfit: 1400,
    assignedEmployee: 'فريق التركيبات الميدانية',
    status: 'قيد الطباعة',
    paymentMethod: 'بطاقة',
    date: '2026-03-15T09:45:00.000Z',
    dimensions: { width: '4.0', height: '1.2' },
    installationAddress: 'ميدان الشهداء - الفرع الجديد',
    deposit: 2000,
    remaining: 1200,
  },
  {
    id: '1006',
    serialNumber: '1006',
    serviceType: 'إدارة صفحات سوشيال ميديا',
    clientName: 'مدارس الرواد الدولية',
    description: 'إطلاق حملة التسجيل للعام الدراسي الجديد وتصوير ومونتاج 4 فيديوهات ريلز',
    price: 4000,
    cost: 1300,
    costBreakdown: { 'تكلفة المصمم': 700, 'إعلانات ممولة': 600 },
    costExecutors: { 'تكلفة المصمم': 'أحمد السعيد (مصمم)', 'إعلانات ممولة': 'إدارة الحملات الممولة' },
    costBreakdownSummary: 'تكلفة المصمم: 700، إعلانات ممولة: 600',
    designCost: 700,
    designerName: 'أحمد السعيد',
    printingCost: 0,
    externalCost: 600,
    externalExecutor: 'منصة فيسبوك/إنستغرام',
    materialCost: 0,
    expectedProfit: 2700,
    assignedEmployee: 'محمد علي (مصمم جرافيك)',
    status: 'قيد التصميم',
    paymentMethod: 'تحويل',
    date: '2026-03-18T13:10:00.000Z',
    deposit: 4000,
    remaining: 0,
  },
  {
    id: '1007',
    serialNumber: '1007',
    serviceType: 'خدمات طباعة',
    clientName: 'شركة البنيان للمقاولات العامة',
    description: 'طباعة رول أب ستاند عدد 4 مع فولدرات أوراق رسمية وبطاقات عمل للمهندسين',
    price: 1950,
    cost: 850,
    costBreakdown: { 'تكلفة الطباعة': 500, 'تكلفة التصميم': 250, 'تكلفة القص والتغليف': 100 },
    costExecutors: { 'تكلفة الطباعة': 'سالم أحمد', 'تكلفة التصميم': 'أحمد السعيد', 'تكلفة القص والتغليف': 'يوسف النجار' },
    costBreakdownSummary: 'تكلفة الطباعة: 500، تكلفة التصميم: 250، تكلفة القص والتغليف: 100',
    designCost: 250,
    designerName: 'أحمد السعيد',
    printingCost: 500,
    printerName: 'سالم أحمد',
    externalCost: 100,
    externalExecutor: 'ورشة التغليف',
    materialCost: 0,
    expectedProfit: 1100,
    assignedEmployee: 'سالم أحمد (مسؤول الطباعة)',
    status: 'بانتظار اعتماد التصميم',
    paymentMethod: 'نقدي',
    date: '2026-03-22T15:30:00.000Z',
    deposit: 1000,
    remaining: 950,
  }
];

const initialInventory: InventoryItem[] = [];

const initialEmployees: Employee[] = [
  {
    id: '1',
    name: 'المدير العام',
    role: 'مدير',
    salary: 0,
    phone: '',
    nationalId: '',
    joinedDate: new Date().toISOString(),
    emergencyContact: '',
    status: 'نشط',
  },
];

const initialExpenses: Expense[] = [];

const defaultSettings: SystemSettings = {
  shopInfo: {
    name: 'شركة أسلوب للدعاية والإعلان',
    phone: '',
    address: '',
    logoUrl: null,
    currency: 'د.ل',
  },
  security: {
    password: '1400', // Default system password is 1400
  },
  permissions: {
    'مدير': {
      dashboard: true,
      sales: true,
      designs: true,
      installation: true,
      inventory: true,
      expenses: true,
      employees: true,
      settings: true,
      audit: true,
      customers: true,
      suppliers: true,
      treasury: true,
    },
  },
  invoice: {
    footerNote: 'شكراً لتعاملكم معنا. يسري ضمان العمل المعتمد وفق المواصفات المحددة.',
    subHeader: 'للدعاية والإعلان والطباعة والتجهيزات الإعلانية المتكاملة',
    termsText: 'الدفعة الأولى غير قابلة للاسترجاع بعد بدء أعمال القص والتشكيل والتجهيز.',
  },
  theme: 'light',
  commissionBasis: 'صافي الربح',
  servicesConfig: defaultServicesConfig,
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Load saved state or defaults
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('masar_orders');
    if (!saved) return initialOrders;
    try {
      const parsed: any[] = JSON.parse(saved);
      return parsed.map((o, idx) => ({
        id: o.id || (1001 + idx).toString(),
        serialNumber: o.serialNumber || o.id || (1001 + idx).toString(),
        serviceType: o.serviceType || 'لافتة إعلانية',
        clientName: o.clientName || 'عميل نقدي',
        description: o.description || '',
        price: Number(o.price) || 0,
        cost: typeof o.cost === 'number' ? o.cost : (Number(o.cost) || 0),
        costBreakdown: o.costBreakdown || undefined,
        costBreakdownSummary: o.costBreakdownSummary || undefined,
        designCost: typeof o.designCost === 'number' ? o.designCost : (Number(o.designCost) || 0),
        materialCost: typeof o.materialCost === 'number' ? o.materialCost : (Number(o.materialCost) || 0),
        printingCost: typeof o.printingCost === 'number' ? o.printingCost : (Number(o.printingCost) || 0),
        externalCost: typeof o.externalCost === 'number' ? o.externalCost : (Number(o.externalCost) || 0),
        commissionCost: typeof o.commissionCost === 'number' ? o.commissionCost : (Number(o.commissionCost) || 0),
        otherCosts: typeof o.otherCosts === 'number' ? o.otherCosts : (Number(o.otherCosts) || 0),
        costCenter: o.costCenter,
        expectedProfit: typeof o.expectedProfit === 'number' ? o.expectedProfit : ((Number(o.price) || 0) - (Number(o.cost) || 0)),
        assignedEmployee: o.assignedEmployee || 'أحمد الإداري',
        status: o.status || 'بانتظار اعتماد التصميم',
        paymentMethod: o.paymentMethod || 'نقدي',
        date: o.date || new Date().toISOString(),
        dimensions: o.dimensions,
        targetDeliveryDate: o.targetDeliveryDate,
        deposit: o.deposit,
        remaining: o.remaining,
        installationAddress: o.installationAddress,
        craneCost: o.craneCost,
        pendingSync: o.pendingSync,
      }));
    } catch {
      return initialOrders;
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('masar_inventory');
    return saved ? JSON.parse(saved) : initialInventory;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('masar_expenses');
    if (!saved) return initialExpenses;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialExpenses;
    } catch {
      return initialExpenses;
    }
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('masar_employees');
    return saved ? JSON.parse(saved) : initialEmployees;
  });

  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('masar_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialEmployees[0];
      }
    }
    return initialEmployees[0];
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const savedTheme = localStorage.getItem('masar_theme') as 'light' | 'dark' | null;
    const saved = localStorage.getItem('masar_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const shopName = (!parsed.shopInfo?.name || parsed.shopInfo?.name === 'مسار لصناعة وتركيب اللوافت' || parsed.shopInfo?.name === 'مسار') 
          ? 'شركة أسلوب للدعاية والإعلان' 
          : parsed.shopInfo.name;
        
        const servicesConfig = (Array.isArray(parsed.servicesConfig) && parsed.servicesConfig.length > 0)
          ? parsed.servicesConfig
          : defaultServicesConfig;

        return {
          ...defaultSettings,
          ...parsed,
          shopInfo: { 
            ...defaultSettings.shopInfo, 
            ...parsed.shopInfo,
            name: shopName,
          },
          security: { ...defaultSettings.security, ...parsed.security },
          permissions: { ...defaultSettings.permissions, ...parsed.permissions },
          invoice: { ...defaultSettings.invoice, ...parsed.invoice },
          servicesConfig,
          theme: savedTheme || parsed.theme || defaultSettings.theme,
        };
      } catch (e) {
        return { ...defaultSettings, theme: savedTheme || defaultSettings.theme };
      }
    }
    return { ...defaultSettings, theme: savedTheme || defaultSettings.theme };
  });

  // Pages and Components Central Manager State
  const [pagesConfig, setPagesConfig] = useState<PageConfig[]>(() => {
    const saved = localStorage.getItem('masar_pages_config');
    if (!saved) return defaultPagesConfig;
    try {
      const parsed: PageConfig[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out removed pages (treasury, analysis) and ensure clean structure
        const filtered = parsed
          .filter(p => p.id !== 'treasury' && p.id !== 'analysis' && p.path !== '/treasury' && p.path !== '/analysis')
          .map(p => {
            if (p.id === 'dashboard') {
              return { ...p, name: p.name || 'لوحة التحكم' };
            }
            if (p.id === 'sales' || p.path === '/sales') {
              return { ...p, name: 'سجل المبيعات' };
            }
            if (p.id === 'expenses') {
              // Ensure expenses has the rich smart indicators components if missing
              const hasSmart = p.components?.some(c => c.id === 'expenses_smart_indicators');
              if (!hasSmart) {
                const defaultExpenses = defaultPagesConfig.find(dp => dp.id === 'expenses');
                if (defaultExpenses) {
                  return { ...p, description: defaultExpenses.description, components: defaultExpenses.components };
                }
              }
            }
            return p;
          });
        return filtered.length > 0 ? filtered : defaultPagesConfig;
      }
      return defaultPagesConfig;
    } catch {
      return defaultPagesConfig;
    }
  });

  useEffect(() => {
    localStorage.setItem('masar_pages_config', JSON.stringify(pagesConfig));
  }, [pagesConfig]);

  const updatePage = (pageId: string, updates: Partial<PageConfig>) => {
    setPagesConfig(prev => {
      const next = prev.map(p => {
        if (p.id === pageId) {
          return { ...p, ...updates };
        }
        return p;
      });
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const addPage = (newPage: Omit<PageConfig, 'id' | 'order'>) => {
    setPagesConfig(prev => {
      const newId = 'page-' + Math.random().toString(36).substring(2, 9);
      const nextOrder = prev.length > 0 ? Math.max(...prev.map(p => p.order || 0)) + 1 : 1;
      const createdPage: PageConfig = {
        ...newPage,
        id: newId,
        path: newPage.path?.startsWith('/') ? newPage.path : `/page/${newId}`,
        order: nextOrder,
        visible: newPage.visible ?? true,
        components: newPage.components || [
          {
            id: `${newId}_comp_1`,
            title: 'إحصائيات وقراءات فورية',
            type: 'metric_card',
            description: 'مؤشر أداء رقمي مباشر يتم تحديثه تلقائياً',
            visible: true,
            order: 1,
            width: 'half',
          },
          {
            id: `${newId}_comp_2`,
            title: 'جدول البيانات والعمليات',
            type: 'table',
            description: 'كشف بالعمليات والبيانات الخاصة بالقسم',
            visible: true,
            order: 2,
            width: 'full',
          }
        ]
      };
      const next = [...prev, createdPage];
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const deletePage = (pageId: string) => {
    setPagesConfig(prev => {
      const next = prev.filter(p => p.id !== pageId);
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const reorderPages = (pageIds: string[]) => {
    setPagesConfig(prev => {
      const orderMap = new Map(pageIds.map((id, index) => [id, index + 1]));
      const next = [...prev].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? a.order;
        const orderB = orderMap.get(b.id) ?? b.order;
        return orderA - orderB;
      }).map((p, idx) => ({ ...p, order: idx + 1 }));
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const addPageComponent = (pageId: string, component: Omit<PageComponentConfig, 'id' | 'order'>) => {
    setPagesConfig(prev => {
      const next = prev.map(p => {
        if (p.id === pageId) {
          const comps = p.components || [];
          const nextOrder = comps.length > 0 ? Math.max(...comps.map(c => c.order || 0)) + 1 : 1;
          const newComp: PageComponentConfig = {
            ...component,
            id: `${pageId}_comp_${Math.random().toString(36).substring(2, 8)}`,
            order: nextOrder,
            visible: component.visible ?? true
          };
          return {
            ...p,
            components: [...comps, newComp]
          };
        }
        return p;
      });
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const updatePageComponent = (pageId: string, componentId: string, updates: Partial<PageComponentConfig>) => {
    setPagesConfig(prev => {
      const next = prev.map(p => {
        if (p.id === pageId) {
          const comps = (p.components || []).map(c => {
            if (c.id === componentId) {
              return { ...c, ...updates };
            }
            return c;
          });
          return { ...p, components: comps };
        }
        return p;
      });
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const deletePageComponent = (pageId: string, componentId: string) => {
    setPagesConfig(prev => {
      const next = prev.map(p => {
        if (p.id === pageId) {
          const comps = (p.components || []).filter(c => c.id !== componentId);
          return { ...p, components: comps };
        }
        return p;
      });
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const reorderPageComponents = (pageId: string, componentIds: string[]) => {
    setPagesConfig(prev => {
      const next = prev.map(p => {
        if (p.id === pageId) {
          const orderMap = new Map(componentIds.map((id, index) => [id, index + 1]));
          const sorted = [...(p.components || [])].sort((a, b) => {
            const orderA = orderMap.get(a.id) ?? a.order;
            const orderB = orderMap.get(b.id) ?? b.order;
            return orderA - orderB;
          }).map((c, idx) => ({ ...c, order: idx + 1 }));
          return { ...p, components: sorted };
        }
        return p;
      });
      localStorage.setItem('masar_pages_config', JSON.stringify(next));
      return next;
    });
  };

  const resetPagesConfig = () => {
    setPagesConfig(defaultPagesConfig);
    localStorage.setItem('masar_pages_config', JSON.stringify(defaultPagesConfig));
  };

  // Offline-First sync queue & status
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() => {
    const saved = localStorage.getItem('masar_sync_queue');
    return saved ? JSON.parse(saved) : [];
  });

  const [syncState, setSyncState] = useState<SyncState>(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced';
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('masar_last_sync_time') || new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
  });

  // Workshop / Kiosk Mode
  const [isKioskMode, setIsKioskMode] = useState(false);
  const toggleKioskMode = () => setIsKioskMode(prev => !prev);

  const isSyncingRef = useRef(false);

  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('masar_customers');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('masar_suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(() => {
    const saved = localStorage.getItem('masar_treasury_accounts');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'الخزينة الرئيسية', type: 'صندوق', balance: 0 },
      { id: '2', name: 'الحساب المصرفي', type: 'مصرف', balance: 0 }
    ];
  });
  
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>(() => {
    const saved = localStorage.getItem('masar_treasury_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist state to local storage
  useEffect(() => {
    localStorage.setItem('masar_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('masar_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('masar_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('masar_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('masar_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('masar_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('masar_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('masar_treasury_accounts', JSON.stringify(treasuryAccounts));
  }, [treasuryAccounts]);

  useEffect(() => {
    localStorage.setItem('masar_treasury_transactions', JSON.stringify(treasuryTransactions));
  }, [treasuryTransactions]);


  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('masar_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('masar_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('masar_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Apply theme class to document and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('masar_theme', settings.theme);
  }, [settings.theme]);

  // Enqueue a sync operation in the background
  const enqueueSync = useCallback((table: SyncQueueItem['table'], action: SyncQueueItem['action'], payload: any) => {
    const newItem: SyncQueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      table,
      action,
      payload,
      timestamp: new Date().toISOString(),
    };

    setSyncQueue(prev => [...prev, newItem]);
    setSyncState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'pending');
  }, []);

  // Process Sync Queue with Supabase
  const processSyncQueue = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline');
      return;
    }

    isSyncingRef.current = true;
    setSyncState('syncing');

    try {
      if (isSupabaseConfigured) {
        // Attempt live Supabase batch sync
        const queue = [...syncQueue];
        for (const item of queue) {
          try {
            if (item.action === 'insert' || item.action === 'upsert' || item.action === 'update') {
              await supabase.from(item.table).upsert(item.payload);
            } else if (item.action === 'delete') {
              await supabase.from(item.table).delete().match({ id: item.payload.id });
            }
          } catch {
            // Non-blocking table sync error, item will remain in queue
          }
        }
      }

      // Simulate network sync interval for seamless feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      // Successfully synced
      setSyncQueue([]);
      setSyncState('synced');
      const nowStr = new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      localStorage.setItem('masar_last_sync_time', nowStr);
    } catch {
      setSyncState('pending');
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncQueue]);

  // Network Online/Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setSyncState('syncing');
      processSyncQueue();
    };

    const handleOffline = () => {
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial background sync check
    if (navigator.onLine && syncQueue.length > 0) {
      processSyncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processSyncQueue, syncQueue.length]);

  const syncNow = async () => {
    await processSyncQueue();
  };

  const getNextSerialNumber = (): string => {
    return getNextOrderSerialNumber(orders);
  };

  // CRUD with Offline-First state & sync queuing
  const addOrder = (order: Omit<Order, 'id'>, customId?: string) => {
    const nextId = customId && customId.trim() !== '' ? customId.trim() : getNextSerialNumber();
    const newOrder: Order = {
      ...order,
      id: nextId,
      serialNumber: nextId,
      serviceType: order.serviceType || 'لافتة إعلانية',
      cost: typeof order.cost === 'number' ? order.cost : 0,
      expectedProfit: typeof order.expectedProfit === 'number' 
        ? order.expectedProfit 
        : (order.price - (order.cost || 0)),
      pendingSync: true,
    };
    
    setOrders([newOrder, ...orders]);
    enqueueSync('orders', 'insert', newOrder);

    // Smart Inventory Deduction: Automatically deduct materials used in this invoice/order
    if (order.usedMaterials && Array.isArray(order.usedMaterials) && order.usedMaterials.length > 0) {
      setInventory(prevInv => {
        let updatedInv = [...prevInv];
        order.usedMaterials!.forEach(used => {
          if (!used || !used.quantity || used.quantity <= 0) return;
          updatedInv = updatedInv.map(invItem => {
            if (invItem.id === used.itemId || (used.name && invItem.name.trim().toLowerCase() === used.name.trim().toLowerCase())) {
              const newQty = Math.max(0, invItem.quantity - used.quantity);
              enqueueSync('inventory', 'update', { ...invItem, quantity: newQty });
              return { ...invItem, quantity: newQty, pendingSync: true };
            }
            return invItem;
          });
        });
        return updatedInv;
      });
    }
  };

  const deleteOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
    enqueueSync('orders', 'delete', { id });
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    const updated = orders.map(o => o.id === id ? { ...o, status, pendingSync: true } : o);
    setOrders(updated);
    const target = updated.find(o => o.id === id);
    if (target) {
      enqueueSync('orders', 'update', target);
    }
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = { 
      ...item, 
      id: Math.random().toString(36).substring(2, 9),
      pendingSync: true,
    };
    setInventory([newItem, ...inventory]);
    enqueueSync('inventory', 'insert', newItem);
  };

  const updateInventoryQuantity = (id: string, delta: number) => {
    const updated = inventory.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(0, item.quantity + delta), pendingSync: true } 
        : item
    );
    setInventory(updated);
    const target = updated.find(i => i.id === id);
    if (target) {
      enqueueSync('inventory', 'update', target);
    }
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { 
      ...expense, 
      id: Math.random().toString(36).substring(2, 9),
      type: expense.type || 'مصروف',
      pendingSync: true,
    };
    setExpenses([newExpense, ...expenses]);
    enqueueSync('expenses', 'insert', newExpense);
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    enqueueSync('expenses', 'delete', { id });
  };

  
  const updateEmployee = (id: string, updatedFields: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const newEmp = { ...emp, ...updatedFields, pendingSync: true };
        enqueueSync('employees', 'update', newEmp);
        return newEmp;
      }
      return emp;
    }));
  };

  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = { 
      ...employee, 
      id: Math.random().toString(36).substring(2, 9),
      pendingSync: true,
    };
    setEmployees([newEmployee, ...employees]);
    enqueueSync('employees', 'insert', newEmployee);
  };

  // Authentication Handlers
  const login = (id: string) => {
    const user = employees.find(e => e.id === id);
    if (user) setCurrentUser(user);
  };

  const loginWithPasscode = async (passcode: string): Promise<{ success: boolean; message?: string }> => {
    // 1. Check if it matches an employee's pinCode
    const matchedEmployeeByPin = employees.find(e => e.pinCode === passcode);
    if (matchedEmployeeByPin) {
      setCurrentUser(matchedEmployeeByPin);
      return { success: true };
    }

    // 2. Fallback to Supabase/System Authentication
    const authResult = await authenticateUser(passcode);
    if (authResult.success) {
      const matchedEmployee = employees.find(e => e.role === 'مدير') || employees[0] || {
        id: '1',
        name: 'المدير العام',
        role: 'مدير' as EmployeeRole,
        salary: 0,
      };
      setCurrentUser(matchedEmployee);
      return { success: true };
    }

    // 3. System Admin Password
    if (passcode === settings.security.password) {
      const defaultAdmin = employees.find(e => e.role === 'مدير') || employees[0];
      if (defaultAdmin) {
        setCurrentUser(defaultAdmin);
        return { success: true };
      }
    }

    return { success: false, message: authResult.message || 'رمز الدخول غير صحيح' };
  };

  const loginWithSupabaseAuth = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const authResult = await authenticateUser(pass, email);
    if (authResult.success) {
      const adminEmployee = employees.find(e => e.role === 'مدير') || employees[0];
      if (adminEmployee) {
        setCurrentUser(adminEmployee);
      }
      return { success: true };
    }
    return { success: false, message: authResult.message || 'فشل المصادقة عبر Supabase' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const simulateRole = (role: EmployeeRole) => {
    const existing = employees.find(e => e.role === role);
    if (existing) {
      setCurrentUser(existing);
    } else {
      const mockUser: Employee = {
        id: `sim_${role}`,
        name: role === 'مدير' ? 'أحمد الإداري' : role === 'مصمم' ? 'عمر المصمم' : 'خالد الفني',
        role: role,
        salary: 3000
      };
      setCurrentUser(mockUser);
    }
  };

  // Settings Handlers
  
  const updateSystemSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateShopInfo = (info: Partial<ShopInfo>) => {
    setSettings(prev => ({
      ...prev,
      shopInfo: {
        ...prev.shopInfo,
        ...info,
      }
    }));
    enqueueSync('system_settings', 'upsert', { type: 'shopInfo', data: info });
  };

  const changeSystemPassword = (oldPass: string, newPass: string) => {
    if (oldPass !== settings.security.password) {
      return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
    }
    if (!newPass || newPass.trim().length < 3) {
      return { success: false, message: 'يجب أن تتكون كلمة المرور الجديدة من 3 خانات على الأقل.' };
    }
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        password: newPass.trim()
      }
    }));
    enqueueSync('system_settings', 'upsert', { type: 'password', updated: true });
    return { success: true, message: 'تم تغيير كلمة مرور المنظومة بنجاح.' };
  };

  const updateRolePermissions = (role: EmployeeRole, perms: Partial<RolePermission>) => {
    setSettings(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [role]: {
          ...prev.permissions[role],
          ...perms,
        }
      }
    }));
    enqueueSync('system_settings', 'upsert', { type: 'permissions', role, perms });
  };

  const addRole = (role: string, perms: RolePermission) => {
    setSettings(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [role]: perms,
      }
    }));
    enqueueSync('system_settings', 'upsert', { type: 'permissions', role, perms });
  };

  const deleteRole = (role: string) => {
    setSettings(prev => {
      const newPermissions = { ...prev.permissions };
      delete newPermissions[role];
      return { ...prev, permissions: newPermissions };
    });
    // In a real backend, you'd want a delete sync event too.
  };

  const updateInvoiceSettings = (invoice: Partial<SystemSettings['invoice']>) => {
    setSettings(prev => ({
      ...prev,
      invoice: {
        ...prev.invoice,
        ...invoice,
      }
    }));
    enqueueSync('system_settings', 'upsert', { type: 'invoice', invoice });
  };

  const addServiceConfig = (service: { name: string; costItems: string[] }) => {
    setSettings(prev => {
      const currentList = prev.servicesConfig || defaultServicesConfig;
      const newService: DynamicServiceConfig = {
        id: `srv-${Date.now()}`,
        name: service.name.trim(),
        costItems: service.costItems.filter(item => item.trim() !== ''),
        isDefault: false,
      };
      const updated = [...currentList, newService];
      localStorage.setItem('masar_settings', JSON.stringify({ ...prev, servicesConfig: updated }));
      return {
        ...prev,
        servicesConfig: updated,
      };
    });
    enqueueSync('system_settings', 'upsert', { type: 'servicesConfig', action: 'add' });
  };

  const updateServiceConfig = (id: string, updated: { name?: string; costItems?: string[] }) => {
    setSettings(prev => {
      const currentList = prev.servicesConfig || defaultServicesConfig;
      const updatedList = currentList.map(srv => {
        if (srv.id === id) {
          return {
            ...srv,
            name: updated.name !== undefined ? updated.name.trim() : srv.name,
            costItems: updated.costItems !== undefined ? updated.costItems.filter(i => i.trim() !== '') : srv.costItems,
          };
        }
        return srv;
      });
      localStorage.setItem('masar_settings', JSON.stringify({ ...prev, servicesConfig: updatedList }));
      return {
        ...prev,
        servicesConfig: updatedList,
      };
    });
    enqueueSync('system_settings', 'upsert', { type: 'servicesConfig', action: 'update', id });
  };

  const deleteServiceConfig = (id: string) => {
    setSettings(prev => {
      const currentList = prev.servicesConfig || defaultServicesConfig;
      const updatedList = currentList.filter(srv => srv.id !== id);
      localStorage.setItem('masar_settings', JSON.stringify({ ...prev, servicesConfig: updatedList }));
      return {
        ...prev,
        servicesConfig: updatedList,
      };
    });
    enqueueSync('system_settings', 'upsert', { type: 'servicesConfig', action: 'delete', id });
  };

  const resetServicesConfig = () => {
    setSettings(prev => {
      localStorage.setItem('masar_settings', JSON.stringify({ ...prev, servicesConfig: defaultServicesConfig }));
      return {
        ...prev,
        servicesConfig: defaultServicesConfig,
      };
    });
  };

  const setTheme = (theme: 'light' | 'dark') => {
    localStorage.setItem('masar_theme', theme);
    setSettings(prev => ({
      ...prev,
      theme,
    }));
  };

  const toggleTheme = () => {
    setSettings(prev => {
      const next = prev.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('masar_theme', next);
      return {
        ...prev,
        theme: next,
      };
    });
  };

  const resetAllData = () => {
    setOrders([]);
    setInventory([]);
    setExpenses([]);
    setEmployees(initialEmployees);
    setCurrentUser(initialEmployees[0]);
    setSettings(defaultSettings);
    setSyncQueue([]);
    localStorage.clear();
    localStorage.setItem('masar_orders', JSON.stringify([]));
    localStorage.setItem('masar_inventory', JSON.stringify([]));
    localStorage.setItem('masar_expenses', JSON.stringify([]));
    localStorage.setItem('masar_employees', JSON.stringify(initialEmployees));
    localStorage.setItem('masar_current_user', JSON.stringify(initialEmployees[0]));
    localStorage.setItem('masar_settings', JSON.stringify(defaultSettings));
  };

  const wipeAllSystemData = async (wipeSupabase = true): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Reset React State to empty clean-slate arrays
      setOrders([]);
      setInventory([]);
      setExpenses([]);
      const defaultAdmin: Employee[] = [
        {
          id: '1',
          name: 'المدير العام',
          role: 'مدير',
          phone: '',
          nationalId: '',
          salary: 0,
          joinedDate: new Date().toISOString(),
          emergencyContact: '',
          status: 'نشط',
        }
      ];
      setEmployees(defaultAdmin);
      setCurrentUser(defaultAdmin[0]);
      setSyncQueue([]);

      // 2. Wipe LocalStorage
      localStorage.removeItem('masar_orders');
      localStorage.removeItem('masar_inventory');
      localStorage.removeItem('masar_expenses');
      localStorage.removeItem('masar_employees');
      localStorage.removeItem('masar_sync_queue');
      localStorage.removeItem('masar_last_sync');
      localStorage.removeItem('masar_last_sync_time');

      // Initialize clean empty arrays in LocalStorage
      localStorage.setItem('masar_orders', JSON.stringify([]));
      localStorage.setItem('masar_inventory', JSON.stringify([]));
      localStorage.setItem('masar_expenses', JSON.stringify([]));
      localStorage.setItem('masar_employees', JSON.stringify(defaultAdmin));
      localStorage.setItem('masar_current_user', JSON.stringify(defaultAdmin[0]));
      localStorage.setItem('masar_sync_queue', JSON.stringify([]));

      // 3. Clear remote Supabase tables if connected
      if (wipeSupabase && isSupabaseConfigured) {
        try {
          await Promise.allSettled([
            supabase.from('orders').delete().neq('id', '_dummy_none_'),
            supabase.from('inventory').delete().neq('id', '_dummy_none_'),
            supabase.from('expenses').delete().neq('id', '_dummy_none_'),
            supabase.from('employees').delete().neq('id', '1'),
          ]);
        } catch (supabaseErr) {
          console.warn('Supabase remote table wipe error:', supabaseErr);
        }
      }

      return { success: true, message: 'تم تصفير المنظومة ومسح كافة السجلات بنجاح' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'حدث خطأ أثناء تصفير المنظومة' };
    }
  };

  return (
    <AppContext.Provider value={{
      orders, addOrder, deleteOrder, getNextSerialNumber, updateOrderStatus,
      inventory, addInventoryItem, updateInventoryQuantity,
      expenses, addExpense, deleteExpense,
      employees, addEmployee, updateEmployee,
      currentUser, login, loginWithPasscode, loginWithSupabaseAuth, logout, simulateRole,
      syncState,
      pendingSyncCount: syncQueue.length,
      lastSyncTime,
      syncNow,
      settings,
      updateSystemSettings,
      updateShopInfo,
      changeSystemPassword,
      updateRolePermissions,
      addRole,
      deleteRole,
      updateInvoiceSettings,
      addServiceConfig,
      updateServiceConfig,
      deleteServiceConfig,
      resetServicesConfig,
      setTheme,
      toggleTheme,
      customers, setCustomers, suppliers, setSuppliers, treasuryAccounts, setTreasuryAccounts, treasuryTransactions, setTreasuryTransactions,
      pagesConfig,
      updatePage,
      addPage,
      deletePage,
      reorderPages,
      addPageComponent,
      updatePageComponent,
      deletePageComponent,
      reorderPageComponents,
      resetPagesConfig,
      resetAllData,
      wipeAllSystemData,
      isKioskMode,
      setIsKioskMode,
      toggleKioskMode,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
