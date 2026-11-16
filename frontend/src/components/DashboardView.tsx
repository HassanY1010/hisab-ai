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
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-petroleum-900 to-petroleum-800 rounded-2xl p-6 text-white shadow-lg shadow-petroleum-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">لوحة القيادة والموقف المالي المباشر</h1>
          <p className="text-emerald-100/80 text-sm mt-1">
            متابعة فورية للتحويلات البنكية، تجميع السير، ومراقبة التكرار بدقة بنسبة 100%.
          </p>
        </div>
        <button
          onClick={onOpenOcr}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-2 space-x-reverse"
        >
          <Sparkles className="w-5 h-5" />
          <span>مسح إشعار تحويل جديد</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inward */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي التحويلات الواردة</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">
              {(stats?.totalInward || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">SDG</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              عدد العمليات: <span className="font-semibold text-slate-700">{stats?.countInward || 0}</span> عملية
            </div>
          </div>
        </div>

        {/* Total Outward */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي التحويلات الصادرة</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">
              {(stats?.totalOutward || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">SDG</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              عدد العمليات: <span className="font-semibold text-slate-700">{stats?.countOutward || 0}</span> عملية
            </div>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">صافي الفرق (الرصيد)</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${(stats?.netBalance || 0) >= 0 ? 'text-teal-800' : 'text-amber-600'}`}>
              {(stats?.netBalance || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">SDG</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              الوارد مطروحاً منه الصادر
            </div>
          </div>
        </div>

        {/* Duplicate Caught */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden cursor-pointer hover:border-amber-300 transition-all" onClick={onViewDuplicates}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">محاولات التكرار المحجوبة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">
              {stats?.duplicateCount || 0} <span className="text-xs font-normal text-slate-400">محاولة</span>
            </div>
            <div className="text-xs text-amber-600 font-medium mt-1 flex items-center space-x-1 space-x-reverse">
              <span>تم استبعادها من الإجماليات</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center space-x-3 space-x-reverse">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500">إجمالي العمليات المسجلة</div>
            <div className="text-lg font-bold text-slate-800">{stats?.totalTransactions || 0} عملية معتمدة</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center space-x-3 space-x-reverse">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FolderSync className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500">السير المالية المفتوحة</div>
            <div className="text-lg font-bold text-slate-800">{stats?.openBatchesCount || 0} سير نشط</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center space-x-3 space-x-reverse">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500">عمليات قيد التدقيق</div>
            <div className="text-lg font-bold text-slate-800">{stats?.pendingReviewCount || 0} عملية</div>
          </div>
        </div>
      </div>

      {/* Chart & Recent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movement Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">حركة الوارد والصادر (آخر 7 أيام)</h2>
              <p className="text-xs text-slate-400">مقارنة حركة التحويلات المالية المستلمة والمرسلة</p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse text-xs">
              <span className="flex items-center space-x-1 space-x-reverse">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span>الوارد</span>
              </span>
              <span className="flex items-center space-x-1 space-x-reverse">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <span>الصادر</span>
              </span>
            </div>
          </div>

          <div className="h-64">
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
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString()} SDG`]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', direction: 'rtl' }}
                />
                <Area type="monotone" dataKey="inward" name="الوارد" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInward)" />
                <Area type="monotone" dataKey="outward" name="الصادر" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOutward)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">آخر العمليات</h2>
              <button
                onClick={() => onViewAllTransactions()}
                className="text-xs font-semibold text-petroleum-700 hover:text-petroleum-900"
              >
                عرض الكل
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentTransactions && recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.direction === 'INWARD' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {tx.direction === 'INWARD' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{tx.transactionNumber}</div>
                        <div className="text-[11px] text-slate-400">
                          {tx.beneficiaryName || (tx.direction === 'INWARD' ? 'تحويل وارد' : 'تحويل صادر')}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-bold ${tx.direction === 'INWARD' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.amount.toLocaleString()} <span className="text-[10px]">SDG</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(tx.receivedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">
                  لا توجد عمليات مسجلة بعد. استخدم زر مسح إشعار لإضافة أول عملية.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <span>جميع العمليات مؤمنة ضد التكرار</span>
              <span className="font-bold text-emerald-700">✓ بنك الخرطوم</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
