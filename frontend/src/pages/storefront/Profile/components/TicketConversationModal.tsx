import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Tag,
  Typography,
  Button,
  Space,
  Input,
  Avatar,
  Card,
  Spin,
  Alert,
  message,
  Image,
  Empty,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { ticketService } from '../../../../services/ticketService';
import { notifyError } from '../../../../utils/notify';
import type { Ticket, TicketStatus } from '../../../../types/ticket';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
  ticketId: string | null;
  open: boolean;
  onClose: () => void;
  onTicketUpdated?: () => void;
}

export const TicketConversationModal: React.FC<Props> = ({
  ticketId,
  open,
  onClose,
  onTicketUpdated,
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  const [replyMessage, setReplyMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadTicket = useCallback(async (silent = false) => {
    if (!ticketId) return;
    try {
      if (!silent) {
        setLoading(true);
      }
      const res = await ticketService.getTicketDetail(ticketId);
      setTicket(res);
    } catch (err: any) {
      if (!silent) {
        notifyError(err, 'Không thể tải chi tiết yêu cầu hỗ trợ');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [ticketId]);

  useEffect(() => {
    if (open && ticketId) {
      loadTicket();
    }
  }, [open, ticketId, loadTicket]);

  useEffect(() => {
    if (!open || !ticketId) return;

    const interval = setInterval(() => {
      loadTicket(true);
    }, 3500);

    return () => {
      clearInterval(interval);
    };
  }, [open, ticketId, loadTicket]);

  const handleSendReply = async () => {
    if (!ticketId || !replyMessage.trim()) return;
    try {
      setSending(true);
      const attachments = attachmentUrl.trim() ? [attachmentUrl.trim()] : [];
      await ticketService.replyTicket(ticketId, {
        message: replyMessage.trim(),
        attachments,
      });

      message.success('Đã gửi phản hồi');
      setReplyMessage('');
      setAttachmentUrl('');
      await loadTicket(true);
      onTicketUpdated?.();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticketId) return;
    try {
      setClosing(true);
      await ticketService.closeTicket(ticketId);
      message.success('Đã đóng yêu cầu hỗ trợ thành công');
      await loadTicket(true);
      onTicketUpdated?.();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể đóng vé');
    } finally {
      setClosing(false);
    }
  };

  const statusTags: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
    OPEN: { label: 'Chờ tiếp nhận', color: 'warning', icon: <ClockCircleOutlined /> },
    IN_PROGRESS: { label: 'Đang xử lý', color: 'processing', icon: <SyncOutlined spin /> },
    RESOLVED: { label: 'Đã giải quyết', color: 'success', icon: <CheckCircleOutlined /> },
    CLOSED: { label: 'Đã đóng', color: 'default', icon: <CheckCircleOutlined /> },
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={720}
      title={
        ticket ? (
          <div>
            <Space align="center" style={{ marginBottom: 4 }}>
              <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{ticket.code}</Text>
              <Tag color={statusTags[ticket.status]?.color || 'default'} icon={statusTags[ticket.status]?.icon}>
                {statusTags[ticket.status]?.label || ticket.status}
              </Tag>
              <Tag color="blue">{ticket.category}</Tag>
            </Space>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{ticket.title}</div>
          </div>
        ) : (
          'Chi tiết yêu cầu hỗ trợ'
        )
      }
      footer={[
        ticket && ticket.status !== 'CLOSED' && (
          <Button
            key="close-ticket"
            danger
            loading={closing}
            onClick={handleCloseTicket}
          >
            Đã hài lòng & Đóng vé
          </Button>
        ),
        <Button key="back" onClick={onClose}>
          Đóng cửa sổ
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Đang tải trao đổi..." />
        </div>
      ) : ticket ? (
        <div>
          {/* Related Order Banner */}
          {ticket.order && (
            <Alert
              message={
                <span>
                  Yêu cầu liên quan đến đơn hàng: <Text strong>{ticket.order.orderNumber}</Text>
                </span>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Conversation history */}
          <div
            style={{
              maxHeight: 380,
              overflowY: 'auto',
              paddingRight: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((msg) => {
                const isCustomer = msg.senderId === ticket.userId;

                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <Card
                      size="small"
                      bordered={false}
                      style={{
                        backgroundColor: isCustomer ? '#e6f7ff' : '#f6ffed',
                        border: isCustomer ? '1px solid #91d5ff' : '1px solid #b7eb8f',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <Space size="small">
                          <Avatar
                            size="small"
                            icon={isCustomer ? <UserOutlined /> : <CustomerServiceOutlined />}
                            style={{ backgroundColor: isCustomer ? '#1890ff' : '#52c41a' }}
                          />
                          <Text strong style={{ fontSize: 13 }}>
                            {isCustomer ? 'Bạn' : 'Nhân viên PhoneShop'}
                          </Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                          {new Date(msg.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </div>

                      <Paragraph style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </Paragraph>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Space wrap orientation="horizontal">
                            {msg.attachments.map((url, idx) => (
                              <Image
                                key={idx}
                                src={url}
                                width={70}
                                height={70}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                              />
                            ))}
                          </Space>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })
            ) : (
              <Text type="secondary">Chưa có tin nhắn nào.</Text>
            )}
          </div>

          {/* Reply composer */}
          {ticket.status !== 'CLOSED' ? (
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <TextArea
                rows={3}
                placeholder="Nhập nội dung phản hồi của bạn..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  prefix={<FileImageOutlined />}
                  placeholder="URL ảnh đính kèm (nếu có)..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  allowClear
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  disabled={!replyMessage.trim()}
                  onClick={handleSendReply}
                >
                  Gửi phản hồi
                </Button>
              </div>
            </div>
          ) : (
            <Alert
              message="Yêu cầu hỗ trợ này đã được đóng. Nếu bạn cần hỗ trợ thêm, vui lòng tạo yêu cầu mới!"
              type="info"
              showIcon
            />
          )}
        </div>
      ) : (
        <Empty
          description="Không thể tải chi tiết yêu cầu hỗ trợ"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: '24px 0' }}
        >
          <Button type="primary" onClick={() => loadTicket()}>
            Thử lại
          </Button>
        </Empty>
      )}
    </Modal>
  );
};

export default TicketConversationModal;
