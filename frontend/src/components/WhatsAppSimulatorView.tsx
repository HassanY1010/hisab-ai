import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Bot,
  User,
  ShieldCheck,
  CheckCheck,
  Sparkles,
  Paperclip,
  Smile,
  AlertCircle,
  MessageSquare,
  List,
  ChevronUp,
  ChevronDown,
  Camera,
  X,
  Check
} from 'lucide-react';
import { api, getAssetUrl } from '../api';

export const WhatsAppSimulatorView: React.FC<{ onRefreshData: () => void }> = ({ onRefreshData }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [samples, setSamples] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'conversations' | 'chat'>('chat');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [stagedImageUrl, setStagedImageUrl] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<any | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Exact amounts for the 6 real samples to display on buttons
  const sampleAmounts: Record<string, string> = {
    '1794831071578.jpg': '1,000,000 SDG',
    '1794831071609.jpg': '5,000,000 SDG',
    '1794831071639.jpg': '1,800,000 SDG',
    '1794831071669.jpg': '2,000,000 SDG',
    '1794831071700.jpg': '1,943,000 SDG',
    '1794831071730.jpg': '1,500,000 SDG',
  };

  useEffect(() => {
    loadConversations();
    api.getSamples().then(res => {
      if (res.success) setSamples(res.data);
    }).catch(console.error);
  }, []);

  // Live polling for background queue and batch completion
  useEffect(() => {
    if (!activeBatchId || !activeConv) return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await api.getWhatsAppBatchStatus(activeBatchId);
        if (statusRes.success) {
          setBatchStatus(statusRes.data);
          await loadMessages(activeConv.id);

          if (statusRes.data.progressPercent >= 100 && statusRes.data.summarySent) {
            onRefreshData();
            setTimeout(() => {
              setActiveBatchId(null);
              setBatchStatus(null);
            }, 3500);
          }
        }
      } catch (err) {
        console.warn('Batch poll error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeBatchId, activeConv?.id]);

  const loadConversations = async () => {
    try {
      const res = await api.getWhatsAppConversations();
      if (res.success && res.data.length > 0) {
        setConversations(res.data);
        if (!activeConv) {
          setActiveConv(res.data[0]);
          loadMessages(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await api.getWhatsAppMessages(convId);
      if (res.success) {
        setMessages(res.data);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectConv = (conv: any) => {
    setActiveConv(conv);
    loadMessages(conv.id);
    setMobileTab('chat');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeConv || isProcessing) return;

    setIsProcessing(true);
    setInputText('');

    try {
      const res = await api.sendWhatsAppMessage(activeConv.id, text.trim());
      if (res && res.success !== false) {
        await loadMessages(activeConv.id);
        onRefreshData();
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Non-blocking rapid sample sender: immediately dispatches to background queue
   * User can click multiple samples continuously without waiting!
   */
  const handleSendSampleImage = async (filename: string) => {
    if (!activeConv) return;

    try {
      const imgRes = await fetch(getAssetUrl(`/samples/${filename}`));
      const blob = await imgRes.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });

      const res = await api.sendWhatsAppMessage(activeConv.id, '', file, activeBatchId || undefined);
      if (res && res.success !== false) {
        if (res.data?.batchId) {
          setActiveBatchId(res.data.batchId);
        }
        await loadMessages(activeConv.id);
      }
    } catch (err: any) {
      console.error(`خطأ أثناء إرسال الإشعار: ${err.message}`);
    }
  };

  /**
   * Bulk launcher: sends all 6 real samples at once in a single batch
   */
  const handleSendAllSamples = async () => {
    if (!activeConv || samples.length === 0 || isSending) return;
    setIsSending(true);

    try {
      // Fetch all sample files in parallel for instant bulk staging
      const files: File[] = await Promise.all(
        samples.map(async (s) => {
          const imgRes = await fetch(getAssetUrl(`/samples/${s.filename}`));
          const blob = await imgRes.blob();
          return new File([blob], s.filename, { type: 'image/jpeg' });
        })
      );

      const res = await api.sendWhatsAppBatchMessages(activeConv.id, files);
      if (res && res.success !== false) {
        if (res.data?.batchId) {
          setActiveBatchId(res.data.batchId);
        }
        await loadMessages(activeConv.id);
        onRefreshData();
      }
    } catch (err: any) {
      alert(`فشل إرسال الدفعة: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setStagedFiles(files);
    if (files.length === 1) {
      setStagedImageFile(files[0]);
      setStagedImageUrl(URL.createObjectURL(files[0]));
    }
  };

  const confirmSendStagedFiles = async () => {
    if (stagedFiles.length === 0 || !activeConv || isSending) return;
    setIsSending(true);
    const filesToSend = [...stagedFiles];
    cancelStagedImage();

    try {
      if (filesToSend.length === 1) {
        const res = await api.sendWhatsAppMessage(activeConv.id, '', filesToSend[0], activeBatchId || undefined);
        if (res?.data?.batchId) setActiveBatchId(res.data.batchId);
      } else {
        const res = await api.sendWhatsAppBatchMessages(activeConv.id, filesToSend);
        if (res?.data?.batchId) setActiveBatchId(res.data.batchId);
      }
      await loadMessages(activeConv.id);
      onRefreshData();
    } catch (err: any) {
      alert(`فشل رفع الإشعارات: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const cancelStagedImage = () => {
    if (stagedImageUrl) {
      URL.revokeObjectURL(stagedImageUrl);
    }
    setStagedFiles([]);
    setStagedImageFile(null);
    setStagedImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const quickCommands = [
    'الإجمالي',
    'إجمالي الوارد',
    'إجمالي الصادر',
    'عدد العمليات',
    'تقرير اليوم',
    'تقرير الأسبوع',
    'آخر العمليات',
    'كشف التكرار',
    'تصدير Excel'
  ];

  const renderMessageContent = (m: any) => {
    let meta: any = null;
    try {
      if (m.metadata) meta = JSON.parse(m.metadata);
    } catch {}

    // 1. Batch Live Progress Card
    if (meta?.type === 'BATCH_PROGRESS' || m.text.includes('جاري استقبال ومعالجة الإشعارات')) {
      const total = meta?.total || (() => {
        const match = m.text.match(/من\s+(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })();
      const completed = meta?.completed !== undefined ? meta.completed : (() => {
        const match = m.text.match(/معالجة:\s*\*?(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })();
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return (
        <div className="space-y-2.5 py-1 min-w-[240px] sm:min-w-[280px]">
          <div className="flex items-center space-x-2 space-x-reverse text-emerald-950 font-black text-xs sm:text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
            <span>⏳ جاري استقبال ومعالجة الإشعارات...</span>
          </div>
          <div className="w-full bg-emerald-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-600 to-teal-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-black text-emerald-950">
            <span>تمت معالجة {completed} من {total}</span>
            <span className="bg-emerald-200/90 px-2 py-0.5 rounded-md font-mono">{pct}%</span>
          </div>
          <div className="text-[10px] text-emerald-800 font-semibold flex items-center space-x-1 space-x-reverse">
            <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>يتم استخراج الأسماء والأرقام والمبالغ والتحقق من التكرار آلياً...</span>
          </div>
        </div>
      );
    }

    // 2. Batch Table Summary Card (Matching user reference image)
    if (meta?.type === 'BATCH_TABLE_SUMMARY' || m.text.includes('| # |')) {
      let rows: Array<{ index: number; name: string; txNumber: string; amount: number | string }> = meta?.rows || [];
      let totalCount = meta?.totalReceived || 0;
      let totalAmount = meta?.totalAmount ? meta.totalAmount.toLocaleString('en-US') + ' SDG' : '';
      let duplicateCount = meta?.duplicateCount || 0;
      let reviewCount = meta?.reviewCount || 0;
      let failedCount = meta?.failedCount || 0;

      // Fallback: parse markdown table if metadata was not structured
      if (rows.length === 0) {
        const lines = m.text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('|') && !trimmed.includes('|---|') && !trimmed.includes('| # |')) {
            const cols = trimmed.split('|').map((c: string) => c.trim()).filter(Boolean);
            if (cols.length >= 4) {
              rows.push({
                index: parseInt(cols[0], 10) || rows.length + 1,
                name: cols[1] || 'غير متوفر',
                txNumber: cols[2] || '',
                amount: cols[3] || '0'
              });
            }
          } else if (trimmed.includes('الإجمالي:') || trimmed.includes('المجموع:')) {
            const match = trimmed.match(/الإجمالي:?\s*\*?([0-9,]+(?:\.\d+)?)\s*(?:SDG)?/i);
            if (match) totalAmount = match[1] + ' SDG';
          } else if (trimmed.includes('عدد الإشعارات:')) {
            const match = trimmed.match(/عدد الإشعارات:?\s*\*?(\d+)/);
            if (match) totalCount = parseInt(match[1], 10);
          } else if (trimmed.includes('إشعارات مكررة')) {
            const match = trimmed.match(/إشعارات مكررة.*?(\d+)/);
            if (match) duplicateCount = parseInt(match[1], 10);
          } else if (trimmed.includes('تحتاج مراجعة')) {
            const match = trimmed.match(/تحتاج مراجعة.*?(\d+)/);
            if (match) reviewCount = parseInt(match[1], 10);
          }
        }
      }

      if (totalCount === 0) totalCount = rows.length;

      return (
        <div className="space-y-3 py-1 max-w-full">
          {/* Header matching image and specifications */}
          <div className="text-right border-b border-emerald-200/60 pb-2 space-y-1.5">
            <div className="text-sm font-black text-slate-950 flex items-center space-x-1.5 space-x-reverse">
              <span className="text-emerald-700">📋</span>
              <span>حساب إشعارات الدفعة</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/50">
              <div>عدد الصور المستلمة: <span className="font-black text-slate-950">{totalCount}</span></div>
              <div>العمليات المسجلة: <span className="font-black text-emerald-900">{rows.length}</span></div>
              <div>الإشعارات المكررة: <span className={`font-black ${duplicateCount > 0 ? 'text-amber-700 underline' : 'text-slate-900'}`}>{duplicateCount}</span></div>
              <div>تحتاج مراجعة: <span className={`font-black ${(reviewCount + failedCount) > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{reviewCount + failedCount}</span></div>
            </div>
          </div>

          {/* Structured Table with Green Header */}
          {rows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs bg-white">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#10593b] text-white font-black text-[11px]">
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5 text-right min-w-[120px]">الاسم</th>
                    <th className="p-2.5 text-center min-w-[90px]">رقم الإشعار</th>
                    <th className="p-2.5 text-left min-w-[90px]">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 hover:bg-emerald-50/50 transition-colors ${
                        i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                      }`}
                    >
                      <td className="p-2 text-center text-slate-500 font-bold text-[11px]">{r.index}</td>
                      <td className="p-2 font-bold text-slate-900 truncate max-w-[140px]" title={r.name}>{r.name}</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-700 text-[11px] dir-ltr">{r.txNumber}</td>
                      <td className="p-2 text-left font-black text-slate-950 font-mono text-xs">
                        {typeof r.amount === 'number' ? r.amount.toLocaleString('en-US') : r.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-100/70 border-t-2 border-emerald-600 font-black text-slate-950">
                    <td colSpan={3} className="p-2.5 text-right font-black text-emerald-950 text-xs">المجموع</td>
                    <td className="p-2.5 text-left font-black text-emerald-900 text-xs sm:text-sm font-mono whitespace-nowrap">
                      {totalAmount || '0 SDG'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 font-bold">
              ⚠️ تنبيه: لم يتم تسجيل أي إشعارات جديدة في هذه الدفعة (كافة الإشعارات محجوبة أو مكررة).
            </div>
          )}

          {/* Warning Notes for Duplicates / Review */}
          {(duplicateCount > 0 || reviewCount > 0 || failedCount > 0) && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-2.5 space-y-1 text-[11px] font-bold text-amber-950">
              <div className="font-black text-amber-900 flex items-center space-x-1 space-x-reverse">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>ملاحظات الدفعة:</span>
              </div>
              {duplicateCount > 0 && (
                <div className="flex items-center space-x-1 space-x-reverse text-amber-900 pr-4">
                  <span>▫️ إشعارات مكررة (تم حجبها):</span>
                  <span className="font-black underline">{duplicateCount}</span>
                </div>
              )}
              {reviewCount > 0 && (
                <div className="flex items-center space-x-1 space-x-reverse text-amber-900 pr-4">
                  <span>▫️ إشعارات تحتاج مراجعة:</span>
                  <span className="font-black">{reviewCount}</span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center space-x-1 space-x-reverse text-rose-900 pr-4">
                  <span>▫️ إشعارات تعذر استخراجها:</span>
                  <span className="font-black">{failedCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Copy Plain Text WhatsApp message button */}
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(m.text);
                alert('تم نسخ كشف الدفعة بنص واتساب!');
              }}
              className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-md px-2 py-0.5 flex items-center space-x-1 space-x-reverse transition-colors cursor-pointer"
              title="نسخ جدول الدفعة بصيغة نص واتساب"
            >
              <span>📋</span>
              <span>نسخ نص الجدول</span>
            </button>
          </div>
        </div>
      );
    }

    // 3. Default text message
    return (
      <div className="whitespace-pre-line leading-relaxed font-semibold">
        {m.text}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Simulation Banner Notice */}
      <div className="bg-emerald-50 border border-emerald-300 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-bold text-emerald-950 shadow-xs">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Bot className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>محاكي واتساب التفاعلي الذكي - متصل فعلياً بقاعدة PostgreSQL ومحرك الـ OCR السحابي</span>
        </div>
        <span className="bg-emerald-200 text-emerald-950 px-2.5 py-1 rounded-full text-[11px] font-black shrink-0">
          محاكي تجريبي حي
        </span>
      </div>

      {/* Mobile Switcher (Visible only on mobile devices) */}
      <div className="flex md:hidden bg-slate-200 p-1 rounded-xl">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 space-x-reverse transition-all ${
            mobileTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>شاشة المحادثة ({activeConv?.name || 'البوت'})</span>
        </button>
        <button
          onClick={() => setMobileTab('conversations')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 space-x-reverse transition-all ${
            mobileTab === 'conversations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <List className="w-4 h-4" />
          <span>القنوات والعينات</span>
        </button>
      </div>

      {/* Main WhatsApp Window */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[calc(100dvh-12rem)] min-h-[480px] max-h-[820px]">
        {/* Left Sidebar: Conversations List & Sample Launchers */}
        <div className={`border-l border-slate-200 bg-slate-50 flex flex-col h-full min-h-0 ${
          mobileTab === 'conversations' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <span className="font-extrabold text-slate-900 text-sm">محادثات البوت المحاسبي</span>
            <span className="text-[11px] bg-emerald-100 text-emerald-950 font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
              متصل 🟢
            </span>
          </div>

          <div className="divide-y divide-slate-200 overflow-y-auto flex-1">
            {conversations.map((conv) => {
              const isSelected = activeConv?.id === conv.id;
              const isDefaultInward = conv.direction === 'INWARD';
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`p-3.5 flex items-center space-x-3 space-x-reverse cursor-pointer transition-colors ${
                    isSelected ? 'bg-white border-r-4 border-r-emerald-700 shadow-xs' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-white shadow-sm shrink-0 ${
                    isDefaultInward ? 'bg-gradient-to-br from-emerald-700 to-teal-800' : 'bg-gradient-to-br from-rose-600 to-red-800'
                  }`}>
                    {isDefaultInward ? 'و' : 'ص'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 truncate">{conv.name}</span>
                      <span className="text-[10px] font-bold text-slate-500">الآن</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 truncate mt-0.5">
                      قناة تحويلات {isDefaultInward ? 'الوارد المستلم' : 'الصادر المدفوع'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sample Images Quick Launcher */}
          <div className="p-3 bg-white border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-900 block mb-2 flex items-center space-x-1 space-x-reverse">
              <Sparkles className="w-3.5 h-3.5 text-teal-800 shrink-0" />
              <span>إرسال إشعار بنكي سريع (العينات الست):</span>
            </span>

            {/* Bulk Send All 6 Samples Button */}
            <button
              type="button"
              disabled={isSending}
              onClick={handleSendAllSamples}
              className="w-full mb-2.5 p-2 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-black text-xs shadow-xs flex items-center justify-center space-x-1.5 space-x-reverse transition-all cursor-pointer active:scale-98"
              title="إرسال جميع العينات الـ 6 في دفعة واحدة لاختبار المعالجة المتزامنة"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>{isSending ? 'جاري إرسال الدفعة...' : '🚀 إرسال كل العينات الـ 6 دفعة واحدة'}</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {samples.map((s, idx) => {
                const label = sampleAmounts[s.filename] || `صورة ${idx + 1}`;
                return (
                  <button
                    key={s.filename}
                    onClick={() => {
                      handleSendSampleImage(s.filename);
                      setMobileTab('chat');
                    }}
                    className="text-right text-[11px] p-2 rounded-xl border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-all font-bold text-slate-900 truncate shadow-2xs cursor-pointer"
                    title={`إرسال سريع: ${label}`}
                  >
                    📄 {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className={`md:col-span-2 flex flex-col h-full min-h-0 bg-[#f0f2f5] relative ${
          mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Chat Header */}
          <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                <Bot className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black text-slate-950">{activeConv?.name || 'محادثة البوت'}</div>
                <div className="text-[11px] text-emerald-800 font-bold">البوت المحاسبي جاهز لاستقبال الإشعارات والأوامر</div>
              </div>
            </div>

            {/* Switch to Channel button on mobile */}
            <button
              onClick={() => setMobileTab('conversations')}
              className="md:hidden text-xs font-bold text-slate-700 bg-white border border-slate-300 px-2.5 py-1 rounded-lg"
            >
              تغيير القناة
            </button>
          </div>

          {/* Live Background Batch Processing Indicator */}
          {batchStatus && batchStatus.progressPercent < 100 && (
            <div className="bg-emerald-50 border-b border-emerald-300 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-bold text-emerald-950 shrink-0 shadow-2xs">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
                <span>⚡ جاري معالجة الدفعة في الخلفية: {batchStatus.completedJobs} من {batchStatus.totalJobs} ({batchStatus.progressPercent}%)</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse text-[11px] font-black">
                <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">مسجل: {batchStatus.registeredCount}</span>
                {batchStatus.duplicateCount > 0 && (
                  <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">مكرر: {batchStatus.duplicateCount}</span>
                )}
                {batchStatus.reviewCount > 0 && (
                  <span className="bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-md">مراجعة: {batchStatus.reviewCount}</span>
                )}
                {batchStatus.failedCount > 0 && (
                  <span className="bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-md">فشل: {batchStatus.failedCount}</span>
                )}
              </div>
            </div>
          )}

          {/* Quick Command Pills */}
          <div className="bg-white/90 border-b border-slate-200 px-3 py-2 overflow-x-auto flex items-center space-x-1.5 space-x-reverse shrink-0">
            <span className="text-[11px] font-black text-slate-600 shrink-0 ml-1">أوامر سريعة:</span>
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                disabled={isProcessing}
                onClick={() => handleSendMessage(cmd)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-950 text-slate-800 border border-slate-300 whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Quick Floating Scroll Controls (Jump to top / bottom) */}
          <div className="absolute left-3 bottom-20 z-20 flex flex-col space-y-1.5">
            <button
              type="button"
              onClick={scrollToTop}
              className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-slate-300 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
              title="الصعود لأول الرسائل"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="w-8 h-8 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
              title="النزول لآخر رسالة"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            {messages.map((m) => {
              const isUser = m.sender === 'USER';
              return (
                <div key={m.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm shadow-xs ${
                      isUser
                        ? 'bg-white text-slate-900 rounded-tr-none border border-slate-200'
                        : 'bg-[#d9fdd3] text-slate-950 rounded-tl-none border border-emerald-300'
                    }`}
                  >
                    {/* Media Image If Exists */}
                    {(m.mediaUrl || m.mediaPath) && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 max-h-56">
                        <img
                          src={getAssetUrl(m.mediaUrl || m.mediaPath)}
                          alt="إشعار بنكي"
                          className="w-full h-auto object-contain cursor-pointer"
                          onClick={() => window.open(getAssetUrl(m.mediaUrl || m.mediaPath), '_blank')}
                        />
                      </div>
                    )}

                    {/* Message Body */}
                    {renderMessageContent(m)}

                    {/* Metadata & Timestamp */}
                    <div className="flex items-center justify-end space-x-1 space-x-reverse mt-1 text-[10px] font-bold text-slate-500">
                      <span>{new Date(m.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      {!isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex justify-end">
                <div className="bg-[#d9fdd3] text-slate-900 border border-emerald-300 text-xs px-4 py-2.5 rounded-2xl rounded-bl-xs shadow-xs flex items-center space-x-2 space-x-reverse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
                  <span className="font-bold">جاري تحليل الإشعار بالذكاء الاصطناعي وOCR واستخراج الأرقام...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Staged Image / Batch Preview Floating Banner */}
          {stagedFiles.length > 0 && (
            <div className="bg-emerald-50 border-t-2 border-emerald-500 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
                {stagedImageUrl ? (
                  <img
                    src={stagedImageUrl}
                    alt="معاينة الإشعار"
                    className="w-12 h-12 object-cover rounded-lg border border-emerald-300 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                    {stagedFiles.length} 📄
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-black text-emerald-950 block truncate">
                    {stagedFiles.length === 1
                      ? (stagedFiles[0].name || 'إشعار تحويل بنكي')
                      : `دفعة إشعارات متعددة (${stagedFiles.length} صور مختارة)`}
                  </span>
                  <span className="text-[11px] text-emerald-800 font-bold">
                    {stagedFiles.length === 1
                      ? 'جاهز للمسح والتحليل بالذكاء الاصطناعي'
                      : 'سيتم وضع جميع الإشعارات في قائمة المعالجة بالتوازي'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 space-x-reverse shrink-0">
                <button
                  type="button"
                  onClick={confirmSendStagedFiles}
                  disabled={isSending}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3 py-2 rounded-xl flex items-center space-x-1 space-x-reverse shadow-xs cursor-pointer touch-target"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'جاري الإرسال...' : (stagedFiles.length > 1 ? `إرسال الدفعة (${stagedFiles.length})` : 'تأكيد وإرسال')}</span>
                </button>
                <button
                  type="button"
                  onClick={cancelStagedImage}
                  className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer touch-target flex items-center justify-center"
                  title="إلغاء الاختيار"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-2 sm:p-3 bg-white border-t border-slate-200 sticky bottom-0 z-10 pb-safe">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse"
            >
              {/* Gallery / File Picker (Multiple selection supported) */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Camera Direct Capture (Mobile Supported) */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="p-2 sm:p-2.5 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-slate-100 transition-colors shrink-0 touch-target flex items-center justify-center cursor-pointer"
                title="إرفاق صورة إشعار من المعرض أو الملفات"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessing}
                className="p-2 sm:p-2.5 rounded-xl text-slate-700 hover:text-emerald-800 hover:bg-slate-100 transition-colors shrink-0 touch-target flex items-center justify-center cursor-pointer"
                title="التقاط صورة مباشرة بكاميرا الهاتف"
              >
                <Camera className="w-5 h-5 text-emerald-800" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب استفساراً محاسبياً (الإجمالي، تقرير اليوم)..."
                disabled={isProcessing}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="p-2.5 sm:p-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white transition-all shadow-sm shrink-0 cursor-pointer touch-target flex items-center justify-center"
                title="إرسال"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
