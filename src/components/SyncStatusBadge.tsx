import React, { useState } from 'react';
import { Cloud, CloudUpload, RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function SyncStatusBadge() {
  const { syncState, pendingSyncCount, syncNow, lastSyncTime } = useAppContext();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await syncNow();
    setTimeout(() => {
      setIsManualSyncing(false);
    }, 600);
  };

  const getStatusDisplay = () => {
    if (syncState === 'syncing' || isManualSyncing) {
      return {
        label: 'جاري المزامنة مع Supabase...',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 ',
        dotColor: 'bg-blue-500 animate-pulse',
        icon: <RefreshCw size={13} className="animate-spin text-blue-600 " />,
      };
    }

    if (syncState === 'offline') {
      return {
        label: pendingSyncCount > 0 ? `محفوظ محلياً (${pendingSyncCount} بانتظار الاتصال)` : 'وضع العمل دون إنترنت',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200 ',
        dotColor: 'bg-amber-500',
        icon: <WifiOff size={13} className="text-amber-600 " />,
      };
    }

    if (syncState === 'pending' || pendingSyncCount > 0) {
      return {
        label: `معلق في قائمة المزامنة (${pendingSyncCount})`,
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200 ',
        dotColor: 'bg-amber-500 animate-ping',
        icon: <CloudUpload size={13} className="text-amber-600 " />,
      };
    }

    return {
      label: 'متزامن سحابياً (Supabase)',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200 ',
      dotColor: 'bg-emerald-500',
      icon: <CheckCircle2 size={13} className="text-emerald-600 " />,
    };
  };

  const status = getStatusDisplay();

  return (
    <div className="relative inline-block">
      <button
        onClick={handleManualSync}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all duration-150 ease-out cursor-pointer shadow-xs ${status.badgeBg}`}
        title="انقر لإجراء فحص وتحديث المزامنة السحابية فوراً"
      >
        <span className="shrink-0">{status.icon}</span>
        <span className="text-[11px] font-bold tracking-tight">{status.label}</span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dotColor}`} />
      </button>

      {/* Floating Info Tooltip */}
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white text-slate-800 rounded-xl shadow-sm border border-slate-200/80 text-[11px] z-50 animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-900 ">
            <Database size={13} className="text-emerald-500" />
            <span>معمارية المزامنة (Offline-First)</span>
          </div>
          <p className="text-slate-600 text-[10px] leading-relaxed">
            يتم حفظ كافة المعاملات في الذاكرة المحلية أولاً لضمان السرعة الفائقة، وتُرفع تلقائياً لخوادم Supabase فور توفر اتصال الإنترنت.
          </p>
          {lastSyncTime && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 flex justify-between">
              <span>آخر مزامنة:</span>
              <span className="font-mono tabular-nums">{lastSyncTime}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
