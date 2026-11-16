import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowLeft, Sparkles, PlayCircle, LogIn, AlertCircle } from 'lucide-react';

interface DemoLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: { name: string; role: string }) => void;
}

export const DemoLoginModal: React.FC<DemoLoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [username, setUsername] = useState('demo@hisab.ai');
  const [password, setPassword] = useState('demo1234');
  const [showAdvancedLogin, setShowAdvancedLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickStart = () => {
    onLoginSuccess({
      name: 'العميل التجريبي (Demo Client)',
      role: 'مدير العمليات المحاسبية'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    onLoginSuccess({
      name: 'العميل التجريبي (Demo Client)',
      role: 'مدير العمليات المحاسبية'
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 right-0 left-0 h-2.5 bg-gradient-to-l from-emerald-500 via-[#0f766e] to-[#042f2e]" />

        {/* Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#042f2e] text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-950/25">
            <ShieldCheck className="w-9 h-9 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
              HISAB <span className="text-[#0f766e]">AI</span>
            </h1>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 mt-1">
              نظام إدارة الإشعارات والتحويلات البنكية الذكي
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-2 leading-relaxed">
              منصة سحابية متقدمة لاستخراج بيانات الإشعارات البنكية لحظياً عبر الذكاء الاصطناعي (OCR)، كشف ومطابقة التكرار، إدارة السير، ومحاكاة محادثات واتساب الحقيقية.
            </p>
          </div>
        </div>

        {/* Isolation Notice Banner */}
        <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl text-xs font-bold text-amber-950 my-5 flex items-start space-x-2.5 space-x-reverse">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-black text-amber-900 block">نسخة تجريبية معتمدة (Demo Environment):</span>
            هذه بيئة تجريبية تفاعلية ببيانات معزولة تماماً عن الحسابات البنكية الحقيقية، صممت خصيصاً لتمكين العميل من تجربة واختبار كافة وظائف النظام لمدة ساعة.
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleQuickStart}
            className="w-full bg-gradient-to-r from-emerald-600 to-[#0f766e] hover:from-emerald-500 hover:to-[#115e59] text-white font-black text-sm sm:text-base py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-950/20 flex items-center justify-center space-x-2 space-x-reverse cursor-pointer transform hover:-translate-y-0.5"
          >
            <PlayCircle className="w-5 h-5 text-emerald-200" />
            <span>ابدأ التجربة الآن (حساب جاهز)</span>
          </button>

          {!showAdvancedLogin ? (
            <button
              type="button"
              onClick={() => setShowAdvancedLogin(true)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-600" />
              <span>الدخول إلى النظام (بيانات تسجيل الدخول)</span>
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 mt-3 pt-3 border-t border-slate-200">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-[11px] font-bold text-emerald-900 flex items-center space-x-2 space-x-reverse">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>تم تجهيز الحساب التجريبي مسبقاً، اضغط دخول مباشرة:</span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 block mb-1">اسم المستخدم</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 block mb-1">كلمة المرور</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-rose-700 font-black">{error}</div>
              )}

              <button
                type="submit"
                className="w-full bg-[#0f766e] hover:bg-[#115e59] text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 space-x-reverse cursor-pointer"
              >
                <span>الدخول إلى النظام</span>
                <ArrowLeft className="w-4 h-4 text-emerald-300" />
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-5 text-[11px] font-bold text-slate-500">
          HISAB AI © 2026 | بيئة العرض المحاسبية المعتمدة للعملاء
        </div>
      </div>
    </div>
  );
};
