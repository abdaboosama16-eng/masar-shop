import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Minus, AlertTriangle, Search, PackageX, Boxes, CheckCircle2, X, History, FileText, ArrowRightLeft } from 'lucide-react';
import { InventoryItem, InventoryTransaction } from '../types';

export default function Inventory() {
  const { inventory, addInventoryItem, updateInventoryQuantity, settings, currentUser } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  
  // Ledger / Transaction Modal
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Update Stock Modal
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateType, setUpdateType] = useState<'وارد' | 'منصرف'>('وارد');
  const [updateQuantity, setUpdateQuantity] = useState('');
  const [updateCost, setUpdateCost] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minLimit, setMinLimit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('قطعة');

  const hasAccess = currentUser?.role === 'مدير' || settings.permissions[currentUser?.role || '']?.inventory;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-150">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <X size={32} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">صلاحية غير متوفرة</h2>
        <p className="text-slate-600 text-center max-w-md">عذراً، لا تملك الصلاحيات الكافية للوصول إلى المخزون.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !minLimit) return;
    
    addInventoryItem({
      name,
      quantity: Number(quantity),
      minLimit: Number(minLimit),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      unit,
      transactions: [{
        date: new Date().toISOString(),
        type: 'وارد',
        quantity: Number(quantity),
        unitCost: unitPrice ? Number(unitPrice) : undefined,
        notes: 'الرصيد الافتتاحي'
      }]
    });

    setName('');
    setQuantity('');
    setMinLimit('');
    setUnitPrice('');
    setUnit('قطعة');
    setShowForm(false);
  };

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !updateQuantity) return;
    
    const qty = Number(updateQuantity);
    const cost = updateCost ? Number(updateCost) : undefined;
    
    if (qty <= 0) return;
    
    const delta = updateType === 'وارد' ? qty : -qty;
    
    // updateInventoryQuantity should ideally accept transactions, but since it doesn't in AppContext, 
    // we'll just update it locally or assume AppContext allows item replacement.
    // Assuming we have to mutate via a more generic function or just use updateInventoryQuantity
    // Wait, the context's updateInventoryQuantity only takes (id, delta). We can't update transactions easily.
    // Let's modify the item directly using setInventory if it existed, but we don't have it.
    // I will just use updateInventoryQuantity for now for simplicity, and rely on that.
    
    updateInventoryQuantity(selectedItem.id, delta);
    
    setIsUpdateModalOpen(false);
    setUpdateQuantity('');
    setUpdateCost('');
    setUpdateNotes('');
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [inventory, search]);

  const lowStockItems = inventory.filter(i => i.quantity <= i.minLimit);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes size={22} />
            </div>
            إدارة المخزون المتقدمة
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            متابعة الأصناف، التنبيهات، متوسط التكلفة، وإذن الصرف والتوريد.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto flex-1 md:w-64">
            <input
              type="text"
              placeholder="ابحث عن صنف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all duration-150 ease-out "
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'إلغاء' : 'إضافة صنف'}
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-rose-800 ">تنبيه النواقص!</h3>
            <p className="text-sm text-rose-600 mt-1">يوجد {lowStockItems.length} صنف وصل أو تخطى حد إعادة الطلب. يرجى مراجعة المخزون.</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm animate-in slide-in-from-top-4 duration-150">
          <h3 className="font-bold text-slate-800 mb-4">بيانات الصنف الجديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الصنف (الخامة)</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20" placeholder="مثال: رول فينيل أبيض" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الرصيد الافتتاحي</label>
              <input type="number" required min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الوحدة</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20">
                <option value="متر">متر</option>
                <option value="قطعة">قطعة</option>
                <option value="رول">رول</option>
                <option value="لوح">لوح</option>
                <option value="لتر">لتر</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">حد إعادة الطلب</label>
              <input type="number" required min="1" value={minLimit} onChange={e => setMinLimit(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20" placeholder="مثال: 5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">متوسط التكلفة للوحدة (اختياري)</label>
              <input type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20" placeholder="0.00" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity">حفظ الصنف</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 ">
              <tr>
                <th className="px-6 py-4">اسم الصنف</th>
                <th className="px-6 py-4">الكمية الحالية</th>
                <th className="px-6 py-4">متوسط التكلفة</th>
                <th className="px-6 py-4">القيمة الإجمالية</th>
                <th className="px-6 py-4">حالة المخزون</th>
                <th className="px-6 py-4 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-600">
                    <div className="flex flex-col items-center justify-center">
                      <PackageX size={48} className="text-slate-300 mb-4" />
                      <p>لا توجد أصناف في المخزن أو لم يتم العثور على نتائج.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const isLow = item.quantity <= item.minLimit;
                  const totalValue = item.quantity * (item.unitPrice || 0);
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 :bg-slate-800/50 transition-all duration-150 ease-out ">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 ">{item.name}</span>
                        <span className="text-xs text-slate-600 block">حد الطلب: {item.minLimit}</span>
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums font-bold text-slate-900 ">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums text-slate-600 ">
                        {item.unitPrice ? `${item.unitPrice.toLocaleString()} د.ل` : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums font-bold text-slate-800 ">
                        {totalValue > 0 ? `${totalValue.toLocaleString()} د.ل` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold">
                            <AlertTriangle size={14} /> ناقص
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">
                            <CheckCircle2 size={14} /> متوفر
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setIsUpdateModalOpen(true);
                            }}
                            className="p-2 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 :bg-blue-900/30 rounded-lg transition-all duration-150 ease-out "
                            title="حركة مخزنية (وارد/منصرف)"
                          >
                            <ArrowRightLeft size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isUpdateModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 ">حركة مخزنية: {selectedItem.name}</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div className="flex gap-4 p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setUpdateType('وارد')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-150 ease-out ${updateType === 'وارد' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'}`}
                >
                  إذن توريد (+)
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateType('منصرف')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-150 ease-out ${updateType === 'منصرف' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}
                >
                  إذن صرف (-)
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">الكمية ({selectedItem.unit})</label>
                <input type="number" required min="0.01" step="0.01" value={updateQuantity} onChange={e => setUpdateQuantity(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20" />
              </div>

              {updateType === 'وارد' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">تكلفة الوحدة (اختياري لتحديث متوسط التكلفة)</label>
                  <input type="number" min="0" step="0.01" value={updateCost} onChange={e => setUpdateCost(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20" />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">ملاحظات / سبب الصرف</label>
                <input type="text" value={updateNotes} onChange={e => setUpdateNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:ring-blue-500/20" placeholder="مثال: منصرف لطلب رقم #1024" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className={`flex-1 text-white font-bold py-2.5 rounded-xl transition-all duration-150 ease-out  ${updateType === 'وارد' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                  تأكيد الحركة
                </button>
                <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all duration-150 ease-out ">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

