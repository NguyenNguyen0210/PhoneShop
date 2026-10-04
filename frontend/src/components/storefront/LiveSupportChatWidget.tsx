import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Minus, X, Send, Loader2, Headphones, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ticketService } from '../../services/ticketService';
import type { Ticket, TicketCategory, TicketMessage } from '../../types/ticket';

const extractItems = (res: any): Ticket[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.tickets)) return res.tickets;
  if (Array.isArray(res.data)) return res.data;
  return [];
};

export const LiveSupportChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Starter form state
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('PRODUCT_INQUIRY');
  const [initialMessage, setInitialMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch active ticket when widget opens and user is logged in
  useEffect(() => {
    if (!isOpen) return;

    if (!user) {
      setActiveTicket(null);
      setIsLoadingTicket(false);
      return;
    }

    let isMounted = true;

    const fetchActiveTicket = async () => {
      setIsLoadingTicket(true);
      setError(null);
      try {
        const res = await ticketService.getMyTickets({ limit: 10 });
        const tickets = extractItems(res);
        const openTicket = tickets.find(
          (t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
        );

        if (openTicket) {
          const detail = await ticketService.getTicketDetail(openTicket.id);
          if (isMounted) {
            setActiveTicket(detail || openTicket);
          }
        } else {
          if (isMounted) {
            setActiveTicket(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load live chat tickets:', err);
          setError('Không thể tải dữ liệu hỗ trợ. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingTicket(false);
        }
      }
    };

    fetchActiveTicket();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  // 2. Smart Polling: poll ticket details every 3.5 seconds when chat is open and ticket exists
  useEffect(() => {
    if (!isOpen || !user || !activeTicket?.id) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const detail = await ticketService.getTicketDetail(activeTicket.id);
        if (detail) {
          setActiveTicket(detail);
        }
      } catch (err) {
        // Silently handle polling failure
        console.error('Ticket polling error:', err);
      }
    }, 3500);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOpen, user, activeTicket?.id]);

  // 3. Auto-scroll to bottom ref when messages update or chat opens
  useEffect(() => {
    if (isOpen && activeTicket) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [isOpen, activeTicket?.messages?.length]);

  // Handle starting a new conversation
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = initialMessage.trim();
    if (!trimmedMessage || isStarting) return;

    setIsStarting(true);
    setError(null);
    try {
      const payload = {
        title: '[Live Chat] Hỗ trợ khách hàng',
        category: selectedCategory,
        message: trimmedMessage,
      };
      const created = await ticketService.createTicket(payload);
      const ticketId = created?.id;
      if (ticketId) {
        const detail = await ticketService.getTicketDetail(ticketId);
        setActiveTicket(detail || created);
      } else {
        setActiveTicket(created);
      }
      setInitialMessage('');
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      const apiMessage = err?.response?.data?.message;
      const displayMsg = Array.isArray(apiMessage)
        ? apiMessage.join(', ')
        : apiMessage || 'Không thể tạo yêu cầu hỗ trợ. Vui lòng thử lại.';
      setError(displayMsg);
    } finally {
      setIsStarting(false);
    }
  };

  // Handle sending reply message
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedReply = replyText.trim();
    if (!trimmedReply || isSending || !activeTicket?.id) return;

    setIsSending(true);
    try {
      await ticketService.replyTicket(activeTicket.id, { message: trimmedReply });
      setReplyText('');
      const detail = await ticketService.getTicketDetail(activeTicket.id);
      if (detail) {
        setActiveTicket(detail);
      }
    } catch (err: any) {
      console.error('Failed to reply ticket:', err);
      try {
        const detail = await ticketService.getTicketDetail(activeTicket.id);
        if (detail) setActiveTicket(detail);
      } catch (_) {}
    } finally {
      setIsSending(false);
    }
  };

  // Filter internal messages
  const visibleMessages = (activeTicket?.messages || []).filter(
    (msg: any) => !msg.isInternal && !msg.isInternalNote
  );

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <div className="relative group">
          {/* Tooltip */}
          <div
            role="tooltip"
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none transition-all duration-200"
          >
            Cần hỗ trợ? Chat ngay
            <span className="absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-slate-900" />
          </div>

          {/* Collapsed Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title="Cần hỗ trợ? Chat ngay"
            aria-label="Cần hỗ trợ? Chat ngay"
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:animate-bounce focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <MessageCircle className="w-7 h-7" />
          </button>
        </div>
      ) : (
        /* Expanded Chat Window */
        <div
          role="dialog"
          aria-label="Hỗ trợ khách hàng PhoneShop"
          className="w-[380px] h-[520px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
                  <Headphones className="w-4 h-4" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-600 rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">Hỗ trợ khách hàng PhoneShop</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-blue-100 font-medium">Đang online • trả lời trong vài phút</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                title="Thu nhỏ"
                aria-label="Thu nhỏ"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                title="Đóng"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            {!user ? (
              /* Unauthenticated Prompt */
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h4 className="text-base font-semibold text-slate-800 mb-1">
                  Xin chào quý khách!
                </h4>
                <p className="text-sm text-slate-500 mb-6 max-w-[260px]">
                  Vui lòng đăng nhập để bắt đầu trò chuyện với nhân viên chăm sóc khách hàng.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
                >
                  Đăng nhập để chat với nhân viên
                </Link>
              </div>
            ) : isLoadingTicket ? (
              /* Loading State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-medium">Đang tải cuộc trò chuyện...</p>
              </div>
            ) : error ? (
              /* Error State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-sm text-slate-600 mb-4 max-w-[280px]">{error}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Thử lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setIsOpen(false);
                    }}
                    className="px-4 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : !activeTicket ? (
              /* Starter Form */
              <div className="flex-1 p-5 flex flex-col justify-center overflow-y-auto">
                <div className="mb-4 text-center">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Bạn cần giúp gì?
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn chủ đề và nhắn cho shop, nhân viên sẽ trả lời bạn sớm nhất
                  </p>
                </div>

                <form onSubmit={handleStartChat} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="chat-category-select"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Chủ đề cần hỗ trợ
                    </label>
                    <select
                      id="chat-category-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as TicketCategory)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    >
                      <option value="PRODUCT_INQUIRY">Tư vấn sản phẩm</option>
                      <option value="ORDER_INQUIRY">Đơn hàng</option>
                      <option value="WARRANTY_SUPPORT">Bảo hành</option>
                      <option value="ACCOUNT_GENERAL">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="chat-initial-message"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Nội dung tin nhắn
                    </label>
                    <textarea
                      id="chat-initial-message"
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      placeholder="Mô tả thắc mắc của bạn..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isStarting || !initialMessage.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <span>Bắt đầu trò chuyện</span>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Active Ticket Message History & Reply Box */
              <div className="flex-1 flex flex-col min-h-0">
                {/* Messages List */}
                <div
                  data-testid="chat-messages-container"
                  className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50"
                >
                  {visibleMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-4 text-xs text-slate-400">
                      Chưa có tin nhắn nào. Đặt câu hỏi và nhân viên tư vấn sẽ phản hồi bạn ngay!
                    </div>
                  ) : (
                    visibleMessages.map((msg: TicketMessage) => {
                      const isCustomer =
                        msg.senderId === user?.id ||
                        (user?.id && msg.sender?.id === user?.id) ||
                        (!msg.sender && (!activeTicket.assignedToId || msg.senderId === activeTicket.userId));

                      const staffName =
                        [msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(' ') ||
                        'Hỗ trợ viên';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                        >
                          {!isCustomer && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
                                {msg.sender?.avatarUrl ? (
                                  <img
                                    src={msg.sender.avatarUrl}
                                    alt={staffName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Headphones className="w-3 h-3" />
                                )}
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {staffName}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase tracking-wider">
                                Hỗ trợ
                              </span>
                            </div>
                          )}

                          <div
                            className={`max-w-[80%] px-3.5 py-2 text-sm leading-relaxed ${
                              isCustomer
                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-sm'
                                : 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm shadow-xs border border-slate-200/50'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>

                          {msg.createdAt && (
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input Footer */}
                {activeTicket.status === 'CLOSED' ? (
                  <div className="p-3 border-t border-slate-200 bg-slate-50 text-center shrink-0">
                    <p className="text-xs text-slate-500 mb-2">Cuộc trò chuyện này đã kết thúc.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTicket(null)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                      Bắt đầu cuộc trò chuyện mới
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendReply}
                    className="p-3 border-t border-slate-200 bg-white flex items-end gap-2 shrink-0"
                  >
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                      placeholder="Nhập tin nhắn..."
                      rows={1}
                      className="flex-1 max-h-24 min-h-[38px] resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                      disabled={isSending}
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSending}
                      aria-label="Gửi tin nhắn"
                      className="h-[38px] w-[38px] flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
