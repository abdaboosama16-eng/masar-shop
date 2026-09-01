import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Order, OrderStatus, ServiceType } from '../types';
import { 
  Layers, Share2, Monitor, FileSpreadsheet, FileText, 
  Clock, MapPin, Calendar, CheckCircle2, ChevronLeft, 
  ChevronRight, FileImage, User, Boxes, Filter, Search,
  ArrowRight, Check, Sparkles, MoveRight
} from 'lucide-react';
import { format } from 'date-fns';
import DesignAttachmentModal from '../components/DesignAttachmentModal';

export default function ProductionKanban() {
  const { orders, updateOrderStatus, currentUser, employees } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedOrderForDesign, setSelectedOrderForDesign] = useState<Order | null>(null);

  const isManager = currentUser?.role === 'مدير';

  // Kanban Columns Definition
  const columns: { id: OrderStatus; title: string; subtitle: string; color: string; badgeBg: string; borderColor: string }[] = [
    {
      id: 'قيد التصميم',
      title: 'قيد التصميم',
      subtitle: 'إعداد ومراجعة المخططات والقياسات',
      color: 'text-purple-700 dark:text-purple-400',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      borderColor: 'border-t-purple-500'
    },
    {
      id: 'قيد الطباعة',
      title: 'قيد الطباعة والتنفيذ',
      subtitle: 'أعمال القص، التشكيل، اللحام، والطباعة',
      color: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      borderColor: 'border-t-amber-500'
    },
    {
      id: 'قيد التركيب',
      title: 'قيد التركيب الميداني',
      subtitle: 'التثبيت في الموقع وأعمال الرفع والكهرباء',
      color: 'text-blue-700 dark:text-blue-400',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      borderColor: 'border-t-blue-500'
    },
    {
      id: 'تم التسليم',
      title: 'تم التسليم والاعتماد',
      subtitle: 'المشاريع المنجزة والمعتمدة بالكامل',
      color: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      borderColor: 'border-t-emerald-500'
    },
  ];

  // Map other statuses if needed
  const normalizeStatus = (status: OrderStatus): OrderStatus => {
    if (status === 'بانتظار اعتماد التصميم') return 'قيد التصميم';
    return status;
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = searchQuery.toLowerCase().trim();
      const serialMatch = (order.serialNumber || order.id).toLowerCase().includes(q);
      const clientMatch = order.clientName.toLowerCase().includes(q);
      const descMatch = order.description.toLowerCase().includes(q);
      const addressMatch = (order.installationAddress || '').toLowerCase().includes(q);
      const matchesSearch = !q || serialMatch || clientMatch || descMatch || addressMatch;

      const matchesService = selectedService === 'all' || (order.serviceType || 'لافتة إعلانية') === selectedService;
      const matchesEmployee = selectedEmployee === 'all' || (order.assignedEmployee || '') === selectedEmployee;

      return matchesSearch && matchesService && matchesEmployee;
    });
  }, [orders, searchQuery, selectedService, selectedEmployee]);

  // Geometric icons for services
  const renderServiceIcon = (type?: ServiceType) => {
    switch (type) {
      case 'لافتة إعلانية':
        return <Layers size={14} className="text-emerald-700 dark:text-emerald-400" />;
      case 'إدارة صفحات سوشيال ميديا':
        return <Share2 size={14} className="text-sky-700 dark:text-sky-400" />;
      case 'تصميم موقع إلكتروني':
        return <Monitor size={14} className="text-indigo-700 dark:text-indigo-400" />;
      case 'خدمات طباعة':
        return <FileSpreadsheet size={14} className="text-purple-700 dark:text-purple-400" />;
      default:
        return <FileText size={14} className="text-slate-600 dark:text-slate-400" />;
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const norm = normalizeStatus(currentStatus);
    if (norm === 'قيد التصميم') return 'قيد الطباعة';
    if (norm === 'قيد الطباعة') return 'قيد التركيب';
    if (norm === 'قيد التركيب') return 'تم التسليم';
    return null;
  };

  const getPrevStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const norm = normalizeStatus(currentStatus);
    if (norm === 'تم التسليم') return 'قيد التركيب';
    if (norm === 'قيد التركيب') return 'قيد الطباعة';
    if (norm === 'قيد الطباعة') return 'قيد التصميم';
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            مسار الإنتاج والمهام (Kanban)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة مراحل التنفيذ الفنية من التصميم والطباعة حتى التركيب والتسليم النهائي
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder="بحث برقم الطلبية أو العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl pl-4 pr-9 py-2 text-xs"
            />
            <Search className="absolute right-3 top-2.5 text-slate-400" size={14} />
          </div>

          {/* Service Filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs"
          >
            <option value="all">جميع الخدمات</option>
            <option value="لافتة إعلانية">لافتات إعلانية</option>
            <option value="خدمات طباعة">خدمات طباعة</option>
            <option value="تصميم موقع إلكتروني">مواقع إلكترونية</option>
            <option value="إدارة صفحات سوشيال ميديا">سوشيال ميديا</option>
          </select>

          {/* Employee Filter */}
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs"
          >
            <option value="all">جميع المنفذين</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.name}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Notice Banner if not manager */}
      {!isManager && (
        <div className="p-3.5 px-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-medium">
            <User size={15} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>
              وضع العمل التشغيلي: مسجل كـ <strong>{currentUser?.name} ({currentUser?.role})</strong> - تعرض البيانات والمواصفات الفنية ومسار التنفيذ بدون تفاصيل مالية.
            </span>
          </div>
          <span className="font-bold text-[11px] px-2 py-0.5 rounded bg-emerald-200/70 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
            فني وإنتاج
          </span>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4.5 items-start">
        {columns.map((col) => {
          const colOrders = filteredOrders.filter(o => normalizeStatus(o.status) === col.id);

          return (
            <div 
              key={col.id}
              className={`glass-panel rounded-2xl p-4 flex flex-col min-h-[560px] border-t-4 ${col.borderColor} bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {col.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${col.badgeBg}`}>
                      {colOrders.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {col.subtitle}
                  </p>
                </div>
              </div>

              {/* Column Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[75vh] pr-0.5">
                {colOrders.map((order) => {
                  const daysLeft = order.targetDeliveryDate 
                    ? Math.ceil((new Date(order.targetDeliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isUrgent = daysLeft !== null && daysLeft <= 2 && order.status !== 'تم التسليم';
                  const nextSt = getNextStatus(order.status);
                  const prevSt = getPrevStatus(order.status);

                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all space-y-2.5 group"
                    >
                      {/* Top Row: Serial, Service, Urgency */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[11px] font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                            #{order.serialNumber || order.id}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {renderServiceIcon(order.serviceType)}
                            <span className="truncate">{order.serviceType || 'لافتة'}</span>
                          </span>
                        </div>

                        {daysLeft !== null && order.status !== 'تم التسليم' && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isUrgent 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {daysLeft > 0 ? `${daysLeft} يوم` : 'متأخر'}
                          </span>
                        )}
                      </div>

                      {/* Client Name & Dimensions */}
                      <div>
                        <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                          {order.clientName}
                        </h4>
                        {order.dimensions?.width && order.dimensions?.height && (
                          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                            المقاس: {order.dimensions.height}م × {order.dimensions.width}م
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 bg-slate-50/70 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {order.description}
                      </p>

                      {/* Used Materials if any */}
                      {order.usedMaterials && order.usedMaterials.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Boxes size={11} className="text-emerald-600" />
                            المواد المخصومة:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {order.usedMaterials.map((mat, i) => (
                              <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded font-medium">
                                {mat.name}: {mat.quantity} {mat.unit || ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Location & Delivery Date info */}
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60 space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {order.installationAddress && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={11} className="text-rose-500 shrink-0" />
                            <span className="truncate">{order.installationAddress}</span>
                          </div>
                        )}
                        {order.targetDeliveryDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-blue-500 shrink-0" />
                            <span>موعد التسليم: {format(new Date(order.targetDeliveryDate), 'yyyy-MM-dd')}</span>
                          </div>
                        )}
                        {order.assignedEmployee && (
                          <div className="flex items-center gap-1.5">
                            <User size={11} className="text-slate-400 shrink-0" />
                            <span>المنفذ: <strong className="text-slate-700 dark:text-slate-300">{order.assignedEmployee}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Action Row: Move Stage & Attachments */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        {/* Design Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForDesign(order)}
                          className="px-2 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors border border-purple-200 dark:border-purple-800"
                          title="معاينة أو إرفاق مخطط التصميم"
                        >
                          <FileImage size={11} />
                          <span>التصميم</span>
                        </button>

                        {/* Move Forward / Backward Controls */}
                        <div className="flex items-center gap-1">
                          {prevSt && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, prevSt)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title={`إرجاع إلى: ${prevSt}`}
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}

                          {nextSt ? (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, nextSt)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                              title={`نقل إلى: ${nextSt}`}
                            >
                              <span>{nextSt}</span>
                              <ChevronLeft size={12} />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <Check size={11} />
                              <span>مكتمل</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colOrders.length === 0 && (
                  <div className="h-36 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-3 text-slate-400">
                    <p className="text-[11px] font-medium">لا توجد مهام في هذه المرحلة</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Design Attachment Modal */}
      <DesignAttachmentModal
        order={selectedOrderForDesign}
        isOpen={Boolean(selectedOrderForDesign)}
        onClose={() => setSelectedOrderForDesign(null)}
      />
    </div>
  );
}
