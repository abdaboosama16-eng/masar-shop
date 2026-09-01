import React, { useState } from 'react';
import { Headphones, X, Send, CheckCircle2, ShieldCheck, Activity, PhoneCall, Mail, Clock, HelpCircle, FileText } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDetails, setTicketDetails] = useState('');
  const [ticketPriority, setTicketPriority] = useState('عادي');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDetails) return;
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setTicketSubject('');
      setTicketDetails('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/80 bg-white/95">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
              <Headphones size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">مركز الدعم الفني والمساعدة</h2>
              <p className="text-xs text-slate-500">فريق الدعم الهندسي لمنظومة مسار للحلول البرمجية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* System Health Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
                <Activity size={16} />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">حالة الخادم</p>
                <p className="text-xs font-bold text-emerald-700">متصل وجاهز 100%</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-700 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">أمان البيانات</p>
                <p className="text-xs font-bold text-blue-700">تشفير محلي متين</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">زمن الاستجابة</p>
                <p className="text-xs font-bold text-slate-800">فوري (&lt; 20ms)</p>
              </div>
            </div>
          </div>

          {/* Direct Support Channels */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">قنوات التواصل المباشرة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <PhoneCall size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">الخط الساخن المباشر</p>
                  <p className="text-xs font-mono text-slate-500" dir="ltr">+218 91 000 0000</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">البريد الإلكتروني للدعم</p>
                  <p className="text-xs font-mono text-slate-500">support@masar-systems.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Ticket Submission */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">فتح تذكرة دعم فني سريعة</h3>
              <span className="text-[11px] text-slate-400">الرد خلال 15 دقيقة</span>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">موضوع الاستفسار / المشكلة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: استفسار حول حساب المقاسات، إضافة طابعة..."
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">مستوى الأولوية</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs appearance-none"
                  >
                    <option value="عادي">عادي</option>
                    <option value="متوسط">متوسط</option>
                    <option value="عاجل">عاجل جداً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تفاصيل الطلب</label>
                <textarea
                  required
                  rows={3}
                  placeholder="يرجى وصف المشكلة أو التحديث المطلوب بالتفصيل..."
                  value={ticketDetails}
                  onChange={(e) => setTicketDetails(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <HelpCircle size={14} />
                  <span>دليل الاستخدام متوفر في لوحة التحكم</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitted}
                  className="btn-primary px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>تم الإرسال بنجاح</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>إرسال التذكرة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 flex justify-between items-center text-xs text-slate-500">
          <span className="font-medium">ساعات عمل الدعم الفني: 08:00 ص - 10:00 م (السبت - الخميس)</span>
          <span className="font-mono text-slate-400">مسار v2.4.0</span>
        </div>
      </div>
    </div>
  );
}
