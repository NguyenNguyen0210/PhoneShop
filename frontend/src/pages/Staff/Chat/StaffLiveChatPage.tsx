import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Tag,
  Avatar,
  Typography,
  Space,
  Badge,
  Spin,
  Empty,
  Tooltip,
  Dropdown,
  Image,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SendOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ShoppingOutlined,
  EyeOutlined,
  FileImageOutlined,
  LockOutlined,
  ThunderboltsOutlined,
  InfoCircleOutlined,
  RightOutlined,
  LeftOutlined,
  MessageOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ticketService } from '../../../services/ticketService';
import type { Ticket, TicketStatus } from '../../../types/ticket';

const { Text } = Typography;
const { TextArea } = Input;

const CANNED_REPLIES = [
  'Dạ em chào anh/chị! Em có thể hỗ trợ gì cho mình ạ?',
  'Dạ bên em đã ghi nhận thông tin, em đang kiểm tra hệ thống và sẽ phản hồi ngay ạ!',
  'Dạ đơn hàng của mình đang được xử lý và giao sớm nhất ạ.',
  'Dạ em đã cập nhật yêu cầu của anh/chị trên hệ thống rồi ạ.',
  'Dạ em cảm ơn anh/chị đã liên hệ. Chúc anh/chị một ngày vui vẻ ạ!',
];

const formatTimeAgo = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export const StaffLiveChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active selected conversation
  const [conversations, setConversations] = useState<Ticket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(searchParams.get('id') || null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Loading states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer states
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);

  // UI layout
  const [showInsightPanel, setShowInsightPanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch conversations list
  const fetchConversations = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoadingList(true);
        const params: any = {
          limit: 50,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
        };
        const res = await ticketService.getAdminTickets(params);
        const rawData = res?.data ?? res;
        const list: Ticket[] = Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData)
          ? rawData
          : Array.isArray(res?.items)
          ? res.items
          : [];

        // Prioritize Live Chat and most recent conversations
        const sorted = [...list].sort((a, b) => {
          const aLive = a.title.toLowerCase().includes('live chat') ? 1 : 0;
          const bLive = b.title.toLowerCase().includes('live chat') ? 1 : 0;
          if (aLive !== bLive) return bLive - aLive;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        setConversations(sorted);

        // Auto select first if none selected
        if (!activeTicketId && sorted.length > 0) {
          setActiveTicketId(sorted[0].id);
        }
      } catch (err: any) {
        if (!silent) {
          message.error(err.response?.data?.message || 'Không thể tải danh sách chat');
        }
      } finally {
        if (!silent) setLoadingList(false);
      }
    },
    [statusFilter, searchQuery, activeTicketId]
  );

  // 2. Fetch active ticket messages
  const fetchActiveTicketDetail = useCallback(async (ticketId: string, silent = false) => {
    try {
      if (!silent) setLoadingDetail(true);
      const detail = await ticketService.getAdminTicketDetail(ticketId);
      setActiveTicket(detail);
    } catch (err: any) {
      if (!silent) {
        message.error(err.response?.data?.message || 'Không thể tải tin nhắn');
      }
    } finally {
      if (!silent) setLoadingDetail(false);
    }
  }, []);

  // Poll conversations list every 4s
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Load active ticket detail when activeTicketId changes
  useEffect(() => {
    if (activeTicketId) {
      fetchActiveTicketDetail(activeTicketId);
      setSearchParams({ id: activeTicketId }, { replace: true });
    } else {
      setActiveTicket(null);
    }
  }, [activeTicketId, fetchActiveTicketDetail, setSearchParams]);

  // Poll active ticket messages every 2.5s
  useEffect(() => {
    if (!activeTicketId) return;
    const interval = setInterval(() => {
      fetchActiveTicketDetail(activeTicketId, true);
    }, 2500);
    return () => clearInterval(interval);
  }, [activeTicketId, fetchActiveTicketDetail]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages?.length]);

  // Send message handler
  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = (customMessage ?? replyText).trim();
    if (!activeTicketId || !textToSend || sending) return;

    try {
      setSending(true);
      const attachments = attachmentUrl.trim() ? [attachmentUrl.trim()] : [];
      await ticketService.addAdminReply(activeTicketId, {
        message: textToSend,
        attachments,
        isInternalNote,
      });

      setReplyText('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);

      // Refresh messages immediately
      await fetchActiveTicketDetail(activeTicketId, true);
      fetchConversations(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  // Change ticket status handler
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!activeTicketId) return;
    try {
      await ticketService.updateTicketStatus(activeTicketId, newStatus);
      message.success('Đã cập nhật trạng thái phiên hỗ trợ');
      await fetchActiveTicketDetail(activeTicketId, true);
      fetchConversations(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  // Canned replies dropdown menu
  const cannedMenu: MenuProps = {
    items: CANNED_REPLIES.map((text, idx) => ({
      key: idx,
      label: <span style={{ fontSize: 13 }}>{text}</span>,
      onClick: () => {
        setReplyText((prev) => (prev ? `${prev} ${text}` : text));
      },
    })),
  };

  const customerName =
    [activeTicket?.user?.lastName, activeTicket?.user?.firstName].filter(Boolean).join(' ') ||
    activeTicket?.user?.email ||
    'Khách hàng';

  return (
    <div style={{ height: 'calc(100vh - 120px)', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
      {/* Main Container Card */}
      <Card
        styles={{ body: { padding: 0, height: '100%', display: 'flex', overflow: 'hidden' } }}
        style={{
          flex: 1,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* ======================================================== */}
        {/* COLUMN 1: CONVERSATIONS LIST (~320px)                    */}
        {/* ======================================================== */}
        <div
          style={{
            width: 320,
            minWidth: 300,
            maxWidth: 340,
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          {/* Header & Search */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <MessageOutlined style={{ fontSize: 17 }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 15, display: 'block', lineHeight: 1.2 }}>
                    Tin nhắn Live Chat
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {conversations.length} cuộc hội thoại
                  </Text>
                </div>
              </div>
              <Tooltip title="Làm mới danh sách">
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={() => fetchConversations(false)}
                  loading={loadingList}
                />
              </Tooltip>
            </div>

            <Input
              placeholder="Tìm tên, email, mã vé..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="small"
              style={{ borderRadius: 6 }}
            />

            {/* Quick status tabs */}
            <div style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto' }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'OPEN', label: 'Chờ nhận' },
                { key: 'IN_PROGRESS', label: 'Đang chat' },
                { key: 'RESOLVED', label: 'Đã xong' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key as any)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: statusFilter === tab.key ? 600 : 400,
                    backgroundColor: statusFilter === tab.key ? '#0f172a' : '#f1f5f9',
                    color: statusFilter === tab.key ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingList && conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin tip="Đang tải danh sách..." />
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Empty description="Chưa có tin nhắn nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              conversations.map((item) => {
                const isSelected = item.id === activeTicketId;
                const isLive = item.title.toLowerCase().includes('live chat');
                const name =
                  [item.user?.lastName, item.user?.firstName].filter(Boolean).join(' ') ||
                  item.user?.email ||
                  'Khách hàng';
                const lastMsg = item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1].message : item.title;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveTicketId(item.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      borderLeft: isSelected ? '4px solid #10b981' : '4px solid transparent',
                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Badge dot={item.status === 'OPEN'} color="#faad14" offset={[-2, 32]}>
                        <Avatar
                          size={40}
                          src={item.user?.avatarUrl}
                          icon={<UserOutlined />}
                          style={{
                            backgroundColor: isLive ? '#10b981' : '#3b82f6',
                            flexShrink: 0,
                          }}
                        />
                      </Badge>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                          <Text
                            strong
                            style={{
                              fontSize: 13,
                              color: isSelected ? '#065f46' : '#1e293b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 10, flexShrink: 0 }}>
                            {formatTimeAgo(item.updatedAt)}
                          </Text>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginBottom: 4,
                          }}
                        >
                          {lastMsg}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {isLive && (
                            <Tag
                              color="#10b981"
                              style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', borderRadius: 4 }}
                            >
                              Live Chat
                            </Tag>
                          )}
                          <Tag
                            color={
                              item.status === 'OPEN'
                                ? 'warning'
                                : item.status === 'IN_PROGRESS'
                                ? 'processing'
                                : 'success'
                            }
                            style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', borderRadius: 4 }}
                          >
                            {item.status === 'OPEN' ? 'Chờ nhận' : item.status === 'IN_PROGRESS' ? 'Đang chat' : 'Đã xong'}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {item.code}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2: LIVE CHAT WINDOW (flex: 1)                     */}
        {/* ======================================================== */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#f8fafc',
            minWidth: 320,
          }}
        >
          {activeTicket ? (
            <>
              {/* Chat Window Top Bar */}
              <div
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar
                    size={42}
                    src={activeTicket.user?.avatarUrl}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#10b981' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong style={{ fontSize: 15 }}>
                        {customerName}
                      </Text>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 500 }}>Trực tuyến</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12 }}>
                      {activeTicket.user?.phone && (
                        <span>
                          <PhoneOutlined /> {activeTicket.user.phone}
                        </span>
                      )}
                      <span>
                        <MailOutlined /> {activeTicket.user?.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right controls of Chat Header */}
                <Space>
                  {activeTicket.status !== 'RESOLVED' && activeTicket.status !== 'CLOSED' ? (
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleStatusChange('RESOLVED')}
                      style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                    >
                      Hoàn thành hỗ trợ
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      icon={<SyncOutlined />}
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                    >
                      Mở lại chat
                    </Button>
                  )}

                  <Tooltip title={showInsightPanel ? 'Ẩn thông tin khách' : 'Hiện thông tin khách'}>
                    <Button
                      size="small"
                      icon={showInsightPanel ? <RightOutlined /> : <LeftOutlined />}
                      onClick={() => setShowInsightPanel((prev) => !prev)}
                    >
                      Thông tin
                    </Button>
                  </Tooltip>
                </Space>
              </div>

              {/* Messages Container Area */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {/* Welcome note */}
                <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: 12,
                      fontSize: 11,
                      color: '#475569',
                    }}
                  >
                    Bắt đầu phiên trò chuyện • Mã vé: {activeTicket.code}
                  </span>
                </div>

                {activeTicket.messages && activeTicket.messages.length > 0 ? (
                  activeTicket.messages.map((msg) => {
                    const isStaffSender = msg.senderId !== activeTicket.userId;
                    const isInternal = msg.isInternalNote;

                    // Internal note bubble
                    if (isInternal) {
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: 'center',
                            maxWidth: '85%',
                            backgroundColor: '#fffbe6',
                            border: '1px solid #ffe58f',
                            borderRadius: 8,
                            padding: '8px 14px',
                            margin: '4px 0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <LockOutlined style={{ color: '#faad14', fontSize: 12 }} />
                            <Text strong style={{ fontSize: 11, color: '#d48806' }}>
                              Ghi chú nội bộ CSKH ({msg.sender?.lastName || 'Nhân viên'})
                            </Text>
                            <span style={{ fontSize: 10, color: '#8c8c8c' }}>
                              {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#595959', whiteSpace: 'pre-wrap' }}>
                            {msg.message}
                          </div>
                        </div>
                      );
                    }

                    // Regular Message Bubble (Customer vs Staff)
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: isStaffSender ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: 10,
                          alignSelf: isStaffSender ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                        }}
                      >
                        <Avatar
                          size={32}
                          src={msg.sender?.avatarUrl}
                          icon={<UserOutlined />}
                          style={{
                            backgroundColor: isStaffSender ? '#10b981' : '#3b82f6',
                            flexShrink: 0,
                          }}
                        />

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#94a3b8',
                              marginBottom: 3,
                              textAlign: isStaffSender ? 'right' : 'left',
                            }}
                          >
                            {isStaffSender ? 'Nhân viên CSKH' : customerName} •{' '}
                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>

                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: isStaffSender ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              backgroundColor: isStaffSender ? '#10b981' : '#ffffff',
                              color: isStaffSender ? '#ffffff' : '#1e293b',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              fontSize: 14,
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.message}

                            {msg.attachments && msg.attachments.length > 0 && (
                              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {msg.attachments.map((url, i) => (
                                  <Image
                                    key={i}
                                    src={url}
                                    width={100}
                                    height={100}
                                    style={{
                                      objectFit: 'cover',
                                      borderRadius: 8,
                                      border: isStaffSender ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e2e8f0',
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Text type="secondary">Chưa có tin nhắn nào trong cuộc hội thoại này.</Text>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer Box (Bottom) */}
              <div
                style={{
                  padding: '12px 20px 16px',
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                {/* Composer controls row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: !isInternalNote ? 600 : 400,
                        backgroundColor: !isInternalNote ? '#10b981' : '#f1f5f9',
                        color: !isInternalNote ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <CustomerServiceOutlined /> Phản hồi khách
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: isInternalNote ? 600 : 400,
                        backgroundColor: isInternalNote ? '#faad14' : '#f1f5f9',
                        color: isInternalNote ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <LockOutlined /> Ghi chú nội bộ
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tooltip title="Đính kèm link hình ảnh">
                      <Button
                        size="small"
                        type={showAttachmentInput ? 'primary' : 'default'}
                        icon={<FileImageOutlined />}
                        onClick={() => setShowAttachmentInput((prev) => !prev)}
                      />
                    </Tooltip>

                    <Dropdown menu={cannedMenu} trigger={['click']}>
                      <Button size="small" icon={<ThunderboltsOutlined />}>
                        Mẫu trả lời nhanh
                      </Button>
                    </Dropdown>
                  </div>
                </div>

                {/* Optional Attachment URL Input */}
                {showAttachmentInput && (
                  <div style={{ marginBottom: 8 }}>
                    <Input
                      placeholder="Dán link ảnh (https://...) đính kèm gửi khách..."
                      prefix={<FileImageOutlined style={{ color: '#94a3b8' }} />}
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      size="small"
                      allowClear
                    />
                  </div>
                )}

                {/* Message Input TextArea */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <TextArea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim() && !sending) {
                          handleSendMessage();
                        }
                      }
                    }}
                    placeholder={
                      isInternalNote
                        ? 'Nhập ghi chú nội bộ (chỉ nhân viên nhìn thấy)... Nhấn Enter để lưu'
                        : 'Nhập tin nhắn gửi tới khách hàng... Nhấn Enter để gửi (Shift+Enter để xuống dòng)'
                    }
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    style={{
                      borderRadius: 8,
                      backgroundColor: isInternalNote ? '#fffbe6' : '#ffffff',
                      borderColor: isInternalNote ? '#ffe58f' : undefined,
                    }}
                  />

                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={sending}
                    disabled={!replyText.trim()}
                    onClick={() => handleSendMessage()}
                    style={{
                      height: 48,
                      width: 52,
                      backgroundColor: isInternalNote ? '#faad14' : '#10b981',
                      borderColor: isInternalNote ? '#faad14' : '#10b981',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  color: '#64748b',
                }}
              >
                <MessageOutlined style={{ fontSize: 28 }} />
              </div>
              <Text strong style={{ fontSize: 16, color: '#475569', marginBottom: 4 }}>
                Chưa chọn cuộc trò chuyện nào
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Vui lòng chọn một khách hàng từ danh sách bên trái để bắt đầu chat
              </Text>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3: CUSTOMER & ORDER INSIGHTS (~300px)             */}
        {/* ======================================================== */}
        {showInsightPanel && activeTicket && (
          <div
            style={{
              width: 300,
              minWidth: 280,
              maxWidth: 320,
              borderLeft: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: 'auto',
              padding: '20px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <InfoCircleOutlined style={{ color: '#10b981' }} />
              <Text strong style={{ fontSize: 14 }}>
                Hồ sơ & Đơn hàng
              </Text>
            </div>

            {/* Customer Avatar & Bio */}
            <div
              style={{
                textAlign: 'center',
                padding: '16px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Avatar
                size={58}
                src={activeTicket.user?.avatarUrl}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#10b981', marginBottom: 8 }}
              />
              <Text strong style={{ fontSize: 15, display: 'block' }}>
                {customerName}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {activeTicket.user?.email}
              </Text>
              {activeTicket.user?.phone && (
                <Text style={{ fontSize: 12, color: '#475569', display: 'block', marginTop: 2 }}>
                  SĐT: {activeTicket.user.phone}
                </Text>
              )}

              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/staff/customers/${activeTicket.userId}`)}
                style={{ marginTop: 6, padding: 0 }}
              >
                Xem Hồ sơ Customer 360° →
              </Button>
            </div>

            {/* Related Order Details */}
            {activeTicket.order ? (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <ShoppingOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                  <Text strong style={{ fontSize: 13 }}>
                    Đơn: {activeTicket.order.orderNumber}
                  </Text>
                </div>
                {activeTicket.order.totalAmount && (
                  <div style={{ fontSize: 12, marginBottom: 2 }}>
                    <Text type="secondary">Tổng tiền: </Text>
                    <Text strong>{Number(activeTicket.order.totalAmount).toLocaleString('vi-VN')} đ</Text>
                  </div>
                )}
                {activeTicket.order.status && (
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <Text type="secondary">Trạng thái: </Text>
                    <Tag color="blue" style={{ fontSize: 10 }}>
                      {activeTicket.order.status}
                    </Tag>
                  </div>
                )}
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate(`/staff/orders?id=${activeTicket.order?.id}`)}
                  style={{ padding: 0, fontSize: 12 }}
                >
                  Mở đơn hàng →
                </Button>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Chưa gắn đơn hàng cụ thể
                </Text>
              </div>
            )}

            {/* Session Metadata */}
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <Text type="secondary">Mã phiên: </Text>
                <Text strong>{activeTicket.code}</Text>
              </div>
              <div>
                <Text type="secondary">Phân loại: </Text>
                <Tag color="blue" style={{ margin: 0 }}>
                  {activeTicket.category}
                </Tag>
              </div>
              <div>
                <Text type="secondary">Độ ưu tiên: </Text>
                <Tag color={activeTicket.priority === 'URGENT' ? 'red' : 'default'} style={{ margin: 0 }}>
                  {activeTicket.priority}
                </Tag>
              </div>
              <div>
                <Text type="secondary">Tạo lúc: </Text>
                <span>{new Date(activeTicket.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StaffLiveChatPage;
