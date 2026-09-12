import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Order, OrderStatus, PaymentMethod, ServiceType } from '../types';
import { 
  Plus, Printer, X, Inbox, Maximize, Calendar, FileImage, 
  MapPin, Hash, User, DollarSign, FileText, 
  Search, Filter, Trash2, Layers, Share2, Monitor, 
  FileSpreadsheet, ChevronDown, Calculator, Check, 
  Briefcase, MessageSquare, BookOpen, RotateCcw, 
  Tv, Kanban, ArrowRight, 
  CheckCircle2, Clock, Receipt, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import DesignAttachmentModal from '../components/DesignAttachmentModal';
import InvoicePrintModal from '../components/InvoicePrintModal';
import WhatsAppShareModal from '../components/WhatsAppShareModal';
import MonthlySalesGrid from '../components/MonthlySalesGrid';
import OrderDetailsModal from '../components/OrderDetailsModal';
import ExpensesView from '../components/ExpensesView';
import ProfitsView from '../components/ProfitsView';

type SalesActiveTab = 'monthly_grid' | 'expenses' | 'profits' | 'new_order' | 'kanban';

export default function Sales() {
  const { 
    orders, 
    addOrder, 
    updateOrder,
    deleteOrder, 
    reorderOrders,
    getNextSerialNumber, 
    updateOrderStatus, 
    toggleOrderPaidStatus,
    toggleOrderPinned,
    employees, 
    settings, 
    isKioskMode,
    toggleKioskMode 
  } = useAppContext();

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tabParam = searchParams.get('tab') as SalesActiveTab | null;

  // Active Tab State (3 Principal Tabs)
  const [activeTab, setActiveTab] = useState<SalesActiveTab>(
    tabParam === 'expenses' ? 'expenses' : tabParam === 'profits' ? 'profits' : 'monthly_grid'
  );

  useEffect(() => {
    const currentTab = new URLSearchParams(location.search).get('tab') as SalesActiveTab | null;
    if (currentTab === 'expenses') setActiveTab('expenses');
    else if (currentTab === 'profits') setActiveTab('profits');
    else if (currentTab === 'monthly_grid') setActiveTab('monthly_grid');
  }, [location.search]);

  const handleTabChange = (tab: SalesActiveTab) => {
    setActiveTab(tab);
    if (tab === 'monthly_grid') {
      navigate('/sales', { replace: true });
    } else {
      navigate(`/sales?tab=${tab}`, { replace: true });
    }
  };

  // Inline table row addition state
  const [isAddingRow, setIsAddingRow] = useState(false);

  // Modals state
  const [selectedOrderForDesign, setSelectedOrderForDesign] = useState<Order | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [whatsAppOrder, setWhatsAppOrder] = useState<Order | null>(null);

  // ميزة تكرار/نسخ الفاتورة (Duplicate Row) وإدراجها في أسفل الجدول
  const handleDuplicateOrder = (orderToDuplicate: Order) => {
    const nextSerial = getNextSerialNumber();
    const duplicatedOrder: Omit<Order, 'id'> = {
      ...orderToDuplicate,
      serialNumber: nextSerial,
      isPaid: false,
      paidAt: undefined,
      pendingSync: true,
    };
    addOrder(duplicatedOrder, nextSerial);
  };

  // Search & Filter state for Invoices Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('الكل');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('الكل');

  // Search & Filter state for Kanban Tab
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanServiceFilter, setKanbanServiceFilter] = useState<string>('الكل');
  const [kanbanEmployeeFilter, setKanbanEmployeeFilter] = useState<string>('الكل');

  // Form Fields:
  // 2. نوع الخدمة
  const availableServices = useMemo(() => {
    if (settings.servicesConfig && settings.servicesConfig.length > 0) {
      return settings.servicesConfig;
    }
    return [
      { id: 'srv-1', name: 'إدارة صفحات سوشيال ميديا', costItems: ['تكلفة المصمم', 'تكلفة كاتب المحتوى', 'إعلانات ممولة'] },
      { id: 'srv-2', name: 'لافتة إعلانية', costItems: ['تكلفة التصميم', 'تكلفة الطباعة', 'التكلفة الخارجية', 'مواد خام'] },
      { id: 'srv-3', name: 'تنفيذ لافتات', costItems: ['تكلفة القص', 'تكلفة التركيب', 'مواد خام'] },
      { id: 'srv-4', name: 'تصميم موقع إلكتروني', costItems: ['تكلفة المبرمج', 'تكلفة التصميم UI/UX', 'استضافة ونطاق'] },
      { id: 'srv-5', name: 'خدمات طباعة', costItems: ['تكلفة الورق والمواد', 'تكلفة ماكينة الطباعة', 'تكلفة التغليف والتوصيل'] },
    ];
  }, [settings.servicesConfig]);

  const [serviceType, setServiceType] = useState<string>('لافتة إعلانية');
  const [dynamicCostValues, setDynamicCostValues] = useState<Record<string, string>>({});
  const [dynamicCostExecutors, setDynamicCostExecutors] = useState<Record<string, string>>({});
  const [customCostItemInput, setCustomCostItemInput] = useState('');

  // استدعاء قالب الخدمة التلقائي وملء بنود التكلفة بقيمة افتراضية 0
  const handleServiceTypeChange = (newService: string) => {
    setServiceType(newService);
    const template = availableServices.find(s => s.name === newService);
    if (template) {
      const newCosts: Record<string, string> = {};
      const newExecs: Record<string, string> = {};
      const items = template.costItems || [];
      items.forEach(item => {
        newCosts[item] = '0';
        if (template.defaultCosts && template.defaultCosts[item] !== undefined) {
          newCosts[item] = String(template.defaultCosts[item]);
        }
        if (template.defaultExecutors && template.defaultExecutors[item]) {
          newExecs[item] = template.defaultExecutors[item];
        }
      });
      setDynamicCostValues(newCosts);
      setDynamicCostExecutors(newExecs);
    }
  };

  // Active service config and its cost items
  const currentServiceConfig = useMemo(() => {
    return availableServices.find(s => s.name === serviceType) || availableServices[0];
  }, [availableServices, serviceType]);

  const currentCostItems = useMemo(() => {
    const baseItems = currentServiceConfig?.costItems || ['تكلفة التصميم', 'تكلفة الطباعة', 'التكلفة الخارجية', 'مواد خام'];
    const customKeys = Object.keys(dynamicCostValues).filter(k => !baseItems.includes(k));
    return [...baseItems, ...customKeys];
  }, [currentServiceConfig, dynamicCostValues]);
  
  // 3. اسم الزبون
  const [clientName, setClientName] = useState('');
  
  // 4. سعر الفاتورة الإجمالي
  const [price, setPrice] = useState('');
  
  // 6. التكلفة و التوقع للربح
  const [cost, setCost] = useState('');
  
  // Detailed costs
  const [designCost, setDesignCost] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [printingCost, setPrintingCost] = useState('');
  const [externalCost, setExternalCost] = useState('');
  const [commissionCost, setCommissionCost] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [costCenter, setCostCenter] = useState('');

  // Supplementary Fields (Payment, Delivery, Dimensions)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقدي');
  const [deposit, setDeposit] = useState('');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [craneCost, setCraneCost] = useState('');
  const [notes, setNotes] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Form Submission Success Toast
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Unique client names list for Client Ledger filter
  const uniqueClients = useMemo(() => {
    const clients = Array.from(new Set(orders.map(o => o.clientName.trim()).filter(Boolean)));
    return clients.sort();
  }, [orders]);

  // Dynamic calculations in form
  const parsedPrice = parseFloat(price) || 0;
  
  const dCost = parseFloat(designCost) || 0;
  const mCost = parseFloat(materialCost) || 0;
  const pCost = parseFloat(printingCost) || 0;
  const eCost = parseFloat(externalCost) || 0;
  const cCost = parseFloat(commissionCost) || 0;
  const oCost = parseFloat(otherCosts) || 0;
  const directCostInput = parseFloat(cost) || 0;
  
  // Calculate total from dynamic cost values
  const totalDynamicCost = useMemo(() => {
    return Object.values(dynamicCostValues).reduce((sum: number, v: string) => {
      const num = parseFloat(v);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [dynamicCostValues]);

  // If dynamic costs or detailed legacy costs are provided, calculate accordingly
  const totalDetailedCost = dCost + mCost + pCost + eCost + cCost + oCost;
  const effectiveCostSum = totalDynamicCost > 0 ? totalDynamicCost : totalDetailedCost;
  const parsedCost = effectiveCostSum > 0 ? effectiveCostSum : directCostInput;

  const expectedProfit = parsedPrice - parsedCost;
  const profitMargin = parsedPrice > 0 ? ((expectedProfit / parsedPrice) * 100).toFixed(1) : '0';

  const parsedWidth = parseFloat(width) || 0;
  const parsedHeight = parseFloat(height) || 0;
  const calculatedArea = (parsedWidth * parsedHeight).toFixed(2);

  const parsedDeposit = parseFloat(deposit) || 0;
  const remainingAmount = Math.max(0, parsedPrice - parsedDeposit);

  // Dynamic Cost Summary string
  const costBreakdownSummary = useMemo(() => {
    const parts: string[] = [];
    Object.entries(dynamicCostValues).forEach(([item, val]) => {
      const num = parseFloat(String(val));
      if (!isNaN(num) && num > 0) {
        parts.push(`${item}: ${num.toLocaleString()} ${settings.shopInfo.currency}`);
      }
    });
    return parts.join(' | ');
  }, [dynamicCostValues, settings.shopInfo.currency]);

  // Filtered orders for Invoices Tab
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const serial = (order.serialNumber || order.id).toLowerCase();
      const client = order.clientName.toLowerCase();
      const desc = order.description.toLowerCase();
      const service = (order.serviceType || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = serial.includes(term) || client.includes(term) || desc.includes(term) || service.includes(term);
      const matchesService = selectedServiceFilter === 'الكل' || order.serviceType === selectedServiceFilter;
      const matchesClient = selectedClientFilter === 'الكل' || order.clientName.trim() === selectedClientFilter.trim();

      return matchesSearch && matchesService && matchesClient;
    });
  }, [orders, searchTerm, selectedServiceFilter, selectedClientFilter]);

  // Client Ledger Specific Metrics
  const clientLedgerStats = useMemo(() => {
    const targetOrders = selectedClientFilter === 'الكل' 
      ? filteredOrders 
      : orders.filter(o => o.clientName.trim() === selectedClientFilter.trim());
    
    const totalBilled = targetOrders.reduce((sum, o) => sum + o.price, 0);
    const totalPaid = targetOrders.reduce((sum, o) => sum + (o.deposit || 0), 0);
    const totalRemaining = targetOrders.reduce((sum, o) => {
      const rem = o.remaining !== undefined ? o.remaining : Math.max(0, o.price - (o.deposit || 0));
      return sum + rem;
    }, 0);
    const totalCosts = targetOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
    const totalNetProfit = totalBilled - totalCosts;

    return {
      totalBilled,
      totalPaid,
      totalRemaining,
      totalNetProfit,
      count: targetOrders.length
    };
  }, [orders, filteredOrders, selectedClientFilter]);

  // Overall Financial Metrics for Sales Page
  const totalSales = useMemo(() => orders.reduce((sum, o) => sum + o.price, 0), [orders]);
  const totalCosts = useMemo(() => orders.reduce((sum, o) => sum + (o.cost || 0), 0), [orders]);
  const totalNetProfit = totalSales - totalCosts;

  const resetForm = () => {
    setServiceType(availableServices[0]?.name || 'لافتة إعلانية');
    setDynamicCostValues({});
    setDynamicCostExecutors({});
    setCustomCostItemInput('');
    setClientName('');
    setPrice('');
    
    setCost('');
    setDesignCost('');
    setMaterialCost('');
    setPrintingCost('');
    setExternalCost('');
    setCommissionCost('');
    setOtherCosts('');
    setCostCenter('');

    setPaymentMethod('نقدي');
    setDeposit('');
    setTargetDeliveryDate('');
    setWidth('');
    setHeight('');
    setInstallationAddress('');
    setCraneCost('');
    setNotes('');
    setShowAdvancedFields(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || parsedPrice <= 0) return;

    const parsedCraneCost = craneCost ? parseFloat(craneCost) : 0;

    // Numerical breakdown of dynamic costs
    const numericCostBreakdown: Record<string, number> = {};
    Object.entries(dynamicCostValues).forEach(([k, v]) => {
      const num = parseFloat(String(v));
      if (!isNaN(num) && num > 0) {
        numericCostBreakdown[k] = num;
      }
    });

    // Clean dynamic executors mapping
    const cleanCostExecutors: Record<string, string> = {};
    Object.entries(dynamicCostExecutors).forEach(([k, v]) => {
      const valStr = String(v || '');
      if (valStr.trim()) {
        cleanCostExecutors[k] = valStr.trim();
      }
    });

    let autoDesign = 0;
    let autoPrinting = 0;
    let autoExternal = 0;
    let autoMaterial = 0;
    let detectedDesigner: string | undefined = undefined;
    let detectedPrinter: string | undefined = undefined;
    let detectedExternal: string | undefined = undefined;

    Object.entries(numericCostBreakdown).forEach(([k, v]) => {
      if (k.includes('تصميم') || k.includes('مصمم')) {
        autoDesign += v;
        if (!detectedDesigner && cleanCostExecutors[k]) detectedDesigner = cleanCostExecutors[k];
      } else if (k.includes('طباعة')) {
        autoPrinting += v;
        if (!detectedPrinter && cleanCostExecutors[k]) detectedPrinter = cleanCostExecutors[k];
      } else if (k.includes('خارج')) {
        autoExternal += v;
        if (!detectedExternal && cleanCostExecutors[k]) detectedExternal = cleanCostExecutors[k];
      } else if (k.includes('مادة') || k.includes('خام') || k.includes('قص') || k.includes('تركيب')) {
        autoMaterial += v;
      }
    });

    // Also check non-numeric executor assignments if present
    Object.entries(cleanCostExecutors).forEach(([k, v]) => {
      if ((k.includes('تصميم') || k.includes('مصمم')) && !detectedDesigner) detectedDesigner = v;
      if (k.includes('طباعة') && !detectedPrinter) detectedPrinter = v;
      if (k.includes('خارج') && !detectedExternal) detectedExternal = v;
    });

    const autoSerial = getNextSerialNumber();

    addOrder({
      serialNumber: autoSerial,
      serviceType: serviceType as ServiceType,
      clientName: clientName.trim(),
      description: serviceType ? `${serviceType}` : 'طلب جديد',
      invoiceDetails: notes.trim() ? notes.split(/[\n•]+/).map(s => s.trim()).filter(Boolean) : undefined,
      
      price: parsedPrice,
      cost: parsedCost,
      designCost: autoDesign > 0 ? autoDesign : dCost,
      designerName: detectedDesigner,
      materialCost: autoMaterial > 0 ? autoMaterial : mCost,
      printingCost: autoPrinting > 0 ? autoPrinting : pCost,
      printerName: detectedPrinter,
      externalCost: autoExternal > 0 ? autoExternal : eCost,
      externalExecutor: detectedExternal,
      commissionCost: cCost,
      otherCosts: oCost,
      costCenter: costCenter.trim() || undefined,
      costBreakdown: Object.keys(numericCostBreakdown).length > 0 ? numericCostBreakdown : undefined,
      costExecutors: Object.keys(cleanCostExecutors).length > 0 ? cleanCostExecutors : undefined,
      costBreakdownSummary: costBreakdownSummary || undefined,

      expectedProfit,
      assignedEmployee: (employees.length > 0 ? employees[0].name : 'إدارة الورشة'),
      status: 'بانتظار اعتماد التصميم',
      paymentMethod,
      date: new Date().toISOString(),
      dimensions: (width || height) ? { width, height } : undefined,
      targetDeliveryDate: targetDeliveryDate ? new Date(targetDeliveryDate).toISOString() : undefined,
      deposit: parsedDeposit,
      remaining: remainingAmount,
      installationAddress: installationAddress.trim() || undefined,
      craneCost: parsedCraneCost,
      notes: notes.trim() || undefined,
    }, autoSerial);

    resetForm();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);
    setActiveTab('monthly_grid');
  };

  const handleDelete = (orderId: string) => {
    deleteOrder(orderId);
  };
  const handleDeleteOrder = handleDelete;

  // Service Type Geometric Icons
  const renderServiceIcon = (type?: ServiceType) => {
    switch (type) {
      case 'لافتة إعلانية':
        return <Layers size={14} className="text-emerald-700 " />;
      case 'إدارة صفحات سوشيال ميديا':
        return <Share2 size={14} className="text-sky-700 " />;
      case 'تصميم موقع إلكتروني':
        return <Monitor size={14} className="text-indigo-700 " />;
      case 'خدمات طباعة':
        return <FileSpreadsheet size={14} className="text-purple-700 " />;
      default:
        return <FileText size={14} className="text-slate-600 " />;
    }
  };

  // Kanban Pipeline Configuration
  const kanbanColumns: { id: OrderStatus; title: string; subtitle: string; color: string; badgeBg: string; borderColor: string }[] = [
    {
      id: 'قيد التصميم',
      title: 'قيد التصميم',
      subtitle: 'إعداد ومراجعة المخططات الهندسية',
      color: 'text-purple-700 ',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 ',
      borderColor: 'border-t-purple-500'
    },
    {
      id: 'قيد الطباعة',
      title: 'قيد الطباعة والتنفيذ',
      subtitle: 'أعمال القص، التشكيل، والطباعة',
      color: 'text-amber-700 ',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 ',
      borderColor: 'border-t-amber-500'
    },
    {
      id: 'قيد التركيب',
      title: 'قيد التركيب الميداني',
      subtitle: 'التثبيت في الموقع والرفع والكهرباء',
      color: 'text-blue-700 ',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 ',
      borderColor: 'border-t-blue-500'
    },
    {
      id: 'تم التسليم',
      title: 'تم التسليم والاعتماد',
      subtitle: 'المشاريع المنجزة والمعتمدة بالكامل',
      color: 'text-emerald-700 ',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ',
      borderColor: 'border-t-emerald-500'
    },
  ];

  const normalizeKanbanStatus = (status: OrderStatus): OrderStatus => {
    if (status === 'بانتظار اعتماد التصميم') return 'قيد التصميم';
    return status;
  };

  const getNextKanbanStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const norm = normalizeKanbanStatus(currentStatus);
    if (norm === 'قيد التصميم') return 'قيد الطباعة';
    if (norm === 'قيد الطباعة') return 'قيد التركيب';
    if (norm === 'قيد التركيب') return 'تم التسليم';
    return null;
  };

  const filteredKanbanOrders = useMemo(() => {
    return orders.filter(order => {
      const q = kanbanSearch.toLowerCase().trim();
      const serialMatch = (order.serialNumber || order.id).toLowerCase().includes(q);
      const clientMatch = order.clientName.toLowerCase().includes(q);
      const descMatch = order.description.toLowerCase().includes(q);
      const matchesSearch = !q || serialMatch || clientMatch || descMatch;

      const matchesService = kanbanServiceFilter === 'الكل' || (order.serviceType || 'لافتة إعلانية') === kanbanServiceFilter;
      const matchesEmployee = kanbanEmployeeFilter === 'الكل' || (order.assignedEmployee || '') === kanbanEmployeeFilter;

      return matchesSearch && matchesService && matchesEmployee;
    });
  }, [orders, kanbanSearch, kanbanServiceFilter, kanbanEmployeeFilter]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">سجل الفواتير</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            إدارة الفواتير، متابعة العقود، كشف حسابات الزبائن، ومتابعة مسارات الإنتاج والتنفيذ
          </p>
        </div>
      </div>

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">تم حفظ الطلبية وإصدار الفاتورة بنجاح.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSuccessToast(false)}
            className="text-emerald-700 p-1 hover:bg-emerald-500/20 rounded-lg"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Tabs Navigation (Navigation Tabs Only - Sticky Header) */}
      <div className="sticky top-0 z-40 flex items-center gap-2 p-1.5 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-md no-print">
        
        {/* Tab 1: سجل الفواتير */}
        <button
          type="button"
          onClick={() => handleTabChange('monthly_grid')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 ease-out cursor-pointer ${
            activeTab === 'monthly_grid'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/80 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet size={16} className={activeTab === 'monthly_grid' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
          <span>سجل الفواتير</span>
        </button>

        {/* Tab 2: المصاريف */}
        <button
          type="button"
          id="tab-btn-expenses"
          onClick={() => handleTabChange('expenses')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 ease-out cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm border border-slate-200/80 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt size={16} className={activeTab === 'expenses' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
          <span>المصاريف</span>
        </button>

        {/* Tab 3: الأرباح */}
        <button
          type="button"
          id="tab-btn-profits"
          onClick={() => handleTabChange('profits')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 ease-out cursor-pointer ${
            activeTab === 'profits'
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm border border-slate-200/80 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp size={16} className={activeTab === 'profits' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
          <span>الأرباح</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: السجل الشهري للطلبيات (Monthly Data Grid) */}
      {/* ========================================================================= */}
      {activeTab === 'monthly_grid' && (
        <MonthlySalesGrid
          orders={orders}
          currency={settings.shopInfo.currency}
          onUpdateStatus={updateOrderStatus}
          onUpdateOrder={updateOrder}
          onPrintOrder={setPrintingOrder}
          onShareWhatsApp={setWhatsAppOrder}
          onViewDesign={setSelectedOrderForDesign}
          onViewOrderDetails={setSelectedOrderForDetails}
          onTogglePaid={toggleOrderPaidStatus}
          onTogglePinned={toggleOrderPinned}
          onDeleteOrder={deleteOrder}
          onDuplicateOrder={handleDuplicateOrder}
          onReorderOrders={reorderOrders}
          isAddingRow={isAddingRow}
          setIsAddingRow={setIsAddingRow}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 1: إضافة طلبية جديدة (New Order Form) */}
      {/* ========================================================================= */}
      {activeTab === 'new_order' && (
        <div className="glass-panel p-6 sm:p-8 rounded-xl no-print animate-in fade-in duration-150 border border-slate-200/90 bg-white/95 shadow-sm space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 ">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 ">نموذج إضافة طلبية / فاتورة جديدة</h3>
                <p className="text-xs text-slate-600 ">إدخال بيانات العقد، الأسعار، وحساب صافي الأرباح والتكاليف</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('monthly_grid')}
                className="text-xs text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 ease-out"
              >
                إلغاء والعودة للسجل
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 ease-out"
              >
                تفريغ الحقول
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pb-24">
            
            {/* الصف الأساسي: نوع الخدمة، اسم الزبون، وسعر الفاتورة الإجمالي */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* نوع الخدمة: قائمة منسدلة ديناميكية */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-slate-600" />
                    <span>نوع الخدمة (القوالب الديناميكية)</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {currentCostItems.length} بنود
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={serviceType}
                    onChange={(e) => handleServiceTypeChange(e.target.value)}
                    className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 appearance-none bg-white cursor-pointer pr-4 pl-10"
                    required
                  >
                    {availableServices.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* اسم الزبون */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-slate-600" />
                  <span>اسم الزبون (الشركة أو الشخص)</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                  placeholder="أدخل اسم الزبون أو الشركة..."
                />
              </div>

              {/* سعر الفاتورة الإجمالي */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-slate-600" />
                  <span>سعر الفاتورة الإجمالي ({settings.shopInfo.currency})</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums font-bold text-slate-900 "
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Field 6: بنود التكلفة الديناميكية الخاصة بنوع الخدمة وصافي الربح */}
            <div className="p-5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calculator size={15} className="text-emerald-700" />
                  <span>6. بنود التكلفة الديناميكية لقالب: <strong className="text-blue-700">({serviceType})</strong></span>
                </label>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  تتغير حقول التكلفة تلقائياً وفقاً للخدمة المختارة
                </span>
              </div>
              
              {/* Dynamic Cost Inputs Grid with Executor Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {currentCostItems.map((itemKey) => {
                  const isDesign = itemKey.includes('تصميم') || itemKey.includes('مصمم') || itemKey.includes('UI');
                  const isPrinting = itemKey.includes('طباعة') || itemKey.includes('مطبعة');
                  const isExternal = itemKey.includes('خارج') || itemKey.includes('ورشة') || itemKey.includes('موقع');
                  const isLaser = itemKey.includes('قص') || itemKey.includes('ليزر');
                  const isInstallation = itemKey.includes('تركيب');
                  const isDev = itemKey.includes('مطور') || itemKey.includes('مبرمج');
                  const isContent = itemKey.includes('محتوى') || itemKey.includes('كتابة');

                  const executorPlaceholder = isDesign
                    ? 'اسم المصمم (مثال: أحمد)...'
                    : isPrinting
                    ? 'اسم فني الطباعة (مثال: سالم)...'
                    : isLaser
                    ? 'اسم فني القص/الماكينة...'
                    : isInstallation
                    ? 'اسم فني أو فريق التركيب...'
                    : isDev
                    ? 'اسم المطور...'
                    : isContent
                    ? 'اسم كاتب المحتوى...'
                    : isExternal
                    ? 'اسم الورشة / الجهة الخارجية...'
                    : 'اسم الموظف / المنفذ...';

                  const executorLabel = isDesign
                    ? 'اسم المصمم'
                    : isPrinting
                    ? 'اسم فني الطباعة'
                    : isLaser
                    ? 'فني القص/الليزر'
                    : isInstallation
                    ? 'فني التركيب'
                    : isExternal
                    ? 'الجهة المنفذة'
                    : 'اسم المنفذ/الموظف';

                  return (
                    <div key={itemKey} className="p-3.5 rounded-xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-black text-slate-800">{itemKey}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{settings.shopInfo.currency}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Amount Field */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">المبلغ المطلوب</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={dynamicCostValues[itemKey] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDynamicCostValues(prev => ({
                                ...prev,
                                [itemKey]: val
                              }));
                            }}
                            className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-mono tabular-nums font-bold text-slate-900 bg-slate-50/70"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Executor / Employee Field */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">{executorLabel}</label>
                          <input
                            type="text"
                            list="order-employees-datalist"
                            value={dynamicCostExecutors[itemKey] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDynamicCostExecutors(prev => ({
                                ...prev,
                                [itemKey]: val
                              }));
                            }}
                            className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50/70 placeholder:text-slate-400"
                            placeholder={executorPlaceholder}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Datalist for Employee autocomplete suggestions */}
              <datalist id="order-employees-datalist">
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                ))}
                <option value="ورشة خارجية">ورشة خارجية</option>
                <option value="فريق التركيبات الميدانية">فريق التركيبات الميدانية</option>
                <option value="إدارة الورشة">إدارة الورشة</option>
              </datalist>

              {/* Add Custom On-The-Fly Cost Item */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-600">إضافة بند تكلفة مخصص لهذه الفاتورة:</span>
                <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={customCostItemInput}
                    onChange={(e) => setCustomCostItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customCostItemInput.trim()) {
                          const trimmed = customCostItemInput.trim();
                          setDynamicCostValues(prev => ({ ...prev, [trimmed]: '' }));
                          setCustomCostItemInput('');
                        }
                      }
                    }}
                    placeholder="اسم بند التكلفة الإضافي..."
                    className="flex-1 glass-input rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customCostItemInput.trim()) {
                        const trimmed = customCostItemInput.trim();
                        setDynamicCostValues(prev => ({ ...prev, [trimmed]: '' }));
                        setCustomCostItemInput('');
                      }
                    }}
                    className="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <Plus size={13} />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>

              {/* Summary Calculations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center pt-3 border-t border-slate-200/80">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">إجمالي التكلفة المحسوبة:</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums text-sm font-black text-rose-700">
                      {parsedCost.toLocaleString()} {settings.shopInfo.currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-24 text-[11px] p-1 border rounded text-left font-mono bg-slate-50"
                      placeholder="مباشر..."
                      title="إدخال تكلفة مباشرة إجمالية بديلة"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-center shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-800 block mb-0.5">صافي الربح المحسوب آلياً:</span>
                  <span className={`font-mono tabular-nums text-sm font-black ${expectedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {expectedProfit >= 0 ? `+${expectedProfit.toLocaleString()}` : expectedProfit.toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 text-center shadow-xs">
                  <span className="text-[11px] font-bold text-slate-600 block mb-0.5">نسبة هامش الربح:</span>
                  <span className="font-mono tabular-nums text-sm font-black text-slate-800">
                    {profitMargin}%
                  </span>
                </div>
              </div>
            </div>

            {/* Supplementary Fields Toggle */}
            <div className="pt-3 border-t border-slate-200/80 ">
              <button
                type="button"
                onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                className="text-xs font-bold text-slate-700 hover:text-emerald-700 :text-emerald-400 flex items-center gap-1.5 py-1 transition-all duration-150 ease-out "
              >
                <span>بيانات تكميلية للسداد والتسليم والتركيب (اختياري)</span>
                <ChevronDown size={14} className={`transform transition-transform ${showAdvancedFields ? 'rotate-180' : ''}`} />
              </button>

              {showAdvancedFields && (
                <div className="mt-3 p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">طريقة الدفع</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs bg-white "
                      >
                        <option value="نقدي">نقدي (كاش)</option>
                        <option value="بطاقة">بطاقة مصرفية / تداول</option>
                        <option value="تحويل">تحويل مصرفي</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">العربون المدفوع ({settings.shopInfo.currency})</label>
                      <input
                        type="number"
                        min="0"
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs font-mono tabular-nums bg-white "
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">المتبقي للتحصيل</label>
                      <div className="w-full px-3 py-2 text-xs font-mono tabular-nums font-bold bg-slate-100 border border-slate-200/80 rounded-xl text-slate-800 ">
                        {remainingAmount.toLocaleString()} {settings.shopInfo.currency}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ التسليم المستهدف</label>
                      <input
                        type="date"
                        value={targetDeliveryDate}
                        onChange={(e) => setTargetDeliveryDate(e.target.value)}
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs bg-white "
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان موقع التركيب</label>
                      <input
                        type="text"
                        value={installationAddress}
                        onChange={(e) => setInstallationAddress(e.target.value)}
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs bg-white "
                        placeholder="المدينة، الشارع، الواجهة..."
                      />
                    </div>
                  </div>

                  {/* Signage Dimensions & Crane */}
                  {serviceType === 'لافتة إعلانية' && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-3">
                      <span className="text-[11px] font-bold text-emerald-800 block">مقاسات اللوحة والرافعة:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">الطول (متر)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="w-full glass-input rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums bg-white "
                            placeholder="2.0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">العرض (متر)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            className="w-full glass-input rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums bg-white "
                            placeholder="3.0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">تكلفة الرافعة والنقل ({settings.shopInfo.currency})</label>
                          <input
                            type="number"
                            min="0"
                            value={craneCost}
                            onChange={(e) => setCraneCost(e.target.value)}
                            className="w-full glass-input rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums bg-white "
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {width && height && (
                        <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex justify-between items-center">
                          <span>المساحة المحسوبة آلياً:</span>
                          <span className="font-mono tabular-nums">{calculatedArea} متر مربع (م²)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 8. الملاحظات والتعليمات الخاصة بالطلبية */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText size={15} className="text-slate-600" />
                    <span>ملاحظات إضافية وتعليمات خاصة بالطلبية</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">اختياري</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب هنا أي ملاحظات أو تعليمات خاصة بالطلبية (مواصفات المواد، شروط التسليم، ملاحظات العميل، تفاصيل فنية، إلخ)..."
                  className="w-full glass-input rounded-lg px-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-200/90 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* شريط الإجراءات العائم في الزاوية السفلية من الشاشة (Fixed Floating Action Bar) */}
            <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-950/20 dark:shadow-black/70 animate-in slide-in-from-bottom-4 duration-200">
              <button
                type="button"
                onClick={() => setActiveTab('monthly_grid')}
                className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 ease-out"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 sm:px-8 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] flex items-center gap-2 transition-all"
              >
                <Check size={18} />
                <span>حفظ الطلبية وإصدار الفاتورة</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: صفحة المصاريف المستقلة (Operational Expenses) */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <ExpensesView
          currency={settings.shopInfo.currency}
          onNavigateToProfits={() => setActiveTab('profits')}
          onNavigateToSales={() => setActiveTab('monthly_grid')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: صفحة الأرباح المستقلة (Financial Summary & Profits) */}
      {/* ========================================================================= */}
      {activeTab === 'profits' && (
        <ProfitsView
          currency={settings.shopInfo.currency}
          onNavigateToExpenses={() => setActiveTab('expenses')}
          onNavigateToSales={() => setActiveTab('monthly_grid')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: مسار الإنتاج Kanban (Kanban Production Pipeline) */}
      {/* ========================================================================= */}
      {activeTab === 'kanban' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Kanban Toolbar */}
          <div className="glass-panel p-4 rounded-xl bg-white/90 border border-slate-200/80 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 no-print">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={kanbanSearch}
                onChange={(e) => setKanbanSearch(e.target.value)}
                placeholder="بحث في خطوط الإنتاج (رقم الفاتورة، العميل)..."
                className="w-full glass-input rounded-lg pr-9 pl-4 py-2 text-xs"
              />
              {kanbanSearch && (
                <button 
                  type="button"
                  onClick={() => setKanbanSearch('')}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Service & Employee Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={kanbanServiceFilter}
                  onChange={(e) => setKanbanServiceFilter(e.target.value)}
                  className="glass-input rounded-lg px-3 py-2 text-xs font-bold bg-white appearance-none pr-3 pl-8 cursor-pointer"
                >
                  <option value="الكل">جميع الخدمات</option>
                  <option value="لافتة إعلانية">لافتة إعلانية</option>
                  <option value="إدارة صفحات سوشيال ميديا">إدارة صفحات سوشيال ميديا</option>
                  <option value="تصميم موقع إلكتروني">تصميم موقع إلكتروني</option>
                  <option value="خدمات طباعة">خدمات طباعة</option>
                </select>
                <ChevronDown size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={kanbanEmployeeFilter}
                  onChange={(e) => setKanbanEmployeeFilter(e.target.value)}
                  className="glass-input rounded-lg px-3 py-2 text-xs font-bold bg-white appearance-none pr-3 pl-8 cursor-pointer"
                >
                  <option value="الكل">جميع المنفذين</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4.5 items-start">
            {kanbanColumns.map((col) => {
              const columnOrders = filteredKanbanOrders.filter(
                o => normalizeKanbanStatus(o.status) === col.id
              );

              return (
                <div 
                  key={col.id}
                  className={`glass-panel rounded-xl border border-slate-200/80 bg-white/80 flex flex-col max-h-[calc(100vh-220px)] border-t-4 ${col.borderColor}`}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-slate-200/70 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900 ">
                          {col.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${col.badgeBg}`}>
                          {columnOrders.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{col.subtitle}</p>
                    </div>
                  </div>

                  {/* Cards Scroll Area */}
                  <div className="p-3 space-y-3 overflow-y-auto flex-1 max-h-[620px]">
                    {columnOrders.map((order) => {
                      const nextStatus = getNextKanbanStatus(order.status);
                      const orderSerial = order.serialNumber || order.id;

                      return (
                        <div
                          key={order.id}
                          className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-sm transition-all duration-150 ease-out space-y-3"
                        >
                          {/* Serial & Service */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono tabular-nums text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 ">
                              #{orderSerial}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 ">
                              {order.serviceType || 'لافتة إعلانية'}
                            </span>
                          </div>

                          {/* Client & Description */}
                          <div>
                            <h4 className="font-black text-xs text-slate-900 mb-1">
                              {order.clientName}
                            </h4>
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {order.description}
                            </p>
                          </div>

                          {/* Dimensions & Delivery Date */}
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-600 ">
                            {order.dimensions?.width && order.dimensions?.height && (
                              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono tabular-nums font-bold text-slate-700 ">
                                {order.dimensions.height}×{order.dimensions.width}م
                              </span>
                            )}
                            {order.targetDeliveryDate && (
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 ">
                                تسليم: {format(new Date(order.targetDeliveryDate), 'MM/dd')}
                              </span>
                            )}
                          </div>

                          {/* Assignee & Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-600 truncate">
                              {order.assignedEmployee || 'غير معين'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Details Modal Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForDetails(order)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all duration-150 ease-out"
                                title="عرض التفاصيل والملاحظات"
                              >
                                <FileText size={13} />
                              </button>

                              {/* Attachment Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForDesign(order)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 :bg-blue-950/60 border border-blue-200 transition-all duration-150 ease-out "
                                title="المخطط والتصميم"
                              >
                                <FileImage size={13} />
                              </button>

                              {/* Advance Status Button */}
                              {nextStatus && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, nextStatus)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all duration-150 ease-out  shadow-xs"
                                  title={`نقل إلى ${nextStatus}`}
                                >
                                  <span>{nextStatus}</span>
                                  <ArrowRight size={11} className="rotate-180" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {columnOrders.length === 0 && (
                      <div className="py-10 text-center text-xs text-slate-400 ">
                        لا توجد طلبيات في هذه المرحلة
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Details & Notes Modal */}
      <OrderDetailsModal
        order={selectedOrderForDetails}
        isOpen={!!selectedOrderForDetails}
        onClose={() => setSelectedOrderForDetails(null)}
        onPrint={(order) => {
          setSelectedOrderForDetails(null);
          setPrintingOrder(order);
        }}
        onShareWhatsApp={(order) => {
          setSelectedOrderForDetails(null);
          setWhatsAppOrder(order);
        }}
      />

      {/* Design Attachment Modal */}
      <DesignAttachmentModal
        order={selectedOrderForDesign}
        isOpen={!!selectedOrderForDesign}
        onClose={() => setSelectedOrderForDesign(null)}
      />

      {/* A4 Invoice Print Modal */}
      <InvoicePrintModal
        order={printingOrder}
        isOpen={!!printingOrder}
        onClose={() => setPrintingOrder(null)}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        order={whatsAppOrder}
        isOpen={!!whatsAppOrder}
        onClose={() => setWhatsAppOrder(null)}
      />
    </div>
  );
}
