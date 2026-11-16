import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Hash,
  ShieldAlert,
  Clock,
  FolderSync,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardViewProps {
  stats: any;
  chartData: any[];
  recentTransactions: any[];
  onOpenOcr: () => void;
  onViewAllTransactions: (dir?: 'INWARD' | 'OUTWARD') => void;
  onViewDuplicates: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  chartData,
  recentTransactions,
  onOpenOcr,
  onViewAllTransactions,
  onViewDuplicates
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner - High Contrast Petroleum Dark Gradient with White Text */}
      <div
        className="rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-teal-800"
        style={{
          background: 'linear-gradient(135deg, #042f2e 0%, #0f3d39 50%, #115e59 100%)'
        }}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-xs">
            لوحة القيادة والموقف المالي المباشر
          </h1>
          <p className="text-emerald-200 text-xs sm:text-sm font-bold mt-1.5 leading-relaxed">
            متابعة فورية للتحويلات البنكية، تجميع السير، ومراقبة التكرار بدقة بنسبة 100%.
          </p>
        </div>
        <button
          onClick={onOpenOcr}
          className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 space-x-reverse shrink-0 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-slate-950 shrink-0" />
          <span>مسح إشعار تحويل جديد</span>
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inward */}
        <div className="bg-white rounded-2xl p-5 border-2 border-emerald-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">إجمالي التحويلات الواردة</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-800">
              {(stats?.totalInward || 0).toLocaleString()} <span className="text-xs font-bold text-emerald-700">SDG</span>
            </div>
            <div className="text-xs font-medium text-slate-600 mt-1">
              عدد العمليات: <span className="font-extrabold text-slate-900">{stats?.countInward || 0}</span> عملية
            </div>
          </div>
        </div>

        {/* Total Outward */}
        <div className="bg-white rounded-2xl p-5 border-2 border-rose-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">إجمالي التحويلات الصادرة</span>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-800">
              {(stats?.totalOutward || 0).toLocaleString()} <span className="text-xs font-bold text-rose-700">SDG</span>
            </div>
            <div className="text-xs font-medium text-slate-600 mt-1">
              عدد العمليات: <span className="font-extrabold text-slate-900">{stats?.countOutward || 0}</span> عملية
            </div>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white rounded-2xl p-5 border-2 border-teal-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">صافي الفرق (الرصيد)</span>
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black ${(stats?.netBalance || 0) >= 0 ? 'text-teal-900' : 'text-amber-700'}`}>
              {(stats?.netBalance || 0).toLocaleString()} <span className="text-xs font-bold text-teal-700">SDG</span>
            </div>
            <div className="text-xs font-bold text-slate-600 mt-1">
              الوارد مطروحاً منه الصادر
            </div>
          </div>
        </div>

        {/* Duplicate Caught */}
        <div
          className="bg-white rounded-2xl p-5 border-2 border-amber-200 shadow-xs relative overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
          onClick={onViewDuplicates}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">محاولات التكرار المحجوبة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-700">
              {stats?.duplicateCount || 0} <span className="text-xs font-bold text-amber-900">محاولة</span>
            </div>
            <div className="text-xs text-amber-800 font-bold mt-1 flex items-center space-x-1 space-x-reverse">
              <span>تم استبعادها من الإجماليات</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center space-x-3 space-x-reverse shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600">إجمالي العمليات المسجلة</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{stats?.totalTransactions || 0} عملية معتمدة</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center space-x-3 space-x-reverse shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
            <FolderSync className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600">السير المالية المفتوحة</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{stats?.openBatchesCount || 0} سير نشط</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center space-x-3 space-x-reverse shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-600">عمليات قيد التدقيق</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{stats?.pendingReviewCount || 0} عملية</div>
          </div>
        </div>
      </div>

      {/* Chart & Recent Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movement Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">حركة الوارد والصادر (آخر 7 أيام)</h2>
              <p className="text-xs font-semibold text-slate-500">مقارنة حركة التحويلات المالية المستلمة والمرسلة</p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse text-xs font-bold">
              <span className="flex items-center space-x-1.5 space-x-reverse text-emerald-800">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block"></span>
                <span>الوارد</span>
              </span>
              <span className="flex items-center space-x-1.5 space-x-reverse text-rose-800">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-600 inline-block"></span>
                <span>الصادر</span>
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} SDG`]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', direction: 'rtl', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="inward" name="الوارد" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInward)" />
                <Area type="monotone" dataKey="outward" name="الصادر" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutward)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-black text-slate-900">آخر العمليات</h2>
              <button
                onClick={() => onViewAllTransactions()}
                className="text-xs font-black text-[#0f766e] hover:text-[#115e59] bg-teal-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                عرض الكل
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentTransactions && recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.direction === 'INWARD' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {tx.direction === 'INWARD' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">{tx.transactionNumber}</div>
                        <div className="text-[11px] font-medium text-slate-600 truncate">
                          {tx.beneficiaryName || (tx.direction === 'INWARD' ? 'تحويل وارد' : 'تحويل صادر')}
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className={`text-sm font-black ${tx.direction === 'INWARD' ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {Number(tx.amount).toLocaleString()} <span className="text-[10px] font-bold">SDG</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {new Date(tx.receivedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-600 font-medium text-sm">
                  لا توجد عمليات مسجلة بعد. استخدم زر مسح إشعار لإضافة أول عملية.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700">
              <span>جميع العمليات مؤمنة ضد التكرار</span>
              <span className="font-black text-emerald-800">✓ بنك الخرطوم (بنكك)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
