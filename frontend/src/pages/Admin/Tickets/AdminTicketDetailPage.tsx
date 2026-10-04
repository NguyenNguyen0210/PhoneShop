import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Button,
  Space,
  Input,
  Radio,
  Select,
  Avatar,
  Divider,
  Spin,
  Alert,
  message,
  Image,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  LockOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  ShoppingOutlined,
  EyeOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '../../../services/ticketService';
import type { Ticket, TicketStatus } from '../../../types/ticket';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const AdminTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sending, setSending] = useState(false);

  // Status updating
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('OPEN');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const ticketRef = useRef<Ticket | null>(null);

  const isScrolledToBottom = () => {
    if (messagesContainerRef.current && messagesContainerRef.current.scrollHeight > messagesContainerRef.current.clientHeight) {
      const el = messagesContainerRef.current;
      return el.scrollHeight - el.scrollTop - el.clientHeight <= 150;
    }
    const scrollPosition = window.innerHeight + (window.scrollY || document.documentElement.scrollTop || 0);
    const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    return pageHeight - scrollPosition <= 150;
  };

  const loadTicket = useCallback(async (silent = false) => {
    if (!id) return;
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const res = await ticketService.getAdminTicketDetail(id);

      const prevMessageCount = ticketRef.current?.messages?.length ?? 0;
      const newMessageCount = res?.messages?.length ?? 0;
      const hasNewMessages = newMessageCount > prevMessageCount;
      const atBottom = isScrolledToBottom();

      setTicket(res);
      ticketRef.current = res;
      setSelectedStatus(res.status);

      if (hasNewMessages && atBottom) {
        setTimeout(() => {
          if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.response?.data?.message || 'Không thể tải chi tiết vé');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    ticketRef.current = ticket;
  }, [ticket]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (!id) return;

    const interval = setInterval(() => {
      loadTicket(true);
    }, 3500);

    return () => {
      clearInterval(interval);
    };
  }, [id, loadTicket]);

  const handleSendMessage = async () => {
    if (!id || !replyMessage.trim()) return;
    try {
      setSending(true);
      const attachments = attachmentUrl.trim() ? [attachmentUrl.trim()] : [];
      await ticketService.addAdminReply(id, {
        message: replyMessage.trim(),
        attachments,
        isInternalNote,
      });

      message.success(isInternalNote ? 'Đã lưu ghi chú nội bộ' : 'Đã gửi phản hồi đến khách hàng');
      setReplyMessage('');
      setAttachmentUrl('');
      await loadTicket(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!id) return;
    try {
      setUpdatingStatus(true);
      await ticketService.updateTicketStatus(id, status);
      message.success('Đã cập nhật trạng thái vé');
      setSelectedStatus(status);
      await loadTicket(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Đang tải vé hỗ trợ..." />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/tickets')} style={{ marginBottom: 16 }}>
          Quay lại danh sách
        </Button>
        <Alert type="error" message="Lỗi" description={error || 'Không tìm thấy vé'} showIcon />
      </div>
    );
  }

  const customerName =
    [ticket.user?.lastName, ticket.user?.firstName].filter(Boolean).join(' ') || ticket.user?.email || 'Khách';

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/admin/tickets')}
        style={{ marginBottom: 16 }}
      >
        Danh sách vé hỗ trợ
      </Button>

      <Row gutter={[24, 24]}>
        {/* Left Column: Timeline & Conversation */}
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Space size="middle" style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    {ticket.code}
                  </Text>
                  <Tag color="blue">{ticket.category}</Tag>
                  <Tag color={ticket.priority === 'URGENT' ? 'red' : 'orange'}>{ticket.priority}</Tag>
                </Space>
                <Title level={4} style={{ margin: 0 }}>
                  {ticket.title}
                </Title>
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Tạo lúc: {new Date(ticket.createdAt).toLocaleString('vi-VN')}
              </Text>
            </div>
          </Card>

          {/* Conversation History */}
          <div
            ref={messagesContainerRef}
            style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}
          >
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((msg) => {
                const isInternal = msg.isInternalNote;
                const isStaff = msg.senderId !== ticket.userId;
                const senderName =
                  [msg.sender?.lastName, msg.sender?.firstName].filter(Boolean).join(' ') ||
                  (isStaff ? 'Nhân viên CSKH' : customerName);

                return (
                  <Card
                    key={msg.id}
                    bordered={false}
                    style={{
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      backgroundColor: isInternal ? '#fffbe6' : isStaff ? '#f6ffed' : '#ffffff',
                      borderLeft: isInternal ? '4px solid #faad14' : isStaff ? '4px solid #52c41a' : '4px solid #1890ff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Space>
                        <Avatar
                          src={msg.sender?.avatarUrl}
                          icon={<UserOutlined />}
                          style={{
                            backgroundColor: isInternal ? '#faad14' : isStaff ? '#52c41a' : '#1890ff',
                          }}
                        />
                        <Text strong>{senderName}</Text>
                        {isStaff && <Tag color="green">CSKH</Tag>}
                        {isInternal && (
                          <Tag color="warning" icon={<LockOutlined />}>
                            Ghi chú nội bộ
                          </Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(msg.createdAt).toLocaleString('vi-VN')}
                      </Text>
                    </div>

                    <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 8, fontSize: 14 }}>
                      {msg.message}
                    </Paragraph>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                          Hình ảnh đính kèm:
                        </Text>
                        <Space wrap orientation="horizontal">
                          {msg.attachments.map((url, idx) => (
                            <Image
                              key={idx}
                              src={url}
                              width={90}
                              height={90}
                              style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
                            />
                          ))}
                        </Space>
                      </div>
                    )}
                  </Card>
                );
              })
            ) : (
              <Card bordered={false}>
                <Text type="secondary">Chưa có tin nhắn nào trong luồng hỗ trợ này.</Text>
              </Card>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer Box */}
          <Card
            bordered={false}
            title={
              <Radio.Group
                value={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value={false}>
                  <CustomerServiceOutlined /> Phản hồi khách hàng
                </Radio.Button>
                <Radio.Button value={true}>
                  <LockOutlined /> Ghi chú nội bộ
                </Radio.Button>
              </Radio.Group>
            }
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              backgroundColor: isInternalNote ? '#fffbe6' : '#ffffff',
            }}
          >
            {isInternalNote && (
              <Alert
                message="Chế độ Ghi chú nội bộ: Tin nhắn này chỉ hiển thị cho nhân viên CSKH & Quản trị viên, khách hàng hoàn toàn không nhìn thấy."
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}

            <TextArea
              rows={4}
              placeholder={isInternalNote ? 'Nhập ghi chú kỹ thuật hoặc bàn giao ca...' : 'Nhập nội dung phản hồi gửi tới khách hàng...'}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} sm={16}>
                <Input
                  prefix={<FileImageOutlined />}
                  placeholder="URL hình ảnh đính kèm (tùy chọn)..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  disabled={!replyMessage.trim()}
                  onClick={handleSendMessage}
                  style={{
                    backgroundColor: isInternalNote ? '#faad14' : undefined,
                    borderColor: isInternalNote ? '#faad14' : undefined,
                    width: '100%',
                  }}
                >
                  {isInternalNote ? 'Lưu ghi chú' : 'Gửi phản hồi'}
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right Column: Ticket Controls & Customer Metadata */}
        <Col xs={24} lg={8}>
          {/* Status Controls */}
          <Card title="Trạng thái & Phân công" bordered={false} style={{ marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Trạng thái vé:
              </Text>
              <Select
                style={{ width: '100%' }}
                value={selectedStatus}
                loading={updatingStatus}
                onChange={(val) => handleUpdateStatus(val)}
                options={[
                  { value: 'OPEN', label: 'Chờ tiếp nhận (Open)' },
                  { value: 'IN_PROGRESS', label: 'Đang xử lý (In Progress)' },
                  { value: 'RESOLVED', label: 'Đã giải quyết (Resolved)' },
                  { value: 'CLOSED', label: 'Đã đóng (Closed)' },
                ]}
              />
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                Nhân viên phụ trách:
              </Text>
              <Text type="secondary">
                {ticket.assignedTo
                  ? [ticket.assignedTo.lastName, ticket.assignedTo.firstName].filter(Boolean).join(' ') || ticket.assignedTo.email
                  : 'Chưa phân công cụ thể'}
              </Text>
            </div>
          </Card>

          {/* Customer 360 Quick Card */}
          <Card title="Khách hàng" bordered={false} style={{ marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar
                size={54}
                src={ticket.user?.avatarUrl}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              />
              <div>
                <Text strong style={{ fontSize: 15, display: 'block' }}>
                  {customerName}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {ticket.user?.email}
                </Text>
                {ticket.user?.phone && (
                  <div style={{ fontSize: 13 }}>SĐT: {ticket.user.phone}</div>
                )}
              </div>
            </div>

            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/customers/${ticket.userId}`)}
              style={{ width: '100%', marginTop: 8 }}
            >
              Xem Hồ sơ Customer 360°
            </Button>
          </Card>

          {/* Related Order Card */}
          {ticket.order && (
            <Card title="Đơn hàng liên quan" bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShoppingOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                <Text strong style={{ fontSize: 14 }}>
                  {ticket.order.orderNumber}
                </Text>
              </div>

              {ticket.order.totalAmount && (
                <p style={{ margin: '4px 0' }}>
                  <Text type="secondary">Giá trị đơn: </Text>
                  <Text strong>{Number(ticket.order.totalAmount).toLocaleString('vi-VN')} đ</Text>
                </p>
              )}

              {ticket.order.status && (
                <p style={{ margin: '4px 0' }}>
                  <Text type="secondary">Trạng thái: </Text>
                  <Tag color="blue">{ticket.order.status}</Tag>
                </p>
              )}

              <Button
                type="link"
                style={{ padding: 0, marginTop: 8 }}
                onClick={() => navigate('/admin/orders')}
              >
                Mở Quản lý Đơn hàng →
              </Button>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default AdminTicketDetailPage;
