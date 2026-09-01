import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Order, OrderStatus, PaymentMethod, ServiceType, OrderMaterialUsage } from '../types';
import { 
  Plus, Printer, X, Inbox, Maximize, Calendar, FileImage, 
  MapPin, Hash, User, DollarSign, FileText, 
  Search, Filter, Trash2, Layers, Share2, Monitor, 
  FileSpreadsheet, ChevronDown, Calculator, Check, 
  Briefcase, MessageSquare, BookOpen, RotateCcw, 
  Tv, PackageMinus, Boxes, Kanban, ArrowRight, 
  CheckCircle2, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import DesignAttachmentModal from '../components/DesignAttachmentModal';
import InvoicePrintModal from '../components/InvoicePrintModal';
import WhatsAppShareModal from '../components/WhatsAppShareModal';

type SalesActiveTab = 'new_order' | 'invoices' | 'kanban';

export default function Sales() {
  const { 
    orders, 
    addOrder, 
    deleteOrder, 
    getNextSerialNumber, 
    updateOrderStatus, 
    employees, 
    settings,
    inventory,
    isKioskMode,
    toggleKioskMode 
  } = useAppContext();

  // Active Tab State (3 Principal Tabs)
  const [activeTab, setActiveTab] = useState<SalesActiveTab>('invoices');

  // Modals state
  const [selectedOrderForDesign, setSelectedOrderForDesign] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [whatsAppOrder, setWhatsAppOrder] = useState<Order | null>(null);

  // Search & Filter state for Invoices Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('الكل');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('الكل');

  // Search & Filter state for Kanban Tab
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanServiceFilter, setKanbanServiceFilter] = useState<string>('الكل');
  const [kanbanEmployeeFilter, setKanbanEmployeeFilter] = useState<string>('الكل');

  // Form Fields:
  // 1. رقم التسلسل: حقل يولد رقماً تسلسلياً تلقائياً (#1001)
  const [customSerial, setCustomSerial] = useState('');
  
  // 2. نوع الخدمة
  const [serviceType, setServiceType] = useState<ServiceType>('لافتة إعلانية');
  
  // 3. اسم الزبون
  const [clientName, setClientName] = useState('');
  
  // 4. سعر الفاتورة الإجمالي
  const [price, setPrice] = useState('');
  
  // 5. تفصيل الخدمة
  const [description, setDescription] = useState('');
  
  // 6. التكلفة و التوقع للربح
  
  const [cost, setCost] = useState('');
  
  // Detailed costs
  const [materialCost, setMaterialCost] = useState('');
  const [printingCost, setPrintingCost] = useState('');
  const [externalCost, setExternalCost] = useState('');
  const [commissionCost, setCommissionCost] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [costCenter, setCostCenter] = useState('');

  
  // 7. الجهة المنفذة (الموظف المسؤول)
  const [assignedEmployee, setAssignedEmployee] = useState('');

  // Supplementary Fields (Payment, Delivery, Dimensions)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقدي');
  const [deposit, setDeposit] = useState('');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [craneCost, setCraneCost] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Raw Materials Auto-Deduction State
  const [usedMaterials, setUsedMaterials] = useState<OrderMaterialUsage[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('');

  // Form Submission Success Toast
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Unique client names list for Client Ledger filter
  const uniqueClients = useMemo(() => {
    const clients = Array.from(new Set(orders.map(o => o.clientName.trim()).filter(Boolean)));
    return clients.sort();
  }, [orders]);

  // Auto-calculated serial number
  const currentSerialNumber = customSerial || getNextSerialNumber();

  // Dynamic calculations in form
  const parsedPrice = parseFloat(price) || 0;
  
    const mCost = parseFloat(materialCost) || 0;
    const pCost = parseFloat(printingCost) || 0;
    const eCost = parseFloat(externalCost) || 0;
    const cCost = parseFloat(commissionCost) || 0;
    const oCost = parseFloat(otherCosts) || 0;
    const directCostInput = parseFloat(cost) || 0;
    
    // If detailed costs are provided, sum them, else use direct input cost
    const totalDetailedCost = mCost + pCost + eCost + cCost + oCost;
    const parsedCost = totalDetailedCost > 0 ? totalDetailedCost : directCostInput;

  const expectedProfit = parsedPrice - parsedCost;
  const profitMargin = parsedPrice > 0 ? ((expectedProfit / parsedPrice) * 100).toFixed(1) : '0';

  const parsedWidth = parseFloat(width) || 0;
  const parsedHeight = parseFloat(height) || 0;
  const calculatedArea = (parsedWidth * parsedHeight).toFixed(2);

  const parsedDeposit = parseFloat(deposit) || 0;
  const remainingAmount = Math.max(0, parsedPrice - parsedDeposit);

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
    setCustomSerial('');
    setServiceType('لافتة إعلانية');
    setClientName('');
    setPrice('');
    setDescription('');
    
    setCost('');
    setMaterialCost('');
    setPrintingCost('');
    setExternalCost('');
    setCommissionCost('');
    setOtherCosts('');
    setCostCenter('');

    setAssignedEmployee('');
    setPaymentMethod('نقدي');
    setDeposit('');
    setTargetDeliveryDate('');
    setWidth('');
    setHeight('');
    setInstallationAddress('');
    setCraneCost('');
    setShowAdvancedFields(false);
    setUsedMaterials([]);
    setSelectedMaterialId('');
    setMaterialQty('');
  };

  const handleAddMaterialUsage = () => {
    if (!selectedMaterialId || !materialQty || parseFloat(materialQty) <= 0) return;
    const invItem = inventory.find(i => i.id === selectedMaterialId);
    if (!invItem) return;

    const qty = parseFloat(materialQty);
    const uPrice = invItem.unitPrice || 0;
    const tCost = qty * uPrice;

    const newUsage: OrderMaterialUsage = {
      itemId: invItem.id,
      name: invItem.name,
      quantity: qty,
      unit: invItem.unit,
      unitPrice: uPrice,
      totalCost: tCost
    };

    const updatedMaterials = [...usedMaterials, newUsage];
    setUsedMaterials(updatedMaterials);

    // Auto-calculate execution cost from raw materials + crane
    const matsCostSum = updatedMaterials.reduce((sum, m) => sum + (m.totalCost || (m.quantity * (m.unitPrice || 0))), 0);
    const parsedCrane = parseFloat(craneCost) || 0;
    setCost(String(matsCostSum + parsedCrane));

    setSelectedMaterialId('');
    setMaterialQty('');
  };

  const handleRemoveMaterialUsage = (index: number) => {
    const updatedMaterials = usedMaterials.filter((_, i) => i !== index);
    setUsedMaterials(updatedMaterials);
    
    const matsCostSum = updatedMaterials.reduce((sum, m) => sum + (m.totalCost || (m.quantity * (m.unitPrice || 0))), 0);
    const parsedCrane = parseFloat(craneCost) || 0;
    setCost(String(matsCostSum + parsedCrane));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !description.trim() || parsedPrice <= 0) return;

    const parsedCraneCost = craneCost ? parseFloat(craneCost) : 0;

    addOrder({
      serialNumber: currentSerialNumber,
      serviceType,
      clientName: clientName.trim(),
      description: description.trim(),
      
      price: parsedPrice,
      cost: parsedCost,
      materialCost: mCost,
      printingCost: pCost,
      externalCost: eCost,
      commissionCost: cCost,
      otherCosts: oCost,
      costCenter: costCenter.trim() || undefined,

      expectedProfit,
      assignedEmployee: assignedEmployee || (employees.length > 0 ? employees[0].name : 'إدارة الورشة'),
      status: 'بانتظار اعتماد التصميم',
      paymentMethod,
      date: new Date().toISOString(),
      dimensions: (width || height) ? { width, height } : undefined,
      targetDeliveryDate: targetDeliveryDate ? new Date(targetDeliveryDate).toISOString() : undefined,
      deposit: parsedDeposit,
      remaining: remainingAmount,
      installationAddress: installationAddress.trim() || undefined,
      craneCost: parsedCraneCost,
      usedMaterials: usedMaterials.length > 0 ? usedMaterials : undefined
    }, currentSerialNumber);

    resetForm();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);
    setActiveTab('invoices');
  };

  const handleDeleteOrder = (orderId: string, client: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الطلبية/الفاتورة رقم #${orderId} الخاصة بـ (${client})؟`)) {
      deleteOrder(orderId);
    }
  };

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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">المبيعات والطلبيات</h2>
          <p className="text-xs text-slate-600 mt-1">
            إدارة العقود، تسجيل الفواتير، كشف حسابات الزبائن، ومتابعة مسارات الإنتاج والتنفيذ
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Workshop Kiosk Toggle */}
          <button
            type="button"
            onClick={toggleKioskMode}
            className={`glass-button flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ease-out shadow-xs ${
              isKioskMode 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600' 
                : 'text-slate-700 border-slate-200/80 hover:bg-slate-100 :bg-slate-800'
            }`}
            title="تفعيل شاشة عرض الورشة"
            aria-label="تفعيل شاشة عرض الورشة"
          >
            <Tv size={15} className={isKioskMode ? 'text-white' : 'text-emerald-600 '} />
            <span className="hidden sm:inline">{isKioskMode ? 'إلغاء وضع الورشة' : 'وضع شاشة الورشة'}</span>
          </button>
        </div>
      </div>

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">تم حفظ الطلبية وإصدار الفاتورة وخصم المواد الخام من المخزن بنجاح.</span>
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

      {/* Tabs Navigation (3 Primary Tabs) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-xs no-print">
        
        {/* Tab 1: إضافة طلبية جديدة */}
        <button
          type="button"
          onClick={() => setActiveTab('new_order')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 ease-out ${
            activeTab === 'new_order'
              ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/80 '
              : 'text-slate-600 hover:text-slate-900 :text-white'
          }`}
        >
          <Plus size={16} className={activeTab === 'new_order' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>إضافة طلبية جديدة</span>
        </button>

        {/* Tab 2: سجل الفواتير */}
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 ease-out ${
            activeTab === 'invoices'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 '
              : 'text-slate-600 hover:text-slate-900 :text-white'
          }`}
        >
          <FileText size={16} className={activeTab === 'invoices' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>سجل الفواتير ({orders.length})</span>
        </button>

        {/* Tab 3: مسار الإنتاج Kanban */}
        <button
          type="button"
          onClick={() => setActiveTab('kanban')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 ease-out ${
            activeTab === 'kanban'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 '
              : 'text-slate-600 hover:text-slate-900 :text-white'
          }`}
        >
          <Kanban size={16} className={activeTab === 'kanban' ? 'text-blue-600' : 'text-slate-400'} />
          <span>مسار الإنتاج Kanban</span>
        </button>
      </div>

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
                <p className="text-xs text-slate-600 ">إدخال بيانات العقد، الأسعار، وحساب صافي الأرباح وخصم المخزون التلقائي</p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-600 hover:text-slate-800 :text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200/80 transition-all duration-150 ease-out "
            >
              تفريغ الحقول
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Row 1: Field 1 (رقم التسلسل) & Field 2 (نوع الخدمة) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* 1. رقم التسلسل: حقل يولد رقماً تسلسلياً تلقائياً */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Hash size={14} className="text-slate-600" />
                  <span>1. رقم التسلسل (توليد تلقائي)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentSerialNumber}
                    onChange={(e) => setCustomSerial(e.target.value)}
                    className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums font-black text-emerald-800 bg-emerald-50/40 border-emerald-300/80 "
                    placeholder="#1001"
                  />
                  <span className="absolute left-3 top-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                    رقم #{currentSerialNumber}
                  </span>
                </div>
              </div>

              {/* 2. نوع الخدمة: قائمة منسدلة */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Layers size={14} className="text-slate-600" />
                  <span>2. نوع الخدمة</span>
                </label>
                <div className="relative">
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as ServiceType)}
                    className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 appearance-none bg-white cursor-pointer pr-4 pl-10"
                    required
                  >
                    <option value="لافتة إعلانية">لافتة إعلانية</option>
                    <option value="إدارة صفحات سوشيال ميديا">إدارة صفحات سوشيال ميديا</option>
                    <option value="تصميم موقع إلكتروني">تصميم موقع إلكتروني</option>
                    <option value="خدمات طباعة">خدمات طباعة</option>
                  </select>
                  <ChevronDown size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Field 3 (اسم الزبون) & Field 4 (سعر الفاتورة الإجمالي) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* 3. اسم الزبون */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-slate-600" />
                  <span>3. اسم الزبون (الشركة أو الشخص)</span>
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

              {/* 4. سعر الفاتورة الإجمالي */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-slate-600" />
                  <span>4. سعر الفاتورة الإجمالي ({settings.shopInfo.currency})</span>
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

            {/* Field 5: تفصيل الخدمة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-600" />
                <span>5. تفصيل الخدمة والمواصفات</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm resize-y leading-relaxed"
                placeholder="اكتب مواصفات العمل والبنود المتفق عليها..."
              />
            </div>

            {/* Raw Materials Auto-Deduction Section */}
            <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageMinus size={16} className="text-emerald-600 " />
                  <span className="text-xs font-bold text-slate-900 ">
                    خصم المواد الخام المستهلكة من المخزن وحساب التكلفة آلياً
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 ">
                  تحديث فوري لرصيد المخزن
                </span>
              </div>

              {/* Material selector */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-7">
                  <select
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-xs bg-white "
                  >
                    <option value="">اختر مادة خام من المخزون...</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} (المتوفر: {item.quantity} {item.unit} | التكلفة: {item.unitPrice || 0} {settings.shopInfo.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={materialQty}
                    onChange={(e) => setMaterialQty(e.target.value)}
                    placeholder="الكمية..."
                    className="w-full glass-input rounded-lg px-3 py-2 text-xs font-mono tabular-nums bg-white "
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddMaterialUsage}
                    className="w-full btn-primary py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Plus size={14} />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>

              {/* Added materials list */}
              {usedMaterials.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/80 ">
                  {usedMaterials.map((mat, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-bold"
                    >
                      <Boxes size={13} className="text-emerald-600" />
                      <span>{mat.name}:</span>
                      <span className="font-mono tabular-nums text-emerald-700 ">{mat.quantity} {mat.unit}</span>
                      {mat.totalCost ? (
                        <span className="text-[10px] font-mono tabular-nums text-slate-600 bg-white/80 px-1.5 py-0.5 rounded">
                          ({mat.totalCost.toLocaleString()} {settings.shopInfo.currency})
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterialUsage(idx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field 6: التكلفة و التوقع للربح */}
            <div className="p-5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calculator size={15} className="text-emerald-700 " />
                  <span>6. التكلفة والتوقع للربح (تكلفة التنفيذ الفعلية)</span>
                </label>
                <span className="text-[10px] font-semibold text-slate-600 ">
                  بيانات داخلية خاصة بالإدارة
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
                <div>
                  <span className="text-[11px] text-slate-600 block mb-1">تكلفة التنفيذ (المواد والعمالة):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2.5 text-sm font-mono tabular-nums font-bold text-rose-700 bg-white "
                    placeholder="0.00"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-center shadow-xs">
                  <span className="text-[11px] text-slate-600 block mb-0.5">صافي الربح المحسوب آلياً:</span>
                  <span className={`font-mono tabular-nums text-sm font-black ${expectedProfit >= 0 ? 'text-emerald-700 ' : 'text-rose-700 '}`}>
                    {expectedProfit >= 0 ? `+${expectedProfit.toLocaleString()}` : expectedProfit.toLocaleString()} {settings.shopInfo.currency}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-center shadow-xs">
                  <span className="text-[11px] text-slate-600 block mb-0.5">نسبة هامش الربح:</span>
                  <span className="font-mono tabular-nums text-sm font-bold text-slate-800 ">
                    {profitMargin}%
                  </span>
                </div>
              </div>
            </div>

            {/* Field 7: الجهة المنفذة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase size={14} className="text-slate-600" />
                <span>7. الجهة المنفذة (الموظف المسؤول)</span>
              </label>
              <div className="relative">
                <select
                  value={assignedEmployee}
                  onChange={(e) => setAssignedEmployee(e.target.value)}
                  className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 appearance-none bg-white cursor-pointer pr-4 pl-10"
                >
                  <option value="">اختر الموظف المسؤول عن التنفيذ...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                  <option value="إدارة الورشة / فريق العمل">إدارة الورشة / فريق العمل</option>
                </select>
                <ChevronDown size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
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
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/80 ">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 :text-white hover:bg-slate-100 :bg-slate-800 transition-all duration-150 ease-out "
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary px-8 py-2.5 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
              >
                <Check size={16} />
                <span>حفظ الطلبية وإصدار الفاتورة</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: سجل الفواتير (Invoices & Client Ledger) */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Financial Metrics Summary Banner */}
          {!isKioskMode && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
              <div className="glass-panel p-4 rounded-xl border border-slate-200/80 bg-white/90 ">
                <span className="text-[11px] font-bold text-slate-600 block mb-1">إجمالي المبيعات</span>
                <span className="font-mono tabular-nums text-lg font-black text-slate-900 ">
                  {totalSales.toLocaleString()} {settings.shopInfo.currency}
                </span>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-200/80 bg-white/90 ">
                <span className="text-[11px] font-bold text-slate-600 block mb-1">إجمالي التكاليف</span>
                <span className="font-mono tabular-nums text-lg font-black text-rose-700 ">
                  {totalCosts.toLocaleString()} {settings.shopInfo.currency}
                </span>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-200/80 bg-white/90 ">
                <span className="text-[11px] font-bold text-slate-600 block mb-1">صافي الأرباح</span>
                <span className="font-mono tabular-nums text-lg font-black text-emerald-700 ">
                  {totalNetProfit.toLocaleString()} {settings.shopInfo.currency}
                </span>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-slate-200/80 bg-white/90 ">
                <span className="text-[11px] font-bold text-slate-600 block mb-1">عدد الطلبيات</span>
                <span className="font-mono tabular-nums text-lg font-black text-slate-900 ">
                  {orders.length} طلبية
                </span>
              </div>
            </div>
          )}

          {/* Client Ledger Filter & Search Toolbar */}
          <div className="glass-panel p-4 sm:p-5 rounded-xl no-print space-y-4 bg-white/90 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-200/70 ">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 ">كشف حسابات الزبائن وتصفية السجل</h3>
                  <p className="text-[11px] text-slate-600 ">تصفية الفواتير بحسب اسم الزبون ومراجعة إجمالي المسدد والمتبقي</p>
                </div>
              </div>

              {/* Client Selector Dropdown */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-600 shrink-0">اختيار الزبون:</span>
                <div className="relative flex-1 md:w-64">
                  <select
                    value={selectedClientFilter}
                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2 text-xs font-bold text-slate-900 appearance-none bg-white cursor-pointer pr-3 pl-8"
                  >
                    <option value="الكل">جميع الزبائن ({uniqueClients.length} عميل)</option>
                    {uniqueClients.map(client => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>

                {selectedClientFilter !== 'الكل' && (
                  <button
                    type="button"
                    onClick={() => setSelectedClientFilter('الكل')}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-800 :text-slate-200 hover:bg-slate-100 :bg-slate-800 transition-all duration-150 ease-out "
                    title="إلغاء تصفية الزبون"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Client Ledger Summary Card (When specific client selected) */}
            {selectedClientFilter !== 'الكل' && (
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-indigo-700 " />
                    <span className="text-xs font-black text-indigo-950 ">
                      كشف حساب: {selectedClientFilter}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-lg">
                    عدد الفواتير: {clientLedgerStats.count}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">إجمالي الفواتير المطلوبة</span>
                    <span className="font-mono tabular-nums text-base font-black text-slate-900 ">
                      {clientLedgerStats.totalBilled.toLocaleString()} {settings.shopInfo.currency}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-800 block mb-1">إجمالي المدفوع (المسدد)</span>
                    <span className="font-mono tabular-nums text-base font-black text-emerald-700 ">
                      {clientLedgerStats.totalPaid.toLocaleString()} {settings.shopInfo.currency}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-rose-200/80 shadow-xs">
                    <span className="text-[10px] font-bold text-rose-700 block mb-1">إجمالي المتبقي للتحصيل</span>
                    <span className="font-mono tabular-nums text-base font-black text-rose-700 ">
                      {clientLedgerStats.totalRemaining.toLocaleString()} {settings.shopInfo.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Filters & Search Row */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pt-1">
              <div className="relative flex-1">
                <Search size={16} className="absolute right-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث برقم الفاتورة (#1001)، اسم الزبون، أو تفاصيل الخدمة..."
                  className="w-full glass-input rounded-lg pr-10 pl-4 py-2.5 text-xs bg-slate-50/70 "
                />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')} 
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 :text-slate-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Service Type Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
                {['الكل', 'لافتة إعلانية', 'إدارة صفحات سوشيال ميديا', 'تصميم موقع إلكتروني', 'خدمات طباعة'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedServiceFilter(tab)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all duration-150 ease-out text-xs border ${
                      selectedServiceFilter === tab
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 :bg-slate-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className={isKioskMode ? "grid grid-cols-1 lg:grid-cols-2 gap-5 no-print" : "space-y-3.5 no-print"}>
            {filteredOrders.map((order) => {
              const costVal = order.cost || 0;
              const profitVal = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - costVal);
              const margin = order.price > 0 ? ((profitVal / order.price) * 100).toFixed(0) : '0';
              const orderSerial = order.serialNumber || order.id;

              return (
                <div 
                  key={order.id} 
                  className={`glass-panel p-5 rounded-xl flex flex-col justify-between gap-4 hover:shadow-sm transition-all duration-150 ease-out border border-slate-200/80 bg-white/95 ${
                    isKioskMode ? 'p-6 ring-1 ring-emerald-500/20' : 'lg:flex-row lg:items-center'
                  }`}
                >
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-mono tabular-nums text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 ">
                          #{orderSerial}
                        </span>
                        
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 border border-slate-200/80 text-slate-800 ">
                          {renderServiceIcon(order.serviceType)}
                          <span>{order.serviceType || 'لافتة إعلانية'}</span>
                        </span>

                        <h3 className={`font-black text-slate-900 truncate ${isKioskMode ? 'text-lg' : 'text-base'}`}>
                          {order.clientName}
                        </h3>
                      </div>

                      {/* Interactive Status Badge */}
                      <div className="relative shrink-0">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-black border appearance-none text-center cursor-pointer transition-all duration-150 ease-out pr-7 pl-3.5 shadow-xs
                            ${order.status === 'تم التسليم' ? 'text-emerald-800 bg-emerald-100/90 border-emerald-300 ' : 
                              order.status === 'قيد التركيب' ? 'text-blue-800 bg-blue-100/90 border-blue-300 ' : 
                              order.status === 'بانتظار اعتماد التصميم' ? 'text-purple-800 bg-purple-100/90 border-purple-300 ' :
                              'text-amber-800 bg-amber-100/90 border-amber-300 '}`}
                        >
                          <option value="بانتظار اعتماد التصميم">بانتظار اعتماد التصميم</option>
                          <option value="قيد التصميم">قيد التصميم</option>
                          <option value="قيد الطباعة">قيد الطباعة</option>
                          <option value="قيد التركيب">قيد التركيب</option>
                          <option value="تم التسليم">تم التسليم</option>
                        </select>
                        <ChevronDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </div>

                    {/* Description */}
                    <p className={`text-slate-600 mb-3 font-normal leading-relaxed ${isKioskMode ? 'text-sm font-medium' : 'text-xs line-clamp-2'}`}>
                      {order.description}
                    </p>

                    {/* Badges / Specs Row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 ">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                        {format(new Date(order.date), 'yyyy-MM-dd')}
                      </span>
                      
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                        {order.paymentMethod}
                      </span>

                      {order.assignedEmployee && (
                        <span className="bg-blue-50 text-blue-800 border border-blue-200/80 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                          المسؤول: {order.assignedEmployee}
                        </span>
                      )}

                      {order.dimensions?.width && order.dimensions?.height && (
                        <span className="flex items-center text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg font-mono tabular-nums text-[11px] font-bold">
                          <Maximize size={12} className="ml-1 text-slate-600" />
                          {order.dimensions.height}م × {order.dimensions.width}م ({((parseFloat(order.dimensions.width) || 0) * (parseFloat(order.dimensions.height) || 0)).toFixed(2)} م²)
                        </span>
                      )}

                      {order.installationAddress && (
                        <span className="flex items-center text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg text-[11px]">
                          <MapPin size={12} className="ml-1 text-slate-600" />
                          {order.installationAddress}
                        </span>
                      )}

                      {order.targetDeliveryDate && (
                        <span className="flex items-center bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 ">
                          <Calendar size={12} className="ml-1" />
                          تسليم: {format(new Date(order.targetDeliveryDate), 'yyyy-MM-dd')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Breakdown & Profit Badge */}
                  <div className="flex items-center gap-4 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-600 block font-bold">سعر الفاتورة:</span>
                      <div className="text-base font-black text-slate-900 font-mono tabular-nums">
                        {order.price.toLocaleString()} {settings.shopInfo.currency}
                      </div>
                      {order.remaining !== undefined && order.remaining > 0 && (
                        <span className="text-[10px] font-bold text-rose-700 block">
                          المتبقي: {order.remaining.toLocaleString()} {settings.shopInfo.currency}
                        </span>
                      )}
                    </div>

                    <div className="h-8 w-px bg-slate-200 "></div>

                    {/* Cost & Profit */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-600 block font-bold">تكلفة / صافي الربح:</span>
                      <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs font-bold">
                        <span className="text-rose-700 ">{costVal.toLocaleString()}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-emerald-700 font-black">+{profitVal.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 block">
                        هامش: {margin}%
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-t lg:border-t-0 lg:border-r border-slate-200/80 pt-3 lg:pt-0 lg:pr-4 shrink-0">
                    
                    {/* Design Attachment Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForDesign(order)}
                      className="glass-button flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-blue-700 hover:bg-blue-50 :bg-blue-950/50 border-blue-200 text-xs font-bold transition-all duration-150 ease-out"
                      title="إرفاق/عرض ملفات التصميم"
                    >
                      <FileImage size={15} />
                      <span>التصميم</span>
                    </button>

                    {/* WhatsApp Export Button */}
                    <button
                      type="button"
                      onClick={() => setWhatsAppOrder(order)}
                      className="glass-button flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-emerald-700 hover:bg-emerald-50 :bg-emerald-950/50 border-emerald-200 text-xs font-bold transition-all duration-150 ease-out"
                      title="إرسال بيانات الفاتورة عبر واتساب"
                    >
                      <MessageSquare size={15} />
                      <span>إرسال واتساب</span>
                    </button>

                    {/* Print Invoice Button (A4) */}
                    <button
                      type="button"
                      onClick={() => setPrintingOrder(order)}
                      className="glass-button flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-slate-800 hover:text-slate-900 :text-white text-xs font-bold"
                      title="معاينة وطباعة الفاتورة على مقاس A4"
                    >
                      <Printer size={15} />
                      <span>طباعة</span>
                    </button>

                    {/* Delete Order Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id, order.clientName)}
                      className="p-2 text-slate-400 hover:text-rose-600 :text-rose-400 hover:bg-rose-50 :bg-rose-950/50 rounded-xl transition-all duration-150 ease-out "
                      title="حذف الطلبية"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="col-span-full glass-panel p-16 rounded-xl text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
                  <Inbox size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">لا توجد طلبيات مطابقة للبحث أو الفلتر</h3>
                  <p className="text-xs text-slate-600 ">جرب تغيير كلمات البحث أو اسم الزبون أو قم بإضافة طلبية جديدة من التبويب المخصص.</p>
                </div>
              </div>
            )}
          </div>
        </div>
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
