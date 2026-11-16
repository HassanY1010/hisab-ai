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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Right Section: Mobile Toggle & Brand */}
        <div className="flex items-center space-x-3 space-x-reverse">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
            aria-label="القائمة"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0d9488] to-[#042f2e] flex items-center justify-center text-white shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                HISAB <span className="text-[#0d9488]">AI</span>
              </span>
              <span className="hidden sm:inline-block bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                نظام تجريبي احترافي
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 font-semibold truncate max-w-[180px] sm:max-w-none">
              نظام إدارة التحويلات وإشعارات البنوك الذكي
            </p>
          </div>
        </div>

        {/* Left Section: Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
          <button
            onClick={onOpenWhatsApp}
            className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-3 sm:px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Bot className="w-4 h-4 text-emerald-200" />
            <span>محاكي واتساب</span>
          </button>

          <button
            onClick={onOpenOcrModal}
            className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse bg-[#0f766e] hover:bg-[#115e59] text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span className="hidden sm:inline">مسح إشعار بنكي (OCR)</span>
            <span className="sm:hidden">مسح إشعار</span>
          </button>
        </div>
      </div>
    </header>
  );
};
