import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Truck, Search, Plus, X } from 'lucide-react';
import { Supplier, SupplierTransaction } from '../types';

export default function Suppliers() {
  const { suppliers, setSuppliers, settings, currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const hasAccess = currentUser?.role === 'مدير' || settings.permissions[currentUser?.role || '']?.suppliers;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-150">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <X size={32} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">صلاحية غير متوفرة</h2>
        <p className="text-slate-600 text-center max-w-md">عذراً، لا تملك الصلاحيات الكافية للوصول إلى إدارة الموردين.</p>
      </div>
    );
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [suppliers, searchTerm]);

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newTx: SupplierTransaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount,
      type: 'مدين', // Paying them reduces our debt (makes them debtor to cash)
      description: paymentNotes || 'تسديد دفعة للمورد',
    };

    const updatedSupplier = {
      ...selectedSupplier,
      balance: selectedSupplier.balance - amount,
      totalPaid: selectedSupplier.totalPaid + amount,
      transactions: [newTx, ...selectedSupplier.transactions]
    };

    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    setSelectedSupplier(updatedSupplier);
    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Truck size={22} />
            </div>
            إدارة الموردين
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            متابعة أرصدة الموردين والمطابع، وتسجيل الدفعات، واستخراج كشوفات الحساب الدائنة.
          </p>
        </div>
      </div>

      {!selectedSupplier ? (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <input
                type="text"
                placeholder="ابحث عن اسم المورد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-orange-500/20"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 ">
                <tr>
                  <th className="px-6 py-4">اسم المورد</th>
                  <th className="px-6 py-4">إجمالي التعاملات</th>
                  <th className="px-6 py-4">إجمالي المدفوع</th>
                  <th className="px-6 py-4 text-orange-600">الرصيد المستحق (له)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 ">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-600">
                      لا يوجد موردين متاحين حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(supplier => (
                    <tr 
                      key={supplier.id} 
                      onClick={() => setSelectedSupplier(supplier)}
                      className="hover:bg-slate-50 :bg-slate-800/50 cursor-pointer transition-all duration-150 ease-out "
                    >
                      <td className="px-6 py-4 font-bold text-slate-800 ">{supplier.name}</td>
                      <td className="px-6 py-4">{supplier.totalInvoiced.toLocaleString()} د.ل</td>
                      <td className="px-6 py-4 text-emerald-600">{supplier.totalPaid.toLocaleString()} د.ل</td>
                      <td className="px-6 py-4 font-bold text-orange-600">{supplier.balance.toLocaleString()} د.ل</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedSupplier(null)}
            className="text-sm font-bold text-slate-600 hover:text-slate-800 flex items-center gap-2"
          >
            &rarr; العودة للقائمة
          </button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm md:col-span-2 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedSupplier.name}</h2>
                <p className="text-sm text-slate-600">كشف الحساب وتفاصيل الفواتير والدفعات</p>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all duration-150 ease-out "
              >
                <Plus size={16} />
                تسجيل دفعة للمورد
              </button>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-orange-600 mb-1">الرصيد المستحق (له)</span>
              <span className="text-3xl font-black text-orange-700 ">{selectedSupplier.balance.toLocaleString()} <span className="text-sm">د.ل</span></span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 ">
                  <tr>
                    <th className="px-6 py-4">التاريخ</th>
                    <th className="px-6 py-4">البيان</th>
                    <th className="px-6 py-4 text-emerald-600">مدين (دفعة له)</th>
                    <th className="px-6 py-4 text-orange-600">دائن (فاتورة علينا)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 ">
                  {selectedSupplier.transactions.map((tx, idx) => (
                    <tr key={tx.id || idx}>
                      <td className="px-6 py-4 text-slate-600 ">{new Date(tx.date).toLocaleDateString('ar-LY')}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 ">{tx.description}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">{tx.type === 'مدين' ? tx.amount.toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 text-orange-600 font-bold">{tx.type === 'دائن' ? tx.amount.toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {selectedSupplier.transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-600">لا توجد تعاملات مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 ">تسجيل دفعة سداد للمورد</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">المبلغ المسدد (مدين)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 /20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">البيان أو ملاحظات (اختياري)</label>
                <input 
                  type="text" 
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="مثال: سداد نقدي للفاتورة 102"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 /20"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all duration-150 ease-out ">
                  حفظ الدفعة
                </button>
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all duration-150 ease-out ">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
