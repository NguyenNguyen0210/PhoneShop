import React, { useEffect, useState, useCallback } from 'react';
import { Drawer, Table, Tag, Typography, Button, Space, message } from 'antd';
import { ReloadOutlined, HistoryOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { promotionService } from '../../../../services/promotionService';
import type { Voucher, VoucherUsageRecord } from '../../../../types';

const { Text } = Typography;

export interface VoucherUsageDrawerProps {
  open: boolean;
  onClose: () => void;
  voucher: Voucher | null;
}

export const VoucherUsageDrawer: React.FC<VoucherUsageDrawerProps> = ({
  open,
  onClose,
  voucher,
}) => {
  const [usages, setUsages] = useState<VoucherUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsages = useCallback(async () => {
    if (!voucher?.id) return;
    setLoading(true);
    try {
      const data = await promotionService.getVoucherUsages(voucher.id);
      setUsages(Array.isArray(data) ? data : []);
    } catch {
      message.error('Không thể tải lịch sử sử dụng voucher');
      setUsages([]);
    } finally {
      setLoading(false);
    }
  }, [voucher?.id]);

  useEffect(() => {
    if (open && voucher?.id) {
      fetchUsages();
    } else {
      setUsages([]);
    }
  }, [open, voucher?.id, fetchUsages]);

  const columns: ColumnsType<VoucherUsageRecord> = [
    {
      title: 'Khách hàng',
      key: 'user',
      render: (_, record) => {
        const fullName = [record.user?.lastName, record.user?.firstName]
          .filter(Boolean)
          .join(' ')
          .trim();
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text strong>{fullName || 'Khách vãng lai / Ẩn danh'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.user?.email || 'Chưa có email'}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (orderId) =>
        orderId ? (
          <Tag color="blue">{orderId}</Tag>
        ) : (
          <Text type="secondary">N/A</Text>
        ),
    },
    {
      title: 'Số tiền giảm',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#16a34a' }}>
          -{Number(amount || 0).toLocaleString('vi-VN')} ₫
        </Text>
      ),
    },
    {
      title: 'Thời gian áp dụng',
      dataIndex: 'usedAt',
      key: 'usedAt',
      align: 'right',
      render: (dateStr) => {
        try {
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? dateStr : date.toLocaleString('vi-VN');
        } catch {
          return dateStr;
        }
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Space>
          <HistoryOutlined />
          <span>Lịch sử sử dụng: {voucher?.code}</span>
          {voucher && (
            <Tag color={voucher.isActive ? 'green' : 'default'} style={{ marginLeft: 8 }}>
              {voucher.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
            </Tag>
          )}
        </Space>
      }
      size="large"
      destroyOnHidden
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchUsages}
          loading={loading}
          size="small"
        >
          Làm mới
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Text>
            Tổng số lượt đã dùng:{' '}
            <Text strong>
              <CheckCircleOutlined style={{ color: '#16a34a', marginRight: 4 }} />
              {usages.length}
            </Text>
          </Text>
          {voucher?.usageLimit && (
            <Text type="secondary">
              Giới hạn toàn sàn: <Text strong>{voucher.usageLimit}</Text>
            </Text>
          )}
        </Space>
      </div>

      <Table
        dataSource={usages}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </Drawer>
  );
};
