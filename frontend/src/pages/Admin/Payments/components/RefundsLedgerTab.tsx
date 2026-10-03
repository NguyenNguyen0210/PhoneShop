import React, { useState } from 'react';
import { Table, Tag, Button, Typography, Tooltip, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { returnService } from '../../../../services/returnService';
import type { RefundItem, RefundStatus } from '../../../../types';

const { Text } = Typography;

export interface RefundsLedgerTabProps {
  refunds: RefundItem[];
  loading: boolean;
  canManage: boolean;
  onRefresh: () => void;
}

export const RefundStatusTag: React.FC<{ status: RefundStatus }> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return <Tag color="warning">Chờ xử lý</Tag>;
    case 'PROCESSING':
      return <Tag color="processing">Đang giải ngân</Tag>;
    case 'COMPLETED':
      return <Tag color="success">Đã hoàn tiền</Tag>;
    case 'FAILED':
      return <Tag color="error">Thất bại</Tag>;
    case 'CANCELLED':
      return <Tag color="default">Đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

export const RefundsLedgerTab: React.FC<RefundsLedgerTabProps> = ({
  refunds,
  loading,
  canManage,
  onRefresh,
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const handleProcess = async (refundId: string) => {
    setActionLoadingId(refundId);
    try {
      await returnService.processRefund(refundId);
      message.success('Đã chuyển trạng thái sang Đang giải ngân (PROCESSING)');
      onRefresh();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Xử lý hoàn tiền thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (refundId: string) => {
    setActionLoadingId(refundId);
    try {
      await returnService.completeRefund(refundId);
      message.success('Đã hoàn tất lệnh hoàn tiền (COMPLETED)');
      onRefresh();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Hoàn tất hoàn tiền thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: ColumnsType<RefundItem> = [
    {
      title: 'Mã hoàn tiền',
      dataIndex: 'refundNumber',
      key: 'refundNumber',
      width: 170,
      render: (text: string) => (
        <Text strong code style={{ color: '#9333ea' }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Mã yêu cầu đổi trả',
      dataIndex: 'returnId',
      key: 'returnId',
      width: 160,
      render: (val: string) => <Text code>#{val.slice(0, 8)}</Text>,
    },
    {
      title: 'Số tiền hoàn',
      dataIndex: 'amount',
      key: 'amount',
      width: 160,
      render: (val: number) => (
        <span style={{ color: '#2563eb', fontWeight: 600, fontSize: 14 }}>
          {formatPrice(Number(val))}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: RefundStatus) => <RefundStatusTag status={status} />,
    },
    {
      title: 'Lý do hoàn trả',
      dataIndex: 'reason',
      key: 'reason',
      render: (val?: string) => val || '—',
    },
    {
      title: 'Ngày tạo / Xử lý',
      key: 'dates',
      width: 170,
      render: (_: any, record: RefundItem) => (
        <div>
          <Text style={{ fontSize: 12 }}>{formatDate(record.createdAt)}</Text>
          {record.processedAt && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Xử lý: {formatDate(record.processedAt)}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác giải ngân',
      key: 'action',
      width: 200,
      align: 'center',
      render: (_: any, record: RefundItem) => {
        if (!canManage) {
          return (
            <Tooltip title="Chỉ Quản lý (Manager/Admin) có quyền thực hiện giải ngân">
              <Button size="small" disabled>
                🔒 Xem quyền
              </Button>
            </Tooltip>
          );
        }

        if (record.status === 'PENDING') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              loading={actionLoadingId === record.id}
              onClick={() => handleProcess(record.id)}
            >
              Bắt đầu giải ngân
            </Button>
          );
        }

        if (record.status === 'PROCESSING') {
          return (
            <Popconfirm
              title="Xác nhận hoàn tất hoàn tiền"
              description="Bạn xác nhận đã chuyển tiền thành công cho khách hàng?"
              onConfirm={() => handleComplete(record.id)}
              okText="Đã chuyển"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                size="small"
                style={{ background: '#16a34a' }}
                icon={<CheckCircleOutlined />}
                loading={actionLoadingId === record.id}
              >
                Xác nhận đã chuyển
              </Button>
            </Popconfirm>
          );
        }

        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Hoàn tất
          </Text>
        );
      },
    },
  ];

  return (
    <div>
      <Table
        dataSource={refunds}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
};
