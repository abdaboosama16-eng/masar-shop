
export type CommissionBasis = 'إجمالي المبيعات' | 'صافي الربح' | 'المبلغ المحصل';
export type CommissionStatus = 'مستحقة' | 'معتمدة' | 'مدفوعة';

export interface CommissionRecord {
  id: string;
  orderId: string;
  amount: number;
  status: CommissionStatus;
  date: string;
  description?: string;
}
export type OrderStatus = 'بانتظار اعتماد التصميم' | 'قيد التصميم' | 'قيد الطباعة' | 'قيد التركيب' | 'تم التسليم';
export type PaymentMethod = 'نقدي' | 'بطاقة' | 'تحويل' | 'آجل';
export type ServiceType = string;
export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline';

export interface DynamicServiceConfig {
  id: string;
  name: string;
  costItems: string[];
  isDefault?: boolean;
}

export interface OrderMaterialUsage {
  itemId: string;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalCost?: number;
}

export interface AuditLogEntry {
  date: string;
  user: string;
  action: string;
  details?: string;
}

export interface Order {
  id: string;
  serialNumber?: string;
  serviceType?: ServiceType;
  costCenter?: string; // مركز التكلفة
  clientName: string;
  clientId?: string;
  description: string;
  price: number;
  
  // Detailed Costs & Dynamic Cost Breakdown
  cost?: number; // Total direct cost
  costBreakdown?: Record<string, number>; // Dynamic cost items breakdown: { "تكلفة المصمم": 500, "تكلفة كاتب المحتوى": 300 }
  costExecutors?: Record<string, string>; // Dynamic executor/employee mapping for cost items: { "تكلفة المصمم": "أحمد", "تكلفة الطباعة": "خالد" }
  costBreakdownSummary?: string; // Pre-calculated or helper summary string
  designCost?: number; // تكلفة التصميم (legacy compatibility)
  designerName?: string; // اسم المصمم المنفذ
  materialCost?: number; // تكلفة المواد (legacy compatibility)
  printingCost?: number; // تكلفة الطباعة (legacy compatibility)
  printerName?: string; // اسم فني الطباعة المنفذ
  externalCost?: number; // تكاليف خارجية (legacy compatibility)
  externalExecutor?: string; // اسم المنفذ الخارجي / الورشة
  commissionCost?: number; // عمولة التنفيذ
  otherCosts?: number; // مصروفات إضافية
  
  expectedProfit?: number; // صافي الربح المتوقع
  assignedEmployee?: string; 
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  date: string; // ISO string
  dimensions?: { width: string; height: string };
  targetDeliveryDate?: string;
  deposit?: number;
  remaining?: number;
  isPaid?: boolean; // مؤشر حالة الخلاص / الدفع السريع
  paidAt?: string; // تاريخ وساعة تأكيد الدفع
  installationAddress?: string;
  craneCost?: number;
  usedMaterials?: OrderMaterialUsage[]; 
  attachments?: string[]; // روابط المرفقات
  auditLog?: AuditLogEntry[]; // سجل العمليات والتدقيق
  notes?: string; // الملاحظات الإضافية والتعليمات الخاصة بالطلبية
  pendingSync?: boolean;
  commissions?: CommissionRecord[];
}

export interface InventoryTransaction {
  date: string;
  type: 'وارد' | 'منصرف';
  quantity: number;
  unitCost?: number;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minLimit: number;
  unit: string;
  unitPrice?: number; // متوسط التكلفة / سعر التكلفة
  transactions?: InventoryTransaction[];
  pendingSync?: boolean;
  commissions?: CommissionRecord[];
}

export type FinancialRecordType = 'وارد' | 'مصروف';
export interface Expense {
  id: string;
  type?: FinancialRecordType; 
  description: string;
  amount: number;
  category?: string;
  date: string; // ISO string
  paymentMethod?: PaymentMethod;
  employeeId?: string; 
  referenceNumber?: string;
  notes?: string;
  attachments?: string[];
  pendingSync?: boolean;
  commissions?: CommissionRecord[];
}

export interface CustomerTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'مدين' | 'دائن'; // مدين (عليه) = الفاتورة، دائن (له) = الدفعة
  orderId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  balance: number; // الرصيد الحالي (المتبقي عليه)
  totalInvoiced: number; // إجمالي الفواتير
  totalPaid: number; // إجمالي المدفوع
  lastPaymentDate?: string;
  transactions: CustomerTransaction[];
}

export interface WorkshopTransaction {
  id: string;
  date: string;
  description: string; // البيان/التفاصيل (مثال: تركيب لافتة)
  cost: number; // إجمالي التكلفة (المطالبة المستحقة للجهة)
  paid: number; // المبلغ المدفوع (المسدد للجهة)
  balanceAfter?: number; // الرصيد المتبقي بعد الحركة
  type?: 'مطالبة' | 'دفعة' | 'تسوية'; // نوع الحركة
  notes?: string;
  orderSerial?: string;
}

export interface Workshop {
  id: string;
  name: string; // اسم الورشة أو الشركة (مثل: شركة وليد، ورشة الحدادة)
  phone?: string;
  activity?: string; // التخصص أو النشاط (مثل: أعمال حدادة، تركيبات ورافعات، قص ليزر، مطبعة خارجية)
  address?: string;
  balance: number; // الرصيد المتبقي (إجمالي المديونية المستحقة لهذه الجهة)
  totalCost: number; // إجمالي التكاليف / المطالبات
  totalPaid: number; // إجمالي المدفوعات المسددة
  lastTransactionDate?: string;
  transactions: WorkshopTransaction[];
  notes?: string;
  createdAt?: string;
}

export interface SupplierTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'مدين' | 'دائن'; // مدين (دفعة له)، دائن (فاتورة علينا)
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  balance: number; // الرصيد المستحق له
  totalInvoiced: number;
  totalPaid: number;
  transactions: SupplierTransaction[];
}

export type TreasuryAccountType = 'صندوق' | 'مصرف' | 'عهدة';
export interface TreasuryAccount {
  id: string;
  name: string;
  type: TreasuryAccountType;
  balance: number;
}

export interface TreasuryTransaction {
  id: string;
  accountId: string;
  date: string;
  type: 'إيداع' | 'سحب' | 'تحويل';
  amount: number;
  description: string;
  relatedAccountId?: string; // If transfer
}

export type EmployeeRole = string;
export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  pinCode?: string; 
  salary: number;
  phone?: string;
  nationalId?: string;
  joinedDate?: string;
  emergencyContact?: string;
  status?: 'نشط' | 'موقوف';
  pendingSync?: boolean;
  commissions?: CommissionRecord[];
}

export interface ShopInfo {
  name: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  currency: string;
}

export interface SystemSecurity {
  password: string;
}

export interface RolePermission {
  dashboard: boolean; 
  sales: boolean; 
  designs: boolean; 
  installation: boolean; 
  inventory: boolean; 
  expenses: boolean; 
  employees: boolean; 
  settings: boolean; 
  audit: boolean; 
  customers: boolean;
  suppliers: boolean;
  treasury: boolean;
  workshops?: boolean;
}

export type PageComponentType = 
  | 'metric_card' 
  | 'chart' 
  | 'table' 
  | 'form_field' 
  | 'filter_bar' 
  | 'banner_note' 
  | 'action_grid' 
  | 'checklist' 
  | 'custom_widget';

export interface PageComponentConfig {
  id: string;
  title: string;
  type: PageComponentType;
  description: string;
  visible: boolean;
  order: number;
  width?: 'full' | 'half' | 'third' | 'two_thirds';
  settings?: Record<string, any>;
}

export interface PageConfig {
  id: string;
  name: string;
  path: string;
  icon: string;
  description: string;
  visible: boolean;
  isSystemDefault?: boolean;
  order: number;
  components: PageComponentConfig[];
}

export interface SystemSettings {
  shopInfo: ShopInfo;
  security: SystemSecurity;
  permissions: Record<string, RolePermission>;
  invoice: {
    footerNote: string;
    subHeader: string;
    termsText: string;
  };
  theme: 'light' | 'dark';
  commissionBasis?: CommissionBasis;
  servicesConfig?: DynamicServiceConfig[];
  pagesConfig?: PageConfig[];
}
