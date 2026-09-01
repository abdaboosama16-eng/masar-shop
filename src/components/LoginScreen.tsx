import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Lock, ArrowLeft, RefreshCw, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export default function LoginScreen() {
  const { loginWithPasscode, loginWithSupabaseAuth, settings } = useAppContext();
  const [passcode, setPasscode] = useState('');
  const [email, setEmail] = useState('');
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (isSupabaseMode && email.trim()) {
        const result = await loginWithSupabaseAuth(email.trim(), passcode);
        if (!result.success) {
          setErrorMsg(result.message || 'فشل تسجيل الدخول عبر Supabase Auth.');
        }
      } else {
        const result = await loginWithPasscode(passcode);
        if (!result.success) {
          setErrorMsg(result.message || 'رمز الدخول غير صحيح.');
        }
      }
    } catch {
      setErrorMsg('حدث خطأ أثناء محاولة تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickMasterLogin = () => {
    setPasscode('1400');
    setErrorMsg(null);
    loginWithPasscode('1400');
  };

  return (
    <div className="min-h-screen bg-texture flex items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-xl p-8 shadow-2xl border border-slate-200/80 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Subtle decorative geometric backdrop */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
        
        {/* Header and Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shadow-slate-900/20 border border-slate-700">
            {settings.shopInfo.logoUrl ? (
              <img 
                src={settings.shopInfo.logoUrl} 
                alt="شعار الشركة" 
                className="w-12 h-12 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <ShieldCheck size={32} className="text-emerald-400" />
            )}
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {settings.shopInfo.name || 'شركة أسلوب للدعاية والإعلان'}
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            بوابة تسجيل الدخول والمصادقة الأمنية
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ">
            <Database size={12} />
            <span>نظام محمي متوافق مع Supabase & Offline-First</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSupabaseMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني (Supabase User)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm"
                required={isSupabaseMode}
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 ">
                {isSupabaseMode ? 'كلمة المرور' : 'رمز الدخول السري للمنظومة'}
              </label>
              {!isSupabaseMode && (
                <button
                  type="button"
                  onClick={handleQuickMasterLogin}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline"
                >
                  استخدام الرمز الافتراضي (1400)
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={isSupabaseMode ? '••••••••' : 'أدخل رمز الدخول (الافتراضي: 1400)'}
                className="w-full glass-input rounded-lg px-4 py-2.5 text-sm font-mono tabular-nums tracking-wider pl-10"
                required
                autoFocus
              />
              <Lock size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !passcode}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all duration-150 ease-out flex items-center justify-center gap-2 shadow-sm shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>جاري التحقق من الصلاحية...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>تسجيل الدخول إلى المنظومة</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode: Master Code vs Supabase Auth */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSupabaseMode(!isSupabaseMode);
              setErrorMsg(null);
            }}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 :text-white transition-all duration-150 ease-out "
          >
            {isSupabaseMode 
              ? 'التبديل إلى رمز الدخول المباشر (1400)' 
              : 'التبديل إلى مصادقة الحساب السحابي (Supabase Auth)'}
          </button>

          <div className="mt-4 text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>يعمل بدون إنترنت تلقائياً مع مزامنة سحابية مؤمنة</span>
          </div>
        </div>

      </div>
    </div>
  );
}
