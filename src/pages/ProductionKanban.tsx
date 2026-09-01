import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { 
  Search, 
  Filter, 
  User, 
  Boxes, 
  Activity, 
  Check, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Receipt
} from 'lucide-react';

export default function ProductionKanban() {
  const { 
    orders, 
    updateOrderStatus, 
    updateInventoryQuantity,
    customers, 
    setCustomers,
    treasuryAccounts, 
    setTreasuryAccounts,
    treasuryTransactions, 
    setTreasuryTransactions,
    settings 
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<OrderStatus | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Exact 5 Kanban stages matching specifications
  const columns: { id: OrderStatus; title: string; subtitle: string }[] = [
    { 
      id: 'بانتظار اعتماد التصميم', 
      title: 'طلبات جديدة', 
      subtitle: 'بانتظار المراجعة والاعتماد' 
    },
    { 
      id: 'قيد التصميم', 
      title: 'قيد التصميم', 
      subtitle: 'إعداد الرسومات والمخططات' 
    },
    { 
      id: 'قيد الطباعة', 
      title: 'قيد الطباعة والتنفيذ', 
      subtitle: 'أعمال الطباعة والإنتاج الفعلي' 
    },
    { 
      id: 'قيد التركيب', 
      title: 'جاهز للتسليم', 
      subtitle: 'التجهيز أو التركيب النهائي' 
    },
    { 
      id: 'تم التسليم', 
      title: 'مكتمل', 
      subtitle: 'تم التسليم والأرشفة المالية' 
    }
  ];

  // Helper to trigger automated completion logic
  const handleCompleteOrderAutomation = (order: Order) => {
    let actionSummary: string[] = [];

    // 1. Automatic inventory materials deduction
    if (order.usedMaterials && order.usedMaterials.length > 0) {
      order.usedMaterials.forEach(mat => {
        updateInventoryQuantity(mat.itemId, -mat.quantity);
      });
      actionSummary.push(`تم خصم ${order.usedMaterials.length} صنف مواد من المخزون`);
    }

    // 2. Financial settlement of remaining balance
    const remainingAmount = Math.max(0, (order.price || 0) - (order.deposit || 0));

    if (remainingAmount > 0) {
      if (order.paymentMethod === 'آجل') {
        // Post debt to customer statement
        setCustomers(prev => prev.map(c => {
          if (c.name.trim().toLowerCase() === order.clientName.trim().toLowerCase() || c.id === order.clientId) {
            const updatedTransactions = [
              ...c.transactions,
              {
                id: Math.random().toString(36).substring(2, 9),
                date: new Date().toISOString(),
                description: `إتمام وتسليم طلب #${order.serialNumber || order.id}`,
                amount: remainingAmount,
                type: 'مدين' as const,
                orderId: order.id
              }
            ];
            return {
              ...c,
              balance: c.balance + remainingAmount,
              totalInvoiced: c.totalInvoiced + (order.price || 0),
              transactions: updatedTransactions
            };
          }
          return c;
        }));
        actionSummary.push(`تم تقييد مبلغ ${remainingAmount.toLocaleString()} ${settings.shopInfo.currency} في مديونية العميل`);
      } else {
        // Post cash / transfer / card payment to Treasury
        const treasuryName = order.paymentMethod === 'نقدي' ? 'الخزينة الرئيسية' : 'الحساب المصرفي';
        const targetAccount = treasuryAccounts.find(a => a.name === treasuryName) || treasuryAccounts[0];

        if (targetAccount) {
          setTreasuryAccounts(prev => prev.map(a => 
            a.id === targetAccount.id ? { ...a, balance: a.balance + remainingAmount } : a
          ));
          setTreasuryTransactions(prev => [
            {
              id: Math.random().toString(36).substring(2, 9),
              accountId: targetAccount.id,
              date: new Date().toISOString(),
              type: 'إيداع',
              amount: remainingAmount,
              description: `تحصيل متبقي طلب #${order.serialNumber || order.id} - ${order.clientName}`
            },
            ...prev
          ]);
          actionSummary.push(`تم إيداع ${remainingAmount.toLocaleString()} ${settings.shopInfo.currency} في ${targetAccount.name}`);
        }
      }
    }

    if (actionSummary.length > 0) {
      setNotification(`اكتمل الطلب #${order.serialNumber || order.id}: ${actionSummary.join(' | ')}`);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId);
    setDraggingOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggingOrderId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent, statusId: OrderStatus) => {
    e.preventDefault();
    if (dragOverColumnId !== statusId) {
      setDragOverColumnId(statusId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: OrderStatus) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const orderId = e.dataTransfer.getData('text/plain') || draggingOrderId;
    if (!orderId) return;

    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === targetStatus) {
      setDraggingOrderId(null);
      return;
    }

    // Trigger automated actions when landing on "مكتمل" (تم التسليم)
    if (targetStatus === 'تم التسليم' && order.status !== 'تم التسليم') {
      handleCompleteOrderAutomation(order);
    }

    updateOrderStatus(orderId, targetStatus);
    setDraggingOrderId(null);
  };

  // Step Move helper (for mobile or click-based stage transfer)
  const handleMoveStage = (order: Order, nextStatus: OrderStatus) => {
    if (nextStatus === 'تم التسليم' && order.status !== 'تم التسليم') {
      handleCompleteOrderAutomation(order);
    }
    updateOrderStatus(order.id, nextStatus);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        o.clientName.toLowerCase().includes(query) || 
        (o.serialNumber && o.serialNumber.toLowerCase().includes(query)) ||
        o.id.toLowerCase().includes(query) ||
        (o.assignedEmployee && o.assignedEmployee.toLowerCase().includes(query));
      
      const matchesService = selectedService === 'all' || o.serviceType === selectedService;
      return matchesSearch && matchesService;
    });
  }, [orders, searchQuery, selectedService]);

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            مسار العمليات
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
            لوحة متابعة مراحل تنفيذ الطلبيات ونقل الحالات بالسحب والإفلات مع الأتمتة المباشرة
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="بحث برقم الطلب، العميل، أو الموظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 pl-4 pr-10 py-2 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-all duration-150 ease-out placeholder:text-slate-400 shadow-sm"
            />
          </div>

          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full sm:w-48 pl-4 pr-10 py-2 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-all duration-150 ease-out appearance-none shadow-sm cursor-pointer font-medium"
            >
              <option value="all">جميع الخدمات</option>
              <option value="لافتة إعلانية">لافتة إعلانية</option>
              <option value="إدارة صفحات سوشيال ميديا">سوشيال ميديا</option>
              <option value="تصميم موقع إلكتروني">موقع إلكتروني</option>
              <option value="خدمات طباعة">خدمات طباعة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Automated Action Toast Banner */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 text-xs px-2 py-0.5"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Kanban Board Horizontal Track */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none">
        {columns.map((col, colIndex) => {
          const colOrders = filteredOrders.filter(o => o.status === col.id);
          const isOver = dragOverColumnId === col.id;

          const prevCol = colIndex > 0 ? columns[colIndex - 1] : null;
          const nextCol = colIndex < columns.length - 1 ? columns[colIndex + 1] : null;

          return (
            <div 
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-shrink-0 w-80 flex flex-col rounded-xl border transition-all duration-150 ease-out ${
                isOver 
                  ? 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-400 dark:border-slate-500 ring-2 ring-slate-300/60 dark:ring-slate-600/60' 
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 rounded-t-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                    {col.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {col.subtitle}
                  </p>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono tabular-nums text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Body / Draggable Cards */}
              <div className="flex-1 p-3 space-y-3 min-h-[420px] max-h-[calc(100vh-280px)] overflow-y-auto">
                {colOrders.map(order => {
                  const isBeingDragged = draggingOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-all duration-150 ease-out cursor-grab active:cursor-grabbing hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md ${
                        isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'
                      }`}
                    >
                      {/* Top Row: Serial Number & Service Tag */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono tabular-nums text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600/80 px-2 py-0.5 rounded">
                          #{order.serialNumber || order.id}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-700/50 px-2 py-0.5 rounded truncate max-w-[120px]">
                          {order.serviceType || 'خدمة عامة'}
                        </span>
                      </div>

                      {/* Customer Name */}
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-2.5 truncate" title={order.clientName}>
                        {order.clientName}
                      </h4>

                      {/* Financial Value & Assigned Employee */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/70 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">القيمة:</span>
                          <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                            {order.price?.toLocaleString() || 0} {settings.shopInfo.currency}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            المسؤول:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                            {order.assignedEmployee || 'غير محدد'}
                          </span>
                        </div>
                      </div>

                      {/* Quick stage move controls */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-1.5">
                        {prevCol ? (
                          <button
                            type="button"
                            onClick={() => handleMoveStage(order, prevCol.id)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-all duration-150 ease-out flex items-center gap-1"
                            title={`إرجاع إلى: ${prevCol.title}`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span>السابق</span>
                          </button>
                        ) : <div />}

                        {nextCol ? (
                          <button
                            type="button"
                            onClick={() => handleMoveStage(order, nextCol.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200/80 dark:border-slate-600/80 rounded-md transition-all duration-150 ease-out flex items-center gap-1 shadow-sm"
                            title={`نقل إلى: ${nextCol.title}`}
                          >
                            <span>{nextCol.title}</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                            <Check className="w-3 h-3" />
                            <span>مكتمل</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colOrders.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-xs font-medium text-center p-3">
                    <span>اسحب الطلبية إلى هنا</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
