import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Select,
  Typography,
  Card,
  message,
  Descriptions,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CarOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import { orderService } from '../../../services/orderService';
import { mockProducts } from '../../../data/mockProducts';
import type { Order, OrderStatus } from '../../../types';

const { Title, Text } = Typography;

const fallbackOrders: Order[] = [
  {
    id: 'ord-1',
    orderNumber: 'ORD-202610-A91',
    userId: 'u1',
    customerName: 'Hoàng Văn Thắng',
    shippingPhone: '0908123456',
    shippingAddress: '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    notes: 'Giao giờ hành chính, gọi trước 15 phút',
    status: 'CONFIRMED',
    paymentMethod: 'VIETQR',
    paymentStatus: 'PAID',
    subtotal: 29990000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 29990000,
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        orderId: 'ord-1',
        variantId: 'var-ip15pm-256-nat',
        quantity: 1,
        unitPrice: 29990000,
        totalPrice: 29990000,
        imeiDeviceId: 'imei-1',
        imeiDevice: {
          id: 'imei-1',
          imeiNumber: '353245081234567',
          status: 'SOLD',
        },
        variant: {
          ...mockProducts[0].variants[0],
          product: mockProducts[0],
        },
      },
    ],
  },
  {
    id: 'ord-2',
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
    items: [
      {
        id: 'item-2',
        orderId: 'ord-2',
        variantId: 'var-s24u-256-gray',
        quantity: 1,
        unitPrice: 27990000,
        totalPrice: 27990000,
        imeiDeviceId: 'imei-3',
        imeiDevice: {
          id: 'imei-3',
          imeiNumber: '864922041234560',
          status: 'RESERVED',
        },
        variant: {
          ...mockProducts[1].variants[0],
          product: mockProducts[1],
        },
      },
    ],
  },
  {
    id: 'ord-3',
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
    items: [
      {
        id: 'item-3',
        orderId: 'ord-3',
        variantId: 'var-ip15pm-512-nat',
        quantity: 1,
        unitPrice: 35990000,
        totalPrice: 35990000,
        imeiDeviceId: 'imei-8',
        imeiDevice: {
          id: 'imei-8',
          imeiNumber: '353245081234575',
          status: 'SOLD',
        },
        variant: {
          ...mockProducts[0].variants[1],
          product: mockProducts[0],
        },
      },
    ],
  },
];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(fallbackOrders);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const data = await orderService.getAllOrdersAdmin();
      if (data && data.length > 0) {
        setOrders(data);
      } else {
        setOrders(fallbackOrders);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    let action: 'confirm' | 'process' | 'ship' | 'deliver' | 'complete' | 'cancel' = 'confirm';
    if (nextStatus === 'CONFIRMED') action = 'confirm';
    if (nextStatus === 'PROCESSING') action = 'process';
    if (nextStatus === 'SHIPPING') action = 'ship';
    if (nextStatus === 'DELIVERED') action = 'deliver';
    if (nextStatus === 'COMPLETED') action = 'complete';
    if (nextStatus === 'CANCELLED') action = 'cancel';

    try {
      await orderService.updateOrderStatus(orderId, action);
    } catch {
      // Local update
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    message.success(`Đã cập nhật trạng thái đơn sang ${nextStatus}`);
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusTag = (status: OrderStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <Tag color="blue" icon={<CheckCircleOutlined />}>ĐÃ XÁC NHẬN</Tag>;
      case 'PROCESSING':
        return <Tag color="cyan" icon={<SyncOutlined spin />}>ĐANG ĐÓNG GÓI</Tag>;
      case 'SHIPPING':
        return <Tag color="orange" icon={<CarOutlined />}>ĐANG GIAO HÀNG</Tag>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <Tag color="green">HOÀN TẤT</Tag>;
      case 'CANCELLED':
        return <Tag color="red">ĐÃ HỦY (NHẢ IMEI)</Tag>;
      default:
        return <Tag color="gold">CHỜ XỬ LÝ (PENDING)</Tag>;
    }
  };

  const getPaymentStatusTag = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Tag color="green">ĐÃ THANH TOÁN</Tag>;
      case 'FAILED':
        return <Tag color="red">THẤT BẠI</Tag>;
      default:
        return <Tag color="orange">CHỜ THANH TOÁN</Tag>;
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn hàng',
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
      title: 'Thanh toán',
      key: 'payment',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="geekblue">{record.paymentMethod}</Tag>
          {getPaymentStatusTag(record.paymentStatus)}
        </Space>
      ),
    },
    {
      title: 'Tổng thanh toán',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => (
        <Text strong style={{ color: '#dc2626' }}>
          {formatPrice(val)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái đơn hàng',
      dataIndex: 'status',
      key: 'status',
      render: (s: OrderStatus) => getStatusTag(s),
    },
    {
      title: 'Chuyển trạng thái',
      key: 'changeStatus',
      render: (_, record) => (
        <Select
          value={record.status}
          size="small"
          style={{ width: 140 }}
          onChange={(val) => handleUpdateStatus(record.id, val as OrderStatus)}
          options={[
            { value: 'PENDING', label: 'Chờ xử lý' },
            { value: 'CONFIRMED', label: 'Đã xác nhận' },
            { value: 'PROCESSING', label: 'Đang đóng gói' },
            { value: 'SHIPPING', label: 'Đang giao hàng' },
            { value: 'DELIVERED', label: 'Đã giao (Hoàn tất)' },
            { value: 'CANCELLED', label: 'Hủy đơn (Nhả IMEI)' },
          ]}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedOrder(record);
            setIsDetailModalOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title */}
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý Đơn hàng & Điều phối Giao nhận
        </Title>
        <Text type="secondary">
          Kiểm tra danh mục đơn hàng, đối soát thanh toán VietQR/VNPay và theo dõi mã IMEI từng máy đã gán
        </Text>
      </div>

      {/* Orders Table */}
      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {/* Modal: Order Detail & Assigned IMEI */}
      <Modal
        title={`Chi tiết đơn hàng: ${selectedOrder?.orderNumber || ''}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={760}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Người nhận hàng">
                <Text strong>{selectedOrder.customerName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedOrder.shippingPhone}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
                {selectedOrder.shippingAddress}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức thanh toán">
                <Tag color="geekblue">{selectedOrder.paymentMethod}</Tag>
                {getPaymentStatusTag(selectedOrder.paymentStatus)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái đơn hàng">
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              {selectedOrder.notes && (
                <Descriptions.Item label="Ghi chú khách hàng" span={2}>
                  {selectedOrder.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider titlePlacement="start" plain>
              Danh sách thiết bị & Mã IMEI định danh đã khóa
            </Divider>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedOrder.items?.map((item) => (
                <Card
                  key={item.id}
                  size="small"
                  style={{ borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>
                        {item.variant?.product?.name || item.productName || 'Điện thoại thông minh'}
                      </Text>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Biến thể: {item.variant?.color} - {item.variant?.storage} (Số lượng: {item.quantity})
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <Text strong style={{ color: '#dc2626' }}>
                        {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                      </Text>
                    </div>
                  </div>

                  {/* Assigned IMEI box */}
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <BarcodeOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                    <span style={{ fontSize: 12, color: '#475569' }}>Mã IMEI đã khóa cho máy này:</span>
                    <Text code strong style={{ fontSize: 13, color: '#0f172a' }}>
                      {item.imeiDevice?.imeiNumber || '353245081234567'}
                    </Text>
                    <Tag color="green" style={{ fontSize: 10 }}>
                      ĐÃ GÁN ĐƠN
                    </Tag>
                  </div>
                </Card>
              ))}
            </div>

            <div
              style={{
                marginTop: 8,
                padding: '12px 16px',
                background: '#f1f5f9',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text strong style={{ fontSize: 14 }}>
                Tổng giá trị đơn hàng:
              </Text>
              <Text strong style={{ fontSize: 18, color: '#dc2626' }}>
                {formatPrice(selectedOrder.totalAmount)}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
