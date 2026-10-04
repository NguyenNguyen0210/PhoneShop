import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, message, Modal, Descriptions, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  InboxOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

            {(record.status === 'CONFIRMED' || record.status === 'PROCESSING') && (
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

            <Button
              size="small"
              icon={<EyeOutlined />}
              data-testid={`detail-btn-${record.id}`}
              style={{
                borderRadius: 6,
              }}
              onClick={() => {
                setViewingOrder(record);
                setIsModalOpen(true);
              }}
            >
              Chi tiết
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
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

      {/* Modal: Xem chi tiết đơn hàng trực tiếp trên dashboard */}
      <Modal
        title={`Chi tiết đơn hàng: ${viewingOrder?.orderNumber || ''}`}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setViewingOrder(null);
        }}
        footer={[
          viewingOrder?.status === 'PENDING' && (
            <Button
              key="confirm"
              type="primary"
              style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
              loading={actionLoadingId === viewingOrder.id}
              onClick={async () => {
                await handleConfirm(viewingOrder.id);
                setViewingOrder((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : null));
              }}
            >
              Xác nhận đơn
            </Button>
          ),
          viewingOrder?.status === 'CONFIRMED' && (
            <Button
              key="pack"
              type="primary"
              style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
              loading={actionLoadingId === viewingOrder.id}
              onClick={async () => {
                await handlePack(viewingOrder.id);
                setViewingOrder((prev) => (prev ? { ...prev, status: 'PACKED' } : null));
              }}
            >
              Đóng gói đơn
            </Button>
          ),
          <Button
            key="manage"
            icon={<ArrowRightOutlined />}
            onClick={() => {
              if (viewingOrder) {
                navigate(`/staff/orders?id=${viewingOrder.id}`);
              }
            }}
          >
            Mở trang Quản lý đơn hàng
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setIsModalOpen(false);
              setViewingOrder(null);
            }}
          >
            Đóng
          </Button>,
        ].filter(Boolean)}
        width={720}
      >
        {viewingOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Khách hàng">
                <Text strong>{viewingOrder.customerName || 'Khách vãng lai'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {viewingOrder.shippingPhone || 'Chưa cập nhật'}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
                {viewingOrder.shippingAddress || 'Chưa cập nhật'}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức thanh toán">
                <Tag color="geekblue">{viewingOrder.paymentMethod || 'COD'}</Tag>
                {viewingOrder.paymentStatus && (
                  <Tag color={viewingOrder.paymentStatus === 'PAID' ? 'green' : 'orange'}>
                    {viewingOrder.paymentStatus}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {renderStatusTag(viewingOrder.status)}
              </Descriptions.Item>
              {viewingOrder.notes && (
                <Descriptions.Item label="Ghi chú" span={2}>
                  {viewingOrder.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Danh sách mặt hàng */}
            {viewingOrder.items && viewingOrder.items.length > 0 && (
              <div>
                <Divider titlePlacement="start" plain style={{ margin: '8px 0 12px' }}>
                  Danh sách sản phẩm ({viewingOrder.items.length})
                </Divider>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {viewingOrder.items.map((it: any, idx: number) => {
                    const prodName = it.productName || it.variant?.product?.name || 'Sản phẩm';
                    const variantText = [it.variant?.color, it.variant?.storage].filter(Boolean).join(' - ');
                    const price = it.price || it.unitPrice || 0;
                    return (
                      <div
                        key={it.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                            {prodName}
                          </div>
                          {variantText && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Phân loại: {variantText}
                            </Text>
                          )}
                          {it.imei && (
                            <div style={{ fontSize: 11, color: '#2563eb', fontFamily: 'monospace' }}>
                              IMEI: {it.imei}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>
                            x{it.quantity || 1}
                          </Text>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {formatVND(price * (it.quantity || 1))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                background: '#eff6ff',
                borderRadius: 8,
              }}
            >
              <Text strong style={{ fontSize: 14 }}>
                Tổng thanh toán:
              </Text>
              <Text
                strong
                style={{ fontSize: 18, color: '#2563eb', fontFamily: 'monospace' }}
              >
                {formatVND(Number(viewingOrder.totalAmount) || 0)}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
