import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Search, X, FileText, ShoppingCart, Box, User, 
  Layers, ChevronLeft, ArrowUpRight, Hash, Boxes 
} from 'lucide-react';

interface GlobalSearchProps {
  onSelectCallback?: () => void;
}

export default function GlobalSearch({ onSelectCallback }: GlobalSearchProps) {
  const { orders, inventory, currentUser } = useAppContext();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isManager = currentUser?.role === 'مدير';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Search Results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { orders: [], clients: [], materials: [] };

    // 1. Orders matching serial, description, or service
    const matchedOrders = orders.filter(o => 
      (o.serialNumber || o.id).toLowerCase().includes(q) ||
      o.clientName.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      (o.serviceType || '').toLowerCase().includes(q)
    ).slice(0, 5);

    // 2. Unique clients
    const allClients: string[] = Array.from(new Set(orders.map(o => o.clientName.trim()).filter(Boolean)));
    const matchedClients = allClients
      .filter((name: string) => name.toLowerCase().includes(q))
      .map((name: string) => {
        const clientOrders = orders.filter(o => o.clientName.trim() === name);
        const totalSpent = clientOrders.reduce((sum, o) => sum + o.price, 0);
        return { name, count: clientOrders.length, totalSpent };
      })
      .slice(0, 4);

    // 3. Materials
    const matchedMaterials = inventory.filter(m => 
      m.name.toLowerCase().includes(q) ||
      m.unit.toLowerCase().includes(q)
    ).slice(0, 4);

    return {
      orders: matchedOrders,
      clients: matchedClients,
      materials: matchedMaterials
    };
  }, [orders, inventory, query]);

  const hasResults = results.orders.length > 0 || results.clients.length > 0 || results.materials.length > 0;

  const handleSelectOrder = (orderId: string) => {
    setIsOpen(false);
    setQuery('');
    if (onSelectCallback) onSelectCallback();
    if (isManager) {
      navigate('/sales');
    } else {
      navigate('/tasks');
    }
  };

  const handleSelectClient = (clientName: string) => {
    setIsOpen(false);
    setQuery('');
    if (onSelectCallback) onSelectCallback();
    navigate('/sales');
  };

  const handleSelectMaterial = (materialId: string) => {
    setIsOpen(false);
    setQuery('');
    if (onSelectCallback) onSelectCallback();
    navigate('/inventory');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Input Bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="بحث شامل (رقم الفاتورة، اسم العميل، مادة خام)..."
          className="w-full glass-input rounded-lg pl-9 pr-10 py-2 text-xs font-medium bg-white/90 border border-slate-200/90 shadow-xs focus:ring-1 focus:ring-slate-300 focus:border-slate-300 /20"
        />
        <Search className="absolute right-3.5 top-2.5 text-slate-400 pointer-events-none" size={15} />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute left-3 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Floating Results Popover */}
      {isOpen && query.trim() !== '' && (
        <div className="absolute top-full mt-2 right-0 w-full md:w-[480px] bg-white/95 backdrop-blur-2xl rounded-xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          <div className="p-3 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
            <span>نتائج البحث عن: <strong className="text-slate-900 ">"{query}"</strong></span>
            <span className="text-[10px]">اضغط على أي نتيجة للانتقال المباشر</span>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-2 divide-y divide-slate-100 space-y-2">
            
            {/* Orders Category */}
            {results.orders.length > 0 && (
              <div className="pt-1 first:pt-0">
                <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <ShoppingCart size={12} className="text-emerald-600" />
                  <span>الفواتير والطلبيات ({results.orders.length})</span>
                </div>
                <div className="space-y-1">
                  {results.orders.map(order => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => handleSelectOrder(order.id)}
                      className="w-full text-right p-2.5 rounded-xl hover:bg-emerald-50/80 :bg-slate-800 transition-all duration-150 ease-out  flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span className="font-mono tabular-nums text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 shrink-0">
                          #{order.serialNumber || order.id}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {order.clientName}
                          </p>
                          <p className="text-[10px] text-slate-600 truncate max-w-[240px]">
                            {order.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 ">
                          {order.status}
                        </span>
                        <ChevronLeft size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:-translate-x-0.5 transition-all duration-150 ease-out" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clients Category */}
            {results.clients.length > 0 && isManager && (
              <div className="pt-2">
                <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <User size={12} className="text-blue-600" />
                  <span>العملاء والزبائن ({results.clients.length})</span>
                </div>
                <div className="space-y-1">
                  {results.clients.map(client => (
                    <button
                      key={client.name}
                      type="button"
                      onClick={() => handleSelectClient(client.name)}
                      className="w-full text-right p-2.5 rounded-xl hover:bg-blue-50/80 :bg-slate-800 transition-all duration-150 ease-out  flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {client.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-900 ">{client.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[10px] text-slate-400">{client.count} فواتير سابقة</span>
                        <ChevronLeft size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-all duration-150 ease-out" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Materials Category */}
            {results.materials.length > 0 && (
              <div className="pt-2">
                <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                  <Boxes size={12} className="text-amber-600" />
                  <span>المخزون والمواد الخام ({results.materials.length})</span>
                </div>
                <div className="space-y-1">
                  {results.materials.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectMaterial(item.id)}
                      className="w-full text-right p-2.5 rounded-xl hover:bg-amber-50/80 :bg-slate-800 transition-all duration-150 ease-out  flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 ">{item.name}</p>
                        <p className="text-[10px] text-slate-400">الوحدة: {item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded-lg ${
                          item.quantity <= item.minLimit 
                            ? 'bg-rose-100 text-rose-700 ' 
                            : 'bg-emerald-100 text-emerald-700 '
                        }`}>
                          {item.quantity} {item.unit}
                        </span>
                        <ChevronLeft size={14} className="text-slate-400 group-hover:text-amber-600 group-hover:-translate-x-0.5 transition-all duration-150 ease-out" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!hasResults && (
              <div className="py-8 text-center text-xs text-slate-400">
                لا توجد نتائج مطابقة لـ "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
