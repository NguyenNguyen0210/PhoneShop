import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  InboxOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { Order, OrderStatus } from '../../../../types';
import { orderService } from '../../../../services/orderService';

const { Text } = Typography;

export interface StaffOrdersQueueProps {
  orders: Order[];
  loading?: boolean;
  onConfirm?: (orderId: string) => Promise<void> | void;
  onPack?: (orderId: string) => Promise<void> | void;
}

const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const renderStatusTag = (status: OrderStatus) => {
  switch (status) {
    case 'PENDING':
      return <Tag color="gold">Chờ xác nhận</Tag>;
    case 'CONFIRMED':
      return <Tag color="blue">Đã xác nhận</Tag>;
    case 'PROCESSING':
      return <Tag color="cyan">Đang xử lý</Tag>;
    case 'PACKED':
      return <Tag color="purple">Đã đóng gói</Tag>;
    case 'SHIPPING':
      return <Tag color="orange">Đang giao</Tag>;
    case 'DELIVERED':
      return <Tag color="green">Đã giao</Tag>;
    case 'COMPLETED':
      return <Tag color="success">Hoàn thành</Tag>;
    case 'CANCELLED':
      return <Tag color="error">Đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

export const StaffOrdersQueue: React.FC<StaffOrdersQueueProps> = ({
  orders,
  loading = false,
  onConfirm,
  onPack,
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleConfirm = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      if (onConfirm) {
        await onConfirm(orderId);
      } else {
        await orderService.updateOrderStatus(orderId, 'confirm');
        message.success('Đã xác nhận đơn hàng thành công');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Xác nhận đơn thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePack = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      if (onPack) {
        await onPack(orderId);
      } else {
        await orderService.updateOrderStatus(orderId, 'pack');
        message.success('Đã chuyển sang đóng gói thành công');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Đóng gói đơn thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (num: string) => (
        <Text strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
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
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{name || 'Khách vãng lai'}</div>
          {record.shippingPhone && (
            <Text type="secondary" style={{ fontSize: 12, color: '#64748b' }}>
              {record.shippingPhone}
            </Text>
          )}
        </div>
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
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => renderStatusTag(status),
    },
    {
      title: 'Thao tác nhanh',
      key: 'actions',
      render: (_, record) => {
        const isBusy = actionLoadingId === record.id;
        return (
          <Space size="small" orientation="horizontal">
            {record.status === 'PENDING' && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={isBusy}
                aria-label="Confirm"
                data-testid={`confirm-btn-${record.id}`}
                style={{
                  backgroundColor: '#f59e0b',
                  borderColor: '#f59e0b',
                  borderRadius: 6,
                }}
                onClick={() => handleConfirm(record.id)}
              >
                Xác nhận
              </Button>
            )}

            {record.status === 'CONFIRMED' && (
              <Button
                type="primary"
                size="small"
                icon={<InboxOutlined />}
                loading={isBusy}
                aria-label="Pack"
                data-testid={`pack-btn-${record.id}`}
                style={{
                  backgroundColor: '#3b82f6',
                  borderColor: '#3b82f6',
                  borderRadius: 6,
                }}
                onClick={() => handlePack(record.id)}
              >
                Đóng gói
              </Button>
            )}

            <Link to={`/staff/orders?id=${record.id}`}>
              <Button
                size="small"
                icon={<EyeOutlined />}
                data-testid={`detail-btn-${record.id}`}
                style={{
                  borderRadius: 6,
                }}
              >
                Chi tiết
              </Button>
            </Link>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SyncOutlined style={{ color: '#2563eb' }} />
          <span>Hàng đợi Đơn hàng Cần xử lý</span>
        </div>
      }
      extra={
        <Link
          to="/staff/orders"
          data-testid="link-all-orders"
          style={{
            fontSize: 13,
            color: '#2563eb',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Xem tất cả <ArrowRightOutlined style={{ fontSize: 11 }} />
        </Link>
      }
      style={{
        borderRadius: 12,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
      styles={{ body: { padding: 0 } }}
    >
      <Table<Order>
        rowKey={(record) => record.id || record.orderNumber}
        columns={columns}
        dataSource={orders}
        loading={loading}
        pagination={{
          pageSize: 6,
          size: 'small',
          showSizeChanger: false,
          style: { padding: '0 16px 12px' },
        }}
        locale={{ emptyText: 'Không có đơn hàng nào cần xử lý' }}
      />
    </Card>
  );
};
