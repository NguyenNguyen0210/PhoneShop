import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  ShoppingOutlined,
  AlertOutlined,
  UsergroupAddOutlined,
  EyeOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { orderService } from '../../../services/orderService';
import type { Order } from '../../../types';

const { Title, Text } = Typography;

export const AdminDashboard: React.FC = () => {
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
        return <Tag color="blue">ĐÃ XÁC NHẬN</Tag>;
      case 'PROCESSING':
        return <Tag color="cyan">ĐANG ĐÓNG GÓI</Tag>;
      case 'SHIPPING':
        return <Tag color="orange">ĐANG GIAO HÀNG</Tag>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <Tag color="green">HOÀN TẤT</Tag>;
      case 'CANCELLED':
        return <Tag color="red">ĐÃ HỦY</Tag>;
      default:
        return <Tag color="gold">CHỜ XỬ LÝ</Tag>;
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (num: string) => <Text strong style={{ fontFamily: 'monospace' }}>{num}</Text>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.shippingPhone}</Text>
        </div>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (m: string) => <Tag color="geekblue">{m}</Tag>,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => (
        <Text strong style={{ color: '#dc2626' }}>
          {formatPrice(val)}
        </Text>
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
          <Button size="small" icon={<EyeOutlined />}>
            Xem chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Bảng điều khiển kinh doanh (Dashboard)
        </Title>
        <Text type="secondary">
          Theo dõi tổng doanh thu, lưu lượng đơn hàng và chỉ số giữ chỗ thiết bị IMEI tự động
        </Text>
      </div>

      {/* Row of 4 KPI Stat Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 16 }}>
            <Statistic
              title="Tổng doanh thu tháng này"
              value={385420000}
              precision={0}
              valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
              prefix={<DollarOutlined />}
              suffix="₫"
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Tăng 18.5% so với tháng trước
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 16 }}>
            <Statistic
              title="Đơn hàng mới trong ngày"
              value={24}
              valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
              prefix={<ShoppingOutlined />}
              suffix="đơn"
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              5 đơn đang khóa giữ chỗ 15 phút
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 16 }}>
            <Statistic
              title="Cảnh báo tồn kho thấp"
              value={4}
              valueStyle={{ color: '#ea580c', fontWeight: 'bold' }}
              prefix={<AlertOutlined />}
              suffix="mã SKU"
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Cần nhập thêm lô IMEI mới
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 16 }}>
            <Statistic
              title="Khách hàng đăng ký mới"
              value={158}
              valueStyle={{ color: '#9333ea', fontWeight: 'bold' }}
              prefix={<UsergroupAddOutlined />}
              suffix="người"
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Tỷ lệ quay lại 42%
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Quick Action Shortcuts */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
              Quy trình vận hành IMEI độc quyền
            </div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
              Nhập lô IMEI hoặc điều phối giao hàng nhanh
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              Kiểm tra tính hợp lệ thuật toán Luhn 15 số trước khi đưa thiết bị vào trạng thái sẵn sàng xuất kho
            </div>
          </div>
          <Space>
            <Link to="/admin/imei">
              <Button type="primary" size="large" style={{ background: '#2563eb' }}>
                Quản lý kho IMEI
              </Button>
            </Link>
            <Link to="/admin/orders">
              <Button ghost size="large">
                Xem toàn bộ đơn hàng
              </Button>
            </Link>
          </Space>
        </div>
      </Card>

      {/* Recent Orders Table */}
      <Card
        title="Đơn hàng phát sinh gần đây"
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        extra={
          <Link to="/admin/orders" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
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
        />
      </Card>
    </div>
  );
};
