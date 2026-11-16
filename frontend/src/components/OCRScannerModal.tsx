import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileCheck,
  Layers,
  FileText
} from 'lucide-react';
import { api, getAssetUrl } from '../api';

interface OCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
}

export const OCRScannerModal: React.FC<OCRScannerModalProps> = ({ isOpen, onClose, onTransactionAdded }) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBatchFiles, setSelectedBatchFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [direction, setDirection] = useState<'INWARD' | 'OUTWARD'>('INWARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [batchResults, setBatchResults] = useState<any[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [samples, setSamples] = useState<any[]>([]);

  // Editable fields for single mode
  const [txNumber, setTxNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [beneficiary, setBeneficiary] = useState('');

  const sampleAmounts: Record<string, string> = {
    '1794831071578.jpg': '1,000,000 SDG',
    '1794831071609.jpg': '5,000,000 SDG',
    '1794831071639.jpg': '1,800,000 SDG',
    '1794831071669.jpg': '2,000,000 SDG',
    '1794831071700.jpg': '1,943,000 SDG',
    '1794831071730.jpg': '1,500,000 SDG',
  };

  useEffect(() => {
    if (isOpen) {
      api.getSamples().then(res => {
        if (res.success) setSamples(res.data);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSingleFileChange = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOcrResult(null);
    setBatchResults(null);
    setErrorMsg(null);
  };

  const handleBatchFilesChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, 10); // up to 10 receipts
    setSelectedBatchFiles(fileArray);
    setBatchResults(null);
    setErrorMsg(null);
  };

  const handlePickSample = async (sampleFilename: string) => {
    try {
      const res = await fetch(getAssetUrl(`/samples/${sampleFilename}`));
      const blob = await res.blob();
      const file = new File([blob], sampleFilename, { type: 'image/jpeg' });
      handleSingleFileChange(file);
    } catch (err: any) {
      setErrorMsg(`تعذر تحميل العينة: ${err.message}`);
    }
  };

  const handleScanSingleOcr = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('direction', direction);
    formData.append('commit', 'false');

    try {
      const res = await api.uploadOcrReceipt(formData);
      if (res.success) {
        setOcrResult(res.data);
        setTxNumber(res.data.ocr.normalizedTxNumber || '');
        setAmount(res.data.ocr.amount ? String(res.data.ocr.amount) : '');
        setBeneficiary(res.data.ocr.beneficiaryName || '');
      } else {
        setErrorMsg(res.error || 'فشلت عملية القراءة');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessBatchUpload = async () => {
    if (selectedBatchFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    const formData = new FormData();
    selectedBatchFiles.forEach(f => formData.append('images', f));
    formData.append('direction', direction);
    formData.append('commit', 'true'); // Auto commit batch

    try {
      const res = await api.batchUploadOcr(formData);
      if (res.success) {
        setBatchResults(res.data.results);
        onTransactionAdded();
      } else {
        setErrorMsg(res.error || 'فشلت عملية معالجة الدفعة');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommitSingleTransaction = async () => {
    if (!txNumber || !amount || Number(amount) <= 0) {
      alert('يرجى التأكد من رقم العملية والمبلغ');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await api.createTransaction({
        transactionNumber: txNumber,
        amount: Number(amount),
        direction,
        beneficiaryName: beneficiary || undefined,
        senderAccount: ocrResult?.ocr?.senderAccount || undefined,
        receiverAccount: ocrResult?.ocr?.receiverAccount || undefined,
        transactionDate: ocrResult?.ocr?.transactionDate || undefined,
        imagePath: ocrResult?.file?.url || undefined,
        storageKey: ocrResult?.file?.storageKey || undefined,
        extractedText: ocrResult?.ocr?.rawText || undefined,
        ocrStatus: ocrResult?.ocr?.status || 'SUCCESS',
        verificationStatus: 'VERIFIED'
      });

      if (res.success) {
        alert('✅ تم اعتماد وتسجيل العملية المالية بنجاح!');
        onTransactionAdded();
        handleClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedBatchFiles([]);
    setPreviewUrl(null);
    setOcrResult(null);
    setBatchResults(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-5 max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950">مسح وتحليل إشعار بنكي (OCR Engine)</h2>
              <p className="text-xs font-semibold text-slate-600">معالجة فورية وتخزين في Supabase Storage مع فحص التكرار الآلي</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-900 text-2xl font-black p-1 cursor-pointer">✕</button>
        </div>

        {/* Mode Selector (Single vs Batch) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-200/80 p-1.5 rounded-2xl gap-2">
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => { setMode('single'); setBatchResults(null); }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${
                mode === 'single' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              مسح إشعار مفرد
            </button>
            <button
              onClick={() => { setMode('batch'); setOcrResult(null); }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 space-x-reverse ${
                mode === 'batch' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>رفع دفعة إشعارات متعددة (Batch)</span>
            </button>
          </div>

          {/* Direction Selector */}
          <div className="flex items-center justify-end space-x-4 space-x-reverse text-xs px-2 py-1">
            <label className="flex items-center space-x-1 space-x-reverse cursor-pointer">
              <input
                type="radio"
                name="dir"
                checked={direction === 'INWARD'}
                onChange={() => setDirection('INWARD')}
                className="text-emerald-700"
              />
              <span className="font-black text-emerald-900">وارد (مستلم)</span>
            </label>
            <label className="flex items-center space-x-1 space-x-reverse cursor-pointer">
              <input
                type="radio"
                name="dir"
                checked={direction === 'OUTWARD'}
                onChange={() => setDirection('OUTWARD')}
                className="text-rose-700"
              />
              <span className="font-black text-rose-900">صادر (مدفوع)</span>
            </label>
          </div>
        </div>

        {mode === 'single' ? (
          <>
            {/* Quick Sample Selector */}
            <div>
              <span className="text-xs font-black text-slate-900 block mb-2">اختر إشعاراً سريعاً من العينات الست الحقيقية:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {samples.map((s, idx) => {
                  const amountLabel = sampleAmounts[s.filename] || `إشعار ${idx + 1}`;
                  return (
                    <button
                      key={s.filename}
                      type="button"
                      onClick={() => handlePickSample(s.filename)}
                      className="p-2 border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 rounded-xl text-center text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <div className="text-[10px] font-black text-emerald-800">بنكك</div>
                      <div className="font-black text-slate-950 text-xs mt-0.5">{amountLabel}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Single Upload & Preview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Image Drop / Preview */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 block">صورة الإشعار:</span>
                {previewUrl ? (
                  <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-900/5 flex flex-col items-center p-3">
                    <img
                      src={previewUrl}
                      alt="Receipt Preview"
                      className="max-h-80 object-contain rounded-xl shadow-sm"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setOcrResult(null);
                      }}
                      className="mt-2 text-xs text-rose-600 font-semibold hover:underline"
                    >
                      إلغاء الصورة واختيار أخرى
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-petroleum-800 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all p-4 text-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">اضغط لرفع صورة إشعار بنكي أو اسحبها هنا</span>
                    <span className="text-[11px] text-slate-400 mt-1">يدعم صيغ JPG، PNG، WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleSingleFileChange(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                  </label>
                )}

                {previewUrl && !ocrResult && (
                  <button
                    onClick={handleScanSingleOcr}
                    disabled={isProcessing}
                    className="w-full bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 space-x-reverse cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
                        <span>جارٍ معالجة الصورة واستخراج البيانات بالـ OCR...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-300" />
                        <span>بدء المسح واستخراج الحقول (OCR)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Right Column: OCR Results & Verification */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-700 block">نتائج التدقيق واستخراج الحقول:</span>

                {ocrResult ? (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1 space-x-reverse">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم تحليل الإشعار بنجاح (دقة {Math.round((ocrResult.ocr.confidence || 0.98) * 100)}%)</span>
                      </span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600">بنك الخرطوم (بنكك)</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          رقم العملية المستخرج (TxID) *
                        </label>
                        <input
                          type="text"
                          value={txNumber}
                          onChange={(e) => setTxNumber(e.target.value)}
                          className="w-full font-mono font-bold text-slate-900 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-800/20"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          المبلغ المالي المستخرج (SDG) *
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full font-bold text-emerald-700 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleum-800/20"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          إسم المستفيد
                        </label>
                        <input
                          type="text"
                          value={beneficiary}
                          onChange={(e) => setBeneficiary(e.target.value)}
                          className="w-full text-slate-800 border border-slate-300 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between font-bold">
                        <span className="text-slate-600">تاريخ ووقت الإشعار المستخرج:</span>
                        <span className="text-emerald-950 font-mono font-black">
                          {ocrResult.ocr.formattedDateTime || (ocrResult.ocr.formattedDate ? `${ocrResult.ocr.formattedDate} (بدون وقت)` : 'غير متوفر')}
                        </span>
                      </div>

                      {ocrResult.ocr.senderAccount && (
                        <div className="text-[11px] text-slate-500">
                          من حساب: <strong className="font-mono">{ocrResult.ocr.senderAccount}</strong>
                        </div>
                      )}

                      {ocrResult.ocr.receiverAccount && (
                        <div className="text-[11px] text-slate-500">
                          إلى حساب: <strong className="font-mono">{ocrResult.ocr.receiverAccount}</strong>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleCommitSingleTransaction}
                      disabled={isProcessing}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 space-x-reverse"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>اعتماد وتسجيل العملية في الحسابات</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-64">
                    <FileCheck className="w-8 h-8 text-slate-300 mb-2" />
                    <span>قم باختيار عينة أو رفع صورة للبدء في الاستخراج الآلي للمبلغ ورقم العملية.</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Batch Upload Mode */
          <div className="space-y-4">
            <label className="border-2 border-dashed border-slate-300 hover:border-teal-700 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all text-center">
              <Layers className="w-10 h-10 text-teal-800 mb-2" />
              <span className="text-sm font-black text-slate-900">اختر عدة صور إشعارات دفعة واحدة (حتى 10 إشعارات)</span>
              <span className="text-xs font-semibold text-slate-600 mt-1">سيتم رفعها سحابياً ومعالجتها بالـ OCR وحفظها مباشرة</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleBatchFilesChange(e.target.files)}
                className="hidden"
              />
            </label>

            {selectedBatchFiles.length > 0 && !batchResults && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>الصور المحددة للمعالجة المجمعة ({selectedBatchFiles.length}):</span>
                  <span className="text-teal-900 font-black">{direction === 'INWARD' ? 'سوف تسجل كـ وارد' : 'سوف تسجل كـ صادر'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedBatchFiles.map((f, i) => (
                    <div key={i} className="text-xs p-2 bg-white rounded-lg border border-slate-200 font-semibold text-slate-800 truncate">
                      📄 {f.name}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleProcessBatchUpload}
                  disabled={isProcessing}
                  className="w-full bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 space-x-reverse cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
                      <span>جارٍ قراءة وتدقيق وحفظ الدفعة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>بدء المعالجة والتسجيل المجمع ({selectedBatchFiles.length} إشعار)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Batch Results Table */}
            {batchResults && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>نتائج المعالجة المجمعة ({batchResults.length} إشعار):</span>
                  <span className="text-emerald-700">تم تسجيل العمليات في الحسابات ✓</span>
                </div>
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                      <tr>
                        <th className="py-2 px-3">الملف</th>
                        <th className="py-2 px-3">رقم العملية</th>
                        <th className="py-2 px-3">المبلغ المستخرج</th>
                        <th className="py-2 px-3">الحالة المحاسبية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchResults.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500">{r.filename}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.ocr?.normalizedTxNumber || '-'}</td>
                          <td className="py-2 px-3 font-bold text-emerald-700">{r.ocr?.amount ? `${r.ocr.amount.toLocaleString()} SDG` : '-'}</td>
                          <td className="py-2 px-3">
                            {r.registration?.status === 'DUPLICATE' ? (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">تكرار محجوب</span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">معتمد ومسجل</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center space-x-2 space-x-reverse">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
