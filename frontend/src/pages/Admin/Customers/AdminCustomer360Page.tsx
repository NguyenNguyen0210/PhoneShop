import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Table,
  Tag,
  Avatar,
  Typography,
  Button,
  Spin,
  Empty,
  Badge,
  message,
  Space,
  Divider,
  Tooltip,
  Modal,
  Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined,
  ShoppingOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  CreditCardOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  CopyOutlined,
  FileTextOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { customerService } from '../../../services/customerService';
import type { Customer360Data } from '../../../types/customer';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const AdminCustomer360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<Customer360Data | null>(null);
  const [loading, setLoading] = useState(true);

  // CRM Internal Note state
  const [notes, setNotes] = useState<Array<{ id: string; content: string; author: string; createdAt: string }>>([
    {
      id: 'note-1',
      content: 'Khách hàng thân thiết, ưu tiên tư vấn các dòng Flagship kèm gói bảo hành rơi vỡ VIP Care.',
      author: 'Admin PhoneShop',
      createdAt: new Date().toLocaleDateString('vi-VN'),
    },
  ]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  const loadCustomer360 = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await customerService.getCustomer360(id);
      setData(res);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải hồ sơ khách hàng 360°');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCustomer360();
  }, [loadCustomer360]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Đang tải hồ sơ Customer 360°..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/admin/customers');
            }
          }}
          style={{ marginBottom: 16 }}
        >
          Quay lại danh sách
        </Button>
        <Empty description="Không tìm thấy dữ liệu hồ sơ khách hàng">
          <Button type="primary" onClick={loadCustomer360}>
            Thử lại
          </Button>
        </Empty>
      </div>
    );
  }

  const { customer, metrics, addresses, recentOrders, warranties, installments, tickets } = data;
  const fullName = [customer.lastName, customer.firstName].filter(Boolean).join(' ') || 'Khách hàng';

  // Determine VIP Tier
  const getTier = (spent: number) => {
    if (spent >= 50000000) return { name: 'VIP Kim Cương', color: 'purple', icon: <CrownOutlined /> };
    if (spent >= 20000000) return { name: 'VIP Vàng', color: 'gold', icon: <CrownOutlined /> };
    if (spent >= 10000000) return { name: 'Thành viên Bạc', color: 'blue', icon: <CrownOutlined /> };
    return { name: 'Thành viên Tiêu chuẩn', color: 'default', icon: <UserOutlined /> };
  };
  const tier = getTier(metrics.totalSpent);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Đã sao chép ${label}`);
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      message.warning('Vui lòng nhập nội dung ghi chú');
      return;
    }
    setNotes((prev) => [
      {
        id: `note-${Date.now()}`,
        content: newNoteContent.trim(),
        author: 'Admin PhoneShop',
        createdAt: new Date().toLocaleDateString('vi-VN'),
      },
      ...prev,
    ]);
    setNewNoteContent('');
    setNoteModalOpen(false);
    message.success('Đã thêm ghi chú CRM nội bộ');
  };

  // Orders Table Columns
  const orderColumns: ColumnsType<any> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text) => (
        <Text strong style={{ color: '#1890ff' }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Sản phẩm mua',
      key: 'items',
      render: (_, record) => {
        const items = record.items || [];
        return (
          <div>
            {items.map((it: any) => (
              <div key={it.id} style={{ fontSize: 13, marginBottom: 2 }}>
                • <Text strong>{it.productName}</Text>{' '}
                <Text type="secondary">(x{it.quantity} - {Number(it.price || it.unitPrice || 0).toLocaleString('vi-VN')} đ)</Text>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <Text strong style={{ color: '#cf1322' }}>
          {Number(amount).toLocaleString('vi-VN')} đ
        </Text>
      ),
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'COMPLETED') return <Tag color="success">Hoàn tất</Tag>;
        if (status === 'CANCELLED') return <Tag color="error">Đã hủy</Tag>;
        if (status === 'DELIVERED') return <Tag color="cyan">Đã giao hàng</Tag>;
        if (status === 'SHIPPING') return <Tag color="processing">Đang giao</Tag>;
        return <Tag color="processing">{status}</Tag>;
      },
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (ps) => (
        <Tag color={ps === 'PAID' ? 'green' : 'orange'}>
          {ps === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
        </Tag>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => new Date(d).toLocaleDateString('vi-VN'),
    },
  ];

  // Warranties Table Columns
  const warrantyColumns: ColumnsType<any> = [
    {
      title: 'Thiết bị / Sản phẩm',
      key: 'product',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.orderItem?.productName || 'Thiết bị điện tử'}</div>
          {record.orderItem?.variant && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.orderItem.variant.storage} - {record.orderItem.variant.color}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Mã BH / IMEI / Serial',
      key: 'identifiers',
      render: (_, record) => (
        <div>
          <div>
            <Text strong style={{ color: '#1890ff' }}>{record.warrantyCode}</Text>
          </div>
          <Text code style={{ fontSize: 11 }}>
            IMEI: {record.imei || record.imeiDevice?.imei || 'Đang cập nhật'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? 'Còn hiệu lực' : status}
        </Tag>
      ),
    },
    {
      title: 'Thời hạn bảo hành',
      key: 'period',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>Từ: {record.startDate ? new Date(record.startDate).toLocaleDateString('vi-VN') : '—'}</div>
          <div>Đến: <Text strong>{record.endDate ? new Date(record.endDate).toLocaleDateString('vi-VN') : '—'}</Text></div>
        </div>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {notes || 'Bảo hành chính hãng'}
        </Text>
      ),
    },
  ];

  // Installments Table Columns
  const installmentColumns: ColumnsType<any> = [
    {
      title: 'Đơn hàng',
      key: 'order',
      render: (_, record) => record.order?.orderNumber || '—',
    },
    {
      title: 'Đối tác tài chính',
      dataIndex: 'provider',
      key: 'provider',
      render: (prov) => <Tag color="blue">{prov || 'Home Credit'}</Tag>,
    },
    {
      title: 'Kỳ hạn',
      dataIndex: 'termMonths',
      key: 'termMonths',
      render: (t) => `${t} tháng`,
    },
    {
      title: 'Trả góp hàng tháng',
      dataIndex: 'monthlyPayment',
      key: 'monthlyPayment',
      render: (amt) => (
        <Text strong style={{ color: '#cf1322' }}>
          {Number(amt).toLocaleString('vi-VN')} đ
        </Text>
      ),
    },
    {
      title: 'Tình trạng hồ sơ',
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        if (st === 'APPROVED') return <Tag color="success">Đã phê duyệt</Tag>;
        if (st === 'REJECTED') return <Tag color="error">Từ chối</Tag>;
        return <Tag color="processing">Đang xét duyệt</Tag>;
      },
    },
    {
      title: 'Ngày tạo hồ sơ',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => new Date(d).toLocaleDateString('vi-VN'),
    },
  ];

  // Tickets Table Columns
  const ticketColumns: ColumnsType<any> = [
    {
      title: 'Mã vé',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>,
    },
    {
      title: 'Tiêu đề yêu cầu',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      render: (pr) => {
        const colors: any = { LOW: 'default', MEDIUM: 'cyan', HIGH: 'orange', URGENT: 'red' };
        return <Tag color={colors[pr] || 'default'}>{pr}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        if (st === 'RESOLVED') return <Tag color="success">Đã giải quyết</Tag>;
        if (st === 'CLOSED') return <Tag color="default">Đã đóng</Tag>;
        if (st === 'IN_PROGRESS') return <Tag color="processing">Đang xử lý</Tag>;
        return <Tag color="warning">Chờ tiếp nhận</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/admin/tickets/${record.id}`)}
        >
          Xử lý vé
        </Button>
      ),
    },
  ];

  const defaultAddress = addresses.find((a: any) => a.isDefault) || addresses[0];

  return (
    <div style={{ padding: 24 }}>
      {/* Top Breadcrumb & Action Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/admin/customers');
              }
            }}
          >
            Quay lại
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Hồ sơ Khách hàng 360° • {fullName}
            </Title>
            <Text type="secondary">ID: {customer.id}</Text>
          </div>
        </Space>

        <Space>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => setNoteModalOpen(true)}
          >
            Thêm ghi chú CRM
          </Button>
          <Button
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() => navigate('/admin/orders')}
          >
            Quản lý đơn hàng
          </Button>
        </Space>
      </div>

      {/* 2-Column Responsive CRM Layout */}
      <Row gutter={[24, 24]}>
        {/* Left Column: Identity, Contact & Addresses, Quick Actions */}
        <Col xs={24} lg={8} xl={7}>
          {/* Card 1: Customer Identity */}
          <Card
            bordered={false}
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <div style={{ textAlign: 'center', paddingBottom: 16 }}>
              <Avatar
                size={84}
                src={customer.avatarUrl}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#1890ff',
                  border: '3px solid #e6f7ff',
                  boxShadow: '0 2px 8px rgba(24,144,255,0.2)',
                  marginBottom: 12,
                }}
              />
              <Title level={4} style={{ margin: '0 0 4px 0' }}>
                {fullName}
              </Title>
              <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                {customer.email}
              </Text>

              <Space size="small">
                <Tag color={tier.color} icon={tier.icon} style={{ fontWeight: 600 }}>
                  {tier.name}
                </Tag>
                <Tag color={customer.status === 'ACTIVE' ? 'success' : 'error'}>
                  {customer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Bị hạn chế'}
                </Tag>
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ fontSize: 13, lineHeight: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">
                  <PhoneOutlined style={{ marginRight: 6 }} /> Số điện thoại:
                </Text>
                <Space size={4}>
                  <Text strong>{customer.phone || 'Chưa cập nhật'}</Text>
                  {customer.phone && (
                    <Tooltip title="Sao chép số điện thoại">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined style={{ fontSize: 12 }} />}
                        onClick={() => copyToClipboard(customer.phone!, 'số điện thoại')}
                      />
                    </Tooltip>
                  )}
                </Space>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">
                  <MailOutlined style={{ marginRight: 6 }} /> Email:
                </Text>
                <Tooltip title="Sao chép email">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined style={{ fontSize: 12 }} />}
                    onClick={() => copyToClipboard(customer.email, 'email')}
                  />
                </Tooltip>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">
                  <CalendarOutlined style={{ marginRight: 6 }} /> Ngày tham gia:
                </Text>
                <Text>{new Date(customer.createdAt).toLocaleDateString('vi-VN')}</Text>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text type="secondary">Đăng nhập gần nhất:</Text>
                <Text>
                  {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleString('vi-VN') : 'Gần đây'}
                </Text>
              </div>
            </div>

            <Divider titlePlacement="start" style={{ margin: '16px 0 12px 0', fontSize: 13 }}>
              Địa chỉ nhận hàng mặc định
            </Divider>

            {defaultAddress ? (
              <div
                style={{
                  background: '#f9fafb',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #f0f0f0',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong>{defaultAddress.recipientName || fullName}</Text>
                  <Tag color="cyan">Mặc định</Tag>
                </div>
                <div style={{ color: '#595959', marginBottom: 4 }}>
                  {defaultAddress.phone || customer.phone}
                </div>
                <div style={{ color: '#262626' }}>
                  {[
                    defaultAddress.addressLine1,
                    defaultAddress.ward,
                    defaultAddress.district,
                    defaultAddress.city,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Chưa có địa chỉ mặc định
              </Text>
            )}

            {addresses.length > 1 && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <Text type="secondary">+ {addresses.length - 1} địa chỉ phụ khác đã lưu</Text>
              </div>
            )}
          </Card>

          {/* Card 2: Quick CRM Care Notes */}
          <Card
            bordered={false}
            title={
              <Space>
                <FileTextOutlined style={{ color: '#1890ff' }} />
                <span>Ghi chú Chăm sóc KH ({notes.length})</span>
              </Space>
            }
            extra={
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setNoteModalOpen(true)}
              >
                Thêm
              </Button>
            }
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderRadius: 8,
            }}
          >
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '8px 10px',
                  background: '#fafafa',
                  borderRadius: 6,
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ color: '#262626', marginBottom: 4 }}>{note.content}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c' }}>
                  <span>{note.author}</span>
                  <span>{note.createdAt}</span>
                </div>
              </div>
            ))}
          </Card>
        </Col>

        {/* Right Column: Compact KPIs & Activity Tabs */}
        <Col xs={24} lg={16} xl={17}>
          {/* 4 Compact Top KPI Cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
                <Statistic
                  title="Tổng chi tiêu LTV"
                  value={metrics.totalSpent}
                  formatter={(val) => `${Number(val).toLocaleString('vi-VN')} đ`}
                  valueStyle={{ color: '#cf1322', fontWeight: 700, fontSize: 16 }}
                  prefix={<ShoppingOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
                <Statistic
                  title="Tổng đơn hàng"
                  value={metrics.totalOrders}
                  suffix={`(${metrics.completedOrders} hoàn tất)`}
                  valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: 16 }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
                <Statistic
                  title="Thiết bị & Bảo hành"
                  value={metrics.activeWarranties}
                  suffix="hiệu lực"
                  valueStyle={{ color: '#52c41a', fontWeight: 700, fontSize: 16 }}
                  prefix={<SafetyCertificateOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
                <Statistic
                  title="Vé hỗ trợ / Trả góp"
                  value={metrics.totalTickets + metrics.totalInstallments}
                  suffix={`(${metrics.openTickets} vé mở)`}
                  valueStyle={{ color: '#fa8c16', fontWeight: 700, fontSize: 16 }}
                  prefix={<CustomerServiceOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Activity Tabs Card */}
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
            <Tabs
              defaultActiveKey="orders"
              items={[
                {
                  key: 'orders',
                  label: (
                    <span>
                      <ShoppingOutlined /> Lịch sử Đơn hàng ({recentOrders.length})
                    </span>
                  ),
                  children: (
                    <Table
                      rowKey="id"
                      columns={orderColumns}
                      dataSource={recentOrders}
                      pagination={false}
                      scroll={{ x: 750 }}
                      locale={{ emptyText: <Empty description="Khách hàng chưa có đơn hàng nào" /> }}
                    />
                  ),
                },
                {
                  key: 'warranties',
                  label: (
                    <span>
                      <SafetyCertificateOutlined /> Thiết bị & Bảo hành ({warranties.length})
                    </span>
                  ),
                  children: (
                    <Table
                      rowKey="id"
                      columns={warrantyColumns}
                      dataSource={warranties}
                      pagination={false}
                      scroll={{ x: 750 }}
                      locale={{ emptyText: <Empty description="Chưa có thiết bị đăng ký bảo hành" /> }}
                    />
                  ),
                },
                {
                  key: 'installments',
                  label: (
                    <span>
                      <CreditCardOutlined /> Hồ sơ Trả góp ({installments.length})
                    </span>
                  ),
                  children: (
                    <Table
                      rowKey="id"
                      columns={installmentColumns}
                      dataSource={installments}
                      pagination={false}
                      scroll={{ x: 750 }}
                      locale={{ emptyText: <Empty description="Khách hàng chưa đăng ký trả góp" /> }}
                    />
                  ),
                },
                {
                  key: 'tickets',
                  label: (
                    <span>
                      <CustomerServiceOutlined /> Vé Hỗ trợ ({tickets.length})
                    </span>
                  ),
                  children: (
                    <Table
                      rowKey="id"
                      columns={ticketColumns}
                      dataSource={tickets}
                      pagination={false}
                      scroll={{ x: 750 }}
                      locale={{ emptyText: <Empty description="Khách hàng chưa gửi vé hỗ trợ nào" /> }}
                    />
                  ),
                },
                {
                  key: 'addresses',
                  label: (
                    <span>
                      <HomeOutlined /> Sổ địa chỉ ({addresses.length})
                    </span>
                  ),
                  children: (
                    <Row gutter={[16, 16]}>
                      {addresses.length === 0 ? (
                        <Col span={24}>
                          <Empty description="Chưa lưu địa chỉ giao hàng nào" />
                        </Col>
                      ) : (
                        addresses.map((addr: any) => (
                          <Col xs={24} sm={12} key={addr.id}>
                            <Card
                              size="small"
                              title={addr.recipientName || 'Địa chỉ nhận hàng'}
                              extra={addr.isDefault && <Badge status="success" text="Mặc định" />}
                              style={{ borderRadius: 6 }}
                            >
                              <p style={{ margin: '4px 0' }}>
                                <Text strong>SĐT: </Text>
                                {addr.phone || 'Chưa cập nhật'}
                              </p>
                              <p style={{ margin: '4px 0' }}>
                                <Text strong>Địa chỉ: </Text>
                                {[addr.addressLine1, addr.ward, addr.district, addr.city]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            </Card>
                          </Col>
                        ))
                      )}
                    </Row>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Internal Note Modal */}
      <Modal
        title="Thêm Ghi chú CRM Nội bộ"
        open={noteModalOpen}
        onCancel={() => setNoteModalOpen(false)}
        onOk={handleAddNote}
        okText="Lưu ghi chú"
      >
        <Paragraph type="secondary">
          Ghi chú này chỉ hiển thị với nhân viên và quản trị viên, dùng để theo dõi hành vi, nhu cầu và lưu ý đặc biệt cho khách hàng {fullName}.
        </Paragraph>
        <TextArea
          rows={4}
          placeholder="Ví dụ: Khách quan tâm iPhone 16 Pro Max màu titan sa mạc, gọi tư vấn sau 17h..."
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
        />
      </Modal>
    </div>
  );
};
