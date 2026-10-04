import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Spin, Tag, Button, Tabs, Table, Avatar, Row, Col, Alert } from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  ShoppingOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { userService } from '../../../services/userService';

const { Title, Text } = Typography;

export const StaffCustomer360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomer360 = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getCustomer360(id);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load customer 360:', err);
      setError(err?.response?.data?.message || 'Không thể tải hồ sơ khách hàng 360°');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCustomer360();
  }, [loadCustomer360]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card style={{ borderRadius: 10 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/staff/customers');
            }
          }}
          style={{ marginBottom: 16 }}
        >
          Quay lại danh sách
        </Button>
        <Alert
          type="error"
          message="Lỗi"
          description={error || 'Không tìm thấy thông tin khách hàng.'}
          showIcon
        />
      </Card>
    );
  }

  const user = data.customer || data.user || data;
  const fullName =
    user.fullName ||
    [user.lastName, user.firstName].filter(Boolean).join(' ') ||
    'Khách hàng';
  const email = user.email || '—';
  const phone = user.phone || 'Chưa cập nhật';
  const avatar = user.avatarUrl || user.avatar;

  const orders = data.recentOrders || data.orders || [];
  const warranties = data.warranties || [];
  const tickets = data.tickets || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/staff/customers');
          }
        }}
        style={{ width: 'fit-content' }}
      >
        Quay lại Danh sách
      </Button>

      {/* Customer Profile Header */}
      <Card style={{ borderRadius: 10 }}>
        <Row gutter={[20, 20]} align="middle">
          <Col>
            <Avatar
              size={64}
              icon={!avatar && <UserOutlined />}
              src={avatar}
              style={{ backgroundColor: '#4f46e5' }}
            >
              {fullName.charAt(0) || 'K'}
            </Avatar>
          </Col>
          <Col flex="auto">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Title level={4} style={{ margin: 0 }}>
                {fullName}
              </Title>
              <Tag color={user.status === 'ACTIVE' ? 'success' : 'default'}>
                {user.status === 'ACTIVE' ? 'Hoạt động' : user.status || 'Khách hàng'}
              </Tag>
            </div>
            <Text type="secondary">
              {email} • {phone}
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Card style={{ borderRadius: 10 }}>
        <Tabs
          defaultActiveKey="orders"
          items={[
            {
              key: 'orders',
              label: (
                <span>
                  <ShoppingOutlined /> Lịch sử Đơn hàng ({orders.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={orders}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    {
                      title: 'Mã đơn',
                      dataIndex: 'orderNumber',
                      key: 'orderNumber',
                      render: (val: string, r: any) => (
                        <Text strong style={{ color: '#1890ff' }}>
                          {val || r.code || (r.id ? r.id.slice(0, 8) : '—')}
                        </Text>
                      ),
                    },
                    {
                      title: 'Sản phẩm',
                      key: 'items',
                      render: (_: unknown, record: any) => {
                        const items = record.items || [];
                        if (items.length === 0) return <Text type="secondary">—</Text>;
                        return (
                          <div>
                            {items.map((it: any, idx: number) => (
                              <div key={it.id || idx} style={{ fontSize: 13 }}>
                                • {it.productName || it.name}{' '}
                                <Text type="secondary">(x{it.quantity || 1})</Text>
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
                      render: (val: number) => (
                        <Text strong>{(val || 0).toLocaleString('vi-VN')} ₫</Text>
                      ),
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (val: string) => {
                        let color = 'processing';
                        if (val === 'COMPLETED' || val === 'DELIVERED') color = 'success';
                        else if (val === 'CANCELLED') color = 'error';
                        return <Tag color={color}>{val}</Tag>;
                      },
                    },
                    {
                      title: 'Ngày tạo',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      render: (val: string) =>
                        val ? new Date(val).toLocaleDateString('vi-VN') : '—',
                    },
                  ]}
                />
              ),
            },
            {
              key: 'warranties',
              label: (
                <span>
                  <SafetyCertificateOutlined /> Bảo hành & Thiết bị ({warranties.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={warranties}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    {
                      title: 'Sản phẩm',
                      key: 'product',
                      render: (_: unknown, record: any) =>
                        record.orderItem?.productName ||
                        record.product?.name ||
                        record.productName ||
                        'Thiết bị',
                    },
                    {
                      title: 'Số IMEI',
                      dataIndex: 'imei',
                      key: 'imei',
                      render: (v: string) => <code>{v || '—'}</code>,
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
                          {status === 'ACTIVE' ? 'Còn hiệu lực' : status || 'N/A'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Hạn bảo hành',
                      dataIndex: 'endDate',
                      key: 'endDate',
                      render: (v: string) =>
                        v ? new Date(v).toLocaleDateString('vi-VN') : '—',
                    },
                  ]}
                />
              ),
            },
            {
              key: 'tickets',
              label: (
                <span>
                  <CustomerServiceOutlined /> Lịch sử Hỗ trợ ({tickets.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={tickets}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    {
                      title: 'Mã vé',
                      dataIndex: 'code',
                      key: 'code',
                      render: (v: string, r: any) => (
                        <Text strong style={{ color: '#1890ff' }}>
                          {v || (r.id ? r.id.slice(0, 8) : '—')}
                        </Text>
                      ),
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
                      render: (cat: string) => (cat ? <Tag color="blue">{cat}</Tag> : '—'),
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (v: string) => {
                        let color = 'default';
                        if (v === 'RESOLVED') color = 'success';
                        else if (v === 'IN_PROGRESS') color = 'processing';
                        else if (v === 'OPEN') color = 'warning';
                        return <Tag color={color}>{v}</Tag>;
                      },
                    },
                    {
                      title: 'Thời gian',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      render: (v: string) =>
                        v ? new Date(v).toLocaleDateString('vi-VN') : '—',
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default StaffCustomer360Page;
