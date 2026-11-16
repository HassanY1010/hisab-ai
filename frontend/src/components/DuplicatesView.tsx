import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Eye,
  Calendar,
  Lock,
  ArrowRight,
  X
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
      {/* Header Banner */}
      <div className="bg-amber-50 border-2 border-amber-300 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-amber-950">سجل كشف التكرار ومنع الازدواج المالي</h1>
            <p className="text-xs font-bold text-amber-900 mt-1 leading-relaxed">
              يراقب النظام كافة العمليات الواصلة ويحجب تلقائياً أي رقم عملية سبق تسجيله لضمان عدم احتساب المبالغ مرتين مطلقاً.
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-amber-400 px-5 py-2.5 rounded-2xl text-center shadow-xs shrink-0 w-full sm:w-auto">
          <span className="text-xs text-amber-950 font-black block">إجمالي المحاولات المحجوبة</span>
          <span className="text-2xl sm:text-3xl font-black text-amber-700">{duplicates.length}</span>
        </div>
      </div>

      {/* Desktop Audit Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-black text-slate-900">سجل محاولات الإرسال المكررة المسجلة رقابياً:</span>
          <button
            onClick={onRefresh}
            className="text-xs font-black text-[#0f766e] hover:text-[#115e59] bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 cursor-pointer"
          >
            تحديث السجل ⟳
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-slate-800 text-xs font-black border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100 font-semibold">
              {duplicates.length > 0 ? (
                duplicates.map((dup) => {
                  const orig = dup.originalTransaction;
                  const origAmount = orig ? Number(orig.amount) : 0;
                  const extAmount = dup.extractedAmount ? Number(dup.extractedAmount) : 0;
                  const isMismatch = orig && Math.abs(origAmount - extAmount) > 0.01;
                  return (
                    <tr key={dup.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-950">
                        {dup.transactionNumber}
                      </td>
                      <td className="py-3.5 px-4 font-black text-amber-800">
                        {dup.extractedAmount ? `${extAmount.toLocaleString()} SDG` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-600">
                        {new Date(dup.attemptedAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-800">
                        {orig ? new Date(orig.createdAt).toLocaleString('ar-EG') : 'غير متوفر'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-black text-emerald-800">
                        {orig ? `${origAmount.toLocaleString()} SDG` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300">
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span>محجوبة من الإجمالي</span>
                        </span>
                        {isMismatch && (
                          <span className="block text-[11px] text-rose-700 font-black mt-1">
                            ⚠️ اختلاف في المبلغ!
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedAttempt(dup)}
                          className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-900 transition-colors cursor-pointer"
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
                  <td colSpan={7} className="py-12 text-center text-slate-600 font-bold text-sm">
                    لا توجد محاولات تكرار مسجلة. النظام نظيف تماماً وخالٍ من أية ازدواجات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View for Duplicates */}
      <div className="block md:hidden space-y-3">
        {duplicates.length > 0 ? (
          duplicates.map((dup) => {
            const orig = dup.originalTransaction;
            const origAmount = orig ? Number(orig.amount) : 0;
            const extAmount = dup.extractedAmount ? Number(dup.extractedAmount) : 0;
            return (
              <div key={dup.id} className="bg-white rounded-2xl p-4 border-2 border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-slate-900 text-xs">
                    {dup.transactionNumber}
                  </span>
                  <span className="inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>محجوبة 100%</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 font-medium">
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">المبلغ المحجوب:</span>
                    <span className="font-black text-amber-800 text-xs">{extAmount.toLocaleString()} SDG</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">المبلغ الأصلي المعتمد:</span>
                    <span className="font-black text-emerald-800 text-xs">{origAmount.toLocaleString()} SDG</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 font-bold block text-[11px]">تاريخ محاولة الإرسال الثانية:</span>
                    <span className="font-bold text-slate-700 text-[11px]">
                      {new Date(dup.attemptedAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAttempt(dup)}
                  className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-black rounded-xl flex items-center justify-center space-x-1.5 space-x-reverse transition-colors border border-amber-300"
                >
                  <Eye className="w-4 h-4 text-amber-800" />
                  <span>مقارنة الإشعارين جنباً إلى جنب</span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-600 font-bold text-sm border border-slate-200">
            لا توجد محاولات تكرار مسجلة. النظام نظيف تماماً وخالٍ من أية ازدواجات.
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">مقارنة محاولة التكرار بالعملية الأصلية</h3>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Original Tx Box */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-black text-emerald-950 flex items-center space-x-1.5 space-x-reverse">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <span>العملية المعتمدة الأصلية</span>
                </div>

                {selectedAttempt.originalTransaction?.imagePath && (
                  <div className="rounded-xl overflow-hidden border border-emerald-200 bg-white p-1">
                    <img
                      src={getAssetUrl(selectedAttempt.originalTransaction.imagePath)}
                      alt="الإشعار الأصلي"
                      className="max-h-48 w-full object-contain"
                    />
                  </div>
                )}

                <div className="text-xs space-y-1 font-semibold text-slate-800">
                  <div>
                    <span className="text-slate-500 font-bold block">رقم العملية:</span>
                    <span className="font-mono font-black text-slate-900">{selectedAttempt.transactionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">المبلغ الأصلي:</span>
                    <span className="font-black text-emerald-800 text-sm">
                      {Number(selectedAttempt.originalTransaction?.amount || 0).toLocaleString()} SDG
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">تاريخ التسجيل الأول:</span>
                    <span className="font-bold text-slate-700">
                      {selectedAttempt.originalTransaction?.createdAt
                        ? new Date(selectedAttempt.originalTransaction.createdAt).toLocaleString('ar-EG')
                        : 'غير متوفر'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duplicate Attempt Box */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-black text-amber-950 flex items-center space-x-1.5 space-x-reverse">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>محاولة التكرار (المحجوبة)</span>
                </div>

                {selectedAttempt.imagePath && (
                  <div className="rounded-xl overflow-hidden border border-amber-200 bg-white p-1">
                    <img
                      src={getAssetUrl(selectedAttempt.imagePath)}
                      alt="صورة الإشعار المكرر"
                      className="max-h-48 w-full object-contain"
                    />
                  </div>
                )}

                <div className="text-xs space-y-1 font-semibold text-slate-800">
                  <div>
                    <span className="text-slate-500 font-bold block">رقم العملية المقروء:</span>
                    <span className="font-mono font-black text-slate-900">{selectedAttempt.transactionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">المبلغ المقروء:</span>
                    <span className="font-black text-amber-800 text-sm">
                      {Number(selectedAttempt.extractedAmount || 0).toLocaleString()} SDG
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">تاريخ محاولة الإرسال:</span>
                    <span className="font-bold text-slate-700">
                      {new Date(selectedAttempt.attemptedAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">النتيجة الرقابية:</span>
                    <span className="font-black text-rose-800">
                      محجوبة ولم تُضف إلى إجمالي الرصيد مطلقاً
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
