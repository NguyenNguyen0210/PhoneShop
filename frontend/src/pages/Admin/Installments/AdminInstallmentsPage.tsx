import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Tabs,
  Typography,
  Row,
  Col,
  Statistic,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { installmentService } from '../../../services/installmentService';
import type { InstallmentApplication, InstallmentStatus } from '../../../types';
import { InstallmentReviewModal } from './InstallmentReviewModal';

const { Title, Text } = Typography;

export const AdminInstallmentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialStatus = searchParams.get('status') || 'ALL';
  const [applications, setApplications] = useState<InstallmentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusTab, setStatusTab] = useState<string>(initialStatus);
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Debounced search so each keystroke doesn't fire an API request.
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Server-side totals per status for the metric cards (page items alone
  // would undercount as soon as the list paginates). CANCELLED included —
  // otherwise total ≠ pending+approved+rejected (data discrepancy).
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  useEffect(() => {
    let ignore = false;
    const scope = {
      provider: providerFilter !== 'ALL' ? providerFilter : undefined,
      search: debouncedSearch || undefined,
    };
    void Promise.all([
      installmentService.getAdminInstallments({ ...scope, status: 'PENDING', limit: 1 }),
      installmentService.getAdminInstallments({ ...scope, status: 'APPROVED', limit: 1 }),
      installmentService.getAdminInstallments({ ...scope, status: 'REJECTED', limit: 1 }),
      installmentService.getAdminInstallments({ ...scope, status: 'CANCELLED', limit: 1 }),
    ])
      .then(([p, a, r, c]) => {
        if (!ignore) {
          setStatusCounts({
            pending: p?.total ?? 0,
            approved: a?.total ?? 0,
            rejected: r?.total ?? 0,
            cancelled: c?.total ?? 0,
          });
        }
      })
      .catch(() => {
        if (!ignore) setStatusCounts({ pending: 0, approved: 0, rejected: 0, cancelled: 0 });
      });
    return () => {
      ignore = true;
    };
  }, [providerFilter, debouncedSearch]);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusTab(statusParam);
    }
  }, [searchParams]);

  // Selected for review modal
  const [selectedApp, setSelectedApp] = useState<InstallmentApplication | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await installmentService.getAdminInstallments({
        page,
        limit,
        status: statusTab !== 'ALL' ? statusTab : undefined,
        provider: providerFilter !== 'ALL' ? providerFilter : undefined,
        search: debouncedSearch || undefined,
      });

      if (res && Array.isArray(res.items)) {
        setApplications(res.items);
        setTotal(res.total);
      } else {
        setApplications([]);
        setTotal(0);
      }
    } catch {
      setApplications([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusTab, providerFilter, debouncedSearch]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Metrics — server totals (counting the current page would undercount
  // as soon as the table paginates). total = sum of 4 statuses so cards
  // always reconcile with the table.
  const metrics = useMemo(() => {
    const decided = statusCounts.approved + statusCounts.rejected;
    return {
      total: statusCounts.pending + statusCounts.approved + statusCounts.rejected + statusCounts.cancelled,
      pending: statusCounts.pending,
      approved: statusCounts.approved,
      rejected: statusCounts.rejected,
      cancelled: statusCounts.cancelled,
      approvalRate: decided > 0 ? Math.round((statusCounts.approved / decided) * 1000) / 10 : 0,
      approvalBase: decided,
    };
  }, [statusCounts]);

  // Che CCCD trên danh sách: 074286001088 → 0742 •••• 1088
  const maskCitizenId = (id?: string): string => {
    const clean = (id || '').replace(/\D/g, '');
    if (clean.length < 8) return '••••';
    return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
  };

  // Thiết bị đăng ký mua từ order đi kèm hồ sơ (backend đã include items→variant→product)
  const getApplicationDevice = (record: InstallmentApplication) => {
    const item = record.order?.items?.[0];
    if (!item) return null;
    const variant = item.variant || {};
    return {
      name: variant?.product?.name || item.productName || 'Thiết bị di động',
      spec: [variant.storage, variant.color].filter(Boolean).join(' • '),
      price: Number(variant.price ?? item.unitPrice ?? 0),
      image: variant.imageUrl || variant?.product?.thumbnailUrl || null,
    };
  };

  const getStatusTag = (status: InstallmentStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            ĐÃ PHÊ DUYỆT
          </Tag>
        );
      case 'REJECTED':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            TỪ CHỐI
          </Tag>
        );
      case 'CANCELLED':
        return <Tag color="default">ĐÃ HỦY</Tag>;
      case 'PENDING':
      default:
        return (
          <Tag color="processing" icon={<ClockCircleOutlined />}>
            CHỜ THẨM ĐỊNH
          </Tag>
        );
    }
  };

  const columns: ColumnsType<InstallmentApplication> = [
    {
      title: 'Mã đơn / Hồ sơ',
      key: 'code',
      render: (_, record) => {
        const isStaffPath = location.pathname.startsWith('/staff');
        const orderId = record.orderId || record.order?.id;
        const orderUrl = orderId
          ? isStaffPath
            ? `/staff/orders?id=${orderId}`
            : `/admin/orders?id=${orderId}`
          : null;
        return (
          <Space direction="vertical" size={2}>
            {orderUrl ? (
              <Link
                to={orderUrl}
                style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e40af' }}
              >
                #{record.order?.orderNumber || record.orderId?.slice(0, 8) || record.id.slice(0, 8)}
              </Link>
            ) : (
              <Text strong style={{ fontFamily: 'monospace', color: '#1e40af' }}>
                #{record.order?.orderNumber || record.orderId?.slice(0, 8) || record.id.slice(0, 8)}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>
              ID: {record.id.slice(0, 8)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Sản phẩm & Giá niêm yết',
      key: 'device',
      render: (_, record) => {
        const device = getApplicationDevice(record);
        if (!device) return <Text type="secondary">—</Text>;
        return (
          <Space align="start" size={8}>
            {device.image ? (
              <img
                src={device.image}
                alt={device.name}
                style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            <Space direction="vertical" size={1}>
              <Text strong style={{ fontSize: 12, lineHeight: 1.3 }}>
                {device.name}
                {device.spec ? ` (${device.spec})` : ''}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Giá máy: {device.price > 0 ? formatPrice(device.price) : 'Liên hệ'}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.fullName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Thu nhập: {record.incomeRange || 'Chưa rõ'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'SĐT & CCCD',
      key: 'contact',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{record.phoneNumber}</Text>
          <Text
            code
            title="Đã che số giữa để bảo mật — bấm xem chi tiết để hiện đầy đủ"
            style={{ fontSize: 11 }}
          >
            {maskCitizenId(record.citizenId)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Đơn vị tài chính',
      key: 'provider',
      render: (_, record) => {
        const isHome = record.provider === 'HOME_CREDIT';
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 12, color: isHome ? '#dc2626' : '#16a34a', letterSpacing: '0.02em' }}>
              {isHome ? 'HOME CREDIT' : 'FE CREDIT'}
            </Text>
            <Tag color={isHome ? 'red' : 'green'} style={{ fontSize: 10, margin: 0 }}>
              Gói 0% lãi suất
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Gói trả góp',
      key: 'package',
      render: (_, record) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: 12 }}>
            Kỳ hạn {record.termMonths} tháng
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Trước: {formatPrice(record.prepayAmount)} ({record.prepayPercent}%)
          </Text>
          <Text style={{ color: '#dc2626', fontWeight: 600, fontSize: 11 }}>
            Góp: {formatPrice(record.monthlyAmount)}/tháng
          </Text>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      dataIndex: 'status',
      render: (status: InstallmentStatus) => getStatusTag(status),
    },
    {
      title: 'Ngày nộp',
      key: 'createdAt',
      dataIndex: 'createdAt',
      render: (dt: string) => (
        <Text style={{ fontSize: 12 }}>{new Date(dt).toLocaleDateString('vi-VN')}</Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) =>
        record.status === 'PENDING' ? (
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            style={{ background: '#2563eb', borderRadius: 6, fontWeight: 600 }}
            onClick={() => {
              setSelectedApp(record);
              setIsReviewModalOpen(true);
            }}
          >
            Thẩm định ngay
          </Button>
        ) : (
          <Button
            size="small"
            icon={<EyeOutlined />}
            style={{ borderRadius: 6 }}
            onClick={() => {
              setSelectedApp(record);
              setIsReviewModalOpen(true);
            }}
          >
            Xem chi tiết
          </Button>
        ),
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Page Title & Reload */}
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
            <CreditCardOutlined style={{ color: '#2563eb', marginRight: 8 }} />
            Quản lý hồ sơ trả góp
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Thẩm định hồ sơ công ty tài chính (Home Credit / FE Credit) &amp; Điều phối giữ tồn kho
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void fetchApplications()} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Metrics Row — nền trắng đồng nhất, màu chỉ ở icon & con số */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4" style={{ marginBottom: 16 }}>
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Statistic
            title="Tổng hồ sơ"
            value={metrics.total}
            valueStyle={{ fontWeight: 800, color: '#0f172a' }}
            prefix={<CreditCardOutlined style={{ color: '#2563eb' }} />}
          />
        </Card>
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Statistic
            title="Chờ thẩm định"
            value={metrics.pending}
            valueStyle={{ fontWeight: 800, color: '#ca8a04' }}
            prefix={<ClockCircleOutlined style={{ color: '#ca8a04' }} />}
          />
        </Card>
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Statistic
            title="Đã phê duyệt"
            value={metrics.approved}
            valueStyle={{ fontWeight: 800, color: '#16a34a' }}
            prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
          />
        </Card>
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Statistic
            title="Đã từ chối"
            value={metrics.rejected}
            valueStyle={{ fontWeight: 800, color: '#e11d48' }}
            prefix={<CloseCircleOutlined style={{ color: '#e11d48' }} />}
          />
        </Card>
        <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Statistic
            title="Tỷ lệ duyệt"
            value={metrics.approvalRate}
            suffix="%"
            precision={1}
            valueStyle={{ fontWeight: 800, color: '#2563eb' }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {metrics.approved}/{metrics.approvalBase} hồ sơ đã quyết
          </Text>
        </Card>
      </div>

      {/* Filters & Content Card */}
      <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        {/* Status Tabs — đếm đủ 4 trạng thái để khớp thẻ KPI */}
        <Tabs
          activeKey={statusTab}
          onChange={(k) => {
            setStatusTab(k);
            setPage(1);
          }}
          items={[
            { key: 'ALL', label: `Tất cả hồ sơ (${metrics.total})` },
            {
              key: 'PENDING',
              label: (
                <span>
                  Chờ thẩm định{' '}
                  <Badge count={metrics.pending} overflowCount={99} style={{ backgroundColor: '#eab308' }} />
                </span>
              ),
            },
            {
              key: 'APPROVED',
              label: (
                <span>
                  Đã phê duyệt{' '}
                  <Badge count={metrics.approved} overflowCount={99} style={{ backgroundColor: '#16a34a' }} />
                </span>
              ),
            },
            {
              key: 'REJECTED',
              label: (
                <span>
                  Đã từ chối{' '}
                  <Badge count={metrics.rejected} overflowCount={99} style={{ backgroundColor: '#e11d48' }} />
                </span>
              ),
            },
            {
              key: 'CANCELLED',
              label: (
                <span>
                  Đã hủy{' '}
                  <Badge count={metrics.cancelled} overflowCount={99} style={{ backgroundColor: '#94a3b8' }} />
                </span>
              ),
            },
          ]}
        />

        {/* Filter Controls Row */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={14} md={16}>
            <Input
              placeholder="Tìm kiếm theo mã đơn, họ tên khách hàng, CCCD hoặc số điện thoại..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Select
              style={{ width: '100%' }}
              value={providerFilter}
              onChange={(v) => {
                setProviderFilter(v);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả đối tác tài chính' },
                { value: 'HOME_CREDIT', label: 'Home Credit' },
                { value: 'FE_CREDIT', label: 'FE Credit' },
              ]}
            />
          </Col>
        </Row>

        {/* Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={applications}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Review Modal */}
      <InstallmentReviewModal
        open={isReviewModalOpen}
        application={selectedApp}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedApp(null);
        }}
        onSuccess={() => void fetchApplications()}
      />
    </div>
  );
};
