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
  Plus
} from 'lucide-react';
import { getAssetUrl } from '../api';

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className={`w-3 h-3 rounded-full ${direction === 'INWARD' ? 'bg-emerald-500' : (direction === 'OUTWARD' ? 'bg-rose-500' : 'bg-petroleum-700')}`} />
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إجمالي العمليات المعروضة: <span className="font-bold text-slate-800">{filtered.length}</span> عملية بإجمالي <span className="font-bold text-petroleum-800">{totalAmount.toLocaleString()} SDG</span>
          </p>
        </div>

        <button
          onClick={onOpenOcr}
          className="bg-petroleum-800 hover:bg-petroleum-900 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-2 space-x-reverse"
        >
          <Plus className="w-4 h-4" />
          <span>مسح إشعار جديد</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم العملية أو اسم المستفيد أو رقم الحساب..."
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-800/20 focus:border-petroleum-800"
          />
        </div>

        <button
          onClick={onRefresh}
          className="text-xs font-semibold text-petroleum-700 hover:text-petroleum-900 px-3 py-2 border border-slate-200 rounded-lg"
        >
          تحديث البيانات ⟳
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {tx.transactionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-base">
                      <span className={tx.direction === 'INWARD' ? 'text-emerald-700' : 'text-rose-700'}>
                        {Number(tx.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center space-x-1 space-x-reverse px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        tx.direction === 'INWARD' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {tx.direction === 'INWARD' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        <span>{tx.direction === 'INWARD' ? 'وارد' : 'صادر'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {tx.transactionDate ? new Date(tx.transactionDate).toLocaleString('ar-EG') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(tx.receivedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <div className="font-medium">{tx.beneficiaryName || '-'}</div>
                      {tx.receiverAccount && <div className="text-[10px] text-slate-400 font-mono">{tx.receiverAccount}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {tx.batchTransactions && tx.batchTransactions.length > 0 ? (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-xs">
                          {tx.batchTransactions.map((bt: any) => bt.batch.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">غير مدرج في سير</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.verificationStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center space-x-1 space-x-reverse text-emerald-700 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>معتمد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 space-x-reverse text-amber-700 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>قيد المراجعة</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-petroleum-800 transition-colors"
                        title="عرض تفاصيل الإشعار"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    لا توجد عمليات مطابقة في هذا القسم.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">تفاصيل الإشعار البنكي</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block">رقم العملية (TxID)</span>
                <span className="font-mono font-bold text-slate-900 text-base">{selectedTx.transactionNumber}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block">المبلغ المالي</span>
                <span className="font-bold text-emerald-700 text-base">{Number(selectedTx.amount).toLocaleString()} SDG</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block">نوع العملية</span>
                <span className="font-semibold text-slate-800">{selectedTx.direction === 'INWARD' ? 'وارد (مستلم)' : 'صادر (مدفوع)'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block">حالة التحقق والـ OCR</span>
                <span className="font-semibold text-emerald-700">{selectedTx.ocrStatus || 'SUCCESS'} (معتمد)</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                <span className="text-xs text-slate-400 block">إسم المستفيد</span>
                <span className="font-semibold text-slate-800">{selectedTx.beneficiaryName || 'غير متوفر'}</span>
              </div>
              {selectedTx.senderAccount && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block">من حساب</span>
                  <span className="font-mono text-xs text-slate-700">{selectedTx.senderAccount}</span>
                </div>
              )}
              {selectedTx.receiverAccount && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block">إلى حساب</span>
                  <span className="font-mono text-xs text-slate-700">{selectedTx.receiverAccount}</span>
                </div>
              )}
            </div>

            {selectedTx.imagePath && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                <div className="text-xs font-semibold p-2 bg-slate-100 text-slate-600">صورة الإشعار المسجلة:</div>
                <div className="max-h-60 overflow-y-auto bg-slate-900/5 flex justify-center p-2">
                  <img
                    src={getAssetUrl(selectedTx.imagePath)}
                    alt="Receipt"
                    className="max-h-56 object-contain rounded-lg shadow-sm"
                  />
                </div>
              </div>
            )}

            {selectedTx.extractedText && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold block mb-1">النص الكامل المستخرج عبر OCR:</span>
                <pre className="whitespace-pre-wrap font-sans text-slate-700 max-h-32 overflow-y-auto bg-white p-2 rounded border border-slate-200">
                  {selectedTx.extractedText}
                </pre>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="bg-slate-800 text-white text-xs px-4 py-2 rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
