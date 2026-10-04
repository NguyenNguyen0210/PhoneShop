import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ticketService } from '../../../../services/ticketService';
import { orderService } from '../../../../services/orderService';
import type { Ticket, TicketCategory, TicketStatus } from '../../../../types/ticket';
import { TicketConversationModal } from './TicketConversationModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Props {
  initialOrderId?: string | null;
}

export const CustomerTicketsTab: React.FC<Props> = ({ initialOrderId }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Conversation modal state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isConversationOpen, setIsConversationOpen] = useState(false);

  // Orders for dropdown
  const [orders, setOrders] = useState<any[]>([]);

  const [form] = Form.useForm();

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ticketService.getMyTickets({ limit: 50 });
      setTickets(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách vé hỗ trợ');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await orderService.getMyOrders();
      setOrders(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch (err) {
      // Ignore order load failures in ticket tab
    }
  }, []);

  useEffect(() => {
    loadTickets();
    loadOrders();
  }, [loadTickets, loadOrders]);

  useEffect(() => {
    if (initialOrderId) {
      form.setFieldsValue({ orderId: initialOrderId, category: 'ORDER_INQUIRY' });
      setIsCreateModalOpen(true);
    }
  }, [initialOrderId, form]);

  const handleCreateTicket = async (values: any) => {
    try {
      setSubmitting(true);
      const attachments = values.attachmentUrl?.trim() ? [values.attachmentUrl.trim()] : [];
      await ticketService.createTicket({
        title: values.title,
        category: values.category,
        priority: values.priority || 'MEDIUM',
        orderId: values.orderId || undefined,
        message: values.message,
        attachments,
      });

      message.success('Đã gửi yêu cầu thành công. Nhân viên hỗ trợ sẽ phản hồi sớm nhất!');
      setIsCreateModalOpen(false);
      form.resetFields();
      loadTickets();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tạo yêu cầu hỗ trợ');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabels: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
    OPEN: { label: 'Chờ tiếp nhận', color: 'warning', icon: <ClockCircleOutlined /> },
    IN_PROGRESS: { label: 'Đang xử lý', color: 'processing', icon: <SyncOutlined spin /> },
    RESOLVED: { label: 'Đã giải quyết', color: 'success', icon: <CheckCircleOutlined /> },
    CLOSED: { label: 'Đã đóng', color: 'default', icon: <CheckCircleOutlined /> },
  };

  const categoryLabels: Record<TicketCategory, string> = {
    ORDER_INQUIRY: 'Đơn hàng & Vận chuyển',
    PRODUCT_INQUIRY: 'Tư vấn sản phẩm',
    WARRANTY_SUPPORT: 'Bảo hành & Kỹ thuật',
    RETURN_REFUND: 'Khiếu nại đổi trả',
    PAYMENT_INSTALLMENT: 'Thanh toán & Trả góp',
    ACCOUNT_GENERAL: 'Thắc mắc chung',
  };

  const columns: ColumnsType<Ticket> = [
    {
      title: 'Mã vé',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Text strong style={{ color: '#1890ff' }}>{code}</Text>,
    },
    {
      title: 'Tiêu đề yêu cầu',
      key: 'title',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.title}</div>
          {record.order && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đơn hàng: {record.order.orderNumber}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      render: (cat: TicketCategory) => <Tag color="blue">{categoryLabels[cat] || cat}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: TicketStatus) => {
        const info = statusLabels[st] || { label: st, color: 'default', icon: null };
        return (
          <Tag color={info.color} icon={info.icon}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => new Date(d).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedTicketId(record.id);
            setIsConversationOpen(true);
          }}
        >
          Xem trao đổi
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Hỗ trợ & Khiếu nại (Support Tickets)
          </Title>
          <Text type="secondary">
            Gửi yêu cầu về đơn hàng, sản phẩm hoặc bảo hành cho nhân viên hỗ trợ
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadTickets} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Tạo yêu cầu mới
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tickets}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                description="Bạn chưa có yêu cầu hỗ trợ nào. Cần trợ giúp? Hãy tạo yêu cầu mới!"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
                  Tạo yêu cầu hỗ trợ ngay
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create Ticket Modal */}
      <Modal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        title="Tạo yêu cầu hỗ trợ khách hàng"
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTicket}>
          <Form.Item
            name="title"
            label="Tiêu đề yêu cầu"
            rules={[{ required: true, message: 'Vui lòng nhập tóm tắt vấn đề' }]}
          >
            <Input placeholder="Ví dụ: Cần kiểm tra tiến độ giao hàng đơn #123..." />
          </Form.Item>

          <Form.Item
            name="category"
            label="Phân loại vấn đề"
            initialValue="ORDER_INQUIRY"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'ORDER_INQUIRY', label: 'Đơn hàng & Vận chuyển' },
                { value: 'PRODUCT_INQUIRY', label: 'Tư vấn sản phẩm' },
                { value: 'WARRANTY_SUPPORT', label: 'Bảo hành & Kỹ thuật' },
                { value: 'RETURN_REFUND', label: 'Khiếu nại đổi trả / hoàn tiền' },
                { value: 'PAYMENT_INSTALLMENT', label: 'Thanh toán & Trả góp' },
                { value: 'ACCOUNT_GENERAL', label: 'Thắc mắc chung' },
              ]}
            />
          </Form.Item>

          <Form.Item name="orderId" label="Đơn hàng liên quan (tùy chọn)">
            <Select
              placeholder="Chọn đơn hàng của bạn (nếu có)"
              allowClear
              options={orders.map((o: any) => ({
                value: o.id,
                label: `Đơn #${o.orderNumber} - ${Number(o.totalAmount || 0).toLocaleString('vi-VN')} đ (${o.status})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="message"
            label="Nội dung chi tiết"
            rules={[{ required: true, message: 'Vui lòng mô tả chi tiết vấn đề bạn gặp phải' }]}
          >
            <TextArea rows={4} placeholder="Mô tả cụ thể thắc mắc, tình trạng sản phẩm hoặc yêu cầu hỗ trợ..." />
          </Form.Item>

          <Form.Item name="attachmentUrl" label="Hình ảnh đính kèm (URL minh chứng)">
            <Input placeholder="URL hình ảnh lỗi máy, biên lai hoặc hóa đơn (nếu có)..." allowClear />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Gửi yêu cầu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Conversation Thread Modal */}
      <TicketConversationModal
        ticketId={selectedTicketId}
        open={isConversationOpen}
        onClose={() => {
          setIsConversationOpen(false);
          setSelectedTicketId(null);
        }}
        onTicketUpdated={loadTickets}
      />
    </div>
  );
};

export default CustomerTicketsTab;
