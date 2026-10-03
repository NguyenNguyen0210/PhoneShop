import type React from 'react';
import { Card, Tabs, Table, Tag, Button, Badge, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  ArrowRightOutlined,
  WarningOutlined,
  InboxOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { Order } from '../../../../types';
import type { LowStockItem } from '../../../../types/report';

const { Text } = Typography;

interface DashboardAlertsAndOrdersProps {
  orders: Order[];
  lowStockItems: LowStockItem[];
  loading: boolean;
}

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

const renderOrderStatusTag = (status: string) => {
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

export const DashboardAlertsAndOrders: React.FC<DashboardAlertsAndOrdersProps> = ({
  orders,
  lowStockItems,
  loading,
}) => {
  const orderColumns: ColumnsType<Order> = [
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
          {record.shippingPhone && (
            <Text type="secondary" style={{ fontSize: 12, color: '#64748b' }}>
              {record.shippingPhone}
            </Text>
          )}
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
          {formatVND(Number(val) || 0)}
        </span>
      ),
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => renderOrderStatusTag(s),
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
            Chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  const lowStockColumns: ColumnsType<LowStockItem> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string) => (
        <Text strong style={{ color: '#0f172a' }}>
          {name}
        </Text>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string) => (
        <Text style={{ fontFamily: 'monospace', color: '#475569', fontSize: 13 }}>
          {sku}
        </Text>
      ),
    },
    {
      title: 'Tồn khả dụng',
      dataIndex: 'availableQty',
      key: 'availableQty',
      align: 'center',
      render: (qty: number) => (
        <Tag
          color={qty <= 0 ? 'error' : 'warning'}
          style={{ borderRadius: 6, fontWeight: 700, minWidth: 32, textAlign: 'center' }}
        >
          {qty}
        </Tag>
      ),
    },
    {
      title: 'Mức tối thiểu',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      align: 'center',
      render: (level: number) => (
        <span style={{ color: '#64748b', fontWeight: 600 }}>{level}</span>
      ),
    },
    {
      title: 'Thiếu hụt',
      dataIndex: 'deficit',
      key: 'deficit',
      align: 'center',
      render: (def: number) => (
        <Tag color="error" style={{ borderRadius: 6, fontWeight: 700 }}>
          Thiếu {def}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: () => (
        <Link to="/admin/inventory">
          <Button
            size="small"
            type="primary"
            danger
            ghost
            icon={<WarningOutlined />}
            style={{ borderRadius: 6, fontSize: 12 }}
          >
            Nhập kho ngay
          </Button>
        </Link>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'recent-orders',
      label: (
        <Space size={6}>
          <ShoppingOutlined />
          <span>Đơn hàng phát sinh gần đây</span>
        </Space>
      ),
      children: (
        <Table<Order>
          dataSource={orders}
          columns={orderColumns}
          rowKey={(r) => r.id || r.orderNumber}
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'Không có đơn hàng nào gần đây' }}
        />
      ),
    },
    {
      key: 'low-stock',
      label: (
        <Space size={6}>
          <InboxOutlined />
          <span>Cảnh báo tồn kho thấp</span>
          <Badge
            count={lowStockItems?.length || 0}
            overflowCount={99}
            style={{
              backgroundColor: '#ef4444',
              boxShadow: '0 0 0 1px #fff',
              fontWeight: 700,
            }}
          />
        </Space>
      ),
      children: (
        <Table<LowStockItem>
          dataSource={lowStockItems}
          columns={lowStockColumns}
          rowKey={(r) => r.variantId || r.sku}
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'Tất cả sản phẩm đều có tồn kho an toàn' }}
        />
      ),
    },
  ];

  return (
    <Card
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
      extra={
        <Link to="/admin/orders">
          <Button type="link" size="small" icon={<ArrowRightOutlined />} iconPlacement="end">
            Xem tất cả đơn
          </Button>
        </Link>
      }
      data-testid="dashboard-alerts-and-orders-card"
    >
      <Tabs defaultActiveKey="recent-orders" items={tabItems} />
    </Card>
  );
};

export default DashboardAlertsAndOrders;
