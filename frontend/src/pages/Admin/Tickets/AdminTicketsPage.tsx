import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Tag,
  Select,
  Typography,
  Card,
  message,
  Input,
  Row,
  Col,
  Statistic,
  Space,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ticketService } from '../../../services/ticketService';
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../../../types/ticket';

const { Title, Text } = Typography;

export const AdminTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role-aware route detection
  const isStaff = location.pathname.startsWith('/staff');
  const ticketBasePath = isStaff ? '/staff/tickets' : '/admin/tickets';
  const urlStatus = (searchParams.get('status') as TicketStatus | 'ALL') || 'ALL';
  const urlCategory = (searchParams.get('category') as TicketCategory | 'ALL') || 'ALL';
  const urlSearch = searchParams.get('search') || '';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>(urlStatus);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'ALL'>(urlCategory);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'ALL'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>(urlSearch);

  // Sync if URL search params change
  useEffect(() => {
    const s = (searchParams.get('status') as TicketStatus | 'ALL') || 'ALL';
    if (s !== statusFilter) {
      setStatusFilter(s);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== searchKeyword) {
      setSearchKeyword(q);
      setPage(1);
    }
  }, [searchParams]);

  const loadTickets = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const params: any = {
          page,
          limit,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          search: searchKeyword.trim() || undefined,
        };

        const res = await ticketService.getAdminTickets(params);
        const rawData = res?.data ?? res;
        const list: Ticket[] = Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData)
          ? rawData
          : Array.isArray(res?.items)
          ? res.items
          : [];
        const totalCount =
          typeof rawData?.total === 'number'
            ? rawData.total
            : typeof res?.total === 'number'
            ? res.total
            : list.length;

        setTickets(list);
        setTotal(totalCount);
      } catch (err: any) {
        if (!silent) {
          message.error(err.response?.data?.message || 'Không thể tải danh sách vé hỗ trợ');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, limit, statusFilter, categoryFilter, priorityFilter, searchKeyword]
  );

  useEffect(() => {
    loadTickets();
    // Silent polling every 5s to refresh tickets and chat conversations without UI flickering
    const interval = setInterval(() => {
      loadTickets(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const handleStatusChange = (val: TicketStatus | 'ALL') => {
    setStatusFilter(val);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (val === 'ALL') {
      newParams.delete('status');
    } else {
      newParams.set('status', val);
    }
    setSearchParams(newParams, { replace: true });
  };

  const categoryLabels: Record<TicketCategory, { label: string; color: string }> = {
    ORDER_INQUIRY: { label: 'Đơn hàng & Giao vận', color: 'blue' },
    PRODUCT_INQUIRY: { label: 'Tư vấn sản phẩm / Live Chat', color: 'cyan' },
    WARRANTY_SUPPORT: { label: 'Bảo hành & Kỹ thuật', color: 'purple' },
    RETURN_REFUND: { label: 'Khiếu nại đổi trả', color: 'volcano' },
    PAYMENT_INSTALLMENT: { label: 'Thanh toán & Trả góp', color: 'gold' },
    ACCOUNT_GENERAL: { label: 'Thắc mắc chung', color: 'default' },
  };

  const priorityLabels: Record<TicketPriority, { label: string; color: string }> = {
    LOW: { label: 'Thấp', color: 'default' },
    MEDIUM: { label: 'Trung bình', color: 'blue' },
    HIGH: { label: 'Cao', color: 'orange' },
    URGENT: { label: 'Khẩn cấp', color: 'red' },
  };

  const statusLabels: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
    OPEN: { label: 'Chờ tiếp nhận', color: 'warning', icon: <ClockCircleOutlined /> },
    IN_PROGRESS: { label: 'Đang xử lý', color: 'processing', icon: <SyncOutlined spin /> },
    RESOLVED: { label: 'Đã giải quyết', color: 'success', icon: <CheckCircleOutlined /> },
    CLOSED: { label: 'Đã đóng', color: 'default', icon: <CheckCircleOutlined /> },
  };

  const columns: ColumnsType<Ticket> = [
    {
      title: 'Mã vé',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code, record) => (
        <Text
          strong
          style={{ color: '#1890ff', cursor: 'pointer' }}
          onClick={() => navigate(`${ticketBasePath}/${record.id}`)}
        >
          {code}
        </Text>
      ),
    },
    {
      title: 'Tiêu đề & Khách hàng',
      key: 'title',
      render: (_, record) => {
        const customerName =
          [record.user?.lastName, record.user?.firstName].filter(Boolean).join(' ') ||
          record.user?.email ||
          'Khách hàng';
        const isLiveChat =
          record.title.toLowerCase().includes('[live chat]') ||
          record.title.toLowerCase().includes('live chat');

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              {isLiveChat && (
                <Tag
                  color="#10b981"
                  icon={<MessageOutlined />}
                  style={{ borderRadius: 12, fontWeight: 600, padding: '0 8px' }}
                >
                  Live Chat
                </Tag>
              )}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: isLiveChat ? '#059669' : '#1f2937',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(isLiveChat && isStaff ? `/staff/chat?id=${record.id}` : `${ticketBasePath}/${record.id}`)}
              >
                {record.title}
              </span>
              {record._count?.messages ? (
                <Badge
                  count={record._count.messages}
                  overflowCount={99}
                  style={{ backgroundColor: isLiveChat ? '#10b981' : '#1890ff' }}
                  title={`${record._count.messages} tin nhắn trong phiên`}
                />
              ) : null}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Khách hàng: <Text strong>{customerName}</Text>{' '}
              {record.user?.email && `(${record.user.email})`}
            </Text>
            {record.order && (
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                Đơn liên quan: <Text code>{record.order.orderNumber}</Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (cat: TicketCategory) => (
        <Tag color={categoryLabels[cat]?.color || 'default'}>
          {categoryLabels[cat]?.label || cat}
        </Tag>
      ),
    },
    {
      title: 'Mức độ',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (pr: TicketPriority) => (
        <Tag color={priorityLabels[pr]?.color || 'default'}>
          {priorityLabels[pr]?.label || pr}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (st: TicketStatus) => {
        const info = statusLabels[st] || { label: st, color: 'default', icon: null };
        return (
          <Tag color={info.color} icon={info.icon}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: 'Phụ trách',
      key: 'assignedTo',
      width: 160,
      render: (_, record) => {
        if (!record.assignedTo) {
          return <Text type="secondary" italic>Chưa phân công</Text>;
        }
        return (
          <Text>
            {[record.assignedTo.lastName, record.assignedTo.firstName].filter(Boolean).join(' ') || record.assignedTo.email}
          </Text>
        );
      },
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (d) => new Date(d).toLocaleString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_, record) => {
        const isLiveChat =
          record.title.toLowerCase().includes('[live chat]') ||
          record.title.toLowerCase().includes('live chat');
        return (
          <Button
            type={isLiveChat ? 'primary' : 'default'}
            size="small"
            icon={isLiveChat ? <CustomerServiceOutlined /> : <EyeOutlined />}
            style={
              isLiveChat
                ? { backgroundColor: '#10b981', borderColor: '#10b981', borderRadius: 6 }
                : { borderRadius: 6 }
            }
            onClick={(e) => {
              e.stopPropagation();
              navigate(isLiveChat && isStaff ? `/staff/chat?id=${record.id}` : `${ticketBasePath}/${record.id}`);
            }}
          >
            {isLiveChat ? 'Mở phòng chat' : 'Xử lý vé'}
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {isStaff ? 'Hỗ trợ Khách hàng & Tin nhắn Live Chat' : 'Quản lý Vé Hỗ trợ & Inquiry Khách hàng'}
          </Title>
          <Text type="secondary">
            {isStaff
              ? 'Tiếp nhận tin nhắn Live Chat, trả lời khách hàng theo thời gian thực và ghi chú nội bộ'
              : 'Tiếp nhận khiếu nại, phản hồi thắc mắc kỹ thuật và phối hợp ghi chú nội bộ CSKH'}
          </Text>
        </div>
        <Space>
          {isStaff && (
            <Button
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => navigate('/staff/chat')}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            >
              Mở Không gian Live Chat
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => loadTickets(false)} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Chờ tiếp nhận"
              value={tickets.filter((t) => t.status === 'OPEN').length}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang giải quyết"
              value={tickets.filter((t) => t.status === 'IN_PROGRESS').length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đã xử lý xong"
              value={tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Cần xử lý gấp"
              value={tickets.filter((t) => t.priority === 'URGENT' && t.status !== 'CLOSED').length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={6}>
            <Input
              placeholder="Tìm theo Mã vé, Tiêu đề hoặc Email/SĐT..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={() => {
                setPage(1);
                loadTickets(false);
              }}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={handleStatusChange}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'OPEN', label: 'Chờ tiếp nhận (Open)' },
                { value: 'IN_PROGRESS', label: 'Đang xử lý' },
                { value: 'RESOLVED', label: 'Đã giải quyết' },
                { value: 'CLOSED', label: 'Đã đóng' },
              ]}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả danh mục' },
                { value: 'PRODUCT_INQUIRY', label: 'Tư vấn sản phẩm / Live Chat' },
                { value: 'ORDER_INQUIRY', label: 'Đơn hàng & Giao vận' },
                { value: 'WARRANTY_SUPPORT', label: 'Bảo hành & Kỹ thuật' },
                { value: 'RETURN_REFUND', label: 'Khiếu nại đổi trả' },
                { value: 'PAYMENT_INSTALLMENT', label: 'Thanh toán & Trả góp' },
                { value: 'ACCOUNT_GENERAL', label: 'Thắc mắc chung' },
              ]}
            />
          </Col>
          <Col xs={12} md={3}>
            <Select
              style={{ width: '100%' }}
              value={priorityFilter}
              onChange={(val) => {
                setPriorityFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả ưu tiên' },
                { value: 'LOW', label: 'Thấp' },
                { value: 'MEDIUM', label: 'Trung bình' },
                { value: 'HIGH', label: 'Cao' },
                { value: 'URGENT', label: 'Khẩn cấp' },
              ]}
            />
          </Col>
          <Col xs={12} md={4}>
            <Button
              type={searchKeyword === '[Live Chat]' ? 'primary' : 'default'}
              icon={<MessageOutlined />}
              onClick={() => {
                if (searchKeyword === '[Live Chat]') {
                  setSearchKeyword('');
                } else {
                  setSearchKeyword('[Live Chat]');
                }
                setPage(1);
              }}
              style={
                searchKeyword === '[Live Chat]'
                  ? { backgroundColor: '#10b981', borderColor: '#10b981', width: '100%' }
                  : { width: '100%' }
              }
            >
              {searchKeyword === '[Live Chat]' ? 'Đang lọc Live Chat' : 'Tin Live Chat'}
            </Button>
          </Col>
          <Col xs={12} md={3}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => {
                setPage(1);
                loadTickets(false);
              }}
              style={{ width: '100%' }}
            >
              Lọc
            </Button>
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={tickets}
          loading={loading}
          onRow={(record) => {
            const isLiveChat =
              record.title.toLowerCase().includes('[live chat]') ||
              record.title.toLowerCase().includes('live chat');
            return {
              onClick: (e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('button') && !target.closest('a') && !target.closest('.ant-select')) {
                  navigate(isLiveChat && isStaff ? `/staff/chat?id=${record.id}` : `${ticketBasePath}/${record.id}`);
                }
              },
              style: { cursor: 'pointer' },
            };
          }}
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

export default AdminTicketsPage;
