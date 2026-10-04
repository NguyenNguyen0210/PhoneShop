import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Tag, Input, Space, Button, Typography, Card, Avatar } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { userService } from '../../../services/userService';
import type { User } from '../../../types';

const { Title, Text } = Typography;

export const StaffCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchQuery(urlSearch);
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getAllUsers({ role: 'USER' });
      const items = (res as any)?.items || (res as any)?.data || (Array.isArray(res) ? res : []);
      setUsers(items);
    } catch (err) {
      console.error('Failed to load customers for staff:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u: any) => {
      const fullName = (
        u.fullName ||
        [u.lastName, u.firstName].filter(Boolean).join(' ') ||
        ''
      ).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [users, searchQuery]);

  const columns: ColumnsType<User> = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: unknown, record: any) => {
        const fullName =
          record.fullName ||
          [record.lastName, record.firstName].filter(Boolean).join(' ') ||
          'Khách hàng';
        const avatarSrc = record.avatar || record.avatarUrl;
        return (
          <Space size="middle">
            <Avatar
              src={avatarSrc}
              style={{ backgroundColor: '#4f46e5' }}
              icon={!avatarSrc && <UserOutlined />}
            >
              {fullName.charAt(0) || 'K'}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{fullName}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.email}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || 'Chưa cập nhật',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: () => <Tag color="blue">KHÁCH HÀNG</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/staff/customers/${record.id}`)}
        >
          Hồ sơ 360°
        </Button>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Tra cứu Khách hàng
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Tra cứu thông tin liên hệ và lịch sử giao dịch của khách để phục vụ tư vấn
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadCustomers} loading={loading}>
          Làm mới
        </Button>
      </div>

      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <Input
          placeholder="Tìm theo Tên, Email, SĐT..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      <Table
        dataSource={filteredUsers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
      />
    </Card>
  );
};

export default StaffCustomersPage;
