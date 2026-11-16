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
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [stagedImageUrl, setStagedImageUrl] = useState<string | null>(null);

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

  const handleSendSampleImage = async (filename: string) => {
    if (!activeConv || isProcessing) return;
    setIsProcessing(true);

    try {
      const imgRes = await fetch(getAssetUrl(`/samples/${filename}`));
      const blob = await imgRes.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });

      const res = await api.sendWhatsAppMessage(activeConv.id, '', file);
      if (res && res.success !== false) {
        await loadMessages(activeConv.id);
        onRefreshData();
      }
    } catch (err: any) {
      alert(`خطأ أثناء معالجة الإشعار: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStagedImageFile(file);
    setStagedImageUrl(URL.createObjectURL(file));
  };

  const confirmSendStagedImage = async () => {
    if (!stagedImageFile || !activeConv || isProcessing) return;
    setIsProcessing(true);
    const fileToSend = stagedImageFile;
    cancelStagedImage();

    try {
      const res = await api.sendWhatsAppMessage(activeConv.id, '', fileToSend);
      if (res && res.success !== false) {
        await loadMessages(activeConv.id);
        onRefreshData();
      }
    } catch (err: any) {
      alert(`فشل رفع الإشعار: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelStagedImage = () => {
    if (stagedImageUrl) {
      URL.revokeObjectURL(stagedImageUrl);
    }
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
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {samples.map((s, idx) => {
                const label = sampleAmounts[s.filename] || `صورة ${idx + 1}`;
                return (
                  <button
                    key={s.filename}
                    disabled={isProcessing}
                    onClick={() => {
                      handleSendSampleImage(s.filename);
                      setMobileTab('chat');
                    }}
                    className="text-right text-[11px] p-2 rounded-xl border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 transition-all font-bold text-slate-900 truncate shadow-2xs cursor-pointer"
                    title={`إرسال ${label}`}
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
                    {m.mediaPath && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 max-h-56">
                        <img
                          src={getAssetUrl(m.mediaPath)}
                          alt="إشعار بنكي"
                          className="w-full h-auto object-contain cursor-pointer"
                          onClick={() => window.open(getAssetUrl(m.mediaPath), '_blank')}
                        />
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="whitespace-pre-line leading-relaxed font-semibold">
                      {m.text}
                    </div>

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

          {/* Staged Image Preview Floating Banner */}
          {stagedImageUrl && (
            <div className="bg-emerald-50 border-t-2 border-emerald-500 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
                <img
                  src={stagedImageUrl}
                  alt="معاينة الإشعار"
                  className="w-12 h-12 object-cover rounded-lg border border-emerald-300 shadow-2xs shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-black text-emerald-950 block truncate">
                    {stagedImageFile?.name || 'إشعار تحويل بنكي'}
                  </span>
                  <span className="text-[11px] text-emerald-800 font-bold">
                    جاهز للمسح والتحليل بالذكاء الاصطناعي
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 space-x-reverse shrink-0">
                <button
                  type="button"
                  onClick={confirmSendStagedImage}
                  disabled={isProcessing}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3 py-2 rounded-xl flex items-center space-x-1 space-x-reverse shadow-xs cursor-pointer touch-target"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>تأكيد وإرسال</span>
                </button>
                <button
                  type="button"
                  onClick={cancelStagedImage}
                  className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer touch-target flex items-center justify-center"
                  title="إلغاء الصورة"
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
              {/* Gallery / File Picker */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
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
