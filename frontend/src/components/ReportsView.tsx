import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api';

interface ReportsViewProps {
  batches: any[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ batches }) => {
  const [direction, setDirection] = useState<'ALL' | 'INWARD' | 'OUTWARD'>('ALL');
  const [period, setPeriod] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let sDate = startDate;
      let eDate = endDate;

      if (period === 'TODAY') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        sDate = today.toISOString();
      } else if (period === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        sDate = weekAgo.toISOString();
      } else if (period === 'MONTH') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        sDate = monthAgo.toISOString();
      }

      const res = await api.getReportsSummary({
        direction: direction === 'ALL' ? undefined : direction,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
        batchId: selectedBatchId || undefined
      });

      if (res.success) {
        setReportData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [direction, period, selectedBatchId]);

  const handleDownloadExcel = () => {
    let sDate = startDate;
    let eDate = endDate;

    if (period === 'TODAY') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      sDate = today.toISOString();
    } else if (period === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      sDate = weekAgo.toISOString();
    } else if (period === 'MONTH') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      sDate = monthAgo.toISOString();
    }

    const url = api.getExcelDownloadUrl({
      direction: direction === 'ALL' ? undefined : direction,
      startDate: sDate || undefined,
      endDate: eDate || undefined,
      batchId: selectedBatchId || undefined
    });

    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <FileSpreadsheet className="w-6 h-6 text-emerald-800" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900">التقارير المالية وتصدير كشوفات Excel</h1>
          </div>
          <p className="text-xs font-bold text-slate-600 mt-1.5 leading-relaxed">
            استخراج تقارير تفصيلية أو مجمعة، وتصدير ملفات Excel معتمدة بتنسيق RTL احترافي وجاهز للمراجعة المحاسبية.
          </p>
        </div>

        <button
          onClick={handleDownloadExcel}
          className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 space-x-reverse cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-200" />
          <span>تصدير ملف Excel (.xlsx)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
          {/* Direction Filter */}
          <div>
            <label className="text-slate-800 block mb-1.5">نوع العمليات:</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">شامل الوارد والصادر</option>
              <option value="INWARD">الوارد فقط (تحويلات مستلمة)</option>
              <option value="OUTWARD">الصادر فقط (تحويلات مدفوعة)</option>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <label className="text-slate-800 block mb-1.5">الفترة الزمنية:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">كامل العمليات المسجلة</option>
              <option value="TODAY">اليوم فقط</option>
              <option value="WEEK">آخر 7 أيام</option>
              <option value="MONTH">الشهر الحالي</option>
              <option value="CUSTOM">تاريخ مخصص</option>
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <label className="text-slate-800 block mb-1.5">حسب السير (Batch):</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">كافة السير (غير مقيد بسير محدد)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.direction === 'INWARD' ? 'وارد' : 'صادر'})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Action */}
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-[#0f766e] font-black rounded-lg border border-teal-300 transition-colors text-center"
            >
              تحديث التقرير ⟳
            </button>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {period === 'CUSTOM' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs font-bold">
            <div>
              <label className="text-slate-700 block mb-1">من تاريخ:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-700 block mb-1">إلى تاريخ:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border-2 border-emerald-100 shadow-xs">
          <div className="text-xs font-bold text-slate-700">إجمالي الوارد للفترة</div>
          <div className="text-2xl font-black text-emerald-800 mt-2">
            {(reportData?.summary?.totalInward || 0).toLocaleString()} <span className="text-xs font-bold">SDG</span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1">
            {reportData?.summary?.countInward || 0} عملية واردة
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-rose-100 shadow-xs">
          <div className="text-xs font-bold text-slate-700">إجمالي الصادر للفترة</div>
          <div className="text-2xl font-black text-rose-800 mt-2">
            {(reportData?.summary?.totalOutward || 0).toLocaleString()} <span className="text-xs font-bold">SDG</span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1">
            {reportData?.summary?.countOutward || 0} عملية صادرة
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-teal-100 shadow-xs">
          <div className="text-xs font-bold text-slate-700">صافي الفرق المحاسبي</div>
          <div className={`text-2xl font-black mt-2 ${(reportData?.summary?.netBalance || 0) >= 0 ? 'text-teal-900' : 'text-amber-700'}`}>
            {(reportData?.summary?.netBalance || 0).toLocaleString()} <span className="text-xs font-bold">SDG</span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1">
            الوارد - الصادر
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border-2 border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-slate-700">العمليات والمحاولات المحجوبة</div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {reportData?.summary?.totalTransactions || 0} <span className="text-xs font-bold text-slate-600">عملية</span>
          </div>
          <div className="text-xs font-black text-amber-700 mt-1">
            {reportData?.summary?.duplicateCount || 0} محاولة تكرار محجوبة
          </div>
        </div>
      </div>

      {/* Transactions in Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black text-slate-900">
            العمليات المشمولة في كشف الحساب ({reportData?.transactions?.length || 0}):
          </span>
          <button
            onClick={handleDownloadExcel}
            className="text-xs font-black text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 space-x-reverse cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل التقرير كـ Excel</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-800 text-xs font-black border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم العملية</th>
                <th className="py-3 px-4">المبلغ (SDG)</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">تاريخ العملية</th>
                <th className="py-3 px-4">المستفيد</th>
                <th className="py-3 px-4">السير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {reportData?.transactions && reportData.transactions.length > 0 ? (
                reportData.transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-black text-slate-950">{tx.transactionNumber}</td>
                    <td className="py-3 px-4 font-black">
                      <span className={tx.direction === 'INWARD' ? 'text-emerald-800' : 'text-rose-800'}>
                        {Number(tx.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        tx.direction === 'INWARD' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {tx.direction === 'INWARD' ? 'وارد' : 'صادر'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-700">
                      {new Date(tx.receivedAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">{tx.beneficiaryName || '-'}</td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600">
                      {tx.batchTransactions?.map((bt: any) => bt.batch.name).join(', ') || 'بدون سير'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-600 font-bold text-sm">
                    {loading ? 'جاري تحميل التقرير...' : 'لا توجد بيانات مطابقة للشروط المحددة.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
