import React, { useState } from 'react';
import { FileImage, X, Upload, CheckCircle2, FileText, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Order } from '../types';

interface DesignAttachmentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DesignAttachmentModal({ order, isOpen, onClose }: DesignAttachmentModalProps) {
  const [designNote, setDesignNote] = useState('');
  const [sampleDesignSelected, setSampleDesignSelected] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen || !order) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 no-print">
      <div className="glass-panel w-full max-w-xl flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/80 bg-white/95">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
              <FileImage size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">مرفقات التصميم والمخطط الهندسي</h2>
              <p className="text-xs text-slate-500">الطلب: {order.clientName} - {order.description.substring(0, 30)}...</p>
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
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Order specs summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block">المقاس المطلوب:</span>
              <span className="font-bold text-slate-800 font-mono">
                {order.dimensions?.height || '0'}م × {order.dimensions?.width || '0'}م
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">حالة الطلبية:</span>
              <span className="font-bold text-slate-800">{order.status}</span>
            </div>
            <div>
              <span className="text-slate-400 block">تاريخ الطلب:</span>
              <span className="font-bold text-slate-800 font-mono">{order.date.slice(0, 10)}</span>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer group">
            <input
              type="file"
              accept="image/*,.pdf,.ai,.psd"
              className="hidden"
              id="design-file-input"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSampleDesignSelected(e.target.files[0].name);
                }
              }}
            />
            <label htmlFor="design-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-700 text-slate-600 flex items-center justify-center transition-colors">
                <Upload size={22} />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">
                {sampleDesignSelected ? `الملف المحدد: ${sampleDesignSelected}` : 'انقر لرفع ملف التصميم (AI, PSD, PDF, PNG)'}
              </span>
              <span className="text-xs text-slate-400">يدعم المخططات الهندسية ومخرجات برامج التصميم بدقة عالية</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">ملاحظات فنية للمصمم وفنيي التركيب</label>
            <textarea
              rows={3}
              value={designNote}
              onChange={(e) => setDesignNote(e.target.value)}
              placeholder="مثال: مراعاة تثبيت المسامير الجانبية، ألوان الفينيل حسب كود RAL..."
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">مرتبط مباشرة برقم الفاتورة #{order.id}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>تم الحفظ</span>
                  </>
                ) : (
                  <span>حفظ المرفق</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
