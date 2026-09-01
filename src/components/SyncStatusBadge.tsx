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
        badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        dotColor: 'bg-blue-500 animate-pulse',
        icon: <RefreshCw size={13} className="animate-spin text-blue-600 dark:text-blue-400" />,
      };
    }

    if (syncState === 'offline') {
      return {
        label: pendingSyncCount > 0 ? `محفوظ محلياً (${pendingSyncCount} بانتظار الاتصال)` : 'وضع العمل دون إنترنت',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dotColor: 'bg-amber-500',
        icon: <WifiOff size={13} className="text-amber-600 dark:text-amber-400" />,
      };
    }

    if (syncState === 'pending' || pendingSyncCount > 0) {
      return {
        label: `معلق في قائمة المزامنة (${pendingSyncCount})`,
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dotColor: 'bg-amber-500 animate-ping',
        icon: <CloudUpload size={13} className="text-amber-600 dark:text-amber-400" />,
      };
    }

    return {
      label: 'متزامن سحابياً (Supabase)',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dotColor: 'bg-emerald-500',
      icon: <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />,
    };
  };

  const status = getStatusDisplay();

  return (
    <div className="relative inline-block">
      <button
        onClick={handleManualSync}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer shadow-xs ${status.badgeBg}`}
        title="انقر لإجراء فحص وتحديث المزامنة السحابية فوراً"
      >
        <span className="shrink-0">{status.icon}</span>
        <span className="text-[11px] font-bold tracking-tight">{status.label}</span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dotColor}`} />
      </button>

      {/* Floating Info Tooltip */}
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-[11px] z-50 animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-900 dark:text-white">
            <Database size={13} className="text-emerald-500" />
            <span>معمارية المزامنة (Offline-First)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-[10px] leading-relaxed">
            يتم حفظ كافة المعاملات في الذاكرة المحلية أولاً لضمان السرعة الفائقة، وتُرفع تلقائياً لخوادم Supabase فور توفر اتصال الإنترنت.
          </p>
          {lastSyncTime && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 flex justify-between">
              <span>آخر مزامنة:</span>
              <span className="font-mono">{lastSyncTime}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
