import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Minus, AlertTriangle, Search, PackageX, Boxes, CheckCircle2, X } from 'lucide-react';

export default function Inventory() {
  const { inventory, addInventoryItem, updateInventoryQuantity, settings } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minLimit, setMinLimit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('قطعة');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !minLimit) return;

    addInventoryItem({
      name,
      quantity: Number(quantity),
      minLimit: Number(minLimit),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      unit
    });

    setName('');
    setQuantity('');
    setMinLimit('');
    setUnitPrice('');
    setUnit('قطعة');
    setShowForm(false);
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">إدارة المخزون والمواد الخام</h2>
          <p className="text-xs text-slate-500 mt-1">تتبع رصيد الألواح، الفينيل، قطاعات الحديد ومحولات الإضاءة</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto flex-1 md:w-64">
            <input
              type="text"
              placeholder="بحث في المخزون..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input rounded-xl pl-4 pr-10 py-2.5 text-xs font-medium"
            />
            <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm text-xs font-bold whitespace-nowrap"
          >
            <Plus size={16} />
            <span>صنف جديد</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-panel p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 border-emerald-500/30 shadow-xl bg-white/95">
          <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900">إضافة مادة خام جديدة</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الصنف أو الخامة</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                placeholder="أكريليك أبيض 3مم، رول فينيل ألماني، حديد مربعات..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الرصيد المتاح</label>
              <input
                type="number"
                required
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الحد الأدنى للتنبيه</label>
              <input
                type="number"
                required
                min="0"
                value={minLimit}
                onChange={(e) => setMinLimit(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">سعر التكلفة للوحدة ({settings.shopInfo.currency})</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                placeholder="مثال: 85"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">وحدة القياس</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm appearance-none"
              >
                <option value="قطعة">قطعة</option>
                <option value="متر">متر طولي</option>
                <option value="م²">متر مربع (م²)</option>
                <option value="رول">رول كامل</option>
                <option value="لوح">لوح قياسي</option>
                <option value="كجم">كيلوجرام</option>
                <option value="عبوة">عبوة / كرتونة</option>
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end items-end gap-2 mt-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-sm"
              >
                حفظ المادة في المخزن
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item) => {
          const isLow = item.quantity <= item.minLimit;
          return (
            <div key={item.id} className={`glass-panel p-5 rounded-2xl flex flex-col justify-between border-t-4 transition-all duration-200 hover:shadow-lg ${isLow ? 'border-t-rose-500 bg-rose-50/20' : 'border-t-emerald-500'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{item.name}</h3>
                  {item.unitPrice && (
                    <span className="text-[11px] font-mono font-semibold text-slate-500 mt-0.5 block">
                      التكلفة: {item.unitPrice} {settings.shopInfo.currency} / {item.unit}
                    </span>
                  )}
                </div>
                {isLow ? (
                  <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-rose-200">
                    <AlertTriangle size={13} />
                    <span>رصيد منخفض</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg text-[11px] font-bold border border-emerald-200">
                    <CheckCircle2 size={12} />
                    <span>متوفر</span>
                  </span>
                )}
              </div>
              
              <div className="flex items-end justify-between mt-auto pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">الرصيد المتاح حالياً</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black font-mono ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>{item.quantity}</span>
                    <span className="text-xs text-slate-500 font-semibold">{item.unit}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">الحد الأدنى: {item.minLimit} {item.unit}</p>
                </div>

                <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/80">
                  <button
                    onClick={() => updateInventoryQuantity(item.id, -1)}
                    disabled={item.quantity <= 0}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all disabled:opacity-30"
                    title="خصم كمية (صرف)"
                  >
                    <Minus size={15} />
                  </button>
                  <div className="w-px bg-slate-300 mx-1"></div>
                  <button
                    onClick={() => updateInventoryQuantity(item.id, 1)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                    title="إضافة كمية (توريد)"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredInventory.length === 0 && (
          <div className="col-span-full glass-panel p-16 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <PackageX size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">لم يتم العثور على أي صنف</h3>
              <p className="text-xs text-slate-500">تحقق من كلمة البحث أو قم بإضافة صنف جديد إلى المستودع.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
