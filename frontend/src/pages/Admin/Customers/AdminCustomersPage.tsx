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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../../services/customerService';
import type { CustomerSummary } from '../../../types/customer';
import { useAuthStore } from '../../../stores/useAuthStore';

const { Title, Text } = Typography;

export const AdminCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

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
      setCustomers(res.data);
      setTotal(res.total);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchKeyword]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleStatusChange = async (id: string, action: 'activate' | 'deactivate' | 'ban') => {
    try {
      if (action === 'activate') {
        await customerService.activateUser(id);
        message.success('Đã kích hoạt tài khoản');
      } else if (action === 'deactivate') {
        await customerService.deactivateUser(id);
        message.success('Đã tạm ngưng tài khoản');
      } else if (action === 'ban') {
        await customerService.banUser(id);
        message.warning('Đã khóa tài khoản khách hàng');
      }
      loadCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const columns: ColumnsType<CustomerSummary> = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => {
        const fullName = [record.lastName, record.firstName].filter(Boolean).join(' ') || 'Khách hàng';
        return (
          <Space>
            <Avatar src={record.avatarUrl} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <div>
              <div style={{ fontWeight: 600 }}>{fullName}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || <Text type="secondary">—</Text>,
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => new Date(val).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'ACTIVE') return <Tag color="success" icon={<CheckCircleOutlined />}>Hoạt động</Tag>;
        if (status === 'BANNED') return <Tag color="error" icon={<LockOutlined />}>Đã khóa</Tag>;
        return <Tag color="default" icon={<CloseCircleOutlined />}>Tạm ngưng</Tag>;
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/customers/${record.id}`)}
          >
            Hồ sơ 360°
          </Button>

          {/* Admin-only sensitive security controls */}
          {isAdmin() && (
            <>
              {record.status === 'ACTIVE' && (
                <Button
                  danger
                  size="small"
                  icon={<LockOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Khóa tài khoản khách hàng',
                      content: `Bạn có chắc muốn khóa tài khoản ${record.email}?`,
                      okText: 'Khóa',
                      okType: 'danger',
                      cancelText: 'Hủy',
                      onOk: () => handleStatusChange(record.id, 'ban'),
                    });
                  }}
                >
                  Khóa
                </Button>
              )}
              {record.status === 'BANNED' && (
                <Button
                  size="small"
                  icon={<UnlockOutlined />}
                  onClick={() => handleStatusChange(record.id, 'activate')}
                >
                  Mở khóa
                </Button>
              )}
            </>
          )}
        </Space>
      ),
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
            Tra cứu thông tin, lịch sử đơn hàng, thiết bị và hồ sơ khách hàng toàn diện
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadCustomers} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng số khách hàng"
              value={total}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang hoạt động"
              value={customers.filter((c) => c.status === 'ACTIVE').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Bị hạn chế / Khóa"
              value={customers.filter((c) => c.status === 'BANNED').length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
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
          <Col xs={12} md={6}>
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
          <Col xs={12} md={6}>
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
          dataSource={customers}
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
        />
      </Card>
    </div>
  );
};

export default AdminCustomersPage;
