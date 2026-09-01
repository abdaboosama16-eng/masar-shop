import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Wallet, ArrowRightLeft, Plus, X, TrendingUp, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { TreasuryTransaction } from '../types';

export default function Treasury() {
  const { treasuryAccounts, setTreasuryAccounts, treasuryTransactions, setTreasuryTransactions, settings, currentUser } = useAppContext();
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const hasAccess = currentUser?.role === 'مدير' || settings.permissions[currentUser?.role || '']?.treasury;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-150">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <X size={32} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">صلاحية غير متوفرة</h2>
        <p className="text-slate-600 text-center max-w-md">عذراً، لا تملك الصلاحيات الكافية للوصول إلى إدارة الخزينة.</p>
      </div>
    );
  }

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccount || !toAccount || fromAccount === toAccount) return;
    
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) return;

    const sourceAcc = treasuryAccounts.find(a => a.id === fromAccount);
    const targetAcc = treasuryAccounts.find(a => a.id === toAccount);

    if (!sourceAcc || !targetAcc || sourceAcc.balance < amount) {
      alert('الرصيد غير كافٍ أو الحساب غير صحيح');
      return;
    }

    const txOut: TreasuryTransaction = {
      id: Date.now().toString() + '-out',
      accountId: fromAccount,
      date: new Date().toISOString(),
      type: 'تحويل',
      amount: -amount,
      description: transferNotes || `تحويل إلى ${targetAcc.name}`,
      relatedAccountId: toAccount
    };

    const txIn: TreasuryTransaction = {
      id: Date.now().toString() + '-in',
      accountId: toAccount,
      date: new Date().toISOString(),
      type: 'تحويل',
      amount: amount,
      description: transferNotes || `تحويل من ${sourceAcc.name}`,
      relatedAccountId: fromAccount
    };

    setTreasuryAccounts(prev => prev.map(a => {
      if (a.id === fromAccount) return { ...a, balance: a.balance - amount };
      if (a.id === toAccount) return { ...a, balance: a.balance + amount };
      return a;
    }));

    setTreasuryTransactions(prev => [txOut, txIn, ...prev]);
    setIsTransferModalOpen(false);
    setTransferAmount('');
    setTransferNotes('');
  };

  const totalBalance = treasuryAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet size={22} />
            </div>
            الخزينة والمالية
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            إدارة الحسابات المصرفية، الصناديق، العهد، وتسوية ومطابقة الأرصدة.
          </p>
        </div>
        <button 
          onClick={() => setIsTransferModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all duration-150 ease-out  shrink-0"
        >
          <ArrowRightLeft size={16} />
          تحويل بين الحسابات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-sm lg:col-span-1">
          <span className="text-sm font-semibold text-slate-300 block mb-2">إجمالي السيولة النقدية</span>
          <div className="text-3xl font-black">{totalBalance.toLocaleString()} <span className="text-sm font-normal text-slate-400">د.ل</span></div>
        </div>
        
        {treasuryAccounts.map(acc => (
          <div key={acc.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-600 ">
                <Wallet size={16} />
                <span className="text-sm font-bold">{acc.name}</span>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-600">{acc.type}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 ">
              {acc.balance.toLocaleString()} <span className="text-xs font-bold text-slate-600 ml-1">د.ل</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Forecast */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-800 ">توقع السيولة (30 يوماً)</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600 ">الرصيد الفعلي الحالي</span>
              <span className="font-bold text-slate-800 ">{totalBalance.toLocaleString()} د.ل</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
              <span className="text-sm text-emerald-700 ">ديون متوقع تحصيلها (متوسط)</span>
              <span className="font-bold text-emerald-600 ">+ 0 د.ل</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl">
              <span className="text-sm text-rose-700 ">التزامات ومصروفات متكررة</span>
              <span className="font-bold text-rose-600 ">- 0 د.ل</span>
            </div>
            <div className="flex justify-between items-center p-4 border-t border-slate-100 mt-2">
              <span className="text-sm font-bold text-slate-800 ">السيولة الحرة المتوقعة</span>
              <span className="font-black text-lg text-slate-900 ">{totalBalance.toLocaleString()} د.ل</span>
            </div>
          </div>
        </div>

        {/* Recurring Expenses */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <RefreshCw size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-800 ">المصروفات المتكررة</h3>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-bold">إضافة</button>
          </div>
          <div className="text-center py-10">
            <CalendarIcon size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-600">لا توجد التزامات مجدولة أو مصروفات متكررة حالياً</p>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 ">تحويل بين الحسابات</h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleTransfer} className="space-y-4 text-right">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">من حساب (المرسل)</label>
                <select 
                  required
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20"
                >
                  <option value="">-- اختر الحساب --</option>
                  {treasuryAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (الرصيد: {acc.balance})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">إلى حساب (المستقبل)</label>
                <select 
                  required
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20"
                >
                  <option value="">-- اختر الحساب --</option>
                  {treasuryAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">المبلغ</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">ملاحظات (اختياري)</label>
                <input 
                  type="text" 
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all duration-150 ease-out ">
                  تنفيذ التحويل
                </button>
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all duration-150 ease-out ">
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
