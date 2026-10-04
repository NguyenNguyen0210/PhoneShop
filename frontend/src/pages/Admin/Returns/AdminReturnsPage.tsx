import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export const AdminReturnsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
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
      setStatusFilter(statusParam);
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
      // Filter by status tab
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      // Filter by search keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.trim().toLowerCase();
        const returnNo = (item.returnNumber || '').toLowerCase();
        const orderNo = (item.order?.orderNumber || item.orderId || '').toLowerCase();
        const email = (item.user?.email || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        return (
          returnNo.includes(q) ||
          orderNo.includes(q) ||
          email.includes(q) ||
          reason.includes(q)
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const columns: ColumnsType<ReturnRequest> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 170,
      render: (text: string, record: ReturnRequest) => (
        <div>
          <Text strong style={{ color: '#2563eb' }}>
            {text}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatDate(record.requestedAt)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Đơn hàng & Khách hàng',
      key: 'orderAndCustomer',
      render: (_: any, record: ReturnRequest) => (
        <div>
          <Text strong>#{record.order?.orderNumber || record.orderId.slice(0, 8)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user?.email || 'Khách vãng lai'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Lý do đổi trả',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string) => (
        <Tooltip title={reason}>
          <span>{reason}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Số lượng',
      key: 'itemCount',
      width: 90,
      align: 'center',
      render: (_: any, record: ReturnRequest) => (
        <Text strong>{record.items?.length || 0} món</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: ReturnStatus) => <ReturnStatusTag status={status} />,
    },
    {
      title: 'Hoàn tiền',
      key: 'refundStatus',
      width: 140,
      render: (_: any, record: ReturnRequest) => {
        const refunds = record.refunds || [];
        if (refunds.length === 0) return <Text type="secondary">Chưa có</Text>;
        const completed = refunds.find((r) => r.status === 'COMPLETED');
        if (completed) {
          return (
            <span style={{ color: '#16a34a', fontWeight: 600 }}>
              {formatPrice(Number(completed.amount))}
            </span>
          );
        }
        return <span style={{ color: '#ea580c' }}>Chờ xử lý ({refunds.length})</span>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      align: 'center',
      render: (_: any, record: ReturnRequest) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetail(record)}
        >
          Xử lý
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'ALL', label: `Tất cả (${returns.length})` },
    {
      key: 'REQUESTED',
      label: `Chờ tiếp nhận (${returns.filter((r) => r.status === 'REQUESTED').length})`,
    },
    {
      key: 'APPROVED',
      label: `Chờ gửi máy (${returns.filter((r) => r.status === 'APPROVED').length})`,
    },
    {
      key: 'SHIPPING',
      label: `Đang gửi kho (${returns.filter((r) => r.status === 'SHIPPING').length})`,
    },
    {
      key: 'RECEIVED',
      label: `Đã nhận kho (${returns.filter((r) => r.status === 'RECEIVED').length})`,
    },
    {
      key: 'INSPECTING',
      label: `Đang kiểm định (${returns.filter((r) => r.status === 'INSPECTING').length})`,
    },
    {
      key: 'COMPLETED',
      label: `Đã hoàn tất (${returns.filter((r) => r.status === 'COMPLETED').length})`,
    },
    {
      key: 'REJECTED',
      label: `Đã từ chối (${returns.filter((r) => r.status === 'REJECTED').length})`,
    },
  ];

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
            placeholder="Tìm theo mã Return, đơn hàng, khách hàng, lý do..."
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
