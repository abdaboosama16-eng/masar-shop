import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import { 
  X, Printer, Share2, Calendar, MapPin, 
  Layers, CheckCircle2, User, 
  FileText, Hash, DollarSign, Briefcase, Maximize,
  Boxes, Clock, ShieldCheck, Edit3, Save
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (order: Order) => void;
  onShareWhatsApp?: (order: Order) => void;
}

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onPrint,
  onShareWhatsApp
}: OrderDetailsModalProps) {
  const { settings, updateOrderStatus, updateOrder } = useAppContext();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(order?.notes || '');

  // Keep notesValue in sync with active order
  React.useEffect(() => {
    if (order) {
      setNotesValue(order.notes || '');
      setIsEditingNotes(false);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const serial = order.serialNumber || order.id;
  const costVal = order.cost || 0;
  const profitVal = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - costVal);
  const profitMargin = order.price > 0 ? ((profitVal / order.price) * 100).toFixed(1) : '0';
  const remaining = order.remaining !== undefined ? order.remaining : Math.max(0, order.price - (order.deposit || 0));

  const handleSaveNotes = () => {
    if (order) {
      updateOrder(order.id, { notes: notesValue });
      setIsEditingNotes(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/90 flex flex-col my-auto max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <FileText size={20} className="text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">تفاصيل الطلبية #{serial}</h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                  {order.serviceType || 'لافتة إعلانية'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تاريخ التسجيل: {order.date ? format(new Date(order.date), 'yyyy-MM-dd HH:mm') : 'غير محدد'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={() => onPrint(order)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                title="طباعة الفاتورة"
              >
                <Printer size={17} />
              </button>
            )}

            {onShareWhatsApp && (
              <button
                type="button"
                onClick={() => onShareWhatsApp(order)}
                className="p-2 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                title="مشاركة عبر واتساب"
              >
                <Share2 size={17} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-right">
          
          {/* Main Client & Status Card */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">اسم العميل / الجهة:</span>
              <h4 className="text-lg font-black text-slate-900">{order.clientName}</h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">حالة الطلب:</span>
              <select
                value={order.status}
                onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black border appearance-none text-center cursor-pointer transition-colors shadow-xs
                  ${order.status === 'تم التسليم' ? 'text-emerald-800 bg-emerald-100 border-emerald-300' : 
                    order.status === 'قيد التركيب' ? 'text-blue-800 bg-blue-100 border-blue-300' : 
                    order.status === 'بانتظار اعتماد التصميم' ? 'text-purple-800 bg-purple-100 border-purple-300' :
                    'text-amber-800 bg-amber-100 border-amber-300'}`}
              >
                <option value="بانتظار اعتماد التصميم">بانتظار اعتماد التصميم</option>
                <option value="قيد التصميم">قيد التصميم</option>
                <option value="قيد الطباعة">قيد الطباعة</option>
                <option value="قيد التركيب">قيد التركيب</option>
                <option value="تم التسليم">تم التسليم</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-600" />
              <span>تفصيل ومواصفات الخدمة:</span>
            </span>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 text-slate-800 text-xs leading-relaxed font-medium">
              {order.description || 'لا توجد تفاصيل إضافية'}
            </div>
          </div>

          {/* Dedicated Wide Notes Area (الملاحظات) */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50/80 border border-slate-200/90">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Edit3 size={15} className="text-blue-600" />
                <span>الملاحظات والتعليمات الخاصة بالطلبية:</span>
              </label>

              {!isEditingNotes ? (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  تعديل الملاحظات
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Save size={13} />
                    <span>حفظ الملاحظات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesValue(order.notes || '');
                      setIsEditingNotes(false);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>

            {isEditingNotes ? (
              <textarea
                rows={4}
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="أدخل أي ملاحظات فنية أو تعليمات تسليم أو شروط خاصة بالطلبية..."
                className="w-full glass-input rounded-lg px-4 py-3 text-sm text-slate-900 bg-white border border-slate-200/90 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y leading-relaxed font-sans"
              />
            ) : (
              <div className="w-full p-4 rounded-lg bg-white border border-slate-200/90 text-slate-800 text-xs min-h-[90px] leading-relaxed whitespace-pre-line font-medium">
                {order.notes ? (
                  order.notes
                ) : (
                  <span className="text-slate-400 italic">لا توجد ملاحظات مسجلة لهذه الطلبية حتى الآن.</span>
                )}
              </div>
            )}
          </div>

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي الفاتورة:</span>
              <span className="text-sm font-black text-slate-900 font-mono tabular-nums">
                {order.price.toLocaleString()} {settings.shopInfo.currency}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي التكلفة:</span>
              <span className="text-sm font-black text-rose-700 font-mono tabular-nums">
                {costVal.toLocaleString()} {settings.shopInfo.currency}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 block mb-1">صافي الربح:</span>
              <span className="text-sm font-black text-emerald-700 font-mono tabular-nums">
                +{profitVal.toLocaleString()} {settings.shopInfo.currency}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">هامش الربح:</span>
              <span className="text-sm font-black text-slate-800 font-mono tabular-nums">
                {profitMargin}%
              </span>
            </div>
          </div>

          {/* Secondary specs: Delivery, Assignee, Dimensions, Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                <Briefcase size={14} className="text-slate-600" />
                <span>الموظف المسؤول:</span>
              </span>
              <span className="font-bold text-slate-900">{order.assignedEmployee || 'غير معين'}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-600" />
                <span>موعد التسليم المستهدف:</span>
              </span>
              <span className="font-bold text-slate-900">
                {order.targetDeliveryDate ? format(new Date(order.targetDeliveryDate), 'yyyy-MM-dd') : 'غير محدد'}
              </span>
            </div>

            {order.dimensions?.width && order.dimensions?.height && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Maximize size={14} className="text-slate-600" />
                  <span>المقاسات والمساحة:</span>
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-900">
                  {order.dimensions.height}م × {order.dimensions.width}م (
                  {((parseFloat(order.dimensions.width) || 0) * (parseFloat(order.dimensions.height) || 0)).toFixed(2)} م²
                  )
                </span>
              </div>
            )}

            {order.installationAddress && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-600" />
                  <span>عنوان التركيب:</span>
                </span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]" title={order.installationAddress}>
                  {order.installationAddress}
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Cost breakdown */}
          {order.costBreakdown && Object.keys(order.costBreakdown).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 block">تفصيل بنود التكلفة والمنفذين:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(order.costBreakdown).map(([item, val]) => {
                  const executor = order.costExecutors?.[item] || 
                    (item.includes('تصميم') ? order.designerName : item.includes('طباعة') ? order.printerName : item.includes('خارج') ? order.externalExecutor : null);
                  return (
                    <span 
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <span>{item}:</span>
                      <span className="font-mono tabular-nums text-rose-700">{Number(val).toLocaleString()} {settings.shopInfo.currency}</span>
                      {executor && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                          ({executor})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Raw Materials Auto Deduction List */}
          {order.usedMaterials && order.usedMaterials.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 block">المواد الخام المستهلكة من المخزن:</span>
              <div className="flex flex-wrap gap-2">
                {order.usedMaterials.map((mat, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200"
                  >
                    <Boxes size={13} className="text-emerald-700" />
                    <span>{mat.name}:</span>
                    <span className="font-mono tabular-nums text-emerald-800">{mat.quantity} {mat.unit}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200/80">
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={() => onPrint(order)}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Printer size={15} />
                <span>طباعة الفاتورة</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
