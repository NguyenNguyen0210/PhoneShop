import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  ShoppingOutlined,
  AlertOutlined,
  BarcodeOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { orderService } from '../../../services/orderService';
import type { Order } from '../../../types';

const { Title, Text } = Typography;

export const AdminDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService
      .getAllOrdersAdmin()
      .then((data) => {
        if (data && data.length > 0) {
          setOrders(data);
        } else {
          // Mock recent orders for preview
          setOrders([
            {
              id: 'ord-101',
              orderNumber: 'ORD-202610-A91',
              userId: 'u1',
              customerName: 'Hoàng Văn Thắng',
              shippingPhone: '0908123456',
              shippingAddress: '123 Lê Lợi, Quận 1, TP.HCM',
              status: 'CONFIRMED',
              paymentMethod: 'VIETQR',
              paymentStatus: 'PAID',
              subtotal: 29990000,
              shippingFee: 0,
              discount: 0,
              totalAmount: 29990000,
              createdAt: new Date().toISOString(),
              items: [],
            },
            {
              id: 'ord-102',
              orderNumber: 'ORD-202610-B42',
              userId: 'u2',
              customerName: 'Đặng Mai Phương',
              shippingPhone: '0987654321',
              shippingAddress: '45 Cầu Giấy, Hà Nội',
              status: 'PENDING',
              paymentMethod: 'COD',
              paymentStatus: 'PENDING',
              subtotal: 27990000,
              shippingFee: 0,
              discount: 50000,
              totalAmount: 27940000,
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              items: [],
            },
            {
              id: 'ord-103',
              orderNumber: 'ORD-202610-C77',
              userId: 'u3',
              customerName: 'Nguyễn Tấn Dũng',
              shippingPhone: '0912389123',
              shippingAddress: '88 Nguyễn Huệ, Đà Nẵng',
              status: 'SHIPPING',
              paymentMethod: 'VNPAY',
              paymentStatus: 'PAID',
              subtotal: 35990000,
              shippingFee: 0,
              discount: 0,
              totalAmount: 35990000,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              items: [],
            },
          ]);
        }
      })
      .catch(() => {
        // Mock fallback
      })
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600 }}>
            ĐÃ XÁC NHẬN
          </Tag>
        );
      case 'PROCESSING':
        return (
          <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
            ĐANG ĐÓNG GÓI
          </Tag>
        );
      case 'SHIPPING':
        return (
          <Tag color="geekblue" style={{ borderRadius: 6, fontWeight: 600 }}>
            ĐANG GIAO HÀNG
          </Tag>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <Tag color="green" style={{ borderRadius: 6, fontWeight: 600 }}>
            HOÀN TẤT
          </Tag>
        );
      case 'CANCELLED':
        return (
          <Tag color="error" style={{ borderRadius: 6, fontWeight: 600 }}>
            ĐÃ HỦY
          </Tag>
        );
      default:
        return (
          <Tag color="warning" style={{ borderRadius: 6, fontWeight: 600 }}>
            CHỜ XỬ LÝ
          </Tag>
        );
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (num: string) => (
        <Text strong style={{ fontFamily: 'monospace', color: '#38bdf8', letterSpacing: 0.5 }}>
          {num}
        </Text>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.shippingPhone}
          </Text>
        </div>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (m: string) => (
        <Tag
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            fontWeight: 600,
            borderRadius: 6,
          }}
        >
          {m}
        </Tag>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
          {formatPrice(val)}
        </span>
      ),
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => getStatusTag(s),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: () => (
        <Link to="/admin/orders">
          <Button
            size="small"
            icon={<EyeOutlined />}
            style={{
              background: '#151d30',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            Xem chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={3} style={{ margin: 0, color: '#f8fafc', fontWeight: 800, letterSpacing: -0.3 }}>
              Tổng quan hệ thống
            </Title>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontWeight: 600,
              }}
            >
              Obsidian Dashboard
            </span>
          </div>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
            Theo dõi tổng doanh thu, lưu lượng đơn hàng và chỉ số giữ chỗ thiết bị IMEI tự động
          </Text>
        </div>

        {/* Engine status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            borderRadius: 10,
            background: '#0e1526',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>Core Engine</span>
          </div>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
          <span style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'monospace' }}>p99: 14ms</span>
        </div>
      </div>

      {/* Row of 4 Dark KPI Stat Cards with Gradient Borders */}
      <Row gutter={[16, 16]}>
        {/* KPI 1: Revenue */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#0e1526',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                  Tổng doanh thu
                </span>
              }
              value={385420000}
              precision={0}
              valueStyle={{
                color: '#f8fafc',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<DollarOutlined style={{ color: '#6366f1', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>₫</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                <RiseOutlined /> +18.5%
              </span>
              <Text type="secondary" style={{ fontSize: 11 }}>
                so với tháng trước
              </Text>
            </div>
          </Card>
        </Col>

        {/* KPI 2: Orders */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#0e1526',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                  Đơn hàng mới trong ngày
                </span>
              }
              value={24}
              valueStyle={{
                color: '#f8fafc',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<ShoppingOutlined style={{ color: '#10b981', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>đơn</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <LockOutlined /> 5 đơn giữ chỗ 15p
              </span>
              <Text type="secondary" style={{ fontSize: 11 }}>
                (RESERVED)
              </Text>
            </div>
          </Card>
        </Col>

        {/* KPI 3: Low Inventory Alert */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#0e1526',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                  Cảnh báo tồn kho thấp
                </span>
              }
              value={4}
              valueStyle={{
                color: '#f8fafc',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<AlertOutlined style={{ color: '#f59e0b', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>mã SKU</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11, color: '#f87171' }}>
                Cần nhập thêm lô IMEI mới
              </Text>
            </div>
          </Card>
        </Col>

        {/* KPI 4: Concurrency Locks */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#0e1526',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, #818cf8, #c084fc)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                  Khóa giữ chỗ IMEI tức thời
                </span>
              }
              value={7}
              valueStyle={{
                color: '#f8fafc',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<BarcodeOutlined style={{ color: '#818cf8', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>máy</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600 }}>
                SKIP LOCKED Active
              </span>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Concurrency an toàn
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Action Shortcuts Banner */}
      <Card
        bordered={false}
        style={{
          borderRadius: 14,
          background: 'linear-gradient(135deg, #0e1526 0%, #151d30 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#38bdf8',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 6,
              }}
            >
              <ThunderboltOutlined /> Quy trình vận hành IMEI độc quyền & Khóa Concurrency
            </div>
            <div
              style={{
                color: '#f8fafc',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              Nhập lô IMEI hoặc điều phối giao hàng nhanh
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              Kiểm tra tính hợp lệ thuật toán Luhn 15 số trước khi đưa thiết bị vào trạng thái sẵn sàng xuất kho
            </div>
          </div>
          <Space size="middle">
            <Link to="/admin/imei">
              <Button
                type="primary"
                size="large"
                style={{
                  background: '#6366f1',
                  borderColor: '#6366f1',
                  fontWeight: 600,
                  borderRadius: 8,
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
                }}
              >
                Quản lý kho IMEI
              </Button>
            </Link>
            <Link to="/admin/orders">
              <Button
                size="large"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Xem toàn bộ đơn hàng
              </Button>
            </Link>
          </Space>
        </div>
      </Card>

      {/* Recent Orders Table Card */}
      <Card
        title={
          <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>
            Đơn hàng phát sinh gần đây
          </span>
        }
        bordered={false}
        style={{
          borderRadius: 14,
          background: '#0e1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        extra={
          <Link
            to="/admin/orders"
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#818cf8',
              fontWeight: 600,
            }}
          >
            Xem tất cả đơn <ArrowRightOutlined />
          </Link>
        }
      >
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={false}
          style={{ background: 'transparent' }}
        />
      </Card>
    </div>
  );
};

export const AdminDashboard = AdminDashboardPage;
