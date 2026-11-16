import React from 'react';
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, MessageSquareCode, Menu } from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenMobileMenu: () => void;
  duplicateCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
  duplicateCount = 0
}) => {
  const isMoreActive = ['batches', 'duplicates', 'reports', 'settings', 'all_transactions'].includes(activeTab);

  return (
    <nav
      className="md:hidden fixed bottom-0 right-0 left-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-lg px-2 pb-safe"
      dir="rtl"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors touch-target ${
            activeTab === 'dashboard' ? 'text-teal-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-teal-50' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className={`text-[10px] mt-0.5 ${activeTab === 'dashboard' ? 'font-black' : 'font-semibold'}`}>
            الرئيسية
          </span>
        </button>

        {/* Inward */}
        <button
          onClick={() => setActiveTab('inward')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors touch-target ${
            activeTab === 'inward' ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'inward' ? 'bg-emerald-50' : ''}`}>
            <ArrowDownLeft className="w-5 h-5 text-emerald-700" />
          </div>
          <span className={`text-[10px] mt-0.5 ${activeTab === 'inward' ? 'font-black' : 'font-semibold'}`}>
            الوارد
          </span>
        </button>

        {/* WhatsApp Bot - Center Highlighted Pill */}
        <button
          onClick={() => setActiveTab('whatsapp')}
          className="flex-1 flex flex-col items-center justify-center py-1 -mt-4 transition-transform active:scale-95 touch-target"
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-gradient-to-tr from-emerald-700 to-[#042f2e] text-white ring-4 ring-emerald-100 scale-105'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
          >
            <MessageSquareCode className="w-6 h-6 text-emerald-200" />
          </div>
          <span className={`text-[10px] mt-1 ${activeTab === 'whatsapp' ? 'font-black text-emerald-950' : 'font-bold text-slate-700'}`}>
            بوت واتساب
          </span>
        </button>

        {/* Outward */}
        <button
          onClick={() => setActiveTab('outward')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors touch-target ${
            activeTab === 'outward' ? 'text-rose-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'outward' ? 'bg-rose-50' : ''}`}>
            <ArrowUpRight className="w-5 h-5 text-rose-700" />
          </div>
          <span className={`text-[10px] mt-0.5 ${activeTab === 'outward' ? 'font-black' : 'font-semibold'}`}>
            الصادر
          </span>
        </button>

        {/* More / Menu Drawer Toggle */}
        <button
          onClick={onOpenMobileMenu}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors touch-target relative ${
            isMoreActive ? 'text-teal-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl relative transition-all ${isMoreActive ? 'bg-teal-50' : ''}`}>
            <Menu className="w-5 h-5" />
            {duplicateCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white"></span>
            )}
          </div>
          <span className={`text-[10px] mt-0.5 ${isMoreActive ? 'font-black' : 'font-semibold'}`}>
            المزيد
          </span>
        </button>
      </div>
    </nav>
  );
};
