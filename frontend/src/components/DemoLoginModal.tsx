import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowLeft, Sparkles } from 'lucide-react';

interface DemoLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: { name: string; role: string }) => void;
}

export const DemoLoginModal: React.FC<DemoLoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [username, setUsername] = useState('demo@hisab.ai');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    // Demo authorization
    onLoginSuccess({
      name: 'العميل التجريبي (Demo User)',
      role: 'مدير العمليات المحاسبية'
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-l from-emerald-500 via-[#0f766e] to-[#042f2e]" />

        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#042f2e] text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-950/20">
            <ShieldCheck className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">
              HISAB <span className="text-[#0f766e]">AI</span>
            </h2>
            <p className="text-xs font-bold text-slate-600 mt-1">
              نظام إدارة إشعارات التحويلات البنكية ومحاكي واتساب الذكي
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-xs font-bold text-emerald-950 my-5 flex items-center space-x-2 space-x-reverse">
          <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>تم تعبئة بيانات الدخول التجريبية مسبقاً لراحتك أثناء فحص النظام.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-800 block mb-1">اسم المستخدم / البريد الإلكتروني</label>
            <div className="relative">
              <User className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-800 block mb-1">كلمة المرور التجريبية</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-700 font-black">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-[#0f766e] hover:bg-[#115e59] text-white font-black text-xs sm:text-sm py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 space-x-reverse cursor-pointer"
          >
            <span>دخول لوحة التحكم التجريبية</span>
            <ArrowLeft className="w-4 h-4 text-emerald-300" />
          </button>
        </form>

        <div className="text-center mt-6 text-[11px] font-bold text-slate-500">
          HISAB AI © 2026 | بيئة العرض المحاسبية المعتمدة
        </div>
      </div>
    </div>
  );
};
