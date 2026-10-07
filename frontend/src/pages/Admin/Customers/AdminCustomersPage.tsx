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
  Input,
  Avatar,
  Row,
  Col,
  Statistic,
  Dropdown,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SearchOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  CrownOutlined,
  StarOutlined,
  TrophyOutlined,
  MoreOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../../services/customerService';
import type { CustomerSummary, CustomerStats, LoyaltyTier } from '../../../types/customer';
import { useAuthStore } from '../../../stores/useAuthStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PRESET_LOCK_REASONS = [
  'Vi phạm điều khoản chính sách dịch vụ',
  'Nghi vấn gian lận giao dịch thanh toán',
  'Spam hoặc có hành vi trục lợi mã ưu đãi',
  'Tài khoản có dấu hiệu bị xâm nhập trái phép',
  'Yêu cầu chủ động từ phía khách hàng',
  'Khác (Vui lòng nhập lý do cụ thể)',
];

export const AdminCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    banned: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Lock account modal state
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockingCustomer, setLockingCustomer] = useState<CustomerSummary | null>(null);
  const [lockPreset, setLockPreset] = useState<string>(PRESET_LOCK_REASONS[0]);
  const [lockReason, setLockReason] = useState<string>('');
  const [lockSubmitting, setLockSubmitting] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchKeyword.trim() || undefined,
      };

      const res = await customerService.getCustomers(params);
      setCustomers(res.data || []);
      setTotal(res.total || 0);

      // Reconcile KPIs across all database accounts from backend stats metadata
      if (res.stats) {
        setStats(res.stats);
      } else {
        // Fallback calculation if stats metadata not provided
        const allCount = res.total || (res.data ? res.data.length : 0);
        const activeCount = (res.data || []).filter((c: any) => c.status === 'ACTIVE').length;
        const bannedCount = (res.data || []).filter((c: any) => c.status === 'BANNED').length;
        setStats({
          total: allCount,
          active: activeCount,
          inactive: allCount - activeCount - bannedCount,
          banned: bannedCount,
        });
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchKeyword]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleStatusChange = async (id: string, action: 'activate' | 'deactivate') => {
    try {
      if (action === 'activate') {
        await customerService.activateUser(id);
        message.success('Đã kích hoạt tài khoản khách hàng');
      } else if (action === 'deactivate') {
        await customerService.deactivateUser(id);
        message.success('Đã tạm ngưng tài khoản khách hàng');
      }
      loadCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const openLockModal = (cust: CustomerSummary) => {
    setLockingCustomer(cust);
    setLockPreset(PRESET_LOCK_REASONS[0]);
    setLockReason('');
    setLockModalVisible(true);
  };

  const handleConfirmLock = async () => {
    if (!lockingCustomer) return;
    const finalReason = lockReason.trim() || lockPreset;
    if (!finalReason) {
      message.warning('Vui lòng cung cấp lý do khóa tài khoản');
      return;
    }

    try {
      setLockSubmitting(true);
      await customerService.banUser(lockingCustomer.id, finalReason);
      message.success(`Đã khóa tài khoản của khách hàng ${lockingCustomer.email}`);
      setLockModalVisible(false);
      setLockingCustomer(null);
      setLockReason('');
      loadCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể khóa tài khoản khách hàng');
    } finally {
      setLockSubmitting(false);
    }
  };

  const renderTierTag = (tier?: LoyaltyTier) => {
    switch (tier) {
      case 'VIP':
        return (
          <Tag color="gold" icon={<CrownOutlined />} style={{ fontWeight: 600 }}>
            VIP
          </Tag>
        );
      case 'GOLD':
        return (
          <Tag color="orange" icon={<StarOutlined />} style={{ fontWeight: 600 }}>
            Vàng
          </Tag>
        );
      case 'SILVER':
        return (
          <Tag color="blue" icon={<TrophyOutlined />}>
            Bạc
          </Tag>
        );
      case 'STANDARD':
      default:
        return <Tag color="default">Tiêu chuẩn</Tag>;
    }
  };

  const filteredCustomers = customers.filter((cust) => {
    if (tierFilter !== 'ALL' && cust.loyaltyTier !== tierFilter) {
      return false;
    }
    return true;
  });

  const columns: ColumnsType<CustomerSummary> = [
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 240,
      render: (_, record) => {
        const fullName = [record.lastName, record.firstName].filter(Boolean).join(' ') || 'Khách hàng';
        return (
          <Space>
            <Avatar
              src={record.avatarUrl}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff', border: '1px solid #91d5ff' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#262626' }}>{fullName}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.email}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Hạng VIP',
      key: 'loyaltyTier',
      width: 130,
      render: (_, record) => renderTierTag(record.loyaltyTier),
    },
    {
      title: 'Tổng chi tiêu (LTV)',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      width: 160,
      sorter: (a, b) => (a.totalSpent || 0) - (b.totalSpent || 0),
      render: (spent) => (
        <Text strong style={{ color: spent > 0 ? '#cf1322' : '#8c8c8c' }}>
          {Number(spent || 0).toLocaleString('vi-VN')} đ
        </Text>
      ),
    },
    {
      title: 'Số đơn',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.orderCount || 0) - (b.orderCount || 0),
      render: (count) => (
        <Tag color={count > 0 ? 'cyan' : 'default'} style={{ borderRadius: 12, padding: '0 8px' }}>
          {count || 0} đơn
        </Tag>
      ),
    },
    {
      title: 'Lần mua cuối',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      width: 140,
      render: (val) =>
        val ? (
          <Text style={{ fontSize: 13 }}>{new Date(val).toLocaleDateString('vi-VN')}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>
            Chưa có
          </Text>
        ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone) => phone || <Text type="secondary">—</Text>,
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (val) => new Date(val).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        if (status === 'ACTIVE')
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Hoạt động
            </Tag>
          );
        if (status === 'BANNED')
          return (
            <Tag color="error" icon={<LockOutlined />}>
              Đã khóa
            </Tag>
          );
        return (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            Tạm ngưng
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [];

        if (isAdmin()) {
          if (record.status === 'ACTIVE') {
            menuItems.push({
              key: 'deactivate',
              icon: <StopOutlined style={{ color: '#faad14' }} />,
              label: 'Tạm ngưng tài khoản',
              onClick: () => handleStatusChange(record.id, 'deactivate'),
            });
            menuItems.push({
              key: 'ban',
              icon: <LockOutlined style={{ color: '#ff4d4f' }} />,
              label: <span style={{ color: '#ff4d4f' }}>Khóa tài khoản...</span>,
              onClick: () => openLockModal(record),
            });
          } else if (record.status === 'INACTIVE') {
            menuItems.push({
              key: 'activate',
              icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
              label: 'Kích hoạt lại',
              onClick: () => handleStatusChange(record.id, 'activate'),
            });
            menuItems.push({
              key: 'ban',
              icon: <LockOutlined style={{ color: '#ff4d4f' }} />,
              label: <span style={{ color: '#ff4d4f' }}>Khóa tài khoản...</span>,
              onClick: () => openLockModal(record),
            });
          } else if (record.status === 'BANNED') {
            menuItems.push({
              key: 'activate',
              icon: <UnlockOutlined style={{ color: '#52c41a' }} />,
              label: 'Mở khóa tài khoản',
              onClick: () => handleStatusChange(record.id, 'activate'),
            });
          }
        }

        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/customers/${record.id}`)}
            >
              Hồ sơ 360°
            </Button>

            {isAdmin() && menuItems.length > 0 && (
              <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                <Button size="small" icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý Khách hàng & Tra cứu 360°
          </Title>
          <Text type="secondary">
            Tra cứu thông tin, chỉ số CRM bán lẻ (LTV, Hạng VIP, Lần mua cuối) và hồ sơ khách hàng toàn diện
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadCustomers} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* KPI Cards Reconciled Across All Database Accounts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
            <Statistic
              title="Tổng số khách hàng"
              value={stats.total || total}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              suffix="tài khoản"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
              suffix={`(${stats.total ? Math.round((stats.active / stats.total) * 100) : 100}%)`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
            <Statistic
              title="Bị hạn chế / Khóa"
              value={stats.banned}
              valueStyle={{ color: stats.banned > 0 ? '#ff4d4f' : '#8c8c8c' }}
              prefix={<LockOutlined />}
              suffix="tài khoản"
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 8 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo Tên, Email hoặc Số điện thoại..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={() => {
                setPage(1);
                loadCustomers();
              }}
              allowClear
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Hoạt động' },
                { value: 'INACTIVE', label: 'Tạm ngưng' },
                { value: 'BANNED', label: 'Đã khóa' },
              ]}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              style={{ width: '100%' }}
              value={tierFilter}
              onChange={(val) => {
                setTierFilter(val);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả hạng thành viên' },
                { value: 'VIP', label: 'Hạng VIP' },
                { value: 'GOLD', label: 'Hạng Vàng' },
                { value: 'SILVER', label: 'Hạng Bạc' },
                { value: 'STANDARD', label: 'Hạng Tiêu chuẩn' },
              ]}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => {
                setPage(1);
                loadCustomers();
              }}
              style={{ width: '100%' }}
            >
              Tìm kiếm
            </Button>
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredCustomers}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      {/* Mandatory Reason Modal for Locking Account */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>Khóa tài khoản khách hàng</span>
          </Space>
        }
        open={lockModalVisible}
        onCancel={() => {
          if (!lockSubmitting) {
            setLockModalVisible(false);
            setLockingCustomer(null);
            setLockReason('');
          }
        }}
        confirmLoading={lockSubmitting}
        okText="Xác nhận khóa tài khoản"
        okButtonProps={{ danger: true, disabled: !lockReason.trim() && !lockPreset }}
        onOk={handleConfirmLock}
        destroyOnClose
      >
        {lockingCustomer && (
          <div>
            <Alert
              type="error"
              showIcon
              message="Thao tác có mức độ ảnh hưởng bảo mật"
              description={`Bạn đang chuẩn bị khóa tài khoản của ${[
                lockingCustomer.lastName,
                lockingCustomer.firstName,
              ]
                .filter(Boolean)
                .join(' ')} (${lockingCustomer.email}). Khách hàng sẽ bị đăng xuất lập tức khỏi mọi thiết bị và không thể đặt đơn mới.`}
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Phân loại nguyên nhân khóa tài khoản:
              </Text>
              <Select
                style={{ width: '100%' }}
                value={lockPreset}
                onChange={(val) => {
                  setLockPreset(val);
                  if (val !== 'Khác (Vui lòng nhập lý do cụ thể)') {
                    setLockReason(val);
                  } else {
                    setLockReason('');
                  }
                }}
                options={PRESET_LOCK_REASONS.map((r) => ({ value: r, label: r }))}
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Lý do ghi nhận kiểm toán CRM (Bắt buộc):
              </Text>
              <TextArea
                rows={3}
                placeholder="Nhập lý do chi tiết để lưu trữ vào nhật ký quản trị..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
