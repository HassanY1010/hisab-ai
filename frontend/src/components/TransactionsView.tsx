import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Plus,
  X
} from 'lucide-react';
import { getAssetUrl, formatDateTime } from '../api';

interface TransactionsViewProps {
  direction?: 'INWARD' | 'OUTWARD';
  transactions: any[];
  onOpenOcr: () => void;
  onRefresh: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  direction,
  transactions,
  onOpenOcr,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const title = direction === 'INWARD'
    ? 'إدارة التحويلات الواردة (المستلمة من العملاء)'
    : (direction === 'OUTWARD' ? 'إدارة التحويلات الصادرة (المدفوعة للموردين والمصدرين)' : 'كافة العمليات المالية (الوارد والصادر)');

  const filtered = transactions.filter(t => {
    if (direction && t.direction !== direction) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.transactionNumber?.toLowerCase().includes(term) ||
      t.beneficiaryName?.toLowerCase().includes(term) ||
      t.senderAccount?.includes(term) ||
      t.receiverAccount?.includes(term)
    );
  });

  const totalAmount = filtered.reduce((acc, t) => acc + (t.direction === 'OUTWARD' && !direction ? -Number(t.amount) : Number(t.amount)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className={`w-3.5 h-3.5 rounded-full ${direction === 'INWARD' ? 'bg-emerald-600' : (direction === 'OUTWARD' ? 'bg-rose-600' : 'bg-teal-700')}`} />
            <h1 className="text-lg sm:text-xl font-black text-slate-900">{title}</h1>
          </div>
          <p className="text-xs font-bold text-slate-600 mt-1.5">
            إجمالي العمليات المعروضة: <span className="font-black text-slate-950">{filtered.length}</span> عملية بإجمالي <span className="font-black text-[#0f766e]">{totalAmount.toLocaleString()} SDG</span>
          </p>
        </div>

        <button
          onClick={onOpenOcr}
          className="w-full sm:w-auto bg-[#0f766e] hover:bg-[#115e59] text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 space-x-reverse cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>مسح إشعار جديد</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم العملية أو اسم المستفيد أو رقم الحساب..."
            className="w-full pr-9 pl-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
          />
        </div>

        <button
          onClick={onRefresh}
          className="w-full sm:w-auto text-xs font-black text-[#0f766e] hover:text-[#115e59] bg-teal-50 px-4 py-2 border border-teal-200 rounded-lg transition-colors cursor-pointer text-center"
        >
          تحديث البيانات ⟳
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-slate-800 text-xs font-black border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم العملية</th>
                <th className="py-3 px-4">المبلغ (SDG)</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">تاريخ الإشعار</th>
                <th className="py-3 px-4">تاريخ الاستلام</th>
                <th className="py-3 px-4">المستفيد / الحساب</th>
                <th className="py-3 px-4">السير المرتبط</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filtered.length > 0 ? (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-slate-950">
                      {tx.transactionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-black text-base">
                      <span className={tx.direction === 'INWARD' ? 'text-emerald-800' : 'text-rose-800'}>
                        {Number(tx.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center space-x-1 space-x-reverse px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        tx.direction === 'INWARD' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}>
                        {tx.direction === 'INWARD' ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowUpRight className="w-3.5 h-3.5 text-rose-700" />}
                        <span>{tx.direction === 'INWARD' ? 'وارد' : 'صادر'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-900 font-mono">
                      {formatDateTime(tx.transactionDate)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                      {new Date(tx.receivedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-900">
                      <div className="font-bold">{tx.beneficiaryName || '-'}</div>
                      {tx.receiverAccount && <div className="text-[11px] text-slate-600 font-mono">{tx.receiverAccount}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {tx.batchTransactions && tx.batchTransactions.length > 0 ? (
                        <span className="bg-slate-200 text-slate-900 px-2 py-0.5 rounded-md font-bold text-xs">
                          {tx.batchTransactions.map((bt: any) => bt.batch.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium text-xs">غير مدرج في سير</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.verificationStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center space-x-1 space-x-reverse text-emerald-800 text-xs font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>معتمد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 space-x-reverse text-amber-800 text-xs font-black">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>قيد المراجعة</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 hover:bg-teal-50 rounded-lg text-slate-700 hover:text-teal-900 transition-colors cursor-pointer"
                        title="عرض تفاصيل الإشعار"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-600 font-bold text-sm">
                    لا توجد عمليات مطابقة في هذا القسم.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View (Optimized for Smartphones) */}
      <div className="block md:hidden space-y-3">
        {filtered.length > 0 ? (
          filtered.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center space-x-1 space-x-reverse px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  tx.direction === 'INWARD' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  {tx.direction === 'INWARD' ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowUpRight className="w-3.5 h-3.5 text-rose-700" />}
                  <span>{tx.direction === 'INWARD' ? 'تحويل وارد' : 'تحويل صادر'}</span>
                </span>

                <div className={`text-base font-black ${tx.direction === 'INWARD' ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {Number(tx.amount).toLocaleString()} <span className="text-xs font-bold">SDG</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 font-medium">
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">رقم العملية:</span>
                  <span className="font-mono font-black text-slate-900 text-xs">{tx.transactionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">المستفيد:</span>
                  <span className="font-bold text-slate-800 text-xs">{tx.beneficiaryName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">تاريخ الإشعار:</span>
                  <span className="font-bold text-slate-800 text-[11px] font-mono">
                    {formatDateTime(tx.transactionDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">استلام النظام:</span>
                  <span className="font-semibold text-slate-600 text-[11px]">
                    {new Date(tx.receivedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[11px]">الحالة:</span>
                  <span className={`font-black text-[11px] ${tx.verificationStatus === 'VERIFIED' ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {tx.verificationStatus === 'VERIFIED' ? '✓ معتمد' : '⏳ قيد المراجعة'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(tx)}
                className="w-full py-2 bg-slate-100 hover:bg-teal-50 text-slate-900 hover:text-teal-900 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 space-x-reverse transition-colors"
              >
                <Eye className="w-4 h-4 text-teal-800" />
                <span>عرض تفاصيل وصورة الإشعار</span>
              </button>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-600 font-bold text-sm border border-slate-200">
            لا توجد عمليات مطابقة في هذا القسم.
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">تفاصيل الإشعار البنكي</h3>
                <span className="text-xs font-bold text-slate-500">رقم العملية: {selectedTx.transactionNumber}</span>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Receipt Preview */}
              <div className="bg-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-200 min-h-48">
                {selectedTx.imagePath || selectedTx.storageKey ? (
                  <img
                    src={getAssetUrl(selectedTx.imagePath || selectedTx.storageKey)}
                    alt="صورة الإشعار"
                    className="max-h-72 w-auto object-contain rounded-xl shadow-xs"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-500 font-bold text-xs">
                    <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    لا تتوفر صورة محفوظة لهذه العملية
                  </div>
                )}
              </div>

              {/* Data Fields */}
              <div className="space-y-2.5 text-xs font-medium">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">المبلغ المالي:</span>
                  <div className="text-xl font-black text-emerald-800">
                    {Number(selectedTx.amount).toLocaleString()} SDG
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">نوع العملية:</span>
                  <span className="font-bold text-slate-900">
                    {selectedTx.direction === 'INWARD' ? 'وارد (استلام من عميل)' : 'صادر (دفع لمورد)'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">المستفيد:</span>
                  <span className="font-bold text-slate-900">{selectedTx.beneficiaryName || '-'}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">تاريخ ووقت الإشعار البنكي:</span>
                  <span className="font-black text-slate-900 font-mono">
                    {formatDateTime(selectedTx.transactionDate)}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-bold block">تاريخ استلام النظام وتسجيله:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(selectedTx.receivedAt).toLocaleString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>

            {/* Extracted Raw OCR Text (If available) */}
            {selectedTx.extractedText && (
              <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-800 block mb-1">النص المستخرج عبر OCR:</span>
                <p className="text-[11px] font-mono text-slate-700 whitespace-pre-line max-h-32 overflow-y-auto">
                  {selectedTx.extractedText}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
