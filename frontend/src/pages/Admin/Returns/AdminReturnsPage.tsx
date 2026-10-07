import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Tabs,
  Input,
  Space,
  Typography,
  message,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { returnService } from '../../../services/returnService';
import type { ReturnRequest, ReturnStatus } from '../../../types';
import { ReturnStatusTag } from './components/ReturnStatusTag';
import { ReturnDetailDrawer } from './components/ReturnDetailDrawer';

const { Title, Text } = Typography;

const EXCHANGE_HINT = /đổi|lên đời|nâng cấp|1\s*[-–]?\s*đổi\s*1|đổi mới/i;

const isExchangeRequest = (reason?: string) => EXCHANGE_HINT.test(reason || '');

const GROUP_OF: Record<string, 'ACTION_NEEDED' | 'IN_TRANSIT'> = {
  REQUESTED: 'ACTION_NEEDED',
  INSPECTING: 'ACTION_NEEDED',
  APPROVED: 'IN_TRANSIT',
  SHIPPING: 'IN_TRANSIT',
  RECEIVED: 'IN_TRANSIT',
};

const GROUP_MEMBERS: Record<string, ReturnStatus[]> = {
  ACTION_NEEDED: ['REQUESTED', 'INSPECTING'],
  IN_TRANSIT: ['APPROVED', 'SHIPPING', 'RECEIVED'],
};

const getDeviceSummary = (record: ReturnRequest) => {
  const first = record.items?.[0]?.orderItem;
  const extra = (record.items?.length || 0) - 1;
  const productName =
    first?.productName || first?.variant?.product?.name || 'Thiết bị chưa xác định';
  const storage = first?.variant?.storage ? ` (${first.variant.storage})` : '';
  const imei =
    first?.imeiDevice?.imei || first?.imeiDevice?.imeiNumber || first?.imeiDeviceId || '';
  const thumb =
    first?.variant?.imageUrl ||
    first?.variant?.product?.thumbnail ||
    '/placeholder-phone.png';
  const qty = record.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
  const unitPrice = first?.unitPrice || 0;
  return { productName: `${productName}${storage}`, imei, thumb, extra, qty, unitPrice };
};

const getCustomerSummary = (record: ReturnRequest) => {
  const fullName =
    record.order?.customerName ||
    [record.user?.firstName, record.user?.lastName].filter(Boolean).join(' ') ||
    record.user?.email?.split('@')[0] ||
    'Khách hàng';
  const phone = record.order?.shippingPhone || '';
  const email = record.user?.email || '';
  return { fullName, phone, email };
};

const getEstimatedAmount = (record: ReturnRequest) => {
  const pending = (record.refunds || []).find((r) => r.status !== 'COMPLETED');
  if (pending) return Number(pending.amount) || 0;
  const itemsTotal = (record.items || []).reduce(
    (s, it) => s + (it.orderItem?.unitPrice || 0) * (it.quantity || 0),
    0,
  );
  if (itemsTotal > 0) return itemsTotal;
  return Number(record.order?.totalAmount) || 0;
};

export const AdminReturnsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialStatus = searchParams.get('status') || 'ALL';
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(resolveTabKey(statusParam));
    }
  }, [searchParams]);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await returnService.getAllReturnsAdmin();
      setReturns(Array.isArray(data) ? data : []);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách đổi trả');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  const filteredReturns = useMemo(() => {
    return returns.filter((item) => {
      // Filter by status tab (hỗ trợ cả tab gộp nhóm ERP)
      if (statusFilter !== 'ALL') {
        const members = GROUP_MEMBERS[statusFilter];
        if (members) {
          if (!members.includes(item.status)) return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }
      // Filter by search keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.trim().toLowerCase();
        const returnNo = (item.returnNumber || '').toLowerCase();
        const orderNo = (item.order?.orderNumber || item.orderId || '').toLowerCase();
        const email = (item.user?.email || '').toLowerCase();
        const customer = (item.order?.customerName || '').toLowerCase();
        const phone = (item.order?.shippingPhone || '').replace(/\s/g, '');
        const reason = (item.reason || '').toLowerCase();
        const device = (item.items || [])
          .map(
            (it) =>
              `${it.orderItem?.productName || ''} ${it.orderItem?.variant?.product?.name || ''} ${it.orderItem?.imeiDevice?.imei || it.orderItem?.imeiDevice?.imeiNumber || ''}`,
          )
          .join(' ')
          .toLowerCase();
        return (
          returnNo.includes(q) ||
          orderNo.includes(q) ||
          email.includes(q) ||
          customer.includes(q) ||
          phone.includes(q.replace(/\s/g, '')) ||
          reason.includes(q) ||
          device.includes(q)
        );
      }
      return true;
    });
  }, [returns, statusFilter, searchKeyword]);

  const handleOpenDetail = (record: ReturnRequest) => {
    setSelectedReturn(record);
    setIsDrawerOpen(true);
  };

  const handleRecordUpdated = (updated: ReturnRequest) => {
    setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedReturn?.id === updated.id) {
      setSelectedReturn(updated);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const columns: ColumnsType<ReturnRequest> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 130,
      render: (text: string, record: ReturnRequest) => (
        <div>
          <Text strong style={{ color: '#2563eb' }}>
            #{text?.startsWith('RET') ? text : text}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.requestedAt
              ? new Date(record.requestedAt).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thiết bị & IMEI',
      key: 'device',
      width: 220,
      render: (_: any, record: ReturnRequest) => {
        const d = getDeviceSummary(record);
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
            <img
              src={d.thumb}
              alt={d.productName}
              style={{
                width: 40,
                height: 40,
                objectFit: 'contain',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/placeholder-phone.png';
              }}
            />
            <div style={{ minWidth: 0 }}>
              <Tooltip title={d.productName}>
                <div
                  style={{
                    fontWeight: 600,
                    color: '#0f172a',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 160,
                  }}
                >
                  {d.productName}
                  {d.extra > 0 && (
                    <span style={{ color: '#64748b', fontWeight: 400 }}> +{d.extra}</span>
                  )}
                </div>
              </Tooltip>
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                {d.imei ? `IMEI: ${d.imei}` : `SL: ${d.qty} món`}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Khách hàng & Đơn gốc',
      key: 'orderAndCustomer',
      width: 180,
      render: (_: any, record: ReturnRequest) => {
        const isStaffPath = location.pathname.startsWith('/staff');
        const orderId = record.orderId || record.order?.id;
        const orderUrl = orderId
          ? isStaffPath
            ? `/staff/orders?id=${orderId}`
            : `/admin/orders?id=${orderId}`
          : null;
        const c = getCustomerSummary(record);
        const orderLabel = `#${record.order?.orderNumber || (record.orderId || '').slice(0, 8)}`;
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{c.fullName}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{c.phone || c.email || '—'}</div>
            {orderUrl ? (
              <Link to={orderUrl} style={{ fontSize: 11, color: '#3b82f6' }}>
                Đơn: {orderLabel}
              </Link>
            ) : (
              <Text style={{ fontSize: 11, color: '#3b82f6' }}>Đơn: {orderLabel}</Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Lý do & Hình thức',
      key: 'reasonAndType',
      ellipsis: true,
      render: (_: any, record: ReturnRequest) => {
        const exchange = isExchangeRequest(record.reason);
        return (
          <div style={{ maxWidth: 240 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                marginBottom: 4,
                background: exchange ? '#eef2ff' : '#ecfdf5',
                color: exchange ? '#4f46e5' : '#047857',
              }}
            >
              {exchange ? '🔄 Đổi máy mới (1-đổi-1)' : '💵 Trả hàng & Hoàn tiền'}
            </span>
            <Tooltip title={record.reason}>
              <div
                style={{
                  fontSize: 12,
                  color: '#475569',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {record.reason}
              </div>
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: ReturnStatus) => <ReturnStatusTag status={status} />,
    },
    {
      title: 'Giá trị hoàn tiền',
      key: 'refundValue',
      width: 150,
      render: (_: any, record: ReturnRequest) => {
        const refunds = record.refunds || [];
        if (record.status === 'REJECTED' || record.status === 'CANCELLED') {
          return <Text type="secondary">Không áp dụng</Text>;
        }
        const completed = refunds.find((r) => r.status === 'COMPLETED');
        if (completed) {
          return (
            <span style={{ color: '#16a34a', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {formatPrice(Number(completed.amount))}
            </span>
          );
        }
        const pending = refunds.find((r) => r.status !== 'COMPLETED');
        const estimate = pending ? Number(pending.amount) : getEstimatedAmount(record);
        if (!estimate) return <Text type="secondary">—</Text>;
        if (record.status === 'COMPLETED' && refunds.length === 0) {
          return <Text type="secondary">Không phát sinh (đổi máy)</Text>;
        }
        return (
          <div style={{ whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 600, color: '#334155' }}>{formatPrice(estimate)}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>
              {pending ? 'Chờ duyệt chi' : 'Chờ duyệt định giá'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      align: 'center',
      render: (_: any, record: ReturnRequest) => {
        if (record.status === 'REQUESTED') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetail(record)}
            >
              Tiếp nhận
            </Button>
          );
        }
        if (record.status === 'INSPECTING') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenDetail(record)}
            >
              Thẩm định máy
            </Button>
          );
        }
        return (
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenDetail(record)}>
            Chi tiết
          </Button>
        );
      },
    },
  ];

  const countBy = (statuses: ReturnStatus[]) =>
    returns.filter((r) => statuses.includes(r.status)).length;

  const tabItems = [
    { key: 'ALL', label: `Tất cả (${returns.length})` },
    {
      key: 'ACTION_NEEDED',
      label: `Cần xử lý (${countBy(['REQUESTED', 'INSPECTING'])})`,
    },
    {
      key: 'IN_TRANSIT',
      label: `Vận chuyển thiết bị (${countBy(['APPROVED', 'SHIPPING', 'RECEIVED'])})`,
    },
    {
      key: 'COMPLETED',
      label: `Đã hoàn tất (${countBy(['COMPLETED'])})`,
    },
    {
      key: 'REJECTED',
      label: `Đã từ chối (${countBy(['REJECTED'])})`,
    },
  ];

  const resolveTabKey = (raw: string | null): string => {
    if (!raw || raw === 'ALL') return 'ALL';
    if (GROUP_MEMBERS[raw]) return raw;
    if (['COMPLETED', 'REJECTED'].includes(raw)) return raw;
    const group = GROUP_OF[raw];
    return group || 'ALL';
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý Đổi trả & Hoàn tiền
          </Title>
          <Text type="secondary">
            Tiếp nhận, kiểm tra máy và điều phối hoàn tiền theo quy định
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadReturns} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Input
            placeholder="Tìm theo mã yêu cầu (RET), mã đơn, SĐT khách hàng..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            style={{ width: 360 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
          />
        </Space>

        <Tabs
          activeKey={statusFilter}
          onChange={(key) => setStatusFilter(key)}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={filteredReturns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} yêu cầu`,
          }}
          locale={{ emptyText: 'Chưa có yêu cầu đổi trả nào trong mục này' }}
        />
      </Card>

      <ReturnDetailDrawer
        open={isDrawerOpen}
        visible={isDrawerOpen}
        returnRecord={selectedReturn}
        onClose={() => setIsDrawerOpen(false)}
        onUpdated={handleRecordUpdated}
      />
    </div>
  );
};
