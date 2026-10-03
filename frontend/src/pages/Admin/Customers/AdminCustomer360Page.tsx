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
  Descriptions,
  Spin,
  Alert,
  Empty,
  Badge,
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
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { customerService } from '../../../services/customerService';
import type { Customer360Data } from '../../../types/customer';

const { Title, Text } = Typography;

export const AdminCustomer360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<Customer360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomer360 = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await customerService.getCustomer360(id);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải hồ sơ khách hàng 360°');
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

  if (error || !data) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/customers')} style={{ marginBottom: 16 }}>
          Quay lại danh sách
        </Button>
        <Alert type="error" message="Lỗi" description={error || 'Không tìm thấy dữ liệu'} showIcon />
      </div>
    );
  }

  const { customer, metrics, addresses, recentOrders, warranties, installments, tickets } = data;
  const fullName = [customer.lastName, customer.firstName].filter(Boolean).join(' ') || 'Khách hàng';

  // Determine VIP Tier
  const getTier = (spent: number) => {
    if (spent >= 50000000) return { name: 'VIP Kim Cương', color: 'purple' };
    if (spent >= 25000000) return { name: 'VIP Vàng', color: 'gold' };
    if (spent >= 10000000) return { name: 'Thành viên Bạc', color: 'blue' };
    return { name: 'Thành viên Chuẩn', color: 'default' };
  };
  const tier = getTier(metrics.totalSpent);

  // Orders Table Columns
  const orderColumns: ColumnsType<any> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>,
    },
    {
      title: 'Sản phẩm',
      key: 'items',
      render: (_, record) => {
        const items = record.items || [];
        return (
          <div>
            {items.map((it: any) => (
              <div key={it.id} style={{ fontSize: 13 }}>
                • {it.productName} <Text type="secondary">(x{it.quantity})</Text>
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
      render: (amount) => <Text strong>{Number(amount).toLocaleString('vi-VN')} đ</Text>,
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'COMPLETED') return <Tag color="success">Hoàn tất</Tag>;
        if (status === 'CANCELLED') return <Tag color="error">Đã hủy</Tag>;
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
      title: 'Sản phẩm',
      key: 'product',
      render: (_, record) => record.orderItem?.productName || 'Thiết bị',
    },
    {
      title: 'IMEI / Serial',
      dataIndex: 'imei',
      key: 'imei',
      render: (val) => <Text code>{val || 'N/A'}</Text>,
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
      title: 'Hết hạn',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
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
      title: 'Kỳ hạn',
      dataIndex: 'termMonths',
      key: 'termMonths',
      render: (t) => `${t} tháng`,
    },
    {
      title: 'Số tiền/tháng',
      dataIndex: 'monthlyPayment',
      key: 'monthlyPayment',
      render: (amt) => `${Number(amt).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        if (st === 'APPROVED') return <Tag color="success">Đã duyệt</Tag>;
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
      title: 'Tiêu đề',
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

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/admin/customers')}
        style={{ marginBottom: 16 }}
      >
        Danh sách khách hàng
      </Button>

      {/* Customer Header Profile Card */}
      <Card bordered={false} style={{ marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={4} style={{ textAlign: 'center' }}>
            <Avatar
              size={96}
              src={customer.avatarUrl}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff', border: '3px solid #e6f7ff' }}
            />
          </Col>
          <Col xs={24} md={20}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Title level={3} style={{ margin: 0 }}>
                {fullName}
              </Title>
              <Tag color={tier.color} icon={<CrownOutlined />}>
                {tier.name}
              </Tag>
              <Tag color={customer.status === 'ACTIVE' ? 'success' : 'error'}>
                {customer.status === 'ACTIVE' ? 'Hoạt động' : 'Bị hạn chế'}
              </Tag>
            </div>

            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Email">{customer.email}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{customer.phone || 'Chưa cập nhật'}</Descriptions.Item>
              <Descriptions.Item label="Ngày tham gia">
                {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
              </Descriptions.Item>
              <Descriptions.Item label="Đăng nhập gần nhất">
                {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleString('vi-VN') : 'Chưa ghi nhận'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {/* 4 Top KPI Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng chi tiêu"
              value={metrics.totalSpent}
              formatter={(val) => `${Number(val).toLocaleString('vi-VN')} đ`}
              valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng đơn hàng"
              value={metrics.totalOrders}
              suffix={`(${metrics.completedOrders} hoàn tất / ${metrics.cancelledOrders} hủy)`}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Vé hỗ trợ (Tickets)"
              value={metrics.totalTickets}
              suffix={`(${metrics.openTickets} đang mở)`}
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              prefix={<CustomerServiceOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Bảo hành đang hoạt động"
              value={metrics.activeWarranties}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Customer 360 Tabs */}
      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
                      <Col xs={24} sm={12} md={8} key={addr.id}>
                        <Card
                          size="small"
                          title={addr.recipientName || 'Địa chỉ'}
                          extra={addr.isDefault && <Badge status="success" text="Mặc định" />}
                        >
                          <p style={{ margin: '4px 0' }}>
                            <Text strong>SĐT: </Text>
                            {addr.phone || '—'}
                          </p>
                          <p style={{ margin: '4px 0' }}>
                            <Text strong>Địa chỉ: </Text>
                            {[addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}
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
    </div>
  );
};

export default AdminCustomer360Page;
