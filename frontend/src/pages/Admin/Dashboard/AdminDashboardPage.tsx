import React, { useState, useEffect, useMemo } from 'react';
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
import { imeiService } from '../../../services/imeiService';
import { productService } from '../../../services/productService';
import type { Order, ImeiDevice } from '../../../types';

const { Title, Text } = Typography;

export const AdminDashboardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [imeis, setImeis] = useState<ImeiDevice[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      orderService.getAllOrdersAdmin(),
      imeiService.getAllImeis(),
      productService.getAllProductsAdmin(),
    ])
      .then(([ordersData, imeisData, prodsData]) => {
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
        }
        if (Array.isArray(imeisData)) {
          setImeis(imeisData);
        }
        if (prodsData?.total) {
          setProductsCount(prodsData.total);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data from database API:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [orders]);

  const availableImeisCount = useMemo(() => {
    return imeis.filter((i) => i.status === 'AVAILABLE').length;
  }, [imeis]);

  const reservedImeisCount = useMemo(() => {
    return imeis.filter((i) => i.status === 'RESERVED').length;
  }, [imeis]);

  const soldImeisCount = useMemo(() => {
    return imeis.filter((i) => i.status === 'SOLD').length;
  }, [imeis]);

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
        <Text strong style={{ fontFamily: 'monospace', color: '#2563eb', letterSpacing: 0.5 }}>
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
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12, color: '#64748b' }}>
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
            background: '#eff6ff',
            borderColor: '#bfdbfe',
            color: '#2563eb',
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
        <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
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
              background: '#f8fafc',
              borderColor: '#e2e8f0',
              color: '#475569',
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
            <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: -0.3 }}>
              Tổng quan hệ thống
            </Title>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: 600,
              }}
            >
              Admin Dashboard
            </span>
          </div>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'block' }}>
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Core Engine</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontSize: 12, color: '#2563eb', fontFamily: 'monospace', fontWeight: 600 }}>p99: 14ms</span>
        </div>
      </div>

      {/* Row of 4 Bento KPI Stat Cards */}
      <Row gutter={[16, 16]}>
        {/* KPI 1: Revenue */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 20 } }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                  Tổng doanh thu
                </span>
              }
              value={totalRevenue}
              precision={0}
              valueStyle={{
                color: '#0f172a',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<DollarOutlined style={{ color: '#2563eb', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>₫</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ color: '#059669', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                <RiseOutlined /> Thực tế
              </span>
              <Text style={{ fontSize: 11, color: '#64748b' }}>
                từ {orders.filter((o) => o.status !== 'CANCELLED').length} đơn hàng
              </Text>
            </div>
          </Card>
        </Col>

        {/* KPI 2: Orders */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 20 } }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                  Tổng số đơn hàng
                </span>
              }
              value={orders.length}
              valueStyle={{
                color: '#0f172a',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<ShoppingOutlined style={{ color: '#10b981', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>đơn</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ color: '#d97706', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <LockOutlined /> {reservedImeisCount} đơn giữ chỗ 15p
              </span>
              <Text style={{ fontSize: 11, color: '#64748b' }}>
                (RESERVED)
              </Text>
            </div>
          </Card>
        </Col>

        {/* KPI 3: Available Inventory Devices */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 20 } }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                  Thiết bị sẵn sàng xuất kho
                </span>
              }
              value={availableImeisCount}
              valueStyle={{
                color: '#0f172a',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<AlertOutlined style={{ color: '#f59e0b', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>máy</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Text style={{ fontSize: 11, color: '#059669' }}>
                {productsCount} sản phẩm, {imeis.length} IMEI định danh
              </Text>
            </div>
          </Card>
        </Col>

        {/* KPI 4: Concurrency Locks & Sold Devices */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 20 } }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(90deg, #2563eb, #6366f1)',
              }}
            />
            <Statistic
              title={
                <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                  Thiết bị đã xuất bán
                </span>
              }
              value={soldImeisCount}
              valueStyle={{
                color: '#0f172a',
                fontWeight: 800,
                fontFamily: 'monospace',
                fontSize: 24,
                letterSpacing: -0.5,
              }}
              prefix={<BarcodeOutlined style={{ color: '#2563eb', fontSize: 20, marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 14, color: '#64748b' }}>máy</span>}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ color: '#2563eb', fontSize: 11, fontWeight: 600 }}>
                Đang giữ chỗ giỏ hàng
              </span>
              <Text style={{ fontSize: 11, color: '#64748b' }}>
                {reservedImeisCount} máy chờ thanh toán
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Action Shortcuts Banner */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1px solid #dbeafe',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)',
        }}
        styles={{ body: { padding: 24 } }}
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
                color: '#2563eb',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginBottom: 6,
              }}
            >
              <ThunderboltOutlined /> Quy trình quản lý kho &amp; Thiết bị chính hãng
            </div>
            <div
              style={{
                color: '#0f172a',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              Nhập lô IMEI hoặc điều phối giao hàng nhanh
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              Kiểm tra định dạng IMEI chuẩn 15 số quốc tế trước khi đưa thiết bị vào trạng thái sẵn sàng xuất kho
            </div>
          </div>
          <Space size="middle">
            <Link to="/admin/imei">
              <Button
                type="primary"
                size="large"
                style={{
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontWeight: 600,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                }}
              >
                Quản lý kho IMEI
              </Button>
            </Link>
            <Link to="/admin/orders">
              <Button
                size="large"
                style={{
                  background: '#ffffff',
                  borderColor: '#e2e8f0',
                  color: '#0f172a',
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
          <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 16 }}>
            Đơn hàng phát sinh gần đây
          </span>
        }
        bordered={false}
        style={{
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
        extra={
          <Link
            to="/admin/orders"
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#2563eb',
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
