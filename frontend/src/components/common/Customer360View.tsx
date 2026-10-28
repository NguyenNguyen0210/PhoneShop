import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  Tag,
  Button,
  Tabs,
  Table,
  Avatar,
  Row,
  Col,
  Empty,
  message,
  Statistic,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  ShoppingOutlined,
  WalletOutlined,
  UserOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { userService } from '../../services/userService';
import type { Customer360Data } from '../../types/customer';

const { Title, Text } = Typography;

export interface Customer360ViewProps {
  userId: string;
  backPath: string;
}

export const Customer360View: React.FC<Customer360ViewProps> = ({ userId, backPath }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<Customer360Data | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    if (!userId) {
      return;
    }
    const fetchData = async () => {
      try {
        const res = await userService.getCustomer360(userId);
        if (!ignore) {
          setData(res);
        }
      } catch (err: any) {
        if (!ignore) {
          console.error('Failed to load customer 360:', err);
          const msg = err?.response?.data?.message || 'Không thể tải hồ sơ khách hàng 360°';
          message.error(msg);
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    void fetchData();
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data || !data.customer) {
    return (
      <div style={{ padding: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(backPath)}
          style={{ marginBottom: 16 }}
        >
          Quay lại
        </Button>
        <Card style={{ borderRadius: 8, padding: '40px 0', textAlign: 'center' }}>
          <Empty description={errorMessage || 'Không tìm thấy dữ liệu khách hàng'}>
            <Button type="primary" onClick={() => navigate(backPath)}>
              Quay lại danh sách
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  const { customer, metrics, addresses = [], recentOrders = [] } = data;
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Chưa cập nhật';
  const initials = fullName !== 'Chưa cập nhật' && fullName.length > 0 ? fullName.charAt(0).toUpperCase() : 'U';

  const renderCustomerStatusTag = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Tag color="green">Hoạt động</Tag>;
      case 'INACTIVE':
        return <Tag color="default">Không hoạt động</Tag>;
      case 'BANNED':
        return <Tag color="red">Bị khóa</Tag>;
      default:
        return <Tag>{status || 'Không xác định'}</Tag>;
    }
  };

  const orderColumns: ColumnsType<Customer360Data['recentOrders'][number]> = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (val: string) => (
        <Text strong style={{ color: '#1677ff' }}>
          {val || '—'}
        </Text>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => (val ? new Date(val).toLocaleDateString('vi-VN') : '—'),
    },
    {
      title: 'Số sản phẩm',
      dataIndex: 'itemCount',
      key: 'itemCount',
      render: (val: number) => val ?? 0,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0),
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        let color = 'default';
        let text = val;
        if (val === 'COMPLETED' || val === 'DELIVERED') {
          color = 'green';
          text = 'Hoàn tất';
        } else if (val === 'CANCELLED') {
          color = 'red';
          text = 'Đã hủy';
        } else if (val === 'PROCESSING') {
          color = 'blue';
          text = 'Đang xử lý';
        } else if (val === 'CONFIRMED') {
          color = 'cyan';
          text = 'Đã xác nhận';
        } else if (val === 'SHIPPING') {
          color = 'blue';
          text = 'Đang giao hàng';
        } else if (val === 'PENDING') {
          color = 'orange';
          text = 'Chờ xử lý';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Trạng thái thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (val: string) => {
        let color = 'orange';
        let text = val;
        if (val === 'PAID') {
          color = 'green';
          text = 'Đã thanh toán';
        } else if (val === 'FAILED') {
          color = 'red';
          text = 'Thất bại';
        } else if (val === 'PENDING') {
          color = 'orange';
          text = 'Chờ thanh toán';
        }
        return <Tag color={color}>{text || 'Chưa thanh toán'}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(backPath)}
        >
          Quay lại
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Hồ sơ khách hàng 360°
        </Title>
      </div>

      {/* Customer Info Card */}
      <Card style={{ borderRadius: 8 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col>
            <Avatar
              size={64}
              src={customer.avatarUrl || undefined}
              icon={!customer.avatarUrl && <UserOutlined />}
              style={{ backgroundColor: '#1677ff', fontSize: 24 }}
            >
              {!customer.avatarUrl && initials}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Space size="middle" wrap style={{ marginBottom: 8, alignItems: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>
                {fullName}
              </Title>
              {renderCustomerStatusTag(customer.status)}
            </Space>
            <Row gutter={[24, 8]}>
              <Col xs={24} sm={8}>
                <Space>
                  <MailOutlined style={{ color: '#8c8c8c' }} />
                  <Text type="secondary">Email:</Text>
                  <Text strong>{customer.email || '—'}</Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space>
                  <PhoneOutlined style={{ color: '#8c8c8c' }} />
                  <Text type="secondary">SĐT:</Text>
                  <Text strong>{customer.phone || 'Chưa cập nhật'}</Text>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Space>
                  <CalendarOutlined style={{ color: '#8c8c8c' }} />
                  <Text type="secondary">Ngày tạo:</Text>
                  <Text strong>
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString('vi-VN')
                      : '—'}
                  </Text>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 2 KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card style={{ borderRadius: 8 }}>
            <Statistic
              title="Tổng đơn hàng"
              value={metrics?.totalOrders ?? 0}
              prefix={<ShoppingOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card style={{ borderRadius: 8 }}>
            <Statistic
              title="Tổng chi tiêu"
              value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                metrics?.totalSpent || 0,
              )}
              prefix={<WalletOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 2 Tabs */}
      <Card style={{ borderRadius: 8 }}>
        <Tabs
          defaultActiveKey="orders"
          items={[
            {
              key: 'orders',
              label: (
                <Space>
                  <ShoppingOutlined />
                  <span>Lịch sử đơn hàng</span>
                </Space>
              ),
              children:
                recentOrders.length === 0 ? (
                  <Empty description="Chưa có lịch sử đơn hàng nào" style={{ padding: 40 }} />
                ) : (
                  <Table
                    rowKey="id"
                    dataSource={recentOrders}
                    columns={orderColumns}
                    pagination={{ pageSize: 5 }}
                  />
                ),
            },
            {
              key: 'addresses',
              label: (
                <Space>
                  <HomeOutlined />
                  <span>Sổ địa chỉ</span>
                </Space>
              ),
              children:
                addresses.length === 0 ? (
                  <Empty description="Chưa có địa chỉ nào được lưu" style={{ padding: 40 }} />
                ) : (
                  <Row gutter={[16, 16]}>
                    {addresses.map((address) => (
                      <Col xs={24} sm={12} md={8} key={address.id}>
                        <Card
                          size="small"
                          bordered
                          style={{
                            borderRadius: 8,
                            borderColor: address.isDefault ? '#1677ff' : undefined,
                            height: '100%',
                          }}
                          title={
                            <Space>
                              <HomeOutlined />
                              <span>{address.recipientName}</span>
                              {address.isDefault && <Tag color="cyan">Mặc định</Tag>}
                            </Space>
                          }
                        >
                          <p style={{ margin: '4px 0' }}>
                            <Text type="secondary">Số điện thoại: </Text>
                            <Text strong>{address.phone}</Text>
                          </p>
                          <p style={{ margin: '4px 0' }}>
                            <Text type="secondary">Địa chỉ: </Text>
                            <span>
                              {[address.addressLine1, address.ward, address.district, address.city]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </p>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Customer360View;
