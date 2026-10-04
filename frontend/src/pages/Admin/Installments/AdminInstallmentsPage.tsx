import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { installmentService } from '../../../services/installmentService';
import type { InstallmentApplication, InstallmentStatus } from '../../../types';
import { InstallmentReviewModal } from './InstallmentReviewModal';

const { Title, Text } = Typography;

export const AdminInstallmentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
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
        search: searchQuery.trim() || undefined,
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
  }, [page, limit, statusTab, providerFilter, searchQuery]);

  useEffect(() => {
    let ignore = false;
    void installmentService
      .getAdminInstallments({
        page,
        limit,
        status: statusTab !== 'ALL' ? statusTab : undefined,
        provider: providerFilter !== 'ALL' ? providerFilter : undefined,
        search: searchQuery.trim() || undefined,
      })
      .then((res) => {
        if (!ignore && res && Array.isArray(res.items)) {
          setApplications(res.items);
          setTotal(res.total);
        } else if (!ignore) {
          setApplications([]);
          setTotal(0);
        }
      })
      .catch(() => {
        if (!ignore) {
          setApplications([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, limit, statusTab, providerFilter, searchQuery]);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalApps = total || applications.length;
    const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
    const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
    const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;
    return {
      total: totalApps,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };
  }, [applications, total]);

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
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontFamily: 'monospace', color: '#1e40af' }}>
            #{record.order?.orderNumber || record.orderId?.slice(0, 8) || record.id.slice(0, 8)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ID: {record.id.slice(0, 8)}
          </Text>
        </Space>
      ),
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
          <Text copyable code style={{ fontSize: 11 }}>
            {record.citizenId}
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
          <Tag color={isHome ? 'red' : 'green'} style={{ fontWeight: 600 }}>
            {isHome ? 'Home Credit (0%)' : 'FE Credit (0%)'}
          </Tag>
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
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          style={{ background: '#2563eb', borderRadius: 6 }}
          onClick={() => {
            setSelectedApp(record);
            setIsReviewModalOpen(true);
          }}
        >
          {record.status === 'PENDING' ? 'Xem & Thẩm định' : 'Xem chi tiết'}
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

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic
              title="Tổng hồ sơ"
              value={metrics.total}
              valueStyle={{ fontWeight: 800, color: '#0f172a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ borderRadius: 12, border: '1px solid #fef08a', background: '#fefce8' }}
          >
            <Statistic
              title="Chờ thẩm định"
              value={metrics.pending}
              valueStyle={{ fontWeight: 800, color: '#ca8a04' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ borderRadius: 12, border: '1px solid #bbf7d0', background: '#f0fdf4' }}
          >
            <Statistic
              title="Đã phê duyệt"
              value={metrics.approved}
              valueStyle={{ fontWeight: 800, color: '#16a34a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{ borderRadius: 12, border: '1px solid #fecdd3', background: '#fff1f2' }}
          >
            <Statistic
              title="Đã từ chối"
              value={metrics.rejected}
              valueStyle={{ fontWeight: 800, color: '#e11d48' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Content Card */}
      <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        {/* Status Tabs */}
        <Tabs
          activeKey={statusTab}
          onChange={(k) => {
            setStatusTab(k);
            setPage(1);
          }}
          items={[
            { key: 'ALL', label: 'Tất cả hồ sơ' },
            {
              key: 'PENDING',
              label: (
                <span>
                  Chờ thẩm định{' '}
                  {metrics.pending > 0 && (
                    <Badge count={metrics.pending} overflowCount={99} style={{ backgroundColor: '#eab308' }} />
                  )}
                </span>
              ),
            },
            { key: 'APPROVED', label: 'Đã phê duyệt' },
            { key: 'REJECTED', label: 'Đã từ chối' },
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
