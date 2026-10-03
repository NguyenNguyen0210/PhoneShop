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
  Tabs,
  Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CarOutlined,
  BarcodeOutlined,
  SearchOutlined,
  InboxOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { orderService } from '../../../services/orderService';
import type { Order, OrderStatus } from '../../../types';
import { ShippingModal } from './components/ShippingModal';

const { Title, Text } = Typography;

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);
  const [isShippingTransition, setIsShippingTransition] = useState(false);

  // Server-side pagination & filter states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderService.getAllOrdersAdmin({
        page,
        limit,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchKeyword.trim() || undefined,
      });
      if (res && Array.isArray(res.data)) {
        setOrders(res.data);
        setTotal(res.total ?? res.data.length);
      } else if (Array.isArray(res)) {
        setOrders(res);
        setTotal(res.length);
      }
    } catch (err) {
      console.error('Failed to load orders from database API:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchKeyword]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleUpdateStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
    record?: Order
  ) => {
    if (nextStatus === 'SHIPPING') {
      const targetOrder = record || orders.find((o) => o.id === orderId) || selectedOrder;
      setShippingModalOrder(targetOrder || null);
      setIsShippingTransition(true);
      setIsShippingModalOpen(true);
      return;
    }

    let action: 'confirm' | 'process' | 'pack' | 'ship' | 'deliver' | 'complete' | 'cancel' = 'confirm';
    if (nextStatus === 'CONFIRMED') action = 'confirm';
    if (nextStatus === 'PROCESSING') action = 'process';
    if (nextStatus === 'PACKED') action = 'pack';
    if (nextStatus === 'DELIVERED') action = 'deliver';
    if (nextStatus === 'COMPLETED') action = 'complete';
    if (nextStatus === 'CANCELLED') action = 'cancel';

    try {
      const updated = await orderService.updateOrderStatus(orderId, action);
      const resultingStatus = updated?.status || nextStatus;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: resultingStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: resultingStatus } : null));
      }
      message.success(`Đã cập nhật trạng thái đơn sang ${resultingStatus}`);
      void loadOrders();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusTag = (status: OrderStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <Tag color="blue" icon={<CheckCircleOutlined />}>ĐÃ XÁC NHẬN</Tag>;
      case 'PROCESSING':
        return <Tag color="cyan" icon={<SyncOutlined spin />}>ĐANG CHUẨN BỊ</Tag>;
      case 'PACKED':
        return <Tag color="purple" icon={<InboxOutlined />}>ĐÃ ĐÓNG GÓI</Tag>;
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
          onChange={(val) => handleUpdateStatus(record.id, val as OrderStatus, record)}
          options={[
            { value: 'PENDING', label: 'Chờ xử lý' },
            { value: 'CONFIRMED', label: 'Đã xác nhận' },
            { value: 'PROCESSING', label: 'Đang chuẩn bị hàng' },
            { value: 'PACKED', label: 'Đã đóng gói' },
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

  const statusTabs = [
    { key: 'ALL', label: 'Tất cả đơn hàng' },
    { key: 'PENDING', label: 'Chờ xử lý' },
    { key: 'CONFIRMED', label: 'Đã xác nhận' },
    { key: 'PROCESSING', label: 'Đang chuẩn bị' },
    { key: 'PACKED', label: 'Đã đóng gói' },
    { key: 'SHIPPING', label: 'Đang giao hàng' },
    { key: 'DELIVERED', label: 'Đã giao' },
    { key: 'COMPLETED', label: 'Hoàn tất' },
    { key: 'CANCELLED', label: 'Đã hủy' },
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

      {/* Filter and Search Bar */}
      <Card
        bordered={false}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <Tabs
          activeKey={statusFilter}
          onChange={(key) => {
            setStatusFilter(key);
            setPage(1);
          }}
          items={statusTabs}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Input
            placeholder="Tìm theo mã đơn hàng, người nhận, số điện thoại..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setPage(1);
            }}
            style={{ width: 360, borderRadius: 8, background: '#ffffff', borderColor: '#e2e8f0' }}
            allowClear
          />
          <Tag
            style={{
              borderRadius: 6,
              padding: '3px 8px',
              background: '#eff6ff',
              borderColor: '#bfdbfe',
              color: '#2563eb',
              fontWeight: 600,
            }}
          >
            Tổng số đơn: {total}
          </Tag>
        </div>
      </Card>

      {/* Orders Table */}
      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} đơn hàng`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize !== limit) {
              setLimit(newPageSize);
              setPage(1);
            }
          },
        }}
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
              Thông tin Vận chuyển & Giao nhận
            </Divider>

            <Card
              size="small"
              style={{ borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Space direction="vertical" size={6}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Đơn vị vận chuyển:{' '}
                    </Text>
                    <Text strong style={{ fontSize: 13 }}>
                      {selectedOrder.shipping?.providerName || 'Chưa gán'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Mã vận đơn:{' '}
                    </Text>
                    {selectedOrder.shipping?.trackingNumber ? (
                      <Space size={4}>
                        <Text code strong style={{ fontSize: 13, color: '#1d4ed8' }}>
                          {selectedOrder.shipping.trackingNumber}
                        </Text>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined style={{ fontSize: 12 }} />}
                          title="Sao chép mã vận đơn"
                          onClick={() => {
                            if (selectedOrder.shipping?.trackingNumber) {
                              void navigator.clipboard.writeText(
                                selectedOrder.shipping.trackingNumber
                              );
                              message.success('Đã sao chép mã vận đơn');
                            }
                          }}
                        />
                      </Space>
                    ) : (
                      <Text type="secondary" italic>
                        Chưa có
                      </Text>
                    )}
                  </div>
                  {selectedOrder.shipping?.estimatedDeliveryDate && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Dự kiến giao hàng:{' '}
                      </Text>
                      <Text strong style={{ fontSize: 13 }}>
                        {new Date(
                          selectedOrder.shipping.estimatedDeliveryDate
                        ).toLocaleDateString('vi-VN')}
                      </Text>
                    </div>
                  )}
                </Space>

                <Button
                  icon={<CarOutlined />}
                  onClick={() => {
                    setShippingModalOrder(selectedOrder);
                    setIsShippingTransition(false);
                    setIsShippingModalOpen(true);
                  }}
                >
                  Cập nhật vận đơn
                </Button>
              </div>
            </Card>

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
                  {(item.imeiDevice?.imeiNumber || item.imeiDevice?.imei) && (
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
                        {item.imeiDevice?.imeiNumber || item.imeiDevice?.imei}
                      </Text>
                      <Tag color="green" style={{ fontSize: 10 }}>
                        ĐÃ GÁN ĐƠN
                      </Tag>
                    </div>
                  )}
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

      <ShippingModal
        open={isShippingModalOpen}
        order={shippingModalOrder}
        isShippingAction={isShippingTransition}
        onClose={() => {
          setIsShippingModalOpen(false);
          setShippingModalOrder(null);
        }}
        onSuccess={() => {
          void loadOrders();
          if (selectedOrder && shippingModalOrder && selectedOrder.id === shippingModalOrder.id) {
            void orderService.getOrderById(selectedOrder.id).then((fresh) => {
              if (fresh) setSelectedOrder(fresh);
            });
          }
        }}
      />
    </div>
  );
};
