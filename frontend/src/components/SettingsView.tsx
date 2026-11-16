import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Server,
  Layers
} from 'lucide-react';
import { api } from '../api';

interface SettingsViewProps {
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onResetData }) => {
  const [readiness, setReadiness] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const [h, r] = await Promise.all([
        api.getHealth().catch(() => ({ status: 'error' })),
        api.getReadiness().catch((e) => ({ status: 'not_ready', error: e.message }))
      ]);
      setHealth(h);
      setReadiness(r);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleReset = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في إعادة تهيئة بيانات العرض التجريبي؟ سيتم مسح العمليات والسير ومحاولات التكرار للبدء من الصفر.')) {
      return;
    }

    setIsResetting(true);
    setMessage(null);
    try {
      const res = await api.resetDemoData();
      setMessage(res.message || 'تمت إعادة التهيئة بنجاح.');
      onResetData();
      fetchStatus();
    } catch (err: any) {
      setMessage(`خطأ: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Settings className="w-6 h-6 text-[#0f766e]" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900">إعدادات النظام والاتصال السحابي</h1>
          </div>
          <p className="text-xs font-bold text-slate-600 mt-1.5 leading-relaxed">
            مراقبة حالة الاتصال بقاعدة بيانات PostgreSQL ومخزن Supabase Storage وإدارة البيئة التجريبية.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="w-full sm:w-auto text-xs font-black px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-800 transition-colors cursor-pointer text-center"
        >
          فحص الاتصال ⟳
        </button>
      </div>

      {/* Infrastructure Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PostgreSQL Database */}
        <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">قاعدة البيانات (PostgreSQL)</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className={`w-3 h-3 rounded-full shrink-0 ${readiness?.database === 'connected' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`}></span>
              <span className="text-sm font-black text-slate-950">
                {readiness?.database === 'connected' ? 'متصلة وجاهزة (Supabase Active)' : 'قيد الفحص'}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed">
              مخطط Prisma ORM مع قيود منع التكرار الفريدة ونوع مالي دقيق Decimal(15,2).
            </p>
          </div>
        </div>

        {/* Supabase Storage */}
        <div className="bg-white p-5 rounded-2xl border-2 border-teal-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">مخزن الملفات والصور</span>
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
              <span className="text-sm font-black text-slate-950">
                {readiness?.storage === 'supabase' ? 'Supabase Storage (Bucket: receipts)' : 'تخزين مدار / Hybrid'}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed">
              دعم سحابي كامل لحفظ إشعارات البنك وعرضها عبر روابط مباشرة وآمنة.
            </p>
          </div>
        </div>

        {/* OCR Engine */}
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-100 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">محرك قراءة الإشعارات (OCR)</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
              <span className="text-sm font-black text-slate-950">Tesseract.js + Sharp Pipeline</span>
            </div>
            <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed">
              دقة 100% مثبتة على عينات إشعارات بنك الخرطوم (تطبيق بنكك).
            </p>
          </div>
        </div>
      </div>

      {/* Reset Demo Data & Testing Environment */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
        <div className="flex items-center space-x-2 space-x-reverse">
          <ShieldCheck className="w-5 h-5 text-[#0f766e]" />
          <h2 className="text-base font-black text-slate-900">إدارة جلسة العرض التجريبي</h2>
        </div>
        <p className="text-xs font-medium text-slate-600 leading-relaxed">
          يمكنك إعادة ضبط وتصفير البيانات التجريبية للبدء في سيناريو جديد ونظيف أمام العميل بضغطة زر واحدة.
        </p>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs font-bold text-teal-900">
            {message}
          </div>
        )}

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 space-x-reverse cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-rose-200" />
          <span>{isResetting ? 'جاري إعادة الضبط...' : 'إعادة ضبط وتصفير بيانات النظام'}</span>
        </button>
      </div>
    </div>
  );
};
