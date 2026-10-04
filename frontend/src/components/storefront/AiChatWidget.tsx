import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Minus, X, Send, Loader2, Headphones } from 'lucide-react';
import { chatbotService, type ChatHistoryItem, type ChatbotProduct } from '../../services/chatbotService';
import { useAuthStore } from '../../stores/useAuthStore';

interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatbotProduct[];
  escalate?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  'iPhone dưới 20 triệu còn hàng?',
  'Đơn hàng của tôi đâu rồi?',
  'Tra bảo hành bằng IMEI?',
  'Thanh toán VNPay lỗi phải làm sao?',
];

export const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    chatbotService.getSuggestions().then(setSuggestions).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [isOpen, messages.length]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isSending) return;
    const nextHistory: ChatHistoryItem[] = [
      ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content },
    ];
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setInput('');
    setIsSending(true);
    try {
      const res = await chatbotService.ask(content, nextHistory);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, products: res.products, escalate: res.escalate },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Tôi đang hơi bận một chút. Bạn thử lại sau nhé, hoặc chat với nhân viên hỗ trợ ở khung bên dưới.',
          escalate: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {!isOpen ? (
        <div className="relative group">
          <div
            role="tooltip"
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
          >
            Hỏi AI PhoneShop
            <span className="absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-slate-900" />
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title="Hỏi AI PhoneShop"
            aria-label="Hỏi AI PhoneShop"
            className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-violet-300"
          >
            <Sparkles className="w-7 h-7" />
          </button>
        </div>
      ) : (
        <div
          role="dialog"
          aria-label="Trợ lý AI PhoneShop"
          className="w-[380px] h-[520px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">Trợ lý AI PhoneShop</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-violet-100 font-medium">Luôn sẵn sàng giúp bạn</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Thu nhỏ"
                aria-label="Thu nhỏ"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Đóng"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.length === 0 && (
                <div className="text-center pt-2">
                  <p className="text-sm font-semibold text-slate-800">Xin chào{user ? ` ${user.fullName || ''}` : ''}!</p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Hỏi về máy, giá và ưu đãi, giao hàng, thanh toán, bảo hành. Đăng nhập để xem đơn của bạn.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full hover:bg-violet-100 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm shadow-sm'
                        : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm shadow-xs border border-slate-200/60'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>

                  {m.products && m.products.length > 0 && (
                    <div className="mt-2 space-y-2 w-full max-w-[90%]">
                      {m.products.map((p) => (
                        <Link
                          key={p.slug}
                          to={`/products/${p.slug}`}
                          className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all"
                        >
                          <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {p.brand ? `${p.brand} ` : ''}{p.name}
                            </p>
                            <p className="text-xs font-bold text-violet-700">
                              {Number(p.price).toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.escalate && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Muốn gặp nhân viên? Nhấn vào khung chat hỗ trợ ở góc dưới nhé.</span>
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex items-center gap-2 text-slate-400 text-xs px-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang soạn câu trả lời...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="p-3 border-t border-slate-200 bg-white flex items-end gap-2 shrink-0"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Nhắn câu hỏi của bạn... Ví dụ: iPhone dưới 20 triệu còn hàng không?"
                rows={1}
                disabled={isSending}
                className="flex-1 max-h-24 min-h-[38px] resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                aria-label="Gửi tin nhắn"
                className="h-[38px] w-[38px] flex items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
