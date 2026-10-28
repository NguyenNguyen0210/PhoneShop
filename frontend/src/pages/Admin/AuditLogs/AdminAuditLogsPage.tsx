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
  Typography,
  message,
  Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { auditLogService } from '../../../services/auditLogService';
import type { AuditLogEntry, AuditAction } from '../../../types/auditLog';
import { AuditLogDetailDrawer, getAuditActionColor } from './components/AuditLogDetailDrawer';

const { Title, Paragraph, Text } = Typography;

const ACTION_OPTIONS = [
  { label: 'Tất cả hành động', value: '' },
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
  { label: 'Tất cả thực thể', value: '' },
  { label: 'Người dùng (User)', value: 'User' },
  { label: 'Đơn hàng (Order)', value: 'Order' },
  { label: 'Sản phẩm (Product)', value: 'Product' },
  { label: 'Danh mục (Category)', value: 'Category' },
  { label: 'Kho hàng (Inventory)', value: 'Inventory' },
];

export const AdminAuditLogsPage: React.FC = () => {
  // Data states
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Filters
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>(undefined);
  const [entityFilter, setEntityFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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

      const res = await auditLogService.getAuditLogs(params);
      const rows = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setLogs(Array.isArray(rows) ? rows : []);
      setTotal(((res as any)?.data?.total ?? (res as any)?.total) || 0);
    } catch {
      message.error('Không thể tải danh sách nhật ký kiểm toán. Vui lòng thử lại.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, entityFilter, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13 }}>
            {new Date(val).toLocaleDateString('vi-VN')}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(val).toLocaleTimeString('vi-VN')}
          </Text>
        </Space>
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
              <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#8c8c8c' }} />
              <Text italic type="secondary">Hệ thống</Text>
            </Space>
          );
        }
        const name = [record.user?.firstName, record.user?.lastName].filter(Boolean).join(' ') || record.user?.email || 'Người dùng';
        return (
          <Space size={8}>
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <div>
              <Text strong style={{ display: 'block', fontSize: 13 }}>
                {name}
              </Text>
              {record.user?.email && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.user.email}
                </Text>
              )}
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
      title: 'Thực thể',
      key: 'entity',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="purple">{record.entity}</Tag>
          {record.entityId && (
            <Text code style={{ fontSize: 11 }}>
              {record.entityId}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actionButton',
      width: 110,
      align: 'center',
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
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <SafetyCertificateOutlined style={{ marginRight: 10, color: '#1677ff' }} />
          Nhật ký kiểm toán hệ thống
        </Title>
        <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
          Theo dõi lịch sử thay đổi dữ liệu, đăng nhập và các thao tác trên hệ thống.
        </Paragraph>
      </div>

      {/* Filter Card */}
      <Card
        bordered={false}
        style={{ marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input.Search
              allowClear
              placeholder="Tìm kiếm theo email, thực thể, IP..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={(val) => {
                setDebouncedSearch(val);
                setPage(1);
              }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Tất cả hành động"
              style={{ width: '100%' }}
              value={actionFilter || undefined}
              onChange={(val) => {
                setActionFilter(val ? (val as AuditAction) : undefined);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Tất cả thực thể"
              style={{ width: '100%' }}
              value={entityFilter || undefined}
              onChange={(val) => {
                setEntityFilter(val || undefined);
                setPage(1);
              }}
              options={ENTITY_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={12} md={4} style={{ textAlign: 'right' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchLogs()}
              loading={loading}
              style={{ width: '100%' }}
            >
              Làm mới
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
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (totalCount) => `Tổng cộng ${totalCount} bản ghi`,
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
