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
  SyncState 
} from '../types';
import { supabase, isSupabaseConfigured, SyncQueueItem, authenticateUser } from '../lib/supabaseClient';

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
  currentUser: Employee | null;
  login: (id: string) => void;
  loginWithPasscode: (passcode: string) => Promise<{ success: boolean; message?: string }>;
  loginWithSupabaseAuth: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  simulateRole: (role: EmployeeRole) => void;
  
  // Offline-First Supabase Sync
  syncState: SyncState;
  pendingSyncCount: number;
  lastSyncTime: string | null;
  syncNow: () => Promise<void>;

  // Settings & RBAC & Security
  settings: SystemSettings;
  updateShopInfo: (info: Partial<ShopInfo>) => void;
  changeSystemPassword: (oldPass: string, newPass: string) => { success: boolean; message: string };
  updateRolePermissions: (role: EmployeeRole, perms: Partial<RolePermission>) => void;
  updateInvoiceSettings: (invoice: Partial<SystemSettings['invoice']>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  resetAllData: () => void;

  // Workshop / Kiosk Mode for TV Display
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

// Initial Mock Data
const initialOrders: Order[] = [
  { 
    id: '1001', 
    serialNumber: '1001',
    serviceType: 'لافتة إعلانية',
    clientName: 'شركة الأفق للاستثمار والتطوير', 
    description: 'لوحة إعلانية خارجية 3x2 مضيئة حروف أكريليك بارزة مع شاسيه حديد وليدات', 
    price: 1500, 
    cost: 850,
    expectedProfit: 650,
    assignedEmployee: 'خالد الفني',
    status: 'بانتظار اعتماد التصميم', 
    paymentMethod: 'تحويل', 
    date: new Date().toISOString(), 
    dimensions: { width: '3', height: '2' }, 
    targetDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString(), 
    deposit: 500, 
    remaining: 1000, 
    installationAddress: 'طرابلس - طريق الشط', 
    craneCost: 120 
  },
  { 
    id: '1002', 
    serialNumber: '1002',
    serviceType: 'إدارة صفحات سوشيال ميديا',
    clientName: 'مقهى الرواد الحديث', 
    description: 'إدارة صفحات التواصل الاجتماعي شهرياً، تصميم 12 منشوراً إعلانياً وإطلاق حملة تسويقية', 
    price: 800, 
    cost: 320,
    expectedProfit: 480,
    assignedEmployee: 'عمر المصمم',
    status: 'قيد التركيب', 
    paymentMethod: 'نقدي', 
    date: new Date().toISOString(), 
    targetDeliveryDate: new Date(Date.now() + 86400000).toISOString(), 
    deposit: 400, 
    remaining: 400, 
    installationAddress: 'بنغازي - شارع دبي' 
  },
  { 
    id: '1003', 
    serialNumber: '1003',
    serviceType: 'تصميم موقع إلكتروني',
    clientName: 'مجموعة المروج الهندسية', 
    description: 'تصميم وبرمجة موقع إلكتروني تعريفي متجاوب مع واجهة عربية ولوحة تحكم لإدارة المشاريع', 
    price: 2400, 
    cost: 950,
    expectedProfit: 1450,
    assignedEmployee: 'أحمد الإداري',
    status: 'قيد التصميم', 
    paymentMethod: 'تحويل', 
    date: new Date().toISOString(), 
    targetDeliveryDate: new Date(Date.now() + 86400000 * 5).toISOString(), 
    deposit: 1200, 
    remaining: 1200 
  },
  { 
    id: '1004', 
    serialNumber: '1004',
    serviceType: 'خدمات طباعة',
    clientName: 'المركز التجاري الدولي', 
    description: 'طباعة 5000 بروشور مطوي لامع و10 رول أب ستاند ألومنيوم للمعارض والفعاليات', 
    price: 950, 
    cost: 450,
    expectedProfit: 500,
    assignedEmployee: 'خالد الفني',
    status: 'تم التسليم', 
    paymentMethod: 'نقدي', 
    date: new Date().toISOString(), 
    targetDeliveryDate: new Date().toISOString(), 
    deposit: 950, 
    remaining: 0 
  },
];

const initialInventory: InventoryItem[] = [
  { id: '1', name: 'أكريليك أسود 3ملم', quantity: 15, minLimit: 20, unit: 'لوح', unitPrice: 85 },
  { id: '2', name: 'رول فينيل أبيض ألماني', quantity: 5, minLimit: 3, unit: 'رول', unitPrice: 40 },
  { id: '3', name: 'ليدات إضاءة بيضاء موفرة', quantity: 50, minLimit: 100, unit: 'متر', unitPrice: 8 },
  { id: '4', name: 'حديد مربعات 2.5×2.5 سم', quantity: 35, minLimit: 15, unit: 'قطعة', unitPrice: 28 },
];

const initialEmployees: Employee[] = [
  { id: '1', name: 'أحمد الإداري', role: 'مدير', salary: 5000 },
  { id: '2', name: 'عمر المصمم', role: 'مصمم', salary: 3000 },
  { id: '3', name: 'خالد الفني', role: 'فني تركيب', salary: 2500 },
];

const initialExpenses: Expense[] = [
  {
    id: 'f1',
    type: 'وارد',
    description: 'دفعة مقدمة - لوحة إعلانية خارجية (شركة الأفق)',
    amount: 500,
    category: 'مقبوضات مبيعات',
    date: new Date(Date.now() - 3600000 * 24).toISOString(),
    paymentMethod: 'تحويل',
  },
  {
    id: 'f2',
    type: 'وارد',
    description: 'تحصيل نقدي - تسليم بروشورات المركز التجاري الدولي',
    amount: 950,
    category: 'تحصيل دفعات',
    date: new Date(Date.now() - 3600000 * 12).toISOString(),
    paymentMethod: 'نقدي',
  },
  {
    id: 'f3',
    type: 'مصروف',
    description: 'فاتورة استهلاك كهرباء الورشة لشهر أغسطس',
    amount: 280,
    category: 'مصاريف تشغيلية',
    date: new Date(Date.now() - 3600000 * 48).toISOString(),
    paymentMethod: 'نقدي',
  },
  {
    id: 'f4',
    type: 'مصروف',
    description: 'صيانة ماكينة الليزر وقص الأكريليك',
    amount: 190,
    category: 'صيانة ومعدات',
    date: new Date(Date.now() - 3600000 * 20).toISOString(),
    paymentMethod: 'نقدي',
  },
  {
    id: 'f5',
    type: 'وارد',
    description: 'دفعة نقدية - مقهى الرواد الحديث',
    amount: 400,
    category: 'مقبوضات مبيعات',
    date: new Date().toISOString(),
    paymentMethod: 'نقدي',
  },
];

const defaultSettings: SystemSettings = {
  shopInfo: {
    name: 'شركة أسلوب للدعاية والإعلان',
    phone: '091-0000000 / 092-0000000',
    address: 'طرابلس، شارع عمر المختار - المنطقة الإعلانية',
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
    },
    'مصمم': {
      dashboard: false,
      sales: true,
      designs: true,
      installation: false,
      inventory: false,
      expenses: false,
      employees: false,
      settings: false,
    },
    'فني تركيب': {
      dashboard: false,
      sales: false,
      designs: false,
      installation: true,
      inventory: true,
      expenses: false,
      employees: false,
      settings: false,
    },
    'مركب': {
      dashboard: false,
      sales: false,
      designs: false,
      installation: true,
      inventory: true,
      expenses: false,
      employees: false,
      settings: false,
    },
  },
  invoice: {
    footerNote: 'شكراً لتعاملكم مع شركة أسلوب للدعاية والإعلان. يسري ضمان العمل المعتمد وفق المواصفات المحددة.',
    subHeader: 'للدعاية والإعلان والطباعة والتجهيزات الإعلانية المتكاملة',
    termsText: 'الدفعة الأولى غير قابلة للاسترجاع بعد بدء أعمال القص والتشكيل والتجهيز.',
  },
  theme: 'light',
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
        cost: typeof o.cost === 'number' ? o.cost : 0,
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
    const saved = localStorage.getItem('masar_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const shopName = (!parsed.shopInfo?.name || parsed.shopInfo?.name === 'مسار لصناعة وتركيب اللوافت' || parsed.shopInfo?.name === 'مسار') 
          ? 'شركة أسلوب للدعاية والإعلان' 
          : parsed.shopInfo.name;
        
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
        };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

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
    if (currentUser) {
      localStorage.setItem('masar_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('masar_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('masar_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
    const authResult = await authenticateUser(passcode);
    if (authResult.success) {
      const matchedEmployee = employees.find(e => e.role === 'مدير') || employees[0] || {
        id: '1',
        name: 'المدير العام',
        role: 'مدير' as EmployeeRole,
        salary: 5000,
      };
      setCurrentUser(matchedEmployee);
      return { success: true };
    }

    if (passcode === settings.security.password) {
      const defaultAdmin = employees.find(e => e.role === 'مدير') || employees[0];
      if (defaultAdmin) {
        setCurrentUser(defaultAdmin);
        return { success: true };
      }
    }

    return { success: false, message: authResult.message || 'رمز الدخول غير صحيح. الرمز الافتراضي هو 1400' };
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

  const setTheme = (theme: 'light' | 'dark') => {
    setSettings(prev => ({
      ...prev,
      theme,
    }));
  };

  const toggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const resetAllData = () => {
    setOrders(initialOrders);
    setInventory(initialInventory);
    setExpenses(initialExpenses);
    setEmployees(initialEmployees);
    setSettings(defaultSettings);
    setSyncQueue([]);
    localStorage.clear();
  };

  return (
    <AppContext.Provider value={{
      orders, addOrder, deleteOrder, getNextSerialNumber, updateOrderStatus,
      inventory, addInventoryItem, updateInventoryQuantity,
      expenses, addExpense, deleteExpense,
      employees, addEmployee,
      currentUser, login, loginWithPasscode, loginWithSupabaseAuth, logout, simulateRole,
      syncState,
      pendingSyncCount: syncQueue.length,
      lastSyncTime,
      syncNow,
      settings,
      updateShopInfo,
      changeSystemPassword,
      updateRolePermissions,
      updateInvoiceSettings,
      setTheme,
      toggleTheme,
      resetAllData,
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
