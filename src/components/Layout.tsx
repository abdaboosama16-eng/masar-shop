import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Box, Receipt, Badge, 
  LogOut, Menu, X, Settings as SettingsIcon, 
  Sun, Moon, Minimize2, Tv, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import LoginScreen from './LoginScreen';
import SyncStatusBadge from './SyncStatusBadge';
import GlobalSearch from './GlobalSearch';

export default function Layout() {
  const { 
    currentUser, 
    logout, 
    settings, 
    toggleTheme, 
    isKioskMode, 
    toggleKioskMode 
  } = useAppContext();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // If user is not authenticated, display the login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // All primary navigation items unconditionally visible
  const navItems = [
    { name: 'لوحة التحكم', path: '/', icon: <LayoutDashboard size={19} /> },
    { name: 'المبيعات والطلبيات', path: '/sales', icon: <ShoppingCart size={19} /> },
    { name: 'المخزون والمواد', path: '/inventory', icon: <Box size={19} /> },
    { name: 'المالية', path: '/expenses', icon: <Receipt size={19} /> },
    { name: 'شؤون العاملين', path: '/employees', icon: <Badge size={19} /> },
    { name: 'الإعدادات العامة', path: '/settings', icon: <SettingsIcon size={19} /> },
  ];

  return (
    <div className={`min-h-screen bg-texture flex ${isKioskMode ? 'flex-col' : 'flex-col md:flex-row'} text-slate-900 dark:text-slate-100 selection:bg-emerald-100 selection:text-emerald-900`}>
      
      {/* Mobile Header (Hidden in Kiosk Mode) */}
      {!isKioskMode && (
        <header className="md:hidden flex items-center justify-between p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/20 text-white font-bold text-lg overflow-hidden">
              {settings.shopInfo.logoUrl ? (
                <img src={settings.shopInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                settings.shopInfo.name.charAt(0) || 'م'
              )}
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight truncate max-w-[170px]">
                {settings.shopInfo.name}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {currentUser.role}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <SyncStatusBadge />
            <button
              onClick={toggleTheme}
              className="text-slate-600 dark:text-slate-300 p-2 bg-slate-100/80 dark:bg-slate-800 rounded-xl active:scale-95 transition-all"
              title="تبديل السمة"
              aria-label="تبديل السمة"
            >
              {settings.theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-slate-700 dark:text-slate-200 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl active:scale-95 transition-all"
              aria-label="القائمة"
            >
              <Menu size={19} />
            </button>
          </div>
        </header>
      )}

      {/* Mobile Overlay */}
      {isMobileMenuOpen && !isKioskMode && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Collapsible on Desktop */}
      {!isKioskMode && (
        <aside 
          className={`no-print bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border-l border-slate-200/80 dark:border-slate-800 h-screen md:min-h-screen flex flex-col fixed inset-y-0 right-0 z-50 transform transition-all duration-300 md:relative md:translate-x-0 shadow-sm ${
            isMobileMenuOpen ? 'translate-x-0 w-72' : 'translate-x-full md:translate-x-0'
          } ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}
        >
          
          {/* Brand Header & Collapse Toggle */}
          <div className="p-4 border-b border-slate-200/70 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className={`flex items-center gap-3 min-w-0 ${isSidebarCollapsed ? 'md:justify-center md:w-full' : ''}`}>
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/25 text-white font-bold text-xl overflow-hidden shrink-0">
                {settings.shopInfo.logoUrl ? (
                  <img src={settings.shopInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  settings.shopInfo.name.charAt(0) || 'م'
                )}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
                    {settings.shopInfo.name}
                  </span>
                </div>
              )}
            </div>

            {/* Close button on mobile & Collapse toggle button on desktop */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="md:hidden text-slate-400 hover:text-slate-700 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                aria-label="إغلاق القائمة"
              >
                <X size={18} />
              </button>

              <button
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                className={`hidden md:flex text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                  isSidebarCollapsed ? 'mx-auto' : ''
                }`}
                title={isSidebarCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
                aria-label="طي أو توسيع القائمة"
              >
                {isSidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>

          {/* Primary Navigation items */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.name}
                className={({ isActive }) =>
                  `flex items-center ${isSidebarCollapsed ? 'md:justify-center px-2' : 'px-3.5'} py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/40 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                {!isSidebarCollapsed && <span className="text-[13px] mr-3">{item.name}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Bottom Section: User Profile Card */}
          <div className="p-3 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-2">
            
            {/* User Info */}
            <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm ${
              isSidebarCollapsed ? 'flex flex-col items-center gap-2 text-center' : 'space-y-2'
            }`}>
              <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-1.5' : 'justify-between'}`}>
                <div className={`flex items-center gap-2 min-w-0 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
                    {currentUser?.name.substring(0, 1) || 'م'}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || 'مستخدم'}</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">{currentUser?.role || '---'}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>

          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 p-4 md:p-8 overflow-x-hidden min-h-screen animate-in fade-in duration-300 w-full relative ${isKioskMode ? 'max-w-none' : ''}`}>
        
        {/* Top Header Actions for Desktop (Hidden in Kiosk Mode) */}
        {!isKioskMode && (
          <div className="hidden md:flex justify-between items-center gap-4 mb-6 no-print">
            {/* Global Search & Sync Status */}
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <GlobalSearch />
              <SyncStatusBadge />
            </div>

            {/* Top Action Icons: Geometric Icons Only without texts */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs hover:shadow-sm transition-all"
                title={settings.theme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الداكن'}
                aria-label="تبديل السمة"
              >
                {settings.theme === 'dark' ? (
                  <Sun size={17} className="text-amber-400" />
                ) : (
                  <Moon size={17} className="text-slate-600" />
                )}
              </button>
              
              <button
                onClick={() => navigate('/settings')}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs hover:shadow-sm transition-all"
                title="الإعدادات العامة"
                aria-label="الإعدادات العامة"
              >
                <SettingsIcon size={17} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* Kiosk Mode Banner when active */}
        {isKioskMode && (
          <div className="mb-6 p-3 px-5 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-xl border border-slate-700 no-print animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Tv size={18} />
              </div>
              <div>
                <span className="font-bold text-sm text-white block">وضع الورشة المفتوح (Kiosk Mode)</span>
                <span className="text-[11px] text-slate-400">شاشة عرض مخصصة للمصنع وشاشات التلفزيون الكبيرة لمتابعة خطوط الإنتاج والتركيب</span>
              </div>
            </div>
            <button
              onClick={toggleKioskMode}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Minimize2 size={15} />
              <span>إنهاء وضع الورشة</span>
            </button>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
