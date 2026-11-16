import React from 'react';
import { ShieldCheck, Bot, Sparkles, Bell } from 'lucide-react';

interface NavbarProps {
  onOpenOcrModal: () => void;
  onOpenWhatsApp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenOcrModal, onOpenWhatsApp }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-petroleum-800 to-petroleum-950 flex items-center justify-center text-white shadow-md shadow-petroleum-900/20">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">HISAB <span className="text-petroleum-700">AI</span></span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                نظام تجريبي احترافي
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">نظام إدارة التحويلات وإشعارات البنوك الذكي</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={onOpenWhatsApp}
            className="flex items-center space-x-2 space-x-reverse bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-all shadow-sm"
          >
            <Bot className="w-4 h-4" />
            <span>محاكي واتساب</span>
          </button>

          <button
            onClick={onOpenOcrModal}
            className="flex items-center space-x-2 space-x-reverse bg-petroleum-800 hover:bg-petroleum-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-petroleum-900/20"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>مسح إشعار بنكي (OCR)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
