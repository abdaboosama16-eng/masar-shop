
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
export type ServiceType = 'لافتة إعلانية' | 'إدارة صفحات سوشيال ميديا' | 'تصميم موقع إلكتروني' | 'خدمات طباعة';
export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline';

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
  
  // Detailed Costs
  cost?: number; // Total direct cost
  materialCost?: number; // تكلفة المواد
  printingCost?: number; // تكلفة الطباعة
  externalCost?: number; // تكاليف خارجية
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
  installationAddress?: string;
  craneCost?: number;
  usedMaterials?: OrderMaterialUsage[]; 
  attachments?: string[]; // روابط المرفقات
  auditLog?: AuditLogEntry[]; // سجل العمليات والتدقيق
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
}
