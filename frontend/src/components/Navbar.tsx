import React from 'react';
import { ShieldCheck, Bot, Sparkles, Menu } from 'lucide-react';

interface NavbarProps {
  onOpenOcrModal: () => void;
  onOpenWhatsApp: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenOcrModal,
  onOpenWhatsApp,
  onToggleMobileMenu
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Right Section: Mobile Toggle & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse min-w-0">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors touch-target flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="القائمة الجانبية"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#0d9488] to-[#042f2e] flex items-center justify-center text-white shadow-md shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse">
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900 truncate">
                HISAB <span className="text-[#0d9488]">AI</span>
              </span>
              <span className="hidden md:inline-block bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                تجريبي معتمد
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate max-w-[140px] sm:max-w-none hidden sm:block">
              نظام إدارة التحويلات وإشعارات البنوك الذكي
            </p>
          </div>
        </div>

        {/* Left Section: Action Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 space-x-reverse shrink-0">
          <button
            onClick={onOpenWhatsApp}
            className="flex items-center space-x-1 sm:space-x-1.5 space-x-reverse bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] sm:text-xs md:text-sm font-bold px-2.5 sm:px-3.5 py-2 rounded-xl transition-all shadow-xs touch-target cursor-pointer shrink-0"
            title="فتح محاكي واتساب"
          >
            <Bot className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="hidden xs:inline">واتساب</span>
          </button>

          <button
            onClick={onOpenOcrModal}
            className="flex items-center space-x-1 sm:space-x-1.5 space-x-reverse bg-[#0f766e] hover:bg-[#115e59] text-white text-[11px] sm:text-xs md:text-sm font-bold px-2.5 sm:px-4 py-2 rounded-xl transition-all shadow-xs touch-target cursor-pointer shrink-0"
            title="مسح إشعار بنكي جديد"
          >
            <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="hidden sm:inline">مسح إشعار (OCR)</span>
            <span className="sm:hidden">مسح</span>
          </button>
        </div>
      </div>
    </header>
  );
};
