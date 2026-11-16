import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Eye,
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import { getAssetUrl } from '../api';

interface DuplicatesViewProps {
  duplicates: any[];
  onRefresh: () => void;
}

export const DuplicatesView: React.FC<DuplicatesViewProps> = ({ duplicates, onRefresh }) => {
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-amber-500/10 border border-amber-300/60 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-950">سجل كشف التكرار ومنع الازدواج المالي</h1>
            <p className="text-xs text-amber-900/80 mt-1">
              يراقب النظام كافة العمليات الواصلة ويحجب تلقائياً أي رقم عملية سبق تسجيله لضمان عدم احتساب المبالغ مرتين مطلقاً.
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-amber-200 px-4 py-2 rounded-xl text-center">
          <span className="text-[11px] text-amber-800 font-semibold block">إجمالي المحاولات المحجوبة</span>
          <span className="text-2xl font-black text-amber-600">{duplicates.length}</span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">سجل محاولات الإرسال المكررة:</span>
          <button
            onClick={onRefresh}
            className="text-xs font-semibold text-petroleum-700 hover:text-petroleum-900"
          >
            تحديث السجل ⟳
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم العملية</th>
                <th className="py-3 px-4">المبلغ المستخرج</th>
                <th className="py-3 px-4">تاريخ المحاولة الثانية</th>
                <th className="py-3 px-4">تاريخ العملية الأصلية</th>
                <th className="py-3 px-4">المبلغ الأصلي</th>
                <th className="py-3 px-4">القرار المحاسبي</th>
                <th className="py-3 px-4 text-center">المقارنة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {duplicates.length > 0 ? (
                duplicates.map((dup) => {
                  const orig = dup.originalTransaction;
                  const origAmount = orig ? Number(orig.amount) : 0;
                  const extAmount = dup.extractedAmount ? Number(dup.extractedAmount) : 0;
                  const isMismatch = orig && Math.abs(origAmount - extAmount) > 0.01;
                  return (
                    <tr key={dup.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {dup.transactionNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-700">
                        {dup.extractedAmount ? `${extAmount.toLocaleString()} SDG` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(dup.attemptedAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {orig ? new Date(orig.createdAt).toLocaleString('ar-EG') : 'غير متوفر'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-800">
                        {orig ? `${origAmount.toLocaleString()} SDG` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          <Lock className="w-3 h-3" />
                          <span>محجوبة من الإجمالي</span>
                        </span>
                        {isMismatch && (
                          <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                            ⚠️ اختلاف في المبلغ!
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedAttempt(dup)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-amber-800 transition-colors"
                          title="مقارنة محاولة التكرار مع العملية الأصلية"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    لا توجد محاولات تكرار مسجلة. النظام نظيف تماماً وخالٍ من أية ازدواجات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">مقارنة محاولة التكرار بالعملية الأصلية</h3>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Original Tx Box */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-emerald-800 flex items-center space-x-1 space-x-reverse">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>العملية المعتمدة الأصلية</span>
                </div>
                {selectedAttempt.originalTransaction ? (
                  <div className="space-y-1 text-xs text-slate-700">
                    <div>رقم العملية: <strong className="font-mono">{selectedAttempt.originalTransaction.transactionNumber}</strong></div>
                    <div>المبلغ المعتمد: <strong className="text-emerald-700 text-sm">{Number(selectedAttempt.originalTransaction.amount).toLocaleString()} SDG</strong></div>
                    <div>تاريخ التسجيل: {new Date(selectedAttempt.originalTransaction.createdAt).toLocaleString('ar-EG')}</div>
                    <div>النوع: {selectedAttempt.originalTransaction.direction === 'INWARD' ? 'وارد' : 'صادر'}</div>
                    {selectedAttempt.originalTransaction.imagePath && (
                      <div className="mt-2">
                        <span className="text-[10px] text-slate-500 block mb-1">صورة الإشعار الأصلي:</span>
                        <img
                          src={getAssetUrl(selectedAttempt.originalTransaction.imagePath)}
                          alt="Original"
                          className="max-h-40 rounded border border-emerald-200 object-contain mx-auto"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">بيانات العملية الأصلية غير متوفرة</div>
                )}
              </div>

              {/* Duplicate Attempt Box */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-amber-800 flex items-center space-x-1 space-x-reverse">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>محاولة الإرسال الثانية (المحجوبة)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <div>رقم العملية: <strong className="font-mono">{selectedAttempt.transactionNumber}</strong></div>
                  <div>المبلغ المستخرج: <strong className="text-amber-700 text-sm">{Number(selectedAttempt.extractedAmount || 0).toLocaleString()} SDG</strong></div>
                  <div>تاريخ المحاولة: {new Date(selectedAttempt.attemptedAt).toLocaleString('ar-EG')}</div>
                  <div className="text-amber-800 font-semibold bg-amber-100/60 px-2 py-1 rounded text-[11px]">
                    ⛔ الحالة: رُفضت ولم تُحتسب في الحسابات
                  </div>
                  {selectedAttempt.attemptedImagePath && (
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-500 block mb-1">صورة الإشعار المرفقة بالمحاولة:</span>
                      <img
                        src={getAssetUrl(selectedAttempt.attemptedImagePath)}
                        alt="Attempted"
                        className="max-h-40 rounded border border-amber-200 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
              <strong>ملاحظات النظام:</strong> {selectedAttempt.notes || 'تم رصد تطابق في رقم العملية مع سجل قاعدة البيانات الفريد وحجبها تلقائياً.'}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAttempt(null)}
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
