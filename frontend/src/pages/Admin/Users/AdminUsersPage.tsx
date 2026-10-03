import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Avatar,
  Tooltip,
  Popconfirm,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Empty,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  LockOutlined,
  UnlockOutlined,
  StopOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { userService } from '../../../services/userService';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { ManagedUser, UserFilterParams } from '../../../types/userManagement';
import { CreateUserModal } from './components/CreateUserModal';
import { EditUserModal } from './components/EditUserModal';
import { ChangeRoleModal } from './components/ChangeRoleModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { UserAuditLogsDrawer } from './components/UserAuditLogsDrawer';

const { Title, Paragraph, Text } = Typography;

export const AdminUsersPage: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);

  // Data states
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Debounce search input
  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: UserFilterParams = {
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      };
      const res = await userService.getUsers(params);
      setUsers(res?.data || []);
      setTotal(res?.total || 0);
    } catch {
      message.error('Không thể tải danh sách người dùng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Status actions
  const handleActivate = async (user: ManagedUser) => {
    try {
      await userService.activateUser(user.id);
      message.success(`Đã mở khóa tài khoản cho ${user.email}`);
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Thao tác thất bại.');
    }
  };

  const handleDeactivate = async (user: ManagedUser) => {
    try {
      await userService.deactivateUser(user.id);
      message.success(`Đã tạm khóa tài khoản cho ${user.email}`);
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Thao tác thất bại.');
    }
  };

  const handleBan = async (user: ManagedUser) => {
    try {
      await userService.banUser(user.id);
      message.success(`Đã cấm tài khoản ${user.email}`);
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Thao tác thất bại.');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setRoleFilter(undefined);
    setStatusFilter(undefined);
    setPage(1);
  };

  // KPI Calculations
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const lockedCount = users.filter((u) => u.status === 'INACTIVE' || u.status === 'BANNED').length;
  const internalStaffCount = users.filter((u) =>
    u.roles?.some((r) => ['ADMIN', 'MANAGER', 'STAFF'].includes(r.role.name)),
  ).length;

  const getRoleTag = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return <Tag color="volcano">Quản trị viên (ADMIN)</Tag>;
      case 'MANAGER':
        return <Tag color="purple">Quản lý (MANAGER)</Tag>;
      case 'STAFF':
        return <Tag color="geekblue">Nhân viên (STAFF)</Tag>;
      default:
        return <Tag>Khách hàng (USER)</Tag>;
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Tag color="success">Hoạt động</Tag>;
      case 'INACTIVE':
        return <Tag color="warning">Tạm khóa</Tag>;
      case 'BANNED':
        return <Tag color="error">Bị cấm</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: ManagedUser) => {
        const isSelf = record.id === currentUser?.id;
        const fullName = `${record.firstName} ${record.lastName}`.trim();
        return (
          <Space>
            <Avatar
              src={record.avatarUrl}
              style={{ backgroundColor: '#1677ff', verticalAlign: 'middle' }}
            >
              {record.firstName?.[0] || 'U'}
            </Avatar>
            <div>
              <Space orientation="horizontal" size={4}>
                <Text strong>{fullName || record.email}</Text>
                {isSelf && <Tag color="blue">Bạn</Tag>}
              </Space>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ID: {record.id.slice(0, 8)}...
                </Text>
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_: any, record: ManagedUser) => (
        <div>
          <div>
            <Text>{record.email}</Text>
          </div>
          {record.phone && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <PhoneOutlined style={{ marginRight: 4 }} />
                {record.phone}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Vai trò',
      key: 'roles',
      render: (_: any, record: ManagedUser) => (
        <Space wrap>
          {record.roles?.length
            ? record.roles.map((r, i) => <span key={i}>{getRoleTag(r.role.name)}</span>)
            : getRoleTag('USER')}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => {
        try {
          return new Date(val).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
        } catch {
          return val;
        }
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 260,
      render: (_: any, record: ManagedUser) => {
        const isSelf = record.id === currentUser?.id;
        const selfLockoutTooltip = 'Bạn không thể tự khóa hoặc hạ quyền của chính mình';

        // Secondary dropdown items
        const moreItems: MenuProps['items'] = [
          {
            key: 'reset-pass',
            label: 'Đổi mật khẩu',
            icon: <KeyOutlined />,
            onClick: () => {
              setSelectedUser(record);
              setIsResetPassOpen(true);
            },
          },
          ...(record.status === 'ACTIVE'
            ? [
                {
                  key: 'deactivate',
                  danger: true,
                  disabled: isSelf,
                  label: isSelf ? (
                    <Tooltip title={selfLockoutTooltip}>Khóa tài khoản</Tooltip>
                  ) : (
                    <Popconfirm
                      title="Khóa tài khoản người dùng"
                      description="Người dùng này sẽ không thể đăng nhập cho đến khi được mở lại?"
                      onConfirm={() => handleDeactivate(record)}
                      okText="Khóa tài khoản"
                      cancelText="Hủy"
                    >
                      <span>Khóa tài khoản</span>
                    </Popconfirm>
                  ),
                  icon: <LockOutlined />,
                },
                {
                  key: 'ban',
                  danger: true,
                  disabled: isSelf,
                  label: isSelf ? (
                    <Tooltip title={selfLockoutTooltip}>Cấm tài khoản</Tooltip>
                  ) : (
                    <Popconfirm
                      title="Cấm tài khoản"
                      description="Xác nhận cấm vĩnh viễn tài khoản này?"
                      onConfirm={() => handleBan(record)}
                      okText="Xác nhận cấm"
                      cancelText="Hủy"
                    >
                      <span>Cấm tài khoản</span>
                    </Popconfirm>
                  ),
                  icon: <StopOutlined />,
                },
              ]
            : [
                {
                  key: 'activate',
                  label: (
                    <Popconfirm
                      title="Mở khóa tài khoản"
                      description="Cho phép tài khoản này hoạt động trở lại?"
                      onConfirm={() => handleActivate(record)}
                      okText="Mở khóa"
                      cancelText="Hủy"
                    >
                      <span>Mở khóa tài khoản</span>
                    </Popconfirm>
                  ),
                  icon: <UnlockOutlined />,
                },
              ]),
        ];

        return (
          <Space orientation="horizontal" size="small">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setIsEditOpen(true);
              }}
            >
              Sửa
            </Button>

            {isSelf ? (
              <Tooltip title={selfLockoutTooltip}>
                <span>
                  <Button
                    size="small"
                    disabled
                    icon={<SafetyCertificateOutlined />}
                  >
                    Đổi vai trò
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={() => {
                  setSelectedUser(record);
                  setIsChangeRoleOpen(true);
                }}
              >
                Đổi vai trò
              </Button>
            )}

            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setIsAuditLogsOpen(true);
              }}
            >
              Nhật ký
            </Button>

            <Dropdown menu={{ items: moreItems }} trigger={['click']}>
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý Người dùng
        </Title>
        <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
          Quản lý danh sách tài khoản, phân quyền vai trò và nhật ký hoạt động hệ thống.
        </Paragraph>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="Tổng người dùng"
              value={total}
              prefix={<TeamOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="Đang hoạt động"
              value={activeCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="Bị khóa / Cấm"
              value={lockedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<StopOutlined style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="Quản trị & Nhân sự"
              value={internalStaffCount}
              valueStyle={{ color: '#722ed1' }}
              prefix={<SafetyCertificateOutlined style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card bordered={false}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Space wrap size="middle">
            <Input
              placeholder="Tìm theo tên, email, SĐT..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />

            <Select
              placeholder="Vai trò"
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              style={{ width: 160 }}
              allowClear
              options={[
                { label: 'Tất cả vai trò', value: '' },
                { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                { label: 'Quản lý (MANAGER)', value: 'MANAGER' },
                { label: 'Nhân viên (STAFF)', value: 'STAFF' },
                { label: 'Khách hàng (USER)', value: 'USER' },
              ]}
            />

            <Select
              placeholder="Trạng thái"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              style={{ width: 160 }}
              allowClear
              options={[
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Hoạt động (ACTIVE)', value: 'ACTIVE' },
                { label: 'Tạm khóa (INACTIVE)', value: 'INACTIVE' },
                { label: 'Bị cấm (BANNED)', value: 'BANNED' },
              ]}
            />

            <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
              Làm mới dữ liệu
            </Button>
          </Space>

          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setIsCreateOpen(true)}
          >
            Thêm người dùng mới
          </Button>
        </div>

        {/* Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không tìm thấy người dùng phù hợp"
              >
                <Button type="primary" onClick={handleResetFilters}>
                  Đặt lại bộ lọc
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Modals & Drawer */}
      <CreateUserModal
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          fetchUsers();
        }}
      />

      <EditUserModal
        open={isEditOpen}
        user={selectedUser}
        onCancel={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
          fetchUsers();
        }}
      />

      <ChangeRoleModal
        open={isChangeRoleOpen}
        user={selectedUser}
        onCancel={() => {
          setIsChangeRoleOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setIsChangeRoleOpen(false);
          setSelectedUser(null);
          fetchUsers();
        }}
      />

      <ResetPasswordModal
        open={isResetPassOpen}
        user={selectedUser}
        onCancel={() => {
          setIsResetPassOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setIsResetPassOpen(false);
          setSelectedUser(null);
          fetchUsers();
        }}
      />

      <UserAuditLogsDrawer
        open={isAuditLogsOpen}
        user={selectedUser}
        onClose={() => {
          setIsAuditLogsOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default AdminUsersPage;
