import React, { useState } from 'react';
import {
  FolderSync,
  Plus,
  GitMerge,
  Split,
  Lock,
  Unlock,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../api';

interface BatchesViewProps {
  batches: any[];
  allTransactions: any[];
  onRefresh: () => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({ batches, allTransactions, onRefresh }) => {
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'INWARD' | 'OUTWARD'>('ALL');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDirection, setNewBatchDirection] = useState<'INWARD' | 'OUTWARD'>('INWARD');
  const [newBatchNotes, setNewBatchNotes] = useState('');

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedBatchIdsForMerge, setSelectedBatchIdsForMerge] = useState<string[]>([]);
  const [mergedBatchName, setMergedBatchName] = useState('');

  // Split modal state
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSourceBatch, setSplitSourceBatch] = useState<any | null>(null);
  const [selectedTxIdsForSplit, setSelectedTxIdsForSplit] = useState<string[]>([]);
  const [splitBatchName, setSplitBatchName] = useState('');

  // Add transactions modal state
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [targetBatchForAdd, setTargetBatchForAdd] = useState<any | null>(null);
  const [selectedTxIdsToAdd, setSelectedTxIdsToAdd] = useState<string[]>([]);

  const filteredBatches = batches.filter(b => {
    if (directionFilter === 'ALL') return true;
    return b.direction === directionFilter;
  });

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    try {
      await api.createBatch({
        name: newBatchName.trim(),
        direction: newBatchDirection,
        notes: newBatchNotes.trim() || undefined
      });
      setNewBatchName('');
      setNewBatchNotes('');
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const handleToggleStatus = async (batchId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
      await api.setBatchStatus(batchId, newStatus);
      onRefresh();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const handleRemoveTx = async (batchId: string, txId: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذه العملية من السير؟')) return;
    try {
      await api.removeTransactionFromBatch(batchId, txId);
      onRefresh();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatchIdsForMerge.length < 2 || !mergedBatchName.trim()) {
      alert('يجب تحديد سيرين على الأقل وإدخال اسم للسير الجديد');
      return;
    }
    try {
      await api.mergeBatches({
        sourceBatchIds: selectedBatchIdsForMerge,
        newBatchName: mergedBatchName.trim()
      });
      setShowMergeModal(false);
      setSelectedBatchIdsForMerge([]);
      setMergedBatchName('');
      onRefresh();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitSourceBatch || selectedTxIdsForSplit.length === 0 || !splitBatchName.trim()) {
      alert('يجب تحديد عملية واحدة على الأقل وتسمية السير الجديد');
      return;
    }
    try {
      await api.splitBatch({
        sourceBatchId: splitSourceBatch.id,
        transactionIdsToMove: selectedTxIdsForSplit,
        newBatchName: splitBatchName.trim()
      });
      setShowSplitModal(false);
      setSplitSourceBatch(null);
      setSelectedTxIdsForSplit([]);
      setSplitBatchName('');
      onRefresh();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBatchForAdd || selectedTxIdsToAdd.length === 0) return;
    try {
      await api.addTransactionsToBatch(targetBatchForAdd.id, selectedTxIdsToAdd);
      setShowAddTxModal(false);
      setTargetBatchForAdd(null);
      setSelectedTxIdsToAdd([]);
      onRefresh();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <FolderSync className="w-6 h-6 text-petroleum-800" />
            <h1 className="text-xl font-bold text-slate-900">إدارة السير وتجميع العمليات (Batches)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تجميع العمليات في مجموعات عمل مرنة، دمج السير، فصلها، وإصدار كشوفات مجمعة وفق معايير المحاسبة.
          </p>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={() => setShowMergeModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 space-x-reverse"
          >
            <GitMerge className="w-4 h-4 text-slate-600" />
            <span>دمج سيرين</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-petroleum-800 hover:bg-petroleum-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-1.5 space-x-reverse"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء سير جديد</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 space-x-reverse bg-slate-100 p-1 rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => setDirectionFilter('ALL')}
          className={`px-4 py-1.5 rounded-lg transition-all ${directionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          كافة السير ({batches.length})
        </button>
        <button
          onClick={() => setDirectionFilter('INWARD')}
          className={`px-4 py-1.5 rounded-lg transition-all ${directionFilter === 'INWARD' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          سير الوارد ({batches.filter(b => b.direction === 'INWARD').length})
        </button>
        <button
          onClick={() => setDirectionFilter('OUTWARD')}
          className={`px-4 py-1.5 rounded-lg transition-all ${directionFilter === 'OUTWARD' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          سير الصادر ({batches.filter(b => b.direction === 'OUTWARD').length})
        </button>
      </div>

      {/* Batches Cards / List */}
      <div className="space-y-4">
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch) => {
            const isExpanded = expandedBatchId === batch.id;
            return (
              <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      batch.direction === 'INWARD' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      <FolderSync className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <h3 className="font-bold text-slate-900 text-base">{batch.name}</h3>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          batch.direction === 'INWARD' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {batch.direction === 'INWARD' ? 'وارد' : 'صادر'}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          batch.status === 'OPEN' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {batch.status === 'OPEN' ? 'مفتوح (OPEN)' : 'مغلق (CLOSED)'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        تاريخ الإنشاء: {new Date(batch.createdAt).toLocaleString('ar-EG')}
                        {batch.notes && ` • ${batch.notes}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 space-x-reverse self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-left">
                      <div className="text-xs text-slate-400">إجمالي مبالغ السير</div>
                      <div className={`text-lg font-black ${batch.direction === 'INWARD' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {batch.totalAmount.toLocaleString()} <span className="text-xs font-normal">SDG</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{batch.transactionCount} عملية مسجلة</div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      {batch.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => {
                              setTargetBatchForAdd(batch);
                              setShowAddTxModal(true);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                            title="إضافة عمليات إلى هذا السير"
                          >
                            + إضافة عمليات
                          </button>
                          {batch.transactionCount > 1 && (
                            <button
                              onClick={() => {
                                setSplitSourceBatch(batch);
                                setShowSplitModal(true);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center space-x-1 space-x-reverse"
                              title="فصل جزء من العمليات في سير مستقل"
                            >
                              <Split className="w-3.5 h-3.5" />
                              <span>فصل</span>
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => handleToggleStatus(batch.id, batch.status)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center space-x-1 space-x-reverse ${
                          batch.status === 'OPEN'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                        title={batch.status === 'OPEN' ? 'إغلاق السير واعتماده' : 'إعادة فتح السير'}
                      >
                        {batch.status === 'OPEN' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{batch.status === 'OPEN' ? 'إغلاق' : 'إعادة فتح'}</span>
                      </button>

                      <button
                        onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Transactions inside this Batch */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700">العمليات المدرجة في هذا السير ({batch.transactions.length}):</span>
                    </div>

                    {batch.transactions.length > 0 ? (
                      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 text-slate-500 font-semibold border-b">
                            <tr>
                              <th className="py-2.5 px-3">رقم العملية</th>
                              <th className="py-2.5 px-3">المبلغ</th>
                              <th className="py-2.5 px-3">المستفيد</th>
                              <th className="py-2.5 px-3">تاريخ الاستلام</th>
                              {batch.status === 'OPEN' && <th className="py-2.5 px-3 text-center">إزالة</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {batch.transactions.map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{tx.transactionNumber}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-800">{tx.amount.toLocaleString()} SDG</td>
                                <td className="py-2.5 px-3 text-slate-600">{tx.beneficiaryName || '-'}</td>
                                <td className="py-2.5 px-3 text-slate-400">{new Date(tx.receivedAt).toLocaleString('ar-EG')}</td>
                                {batch.status === 'OPEN' && (
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      onClick={() => handleRemoveTx(batch.id, tx.id)}
                                      className="text-rose-500 hover:text-rose-700 p-1"
                                      title="إزالة العملية من السير"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-400">
                        لا توجد عمليات داخل هذا السير حالياً.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            لا توجد سير مسجلة حتى الآن. اضغط على «إنشاء سير جديد» للبدء.
          </div>
        )}
      </div>

      {/* Modal: Create Batch */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateBatch} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">إنشاء سير مالي جديد</h3>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">اسم السير *</label>
              <input
                type="text"
                required
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="مثال: سير واردات الصباح 1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-800/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">نوع السير *</label>
              <select
                value={newBatchDirection}
                onChange={(e) => setNewBatchDirection(e.target.value as any)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-800/20"
              >
                <option value="INWARD">وارد (تحويلات مستلمة)</option>
                <option value="OUTWARD">صادر (تحويلات مدفوعة)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">ملاحظات (اختياري)</label>
              <textarea
                value={newBatchNotes}
                onChange={(e) => setNewBatchNotes(e.target.value)}
                placeholder="أية ملاحظات خاصة بالسير..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-800/20"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-end space-x-2 space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-petroleum-800 text-white rounded-lg hover:bg-petroleum-900"
              >
                إنشاء السير
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Merge Batches */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleMergeSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">دمج سيرين أو أكثر</h3>
            <p className="text-xs text-slate-500">
              اختر السير المراد دمجها من نفس النوع (وارد مع وارد أو صادر مع صادر). سيتم نقل جميع العمليات إلى السير الجديد مع الحفاظ على أرقامها الأصلية.
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
              {batches.map((b) => (
                <label key={b.id} className="flex items-center space-x-2 space-x-reverse text-xs p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBatchIdsForMerge.includes(b.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBatchIdsForMerge([...selectedBatchIdsForMerge, b.id]);
                      } else {
                        setSelectedBatchIdsForMerge(selectedBatchIdsForMerge.filter(id => id !== b.id));
                      }
                    }}
                    className="rounded text-petroleum-800"
                  />
                  <span className="font-semibold">{b.name}</span>
                  <span className="text-slate-400">({b.direction === 'INWARD' ? 'وارد' : 'صادر'} - {b.totalAmount.toLocaleString()} SDG - {b.transactionCount} عملية)</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">اسم السير المجمع الجديد *</label>
              <input
                type="text"
                required
                value={mergedBatchName}
                onChange={(e) => setMergedBatchName(e.target.value)}
                placeholder="مثال: سير اليوم المجمع"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-petroleum-800 text-white rounded-lg hover:bg-petroleum-900"
              >
                تنفيذ الدمج
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Split Batch */}
      {showSplitModal && splitSourceBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSplitSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">فصل عمليات من: {splitSourceBatch.name}</h3>
            <p className="text-xs text-slate-500">
              حدد العمليات التي ترغب في فصلها ونقلها إلى سير جديد منفصل:
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
              {splitSourceBatch.transactions.map((t: any) => (
                <label key={t.id} className="flex items-center space-x-2 space-x-reverse text-xs p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTxIdsForSplit.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTxIdsForSplit([...selectedTxIdsForSplit, t.id]);
                      } else {
                        setSelectedTxIdsForSplit(selectedTxIdsForSplit.filter(id => id !== t.id));
                      }
                    }}
                    className="rounded text-petroleum-800"
                  />
                  <span className="font-mono font-bold">{t.transactionNumber}</span>
                  <span className="font-semibold text-emerald-700">{t.amount.toLocaleString()} SDG</span>
                  <span className="text-slate-400">({t.beneficiaryName || '-'})</span>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">اسم السير الجديد للعمليات المفصولة *</label>
              <input
                type="text"
                required
                value={splitBatchName}
                onChange={(e) => setSplitBatchName(e.target.value)}
                placeholder="مثال: سير العمليات المسائية المفصولة"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-petroleum-800 text-white rounded-lg hover:bg-petroleum-900"
              >
                تنفيذ الفصل
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Transactions to Batch */}
      {showAddTxModal && targetBatchForAdd && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddTxSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">إضافة عمليات إلى: {targetBatchForAdd.name}</h3>
            <p className="text-xs text-slate-500">
              حدد العمليات من نوع ({targetBatchForAdd.direction === 'INWARD' ? 'وارد' : 'صادر'}) لإدراجها داخل هذا السير:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3">
              {allTransactions
                .filter(t => t.direction === targetBatchForAdd.direction)
                .map((t) => {
                  const alreadyInBatch = targetBatchForAdd.transactions.some((bt: any) => bt.id === t.id);
                  return (
                    <label key={t.id} className={`flex items-center space-x-2 space-x-reverse text-xs p-1.5 rounded cursor-pointer ${alreadyInBatch ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                      <input
                        type="checkbox"
                        disabled={alreadyInBatch}
                        checked={alreadyInBatch || selectedTxIdsToAdd.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTxIdsToAdd([...selectedTxIdsToAdd, t.id]);
                          } else {
                            setSelectedTxIdsToAdd(selectedTxIdsToAdd.filter(id => id !== t.id));
                          }
                        }}
                        className="rounded text-petroleum-800"
                      />
                      <span className="font-mono font-bold">{t.transactionNumber}</span>
                      <span className="font-semibold text-slate-800">{t.amount.toLocaleString()} SDG</span>
                      <span className="text-slate-400">({t.beneficiaryName || '-'})</span>
                      {alreadyInBatch && <span className="text-[10px] text-slate-400">(موجودة مسبقاً)</span>}
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-end space-x-2 space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setShowAddTxModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-petroleum-800 text-white rounded-lg hover:bg-petroleum-900"
              >
                إضافة المحددة ({selectedTxIdsToAdd.length})
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
