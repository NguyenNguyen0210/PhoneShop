import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Minus, X, Send, Loader2, Headphones, Zap, Tag, ShieldCheck } from 'lucide-react';
import {
  chatbotService,
  getFlashSaleInfo,
  type ChatHistoryItem,
  type ChatbotProduct,
  type StreamChatEvent,
} from '../../services/chatbotService';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCartStore } from '../../stores/useCartStore';

interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatbotProduct[];
  sources?: string[];
  escalate?: boolean;
}

const CONV_KEY = 'phoneshop_chat_conv';

const getConversationId = (): string => {
  let id = localStorage.getItem(CONV_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CONV_KEY, id);
  }
  return id;
};

const DEFAULT_SUGGESTIONS = [
  '⚡ Flash sale nào đang chạy?',
  '🏷️ Voucher nào dùng được hôm nay?',
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
  // Khóa đồng bộ chống double-submit (state async, 2 click nhanh đều lọt guard).
  const sendingRef = useRef(false);
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
    if (!content || isSending || sendingRef.current) return;
    sendingRef.current = true;
    const nextHistory: ChatHistoryItem[] = [
      ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content },
    ];
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setInput('');
    setIsSending(true);
    const convId = getConversationId();
    const appendAssistant = () =>
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    const removeEmptyAssistant = () =>
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content && !(last.products?.length || last.sources?.length)) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    const handleStreamEvent = (got: { tokens: boolean; done: boolean }) => (e: StreamChatEvent) => {
      if (e.type === 'token' && e.text) {
        got.tokens = true;
        const chunk = e.text;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      } else if (e.type === 'products') {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, products: e.products, sources: e.sources, escalate: e.escalate };
          }
          return next;
        });
      } else if (e.type === 'done') {
        got.done = true;
      }
    };
    // Stream thử tối đa 2 lần (gateway local chập chờn); có chữ dở thì giữ.
    const tryStream = async (): Promise<'done' | 'partial' | 'failed'> => {
      if (typeof chatbotService.askStream !== 'function') return 'failed';
      for (let attempt = 0; attempt < 2; attempt++) {
        const got = { tokens: false, done: false };
        appendAssistant();
        try {
          await chatbotService.askStream(content, convId, handleStreamEvent(got));
        } catch {
          // Rớt stream: gỡ placeholder, thử lại 1 lần nếu chưa có chữ nào.
        }
        if (got.done) return 'done';
        removeEmptyAssistant();
        if (got.tokens) return 'partial';
      }
      return 'failed';
    };
    try {
      const streamResult = await tryStream();
      if (streamResult === 'failed') {
        // REST fallback: dính 429 (hỏi dồn) thì chờ 3s thử lại 1 lần rồi mới báo bận.
        let res;
        try {
          res = await chatbotService.ask(content, nextHistory, convId);
        } catch (err: any) {
          if (err?.response?.status !== 429) throw err;
          await new Promise((r) => setTimeout(r, 3000));
          res = await chatbotService.ask(content, nextHistory, convId);
        }
        if (res.conversationId) localStorage.setItem(CONV_KEY, res.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.reply,
            products: res.products,
            sources: res.sources,
            escalate: res.escalate,
          },
        ]);
      }
      // AI có thể đã thêm/xem giỏ hộ user → refresh giỏ local (badge, trang giỏ)
      // để khỏi phải logout/login lại mới thấy.
      useCartStore.getState().syncWithBackend().catch(() => {});
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
      sendingRef.current = false;
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

                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5 px-0.5">
                      {m.sources.includes('flash-sale') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                          <Zap className="w-3 h-3 text-rose-500 fill-rose-500" /> Flash Sale
                        </span>
                      )}
                      {m.sources.includes('voucher') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                          <Tag className="w-3 h-3 text-amber-500" /> Voucher
                        </span>
                      )}
                      {m.sources.includes('warranty') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-sky-500" /> Bảo hành IMEI
                        </span>
                      )}
                    </div>
                  )}

                  {m.products && m.products.length > 0 && (
                    <div className="mt-2 space-y-2 w-full max-w-[90%]">
                      {m.products.map((p) => {
                        const flash = getFlashSaleInfo(p);
                        const isFlash = flash.isFlashSale || (m.sources || []).includes('flash-sale');
                        return (
                          <Link
                            key={p.slug}
                            to={`/products/${p.slug}`}
                            className={`group relative flex items-center gap-3 p-2.5 bg-white border rounded-xl hover:shadow-sm transition-all ${
                              isFlash
                                ? 'border-rose-200 hover:border-rose-300 bg-linear-to-r from-white to-rose-50/20'
                                : 'border-slate-200 hover:border-violet-300'
                            }`}
                          >
                            {isFlash && (
                              <span className="absolute -top-2 -right-1 flex items-center gap-0.5 text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded-full shadow-xs">
                                <Zap className="w-2.5 h-2.5 fill-white" />
                                Flash Sale
                              </span>
                            )}
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-100"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-violet-600 transition-colors">
                                {p.brand ? `${p.brand} ` : ''}
                                {p.name}
                              </p>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <p className={`text-xs font-bold ${isFlash ? 'text-rose-600' : 'text-violet-700'}`}>
                                  {Number(isFlash ? flash.flashPrice : p.price).toLocaleString('vi-VN')}đ
                                </p>
                                {isFlash && flash.originalPrice > flash.flashPrice && (
                                  <p className="text-[11px] text-slate-400 line-through">
                                    {Number(flash.originalPrice).toLocaleString('vi-VN')}đ
                                  </p>
                                )}
                              </div>
                              {p.specsSummary && (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {p.specsSummary}
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
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
