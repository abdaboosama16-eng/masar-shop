import React, { useRef, useState } from 'react';
import { Order } from '../types';
import { useAppContext } from '../context/AppContext';
import { 
  Printer, X, Calendar, MapPin, Phone, Building2, 
  Layers, CheckCircle, Clock, ShieldCheck, 
  FileText, Hash, DollarSign, Eye, EyeOff, BadgeCheck, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

interface InvoicePrintModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoicePrintModal({ order, isOpen, onClose }: InvoicePrintModalProps) {
  const { settings } = useAppContext();
  const [includeManagerCosts, setIncludeManagerCosts] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceSerial = order.serialNumber || order.id;
  const orderCost = order.cost || 0;
  const orderProfit = order.expectedProfit !== undefined ? order.expectedProfit : (order.price - orderCost);
  const profitPercentage = order.price > 0 ? ((orderProfit / order.price) * 100).toFixed(1) : '0';

  const remaining = order.remaining !== undefined ? order.remaining : (order.price - (order.deposit || 0));
  const companyName = settings.shopInfo.name || 'شركة أسلوب للدعاية والإعلان';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col my-auto print:border-none print:shadow-none print:w-full print:max-w-none print:my-0 print:rounded-none">
        
        {/* Modal Actions Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80 ">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 ">معاينة وطباعة الفاتورة (A4 طولي)</h3>
              <p className="text-[11px] text-slate-600 ">فاتورة رسمية مطابقة للمواصفات الإدارية المعتمدة</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Toggle Management Details in Print */}
            <button
              type="button"
              onClick={() => setIncludeManagerCosts(!includeManagerCosts)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 ease-out  ${
                includeManagerCosts
                  ? 'bg-amber-50 border-amber-300 text-amber-800 '
                  : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100 :bg-slate-700'
              }`}
              title="إظهار تفاصيل التكلفة وصافي الأرباح (خاص بالإدارة)"
            >
              {includeManagerCosts ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{includeManagerCosts ? 'نسخة الإدارة (مع الأرباح)' : 'نسخة رسمية (معتمدة)'}</span>
            </button>

            {/* Print Trigger Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold shadow-sm"
            >
              <Printer size={15} />
              <span>طباعة الفاتورة</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 :text-slate-200 hover:bg-slate-200/60 :bg-slate-700 transition-all duration-150 ease-out "
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Paper Canvas */}
        <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto flex justify-center print:p-0 print:bg-white">
          
          {/* A4 Sheet Area (210mm x 297mm styled sheet) */}
          <div 
            id="printable-invoice"
            className="w-full max-w-[210mm] min-h-[290mm] bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-sm border border-slate-200/90 print:shadow-none print:border-none print:rounded-none print:p-8 print:w-full print:max-w-none flex flex-col justify-between"
            style={{ fontFamily: "'Cairo', sans-serif" }}
          >
            {/* Header: Dynamic Logo, Company Name & Invoice Serial */}
            <div>
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
                {/* Top Right Header: Logo & Company Name */}
                <div className="flex items-start gap-4">
                  {/* Dynamic Logo */}
                  {settings.shopInfo.logoUrl ? (
                    <div className="w-16 h-16 rounded-xl border border-slate-200/80 bg-white p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img 
                        src={settings.shopInfo.logoUrl} 
                        alt="شعار الشركة" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-sm">
                      <Building2 size={24} className="mb-0.5" />
                      <span className="text-[9px] tracking-wider uppercase">أسلوب</span>
                    </div>
                  )}

                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {companyName}
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {settings.invoice.subHeader || 'للدعاية والإعلان والطباعة والتجهيزات الإعلانية المتكاملة'}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2.5 font-medium">
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="text-slate-600 shrink-0" />
                        <span>{settings.shopInfo.phone}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-600 shrink-0" />
                        <span>{settings.shopInfo.address}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Left Header: Invoice Meta Badge */}
                <div className="text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 min-w-[175px]">
                  <div className="text-xs font-bold text-slate-600 mb-1">فاتورة رسمية / طلبية</div>
                  <div className="text-xl font-mono tabular-nums font-black text-slate-900 tracking-tight">
                    #{invoiceSerial}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1.5 space-y-0.5 font-medium">
                    <div>التاريخ: {format(new Date(order.date), 'yyyy/MM/dd')}</div>
                    {order.targetDeliveryDate && (
                      <div>التسليم: {format(new Date(order.targetDeliveryDate), 'yyyy/MM/dd')}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Client & Service Info Strip with Explicit Executing Party */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-6 text-xs">
                {/* 1. اسم الزبون */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">المطلوب من السيد / الشركة:</span>
                  <span className="text-sm font-black text-slate-900 block">{order.clientName}</span>
                  {order.installationAddress && (
                    <span className="text-[11px] text-slate-600 block mt-1">
                      الموقع: {order.installationAddress}
                    </span>
                  )}
                </div>

                {/* 2. نوع الخدمة */}
                <div className="border-r border-slate-200/80 pr-3">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">نوع الخدمة:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200/80 text-slate-900">
                    <Layers size={13} className="text-slate-700" />
                    <span>{order.serviceType || 'لافتة إعلانية'}</span>
                  </span>
                </div>

                {/* 3. الجهة المنفذة */}
                <div className="border-r border-slate-200/80 pr-3">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">الجهة المنفذة (المسؤول):</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200/80 text-slate-900">
                    <Briefcase size={13} className="text-slate-700" />
                    <span>{order.assignedEmployee || 'قسم التنفيذ والإنتاج'}</span>
                  </span>
                </div>
              </div>

              {/* Itemized Table: تفصيل الخدمة والسعر الإجمالي */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs font-bold">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-44">نوع وبند الخدمة</th>
                      <th className="p-3">تفصيل ومواصفات الخدمة</th>
                      <th className="p-3 text-left w-36">السعر الإجمالي ({settings.shopInfo.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    <tr>
                      <td className="p-3 text-center font-mono tabular-nums font-bold text-slate-600">1</td>
                      <td className="p-3 font-bold text-slate-900 align-top">
                        <div>{order.serviceType || 'لافتة إعلانية'}</div>
                        {order.dimensions?.width && order.dimensions?.height && (
                          <div className="text-[11px] text-slate-600 font-mono tabular-nums mt-0.5">
                            المقاس: {order.dimensions.height}م × {order.dimensions.width}م ({((parseFloat(order.dimensions.width) || 0) * (parseFloat(order.dimensions.height) || 0)).toFixed(2)} م²)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-700 leading-relaxed whitespace-pre-line align-top">
                        <div>{order.description}</div>
                        {order.notes && (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded">
                            <strong className="text-slate-800">ملاحظات: </strong>
                            <span>{order.notes}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-left font-mono tabular-nums font-black text-slate-900 text-sm align-top">
                        {order.price.toLocaleString()} {settings.shopInfo.currency}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Manager Cost / Profit Strip (Only when toggled) */}
              {includeManagerCosts && (
                <div className="mb-6 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-900 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-700" />
                      <span>بيانات الرقابة المالية والتكلفة (خاصة بالإدارة):</span>
                    </span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                      نسخة إدارية
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center pt-1 font-mono tabular-nums">
                    <div className="p-2 rounded bg-white border border-amber-200">
                      <span className="text-[10px] text-slate-600 block">تكلفة التنفيذ:</span>
                      <span className="font-bold text-rose-700">{orderCost.toLocaleString()} {settings.shopInfo.currency}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-amber-200">
                      <span className="text-[10px] text-slate-600 block">صافي الربح المتوقع:</span>
                      <span className="font-black text-emerald-700">+{orderProfit.toLocaleString()} {settings.shopInfo.currency}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-amber-200">
                      <span className="text-[10px] text-slate-600 block">هامش الربح:</span>
                      <span className="font-bold text-slate-800">{profitPercentage}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Totals Calculation Box */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                {/* Payment & Terms Note */}
                <div className="flex-1 text-xs text-slate-600 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="font-bold text-slate-800 mb-1">الشروط والأحكام:</div>
                  <p className="text-[11px] leading-relaxed">
                    {settings.invoice.termsText || 'الدفعة الأولى غير قابلة للاسترجاع بعد بدء أعمال القص والتشكيل والتجهيز.'}
                  </p>
                  <div className="pt-1.5 text-[11px] font-semibold text-slate-700 flex items-center gap-2">
                    <span>طريقة السداد:</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200/80">{order.paymentMethod}</span>
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>السعر الإجمالي:</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {order.price.toLocaleString()} {settings.shopInfo.currency}
                    </span>
                  </div>

                  {order.deposit !== undefined && order.deposit > 0 && (
                    <div className="flex justify-between text-xs text-emerald-800 font-semibold">
                      <span>الدفعة المقدمة (العربون):</span>
                      <span className="font-mono tabular-nums font-bold">
                        {order.deposit.toLocaleString()} {settings.shopInfo.currency}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline">
                    <span className="text-xs font-black text-slate-900">المبلغ المتبقي:</span>
                    <span className="text-base font-mono tabular-nums font-black text-slate-900">
                      {remaining.toLocaleString()} {settings.shopInfo.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer & Signatures */}
            <div className="pt-6 border-t border-slate-200/80">
              <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-700 mb-6">
                <div>
                  <span className="font-bold block mb-8">توقيع العميل / المستلم:</span>
                  <div className="w-48 mx-auto border-b border-dashed border-slate-400"></div>
                </div>
                <div>
                  <span className="font-bold block mb-8">توقيع وختم الإدارة:</span>
                  <div className="w-48 mx-auto border-b border-dashed border-slate-400"></div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-600 font-medium pt-2 border-t border-slate-100">
                {settings.invoice.footerNote || 'شكراً لتعاملكم مع شركة أسلوب للدعاية والإعلان. يسري ضمان العمل المعتمد وفق المواصفات المحددة.'}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
