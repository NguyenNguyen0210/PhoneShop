import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, message, Popconfirm } from 'antd';
import { DollarOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { returnService } from '../../../../services/returnService';
import type { RefundItem, RefundStatus } from '../../../../types';

const { Text } = Typography;

interface RefundSectionProps {
  refunds: RefundItem[];
  canManageRefunds: boolean; // true for MANAGER and ADMIN
  onRefundUpdated: () => void;
}

export const RefundSection: React.FC<RefundSectionProps> = ({
  refunds,
  canManageRefunds,
  onRefundUpdated,
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getRefundStatusTag = (status: RefundStatus) => {
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

  const handleProcess = async (refundId: string) => {
    setActionLoadingId(refundId);
    try {
      await returnService.processRefund(refundId);
      message.success('Đã chuyển trạng thái sang Đang giải ngân (PROCESSING)');
      onRefundUpdated();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Xử lý hoàn tiền thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (refundId: string) => {
    setActionLoadingId(refundId);
    try {
      await returnService.completeRefund(refundId);
      message.success('Đã hoàn tất lệnh hoàn tiền (COMPLETED)');
      onRefundUpdated();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Hoàn tất hoàn tiền thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = [
    {
      title: 'Mã hoàn tiền',
      dataIndex: 'refundNumber',
      key: 'refundNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <Text style={{ color: '#2563eb', fontWeight: 600 }}>{formatPrice(Number(val))}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: RefundStatus) => getRefundStatusTag(status),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (val: string) => val || '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: RefundItem) => {
        if (!canManageRefunds) {
          return <Text type="secondary" style={{ fontSize: 12 }}>🔒 Chỉ Manager</Text>;
        }

        if (record.status === 'PENDING') {
          return (
            <Button
              size="small"
              type="primary"
              icon={<SyncOutlined />}
              loading={actionLoadingId === record.id}
              onClick={() => handleProcess(record.id)}
            >
              Giải ngân
            </Button>
          );
        }

        if (record.status === 'PROCESSING') {
          return (
            <Popconfirm
              title="Xác nhận đã giải ngân thành công cho khách hàng?"
              onConfirm={() => handleComplete(record.id)}
              okText="Xác nhận"
              cancelText="Hủy"
            >
              <Button
                size="small"
                type="primary"
                style={{ background: '#16a34a' }}
                icon={<CheckCircleOutlined />}
                loading={actionLoadingId === record.id}
              >
                Hoàn tất
              </Button>
            </Popconfirm>
          );
        }

        return <Text type="secondary">—</Text>;
      },
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Space>
          <DollarOutlined style={{ color: '#16a34a' }} />
          <span>Lịch sử & Lệnh hoàn tiền ({refunds.length})</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Table
        dataSource={refunds}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'Chưa có lệnh hoàn tiền nào được tạo' }}
      />
    </Card>
  );
};
