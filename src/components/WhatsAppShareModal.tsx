import React, { useState } from 'react';
import { Order } from '../types';
import { useAppContext } from '../context/AppContext';
import { MessageSquare, X, Send, Copy, Check, Phone, FileText, DollarSign, Layers } from 'lucide-react';
import { format } from 'date-fns';

interface WhatsAppShareModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppShareModal({ order, isOpen, onClose }: WhatsAppShareModalProps) {
  const { settings } = useAppContext();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const serial = order.serialNumber || order.id;
  const deposit = order.deposit || 0;
  const remaining = order.remaining !== undefined ? order.remaining : Math.max(0, order.price - deposit);
  const formattedDate = format(new Date(order.date), 'yyyy/MM/dd');

  // Dynamic Arabic message formatted cleanly for WhatsApp
  const messageBody = `السلام عليكم ورحمة الله وبركاته،
تحية طيبة من *${settings.shopInfo.name}*

نرفق لكم تفاصيل الفاتورة / الطلبية المعتمدة:
• *رقم الفاتورة:* #${serial}
• *اسم الزبون:* ${order.clientName}
• *نوع الخدمة:* ${order.serviceType || 'لافتة إعلانية'}
• *تفاصيل الخدمة:* ${order.description}
• *المبلغ الإجمالي:* ${order.price.toLocaleString()} ${settings.shopInfo.currency}
${deposit > 0 ? `• *العربون المسدد:* ${deposit.toLocaleString()} ${settings.shopInfo.currency}\n` : ''}• *المبلغ المتبقي:* ${remaining.toLocaleString()} ${settings.shopInfo.currency}
• *تاريخ الطلب:* ${formattedDate}
${order.targetDeliveryDate ? `• *موعد التسليم المتوقع:* ${format(new Date(order.targetDeliveryDate), 'yyyy/MM/dd')}\n` : ''}
لأي استفسار يرجى التواصل معنا عبر الرقم: ${settings.shopInfo.phone}
${settings.shopInfo.address ? `العنوان: ${settings.shopInfo.address}\n` : ''}
شاكرين لكم حسن التعامل معنا.`;

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageBody)}`
    : `https://wa.me/?text=${encodeURIComponent(messageBody)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100 ">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 ">إرسال الفاتورة عبر واتساب</h3>
              <p className="text-[11px] text-slate-600 ">توليد رسالة تفصيلية متكاملة لبيانات الطلبية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 :text-slate-200 hover:bg-slate-200/50 :bg-slate-800 transition-all duration-150 ease-out "
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Recipient Phone Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone size={14} className="text-slate-600" />
              <span>رقم هاتف الزبون (اختياري مع مفتاح الدولة)</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="مثال: 218912345678 أو 966501234567"
              className="w-full glass-input rounded-lg px-4 py-2.5 text-xs font-mono tabular-nums bg-slate-50 text-left"
            />
            <span className="text-[10px] text-slate-600 mt-1 block">
              * يمكنك ترك الرقم فارغاً واختيار جهة الاتصال مباشرة من تطبيق واتساب.
            </span>
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-600" />
                <span>معاينة نص الرسالة المستخرجة من الفاتورة</span>
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 :text-emerald-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 :bg-slate-800 transition-all duration-150 ease-out "
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
              </button>
            </div>
            
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-sans whitespace-pre-line leading-relaxed text-slate-800 max-h-56 overflow-y-auto font-medium">
              {messageBody}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-200/80 ">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-200/60 :bg-slate-700 transition-all duration-150 ease-out "
          >
            إلغاء
          </button>
          
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all duration-150 ease-out"
          >
            <Send size={14} />
            <span>فتح وإرسال عبر واتساب</span>
          </button>
        </div>

      </div>
    </div>
  );
}
