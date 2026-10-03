import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  DatePicker,
  Typography,
  Tooltip,
  message,
  Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  UserOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { auditLogService } from '../../../services/auditLogService';
import type { AuditLogEntry, AuditAction, AuditLogStats } from '../../../types/auditLog';
import { AuditLogDetailDrawer, getAuditActionColor } from './components/AuditLogDetailDrawer';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

const ACTION_OPTIONS: { label: string; value: AuditAction }[] = [
  { label: 'Tạo mới (CREATE)', value: 'CREATE' },
  { label: 'Cập nhật (UPDATE)', value: 'UPDATE' },
  { label: 'Xóa (DELETE)', value: 'DELETE' },
  { label: 'Đăng nhập (LOGIN)', value: 'LOGIN' },
  { label: 'Đăng xuất (LOGOUT)', value: 'LOGOUT' },
  { label: 'Thanh toán (PAYMENT)', value: 'PAYMENT' },
  { label: 'Hoàn tiền (REFUND)', value: 'REFUND' },
  { label: 'Hủy đơn hàng (CANCEL_ORDER)', value: 'CANCEL_ORDER' },
  { label: 'Cập nhật kho (UPDATE_STOCK)', value: 'UPDATE_STOCK' },
  { label: 'Phân quyền (CHANGE_ROLE)', value: 'CHANGE_ROLE' },
  { label: 'Khác (OTHER)', value: 'OTHER' },
];

const ENTITY_OPTIONS = [
  { label: 'Người dùng (User)', value: 'User' },
  { label: 'Đơn hàng (Order)', value: 'Order' },
  { label: 'Sản phẩm (Product)', value: 'Product' },
  { label: 'Danh mục (Category)', value: 'Category' },
  { label: 'Đổi trả (ReturnRequest)', value: 'ReturnRequest' },
  { label: 'Kho & IMEI (Inventory/IMEI)', value: 'Inventory' },
  { label: 'Phiếu hỗ trợ (Ticket)', value: 'Ticket' },
];

export const AdminAuditLogsPage: React.FC = () => {
  // Data states
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Stats
  const [stats, setStats] = useState<AuditLogStats>({
    totalLogs: 0,
    todayLogs: 0,
    sensitiveOperations: 0,
  });

  // Filters
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>(undefined);
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await auditLogService.getAuditLogStats();
      setStats(data);
    } catch {
      // Ignore background stats fetch errors
    }
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }

      const res = await auditLogService.getAuditLogs(params);
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch {
      message.error('Không thể tải danh sách nhật ký kiểm toán. Vui lòng thử lại.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, entityFilter, debouncedSearch, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleResetFilters = () => {
    setActionFilter(undefined);
    setEntityFilter(undefined);
    setSearch('');
    setDateRange(null);
    setPage(1);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }
      await auditLogService.exportAuditLogsToCsv(params);
      message.success('Đã tải xuống tệp CSV nhật ký kiểm toán thành công!');
    } catch {
      message.error('Lỗi khi xuất tệp CSV!');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => (
        <Tooltip title={new Date(val).toISOString()}>
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 13 }}>
              {new Date(val).toLocaleDateString('vi-VN')}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(val).toLocaleTimeString('vi-VN')}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Người thực hiện',
      key: 'user',
      width: 220,
      render: (_, record) => {
        if (!record.user && !record.userId) {
          return (
            <Space size={8}>
              <Avatar size="small" icon={<ThunderboltOutlined />} style={{ backgroundColor: '#8c8c8c' }} />
              <Text italic>Hệ thống tự động</Text>
            </Space>
          );
        }
        const name = [record.user?.firstName, record.user?.lastName].filter(Boolean).join(' ') || 'Admin/User';
        return (
          <Space size={8}>
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <div>
              <Text strong style={{ display: 'block', fontSize: 13 }}>
                {name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.user?.email || record.userId}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action: AuditAction) => (
        <Tag color={getAuditActionColor(action)} style={{ fontWeight: 500 }}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Thực thể / Bản ghi',
      key: 'entity',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{record.entity}</Tag>
          {record.entityId && (
            <Tooltip title="Nhấp để sao chép ID">
              <Text
                code
                style={{ fontSize: 11, cursor: 'pointer' }}
                onClick={() => {
                  navigator.clipboard.writeText(record.entityId!);
                  message.success('Đã sao chép Entity ID!');
                }}
              >
                {record.entityId.length > 16 ? `${record.entityId.slice(0, 16)}...` : record.entityId}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Địa chỉ IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip: string | null) => (
        <Space>
          <GlobalOutlined style={{ color: '#8c8c8c' }} />
          <Text code style={{ fontSize: 12 }}>{ip || 'N/A'}</Text>
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actionButton',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedLog(record);
            setIsDrawerOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <SafetyCertificateOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Nhật ký kiểm toán hệ thống
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            Theo dõi vết lịch sử thay đổi dữ liệu, đăng nhập và các thao tác quản trị trên toàn sàn thương mại điện tử.
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchLogs(); fetchStats(); }} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportCsv}
            loading={exporting}
          >
            Xuất CSV
          </Button>
        </Space>
      </div>

      {/* Metrics Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng số nhật ký hệ thống"
              value={stats.totalLogs}
              prefix={<HistoryOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Hoạt động hôm nay"
              value={stats.todayLogs}
              valueStyle={{ color: '#52c41a' }}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Thao tác nhạy cảm (Xóa/Hủy/Role)"
              value={stats.sensitiveOperations}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Card */}
      <Card
        bordered={false}
        style={{ marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as any);
                setPage(1);
              }}
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Lọc theo hành động"
              style={{ width: '100%' }}
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Lọc theo thực thể"
              style={{ width: '100%' }}
              value={entityFilter}
              onChange={(val) => {
                setEntityFilter(val);
                setPage(1);
              }}
              options={ENTITY_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              allowClear
              placeholder="Tìm email, entityId, IP..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Button onClick={handleResetFilters} style={{ width: '100%' }}>
              Đặt lại
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Table Card */}
      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table<AuditLogEntry>
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t) => `Tổng cộng ${t} bản ghi`,
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
            },
          }}
        />
      </Card>

      {/* Detail Drawer */}
      <AuditLogDetailDrawer
        open={isDrawerOpen}
        log={selectedLog}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
};

export default AdminAuditLogsPage;
