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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900">التقارير المالية وتصدير كشوفات Excel</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            استخراج تقارير تفصيلية أو مجمعة، وتصدير ملفات Excel معتمدة بتنسيق RTL احترافي وجاهز للمراجعة المحاسبية.
          </p>
        </div>

        <button
          onClick={handleDownloadExcel}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-2 space-x-reverse"
        >
          <Download className="w-4 h-4" />
          <span>تصدير ملف Excel (.xlsx)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Direction Filter */}
          <div>
            <label className="font-semibold text-slate-600 block mb-1">نوع العمليات:</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none"
            >
              <option value="ALL">شامل الوارد والصادر</option>
              <option value="INWARD">الوارد فقط (تحويلات مستلمة)</option>
              <option value="OUTWARD">الصادر فقط (تحويلات مدفوعة)</option>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <label className="font-semibold text-slate-600 block mb-1">الفترة الزمنية:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none"
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
            <label className="font-semibold text-slate-600 block mb-1">حسب السير (Batch):</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none"
            >
              <option value="">كافة السير والعمليات</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.direction === 'INWARD' ? 'وارد' : 'صادر'})</option>
              ))}
            </select>
          </div>

          {/* Custom Date Picker */}
          {period === 'CUSTOM' && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">من:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">إلى:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 block">إجمالي الوارد</span>
            <span className="text-xl font-bold text-emerald-700">{reportData.totalInward.toLocaleString()} SDG</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 block">إجمالي الصادر</span>
            <span className="text-xl font-bold text-rose-700">{reportData.totalOutward.toLocaleString()} SDG</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 block">صافي الحركة</span>
            <span className="text-xl font-bold text-teal-800">{reportData.netBalance.toLocaleString()} SDG</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-400 block">عدد العمليات</span>
            <span className="text-xl font-bold text-slate-800">{reportData.count} عملية</span>
          </div>
        </div>
      )}

      {/* Report Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">معاينة جدول التقرير:</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">رقم العملية</th>
                <th className="py-2.5 px-3">المبلغ (SDG)</th>
                <th className="py-2.5 px-3">النوع</th>
                <th className="py-2.5 px-3">المستفيد</th>
                <th className="py-2.5 px-3">تاريخ الإشعار</th>
                <th className="py-2.5 px-3">السير المرتبط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData && reportData.transactions && reportData.transactions.length > 0 ? (
                reportData.transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{tx.transactionNumber}</td>
                    <td className={`py-2.5 px-3 font-bold ${tx.direction === 'INWARD' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {tx.amount.toLocaleString()} SDG
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${tx.direction === 'INWARD' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {tx.direction === 'INWARD' ? 'وارد' : 'صادر'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{tx.beneficiaryName || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(tx.receivedAt).toLocaleString('ar-EG')}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {tx.batchTransactions?.map((bt: any) => bt.batch.name).join(', ') || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لا توجد بيانات مطابقة لخيارات التقرير.
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
