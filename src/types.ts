export type OrderStatus = 'بانتظار اعتماد التصميم' | 'قيد التصميم' | 'قيد الطباعة' | 'قيد التركيب' | 'تم التسليم';
export type PaymentMethod = 'نقدي' | 'بطاقة' | 'تحويل';
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

export interface Order {
  id: string;
  serialNumber?: string;
  serviceType?: ServiceType;
  clientName: string;
  description: string;
  price: number;
  cost?: number; // تكلفة التنفيذ
  expectedProfit?: number; // صافي الربح المتوقع
  assignedEmployee?: string; // الجهة المنفذة / الموظف المسؤول
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  date: string; // ISO string
  dimensions?: { width: string; height: string };
  targetDeliveryDate?: string;
  deposit?: number;
  remaining?: number;
  installationAddress?: string;
  craneCost?: number;
  usedMaterials?: OrderMaterialUsage[]; // المواد الخام المستهلكة من المخزون
  pendingSync?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minLimit: number;
  unit: string;
  unitPrice?: number; // سعر التكلفة للوحدة
  pendingSync?: boolean;
}

export type FinancialRecordType = 'وارد' | 'مصروف';

export interface Expense {
  id: string;
  type?: FinancialRecordType; // 'وارد' | 'مصروف'
  description: string;
  amount: number;
  category?: string;
  date: string; // ISO string
  paymentMethod?: PaymentMethod;
  employeeId?: string; 
  referenceNumber?: string;
  notes?: string;
  pendingSync?: boolean;
}

export type EmployeeRole = 'مدير' | 'مصمم' | 'فني تركيب' | 'مركب';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  salary: number;
  phone?: string;
  nationalId?: string;
  joinedDate?: string;
  emergencyContact?: string;
  status?: 'نشط' | 'موقوف';
  pendingSync?: boolean;
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
  dashboard: boolean; // لوحة التحكم والأرباح
  sales: boolean; // المبيعات والطلبيات
  designs: boolean; // إرفاق واعتماد التصاميم
  installation: boolean; // تفاصيل التركيب
  inventory: boolean; // المخزون والمواد الخام
  expenses: boolean; // المصروفات
  employees: boolean; // شؤون العاملين
  settings: boolean; // إعدادات المنظومة
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
}
