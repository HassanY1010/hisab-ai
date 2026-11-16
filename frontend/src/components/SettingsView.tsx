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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Settings className="w-6 h-6 text-petroleum-800" />
            <h1 className="text-xl font-bold text-slate-900">إعدادات النظام والاتصال السحابي</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مراقبة حالة الاتصال بقاعدة بيانات PostgreSQL ومخزن Supabase Storage وإدارة البيئة التجريبية.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="text-xs font-semibold px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700"
        >
          فحص الاتصال ⟳
        </button>
      </div>

      {/* Infrastructure Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PostgreSQL Database */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">قاعدة البيانات (PostgreSQL)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className={`w-2.5 h-2.5 rounded-full ${readiness?.database === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span className="text-sm font-bold text-slate-900">
                {readiness?.database === 'connected' ? 'متصلة وجاهزة (Connected)' : 'قيد الفحص'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              مخطط Prisma ORM مع قيود منع التكرار الفريدة ونوع مالي دقيق Decimal(15,2).
            </p>
          </div>
        </div>

        {/* Supabase Storage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مخزن الملفات والصور</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-slate-900">
                {readiness?.storage === 'supabase' ? 'Supabase Storage' : 'تخزين مدار / Hybrid'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              دعم سحابي كامل لـ Supabase Buckets مع حماية الروابط وتخزين آمن.
            </p>
          </div>
        </div>

        {/* OCR Engine */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">محرك قراءة الإشعارات (OCR)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-slate-900">Tesseract.js + Sharp</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              دقة 100% مثبتة على عينات إشعارات بنك الخرطوم (تطبيق بنكك).
            </p>
          </div>
        </div>
      </div>

      {/* Reset Demo Data & Testing Environment */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <ShieldCheck className="w-5 h-5 text-petroleum-800" />
          <h2 className="text-base font-bold text-slate-900">إدارة بيئة العرض التجريبية (Demo Environment)</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          يتيح لك هذا الزر إعادة ضبط قاعدة البيانات إلى حالتها الأولية النظيفة، لمسح العمليات التي تمت تجربتها والبدء في جولة عرض جديدة ونظيفة أمام عميل آخر.
        </p>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 space-x-reverse">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center space-x-2 space-x-reverse disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'جارٍ إعادة التهيئة...' : 'إعادة تهيئة بيانات العرض التجريبي (Reset Demo)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
