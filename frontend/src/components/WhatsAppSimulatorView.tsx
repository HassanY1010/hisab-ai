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
  AlertCircle
} from 'lucide-react';
import { api, getAssetUrl } from '../api';

export const WhatsAppSimulatorView: React.FC<{ onRefreshData: () => void }> = ({ onRefreshData }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [samples, setSamples] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeConv || isProcessing) return;

    setIsProcessing(true);
    setInputText('');

    try {
      await api.sendWhatsAppMessage(activeConv.id, text.trim());
      await loadMessages(activeConv.id);
      onRefreshData();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendSampleImage = async (sampleFilename: string) => {
    if (!activeConv || isProcessing) return;
    setIsProcessing(true);

    try {
      const imgRes = await fetch(getAssetUrl(`/samples/${sampleFilename}`));
      const blob = await imgRes.blob();
      const file = new File([blob], sampleFilename, { type: 'image/jpeg' });

      await api.sendWhatsAppMessage(activeConv.id, '', file);
      await loadMessages(activeConv.id);
      onRefreshData();
    } catch (err: any) {
      alert(`خطأ في إرسال صورة العينة: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv || isProcessing) return;
    setIsProcessing(true);

    try {
      await api.sendWhatsAppMessage(activeConv.id, '', file);
      await loadMessages(activeConv.id);
      onRefreshData();
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-800">
        <div className="flex items-center space-x-2 space-x-reverse font-semibold">
          <Bot className="w-4 h-4 text-emerald-600" />
          <span>بيئة محاكاة تفاعلية لواتساب (WhatsApp Simulator) - متصلة فعلياً بقاعدة PostgreSQL ومحرك الـ OCR</span>
        </div>
        <span className="bg-emerald-200/60 px-2 py-0.5 rounded text-[11px] font-bold">محاكي تجريبي آمن</span>
      </div>

      {/* Main WhatsApp Window */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[750px]">
        {/* Left/Right Sidebar: Conversations List */}
        <div className="border-l border-slate-200 bg-slate-50 flex flex-col h-full">
          <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">محادثات البوت المحاسبي</span>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
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
                    isSelected ? 'bg-white border-r-4 border-r-emerald-600 shadow-xs' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                    isDefaultInward ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-500 to-red-700'
                  }`}>
                    {isDefaultInward ? 'و' : 'ص'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">{conv.name}</span>
                      <span className="text-[10px] text-slate-400">الآن</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      قناة تحويلات {isDefaultInward ? 'الوارد المستلم' : 'الصادر المدفوع'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sample Images Quick Launcher */}
          <div className="p-3 bg-white border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 block mb-2 flex items-center space-x-1 space-x-reverse">
              <Sparkles className="w-3.5 h-3.5 text-petroleum-700" />
              <span>إرسال إشعار بنكي من العينات الست:</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {samples.map((s, idx) => (
                <button
                  key={s.filename}
                  disabled={isProcessing}
                  onClick={() => handleSendSampleImage(s.filename)}
                  className="text-right text-[11px] p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all font-mono truncate"
                  title={`إرسال صورة ${s.filename}`}
                >
                  📄 صورة {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="md:col-span-2 flex flex-col h-full bg-[#efeae2]/40 relative">
          {/* Chat Header */}
          <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 rounded-full bg-petroleum-800 text-white flex items-center justify-center font-bold text-sm">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{activeConv?.name || 'محادثة البوت'}</div>
                <div className="text-[11px] text-emerald-600 font-medium">البوت المحاسبي جاهز لاستقبال الإشعارات والأوامر</div>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              قناة: <strong className={activeConv?.direction === 'INWARD' ? 'text-emerald-700' : 'text-rose-700'}>
                {activeConv?.direction === 'INWARD' ? 'وارد' : 'صادر'}
              </strong>
            </div>
          </div>

          {/* Quick Command Chips */}
          <div className="p-2 bg-white/70 border-b border-slate-200 flex items-center space-x-1.5 space-x-reverse overflow-x-auto text-[11px]">
            <span className="text-slate-400 shrink-0 font-medium">أوامر سريعة:</span>
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                disabled={isProcessing}
                onClick={() => handleSendMessage(cmd)}
                className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 font-medium px-2.5 py-1 rounded-full shrink-0 border border-slate-200 transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isUser = msg.sender === 'USER';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs space-y-1.5 ${
                      isUser
                        ? 'bg-white text-slate-900 border border-slate-200 rounded-br-xs'
                        : 'bg-[#d9fdd3] text-slate-900 rounded-bl-xs'
                    }`}
                  >
                    {msg.mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200/80 mb-2">
                        <img
                          src={getAssetUrl(msg.mediaUrl)}
                          alt="Receipt upload"
                          className="max-h-48 object-contain w-full bg-slate-900/5"
                        />
                      </div>
                    )}

                    <div className="whitespace-pre-wrap leading-relaxed font-sans">
                      {msg.text}
                    </div>

                    <div className="text-[10px] text-slate-400 text-left flex items-center justify-end space-x-1 space-x-reverse">
                      <span>{new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      {isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-600 inline" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex justify-end">
                <div className="bg-[#d9fdd3] text-slate-700 text-xs px-4 py-2.5 rounded-2xl rounded-bl-xs shadow-xs flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                  <span>البوت يقوم بقراءة الإشعار وتحليل الحقول بالـ OCR...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2 space-x-reverse"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="إرفاق صورة إشعار بنكي"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب أمراً (مثل: الإجمالي، تقرير اليوم) أو أرفق إشعاراً..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />

              <button
                type="submit"
                disabled={isProcessing || !inputText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-sm"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
