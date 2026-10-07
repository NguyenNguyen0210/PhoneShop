import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CarOutlined,
  BarcodeOutlined,
  SearchOutlined,
  InboxOutlined,
  CopyOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { orderService } from '../../../services/orderService';
import type { Order, OrderStatus } from '../../../types';
import { ShippingDispatchModal } from './components/ShippingDispatchModal';

const { Title, Text } = Typography;

const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PACKED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPING', 'DELIVERED', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  RETURNED: [],
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang chuẩn bị',
  PACKED: 'Đã đóng gói',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Hủy đơn',
  RETURNED: 'Đổi trả',
};

const getTransitionOptions = (currentStatus: OrderStatus) => {
  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
  return [
    {
      value: currentStatus,
      label: `Hiện tại: ${ORDER_STATUS_LABELS[currentStatus] || currentStatus}`,
      disabled: true,
    },
    ...allowed.map((st) => ({
      value: st,
      label: `Chuyển sang: ${ORDER_STATUS_LABELS[st] || st}`,
    })),
  ];
};

// Tên hiển thị thân thiện cho phương thức thanh toán (ẩn mã enum backend)
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'COD',
  VIETQR: 'VietQR',
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
  ZALOPAY: 'ZaloPay',
  BANK_TRANSFER: 'Chuyển khoản',
  CREDIT_CARD: 'Thẻ tín dụng',
  DEBIT_CARD: 'Thẻ ghi nợ',
  INSTALLMENT: 'Trả góp 0%',
};

const formatPaymentMethod = (method?: string): string =>
  (method && PAYMENT_METHOD_LABELS[method]) || method || '—';

// Mã đơn rút gọn để đọc/tìm nhanh: ORD-1791257122910-8AE6DB → #ORD-8AE6DB
// (tooltip giữ mã đầy đủ, tìm kiếm backend vẫn dùng mã đầy đủ)
const formatShortOrderNumber = (orderNumber?: string): string => {
  if (!orderNumber) return '';
  const suffix = (orderNumber.split('-').pop() || orderNumber).replace(/[^A-Za-z0-9]/g, '');
  return `#ORD-${suffix.slice(-6).toUpperCase()}`;
};

const formatOrderDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '';
  }
};

export const AdminOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const urlStatus = searchParams.get('status') || 'ALL';
  const urlSearch = searchParams.get('search') || '';
  const targetOrderId = params.id || searchParams.get('id') || searchParams.get('orderId');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isShippingTransition, setIsShippingTransition] = useState(false);

  // In-flight guard: the row Select stays interactive while the PUT is
  // pending, so a second change event used to fire a duplicate transition —
  // the first request won and the second failed with
  // "Cannot transition from X to X" (both toasts showed at once).
  const [updatingOrderIds, setUpdatingOrderIds] = useState<ReadonlySet<string>>(new Set());

  const markUpdating = (orderId: string) => {
    setUpdatingOrderIds((prev) => new Set(prev).add(orderId));
  };

  const clearUpdating = (orderId: string) => {
    setUpdatingOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  };

  // Server-side pagination & filter states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [searchKeyword, setSearchKeyword] = useState<string>(urlSearch);

  // Sync filter states if URL params change
  useEffect(() => {
    const nextStatus = searchParams.get('status') || 'ALL';
    if (nextStatus !== statusFilter) {
      setStatusFilter(nextStatus);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    if (nextSearch !== searchKeyword) {
      setSearchKeyword(nextSearch);
      setPage(1);
    }
  }, [searchParams]);

  // Handle direct open of order detail when ?id=... or route /orders/:id is visited
  useEffect(() => {
    if (!targetOrderId) return;
    let isMounted = true;

    // Check if target order is already in the list
    const foundInList = orders.find((o) => o.id === targetOrderId || o.orderNumber === targetOrderId);
    if (foundInList) {
      setSelectedOrder(foundInList);
      setIsDetailModalOpen(true);
    }

    const fetchDetail = async () => {
      try {
        const fullOrder = await orderService.getOrderById(targetOrderId);
        if (isMounted && fullOrder) {
          setSelectedOrder(fullOrder);
          setIsDetailModalOpen(true);
        }
      } catch (err) {
        console.error('Không tìm thấy chi tiết đơn hàng:', err);
      }
    };

    void fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [targetOrderId, orders]);

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
    if (searchParams.has('id') || searchParams.has('orderId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('id');
      nextParams.delete('orderId');
      setSearchParams(nextParams, { replace: true });
    }
    if (params.id) {
      const basePath = location.pathname.startsWith('/staff') ? '/staff/orders' : '/admin/orders';
      navigate(basePath, { replace: true });
    }
  };

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
    if (updatingOrderIds.has(orderId)) return;
    if (nextStatus === 'SHIPPING') {
      const targetOrder = record || orders.find((o) => o.id === orderId) || selectedOrder;
      setShippingModalOrder(targetOrder || null);
      setIsShippingTransition(true);
      setIsShippingModalOpen(true);
      return;
    }

    if (nextStatus === 'CANCELLED') {
      let cancelReason = 'Hủy bởi nhân viên vận hành';
      Modal.confirm({
        title: 'Xác nhận hủy đơn hàng?',
        content: (
          <div style={{ marginTop: 8 }}>
            <p style={{ color: '#ef4444', marginBottom: 8 }}>
              Hủy đơn sẽ hoàn trả số lượng tồn kho khả dụng và giải phóng mã IMEI đã khóa.
            </p>
            <Input.TextArea
              placeholder="Nhập lý do hủy đơn hàng (bắt buộc)..."
              rows={3}
              defaultValue="Hủy bởi nhân viên vận hành"
              onChange={(e) => {
                cancelReason = e.target.value;
              }}
            />
          </div>
        ),
        okText: 'Xác nhận hủy đơn',
        okType: 'danger',
        cancelText: 'Quay lại',
        onOk: async () => {
          markUpdating(orderId);
          try {
            const updated = await orderService.updateOrderStatus(orderId, 'cancel', {
              reason: cancelReason.trim() || 'Hủy bởi nhân viên vận hành',
            });
            const resultingStatus = updated?.status || 'CANCELLED';
            setOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, status: resultingStatus } : o))
            );
            if (selectedOrder && selectedOrder.id === orderId) {
              setSelectedOrder((prev) => (prev ? { ...prev, status: resultingStatus } : null));
            }
            message.success('Đã hủy đơn hàng thành công và giải phóng IMEI');
            void loadOrders();
          } catch (err: any) {
            message.error(err.response?.data?.message || err.message || 'Hủy đơn thất bại');
          } finally {
            clearUpdating(orderId);
          }
        },
      });
      return;
    }

    let action: 'confirm' | 'process' | 'pack' | 'ship' | 'deliver' | 'complete' | 'cancel' = 'confirm';
    if (nextStatus === 'CONFIRMED') action = 'confirm';
    if (nextStatus === 'PROCESSING') action = 'process';
    if (nextStatus === 'PACKED') action = 'pack';
    if (nextStatus === 'DELIVERED') action = 'deliver';
    if (nextStatus === 'COMPLETED') action = 'complete';

    markUpdating(orderId);
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
    } finally {
      clearUpdating(orderId);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusTag = (status: OrderStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <Tag color="blue" icon={<CheckCircleOutlined />}>Đã xác nhận</Tag>;
      case 'PROCESSING':
        return <Tag color="cyan" icon={<SyncOutlined spin />}>Đang chuẩn bị</Tag>;
      case 'PACKED':
        return <Tag color="purple" icon={<InboxOutlined />}>Đã đóng gói</Tag>;
      case 'SHIPPING':
        return <Tag color="orange" icon={<CarOutlined />}>Đang giao hàng</Tag>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <Tag color="green">Hoàn tất</Tag>;
      case 'CANCELLED':
        return <Tag color="red">Đã hủy</Tag>;
      case 'RETURNED':
        return <Tag color="volcano">Đổi trả</Tag>;
      default:
        return <Tag color="gold">Chờ xử lý</Tag>;
    }
  };

  // Màu pill cho badge trạng thái tương tác (đồng bộ với Tag tĩnh)
  const STATUS_PILL_CLASSES: Record<OrderStatus, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    PROCESSING: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    PACKED: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    SHIPPING: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    DELIVERED: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    COMPLETED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    RETURNED: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  // 1 cột trạng thái duy nhất: trạng thái cuối (COMPLETED/CANCELLED/RETURNED)
  // hiện badge tĩnh; đơn đang xử lý hiện badge bấm được mở menu bước tiếp theo.
  const renderOrderStatusCell = (record: Order) => {
    const allowed = ALLOWED_ORDER_TRANSITIONS[record.status] || [];
    const isUpdating = updatingOrderIds.has(record.id);
    if (allowed.length === 0) {
      return getStatusTag(record.status);
    }
    const menuItems: MenuProps['items'] = allowed.map((st) => ({
      key: st,
      danger: st === 'CANCELLED',
      label: st === 'CANCELLED' ? 'Hủy đơn hàng' : `Chuyển sang: ${ORDER_STATUS_LABELS[st] || st}`,
      onClick: () => handleUpdateStatus(record.id, st, record),
    }));
    return (
      <Dropdown menu={{ items: menuItems }} trigger={['click']} disabled={isUpdating}>
        <button
          type="button"
          title="Bấm để chuyển bước tiếp theo"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${STATUS_PILL_CLASSES[record.status] || STATUS_PILL_CLASSES.PENDING}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {ORDER_STATUS_LABELS[record.status] || record.status}
          <DownOutlined style={{ fontSize: 10 }} />
        </button>
      </Dropdown>
    );
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
      render: (num: string, record) => (
        <div>
          <button
            type="button"
            title={num}
            onClick={() => {
              setSelectedOrder(record);
              setIsDetailModalOpen(true);
            }}
            className="font-bold text-blue-600 hover:underline cursor-pointer"
            style={{ fontFamily: 'monospace' }}
          >
            {formatShortOrderNumber(num)}
          </button>
          {record.createdAt && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {formatOrderDate(record.createdAt)}
            </div>
          )}
        </div>
      ),
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
          <Tag color="geekblue">{formatPaymentMethod(record.paymentMethod)}</Tag>
          {getPaymentStatusTag(record.paymentStatus)}
        </Space>
      ),
    },
    {
      title: 'Tổng thanh toán',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => (
        <Text strong style={{ color: '#dc2626', whiteSpace: 'nowrap' }}>
          {formatPrice(val)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái đơn hàng',
      dataIndex: 'status',
      key: 'status',
      render: (_: OrderStatus, record) => renderOrderStatusCell(record),
    },
    {
      title: 'Vận chuyển',
      key: 'shipping',
      render: (_, record) => {
        if (record.shipping?.trackingNumber) {
          return (
            <Space direction="vertical" size={2}>
              <Tag
                color="cyan"
                icon={<CarOutlined />}
                style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
              >
                {record.shipping.trackingNumber}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.shipping.providerName}
              </Text>
            </Space>
          );
        }
        if (record.shipping?.providerName) {
          return (
            <Space direction="vertical" size={2}>
              <Text strong style={{ fontSize: 12 }}>
                {record.shipping.providerName}
              </Text>
              <Tag color="orange" style={{ fontSize: 10 }}>Chưa có mã vận đơn</Tag>
            </Space>
          );
        }
        return <Tag color="default">Chưa gán</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size={6}>
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
          <Button
            size="small"
            icon={<CarOutlined />}
            title="Điều phối vận chuyển: gán đơn vị & mã vận đơn"
            onClick={() => {
              setShippingModalOrder(record);
              setIsShippingTransition(false);
              setIsShippingModalOpen(true);
            }}
          >
            Điều phối
          </Button>
        </Space>
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

  // Bộ đếm công việc trên từng tab (limit=1 nên payload nhẹ, chỉ lấy total)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const entries = await Promise.all(
          statusTabs
            .filter((t) => t.key !== 'ALL')
            .map(async (t) => {
              try {
                const res = await orderService.getAllOrdersAdmin({
                  limit: 1,
                  status: t.key,
                  search: searchKeyword.trim() || undefined,
                });
                return [t.key, res.total ?? 0] as const;
              } catch {
                return [t.key, 0] as const;
              }
            })
        );
        if (!cancelled) {
          const map: Record<string, number> = {};
          entries.forEach(([k, v]) => {
            map[k] = v;
          });
          setStatusCounts(map);
        }
      } catch {
        // Bỏ qua lỗi đếm — bảng chính vẫn hiển thị bình thường
      }
    };
    void fetchCounts();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword, total]);

  const statusTabItems = statusTabs.map((t) => {
    if (t.key === 'ALL') {
      return { key: t.key, label: `${t.label} (${total})` };
    }
    const count = statusCounts[t.key];
    return {
      key: t.key,
      label: (
        <span className="inline-flex items-center gap-1.5">
          {t.label}
          <span
            className={`px-1.5 py-px text-[11px] font-bold rounded-full ${
              count && count > 0
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {count ?? '…'}
          </span>
        </span>
      ),
    };
  });

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
          items={statusTabItems}
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
        onCancel={handleCloseDetailModal}
        footer={[
          <Button
            key="dispatch"
            icon={<CarOutlined />}
            title="Điều phối vận chuyển: gán đơn vị & mã vận đơn"
            onClick={() => {
              if (selectedOrder) {
                setShippingModalOrder(selectedOrder);
                setIsShippingTransition(false);
                setIsShippingModalOpen(true);
              }
            }}
          >
            Điều phối
          </Button>,
          <Button key="close" onClick={handleCloseDetailModal}>
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
                <Tag color="geekblue">{formatPaymentMethod(selectedOrder.paymentMethod)}</Tag>
                {getPaymentStatusTag(selectedOrder.paymentStatus)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái đơn hàng">
                <Space>
                  {getStatusTag(selectedOrder.status)}
                  <Select
                    size="small"
                    value={selectedOrder.status}
                    style={{ minWidth: 170 }}
                    disabled={getTransitionOptions(selectedOrder.status).length <= 1}
                    onChange={(newVal) => handleUpdateStatus(selectedOrder.id, newVal, selectedOrder)}
                    options={getTransitionOptions(selectedOrder.status)}
                  />
                </Space>
              </Descriptions.Item>
              {selectedOrder.notes && (
                <Descriptions.Item label="Ghi chú khách hàng" span={2}>
                  {selectedOrder.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Shipping Summary Section */}
            <Card
              size="small"
              style={{
                borderRadius: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Space>
                  <CarOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                  <Text strong style={{ fontSize: 13 }}>
                    Thông tin điều phối vận chuyển
                  </Text>
                </Space>
                <Button
                  size="small"
                  type="primary"
                  icon={<CarOutlined />}
                  onClick={() => {
                    setShippingModalOrder(selectedOrder);
                    setIsShippingModalOpen(true);
                  }}
                >
                  Cập nhật vận chuyển
                </Button>
              </div>

              <Descriptions bordered size="small" column={{ xs: 1, sm: 3 }}>
                <Descriptions.Item label="Đơn vị vận chuyển">
                  <Text strong>
                    {selectedOrder.shipping?.providerName || 'Chưa phân công'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Mã vận đơn">
                  {selectedOrder.shipping?.trackingNumber ? (
                    <Text code strong style={{ color: '#1d4ed8' }}>
                      {selectedOrder.shipping.trackingNumber}
                    </Text>
                  ) : (
                    <Text type="secondary">Chưa có</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái giao nhận">
                  {selectedOrder.shipping?.status ? (
                    <Tag color="cyan">{selectedOrder.shipping.status}</Tag>
                  ) : (
                    <Tag color="default">Chưa khởi tạo</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

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

      {/* Modal: Shipping Dispatch */}
      <ShippingDispatchModal
        open={isShippingModalOpen}
        order={shippingModalOrder}
        isShippingTransition={isShippingTransition}
        onClose={() => {
          setIsShippingModalOpen(false);
          setShippingModalOrder(null);
          setIsShippingTransition(false);
        }}
        onSuccess={async () => {
          setIsShippingModalOpen(false);
          const currentOrderId = shippingModalOrder?.id;
          setShippingModalOrder(null);
          setIsShippingTransition(false);
          await loadOrders();
          if (selectedOrder && currentOrderId === selectedOrder.id) {
            try {
              const res = await orderService.getAllOrdersAdmin({
                page,
                limit,
                search: selectedOrder.orderNumber,
              });
              const refreshed = res?.data?.find((o: Order) => o.id === selectedOrder.id);
              if (refreshed) {
                setSelectedOrder(refreshed);
              }
            } catch (err) {
              console.error('Failed to refresh selected order in detail modal:', err);
            }
          }
        }}
      />
    </div>
  );
};
