import React, { useState, useMemo } from 'react';
import { Table, Input, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { Payment, PaymentMethod, PaymentStatus } from '../../../../types';
import { PaymentMethodTag } from './PaymentMethodTag';
import { PaymentStatusTag } from './PaymentStatusTag';

const { Text } = Typography;

export interface PaymentsListTabProps {
  payments: Payment[];
  loading: boolean;
}

export const PaymentsListTab: React.FC<PaymentsListTabProps> = ({ payments, loading }) => {
  const [keyword, setKeyword] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const filteredData = useMemo(() => {
    return payments.filter((item) => {
      if (methodFilter !== 'ALL' && item.method !== methodFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (keyword.trim()) {
        const q = keyword.trim().toLowerCase();
        const orderNo = (item.order?.orderNumber || item.orderId || '').toLowerCase();
        const email = (item.order?.user?.email || '').toLowerCase();
        const payId = item.id.toLowerCase();
        return orderNo.includes(q) || email.includes(q) || payId.includes(q);
      }
      return true;
    });
  }, [payments, methodFilter, statusFilter, keyword]);

  const columns: ColumnsType<Payment> = [
    {
      title: 'Mã GD / Ngày tạo',
      key: 'paymentId',
      width: 170,
      render: (_: any, record: Payment) => (
        <div>
          <Text strong code style={{ color: '#2563eb' }}>
            #{record.id.slice(0, 8).toUpperCase()}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatDate(record.createdAt)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Đơn hàng',
      key: 'order',
      render: (_: any, record: Payment) => (
        <div>
          <Link to="/admin/orders" style={{ fontWeight: 600 }}>
            #{record.order?.orderNumber || record.orderId.slice(0, 8)}
          </Link>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.order?.user?.email || 'Khách vãng lai'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Cổng thanh toán',
      dataIndex: 'method',
      key: 'method',
      width: 140,
      render: (m: PaymentMethod) => <PaymentMethodTag method={m} />,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatPrice(Number(val))}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (s: PaymentStatus) => <PaymentStatusTag status={s} />,
    },
    {
      title: 'Ngày thanh toán',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 170,
      render: (val: string | null) => (
        <Text style={{ fontSize: 12, color: val ? '#16a34a' : '#64748b' }}>
          {formatDate(val)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space wrap>
          <Input
            placeholder="Tìm kiếm mã đơn, email..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: 160 }}
            options={[
              { value: 'ALL', label: 'Tất cả cổng' },
              { value: 'VNPAY', label: 'VNPay' },
              { value: 'VIETQR', label: 'VietQR' },
              { value: 'COD', label: 'COD (Tiền mặt)' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 170 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'PAID', label: 'Đã thanh toán (PAID)' },
              { value: 'PENDING', label: 'Chờ thanh toán' },
              { value: 'FAILED', label: 'Thất bại (FAILED)' },
            ]}
          />
        </Space>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Hiển thị <strong>{filteredData.length}</strong> / {payments.length} giao dịch
        </Text>
      </div>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </div>
  );
};
