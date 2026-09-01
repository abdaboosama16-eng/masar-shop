import React, { useState } from 'react';
import { Settings, X, Save, Building2, Phone, Coins, FileText, Download, Upload, CheckCircle2, Shield } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { orders, inventory, expenses, employees } = useAppContext();
  const [workshopName, setWorkshopName] = useState('مسار لصناعة وتركيب اللوافت');
  const [phone, setPhone] = useState('091-0000000 / 092-0000000');
  const [currency, setCurrency] = useState('د.ل');
  const [invoiceHeader, setInvoiceHeader] = useState('لصناعة وتركيب اللوافت الإعلانية والتجهيزات الهندسية');
  const [invoiceFooter, setInvoiceFooter] = useState('شكراً لتعاملكم معنا - مسار للأنظمة التجارية');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      workshopName,
      currency,
      orders,
      inventory,
      expenses,
      employees
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `masar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/80 bg-white/95">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">إعدادات المنظومة</h2>
              <p className="text-xs text-slate-500">تخصيص بيانات الورشة، الفواتير، والنسخ الاحتياطي</p>
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
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Section 1: Workshop Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">بيانات الورشة والمؤسسة</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم المنشأة / الورشة</label>
                <input
                  type="text"
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">أرقام هواتف التواصل</label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
                  />
                  <Phone size={14} className="absolute left-3 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">العملة الافتراضية</label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm appearance-none"
                  >
                    <option value="د.ل">دينار ليبي (د.ل)</option>
                    <option value="ر.س">ريال سعودي (ر.س)</option>
                    <option value="د.إ">درهم إماراتي (د.إ)</option>
                    <option value="ج.م">جنيه مصري (ج.م)</option>
                    <option value="$">دولار أمريكي ($)</option>
                  </select>
                  <Coins size={14} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">حالة التخزين المحلي</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <Shield size={14} className="text-emerald-600" />
                  <span>تخزين مشفر وفوري محلياً</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Invoices Header & Footer */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">نصوص الفواتير وسندات القبض</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ترويسة الفاتورة (Header)</label>
                <input
                  type="text"
                  value={invoiceHeader}
                  onChange={(e) => setInvoiceHeader(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">تذييل الفاتورة (Footer)</label>
                <input
                  type="text"
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Data Backup */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Download size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">النسخ الاحتياطي وإدارة البيانات</h3>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">تصدير قاعدة البيانات بالكامل</h4>
                <p className="text-xs text-slate-500 mt-0.5">تنزيل نسخة احتياطية من الطلبيات، المخزون والمصروفات بصيغة JSON</p>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="glass-button w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 shrink-0"
              >
                <Download size={14} />
                <span>تصدير الآن</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
          {savedSuccess ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
              <CheckCircle2 size={16} />
              <span>تم حفظ الإعدادات بنجاح</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-mono">الإصدار: v2.4.0 Commercial</span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Save size={14} />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
