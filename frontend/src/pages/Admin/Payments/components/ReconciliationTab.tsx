import React, { useState } from 'react';
import { Table, Button, Space, Typography, Popconfirm, Alert, message, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { paymentService } from '../../../../services/paymentService';
import type { Payment } from '../../../../types';
import { PaymentMethodTag } from './PaymentMethodTag';
import { ReconciliationModal } from './ReconciliationModal';

const { Text } = Typography;

export interface ReconciliationTabProps {
  payments: Payment[];
  loading: boolean;
  canManage: boolean;
  onRefresh: () => void;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  payments,
  loading,
  canManage,
  onRefresh,
}) => {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const pendingReconcileList = payments.filter(
    (p) => p.status === 'PENDING' && (p.method === 'VIETQR' || p.method === 'VNPAY')
  );

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const handleOpenConfirm = (record: Payment) => {
    setSelectedPayment(record);
    setModalOpen(true);
  };

  const handleFail = async (paymentId: string) => {
    setActionLoadingId(paymentId);
    try {
      await paymentService.failPaymentAdmin(paymentId);
      message.success('Đã đánh dấu giao dịch thất bại (FAILED)');
      onRefresh();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Mã đơn hàng',
      key: 'order',
      width: 180,
      render: (_: any, record: Payment) => (
        <div>
          <Text strong style={{ color: '#2563eb' }}>
            #{record.order?.orderNumber || record.orderId.slice(0, 8)}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Tạo: {formatDate(record.createdAt)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: Payment) => (
        <div>
          <Text>
            {record.order?.user?.firstName || record.order?.user?.lastName
              ? `${record.order.user.lastName || ''} ${record.order.user.firstName || ''}`
              : 'Khách mua hàng'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.order?.user?.email || '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Cổng thanh toán',
      dataIndex: 'method',
      key: 'method',
      width: 140,
      render: (m: any) => <PaymentMethodTag method={m} />,
    },
    {
      title: 'Số tiền cần khớp',
      dataIndex: 'amount',
      key: 'amount',
      width: 160,
      render: (val: number) => (
        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>
          {formatPrice(Number(val))}
        </span>
      ),
    },
    {
      title: 'Cú pháp chuyển khoản',
      key: 'syntax',
      width: 180,
      render: (_: any, record: Payment) => (
        <Text code style={{ fontSize: 12 }}>
          {record.order?.orderNumber || `ORD-${record.orderId.slice(0, 8).toUpperCase()}`}
        </Text>
      ),
    },
    {
      title: 'Thao tác đối soát',
      key: 'action',
      width: 220,
      align: 'center',
      render: (_: any, record: Payment) => {
        if (!canManage) {
          return (
            <Tooltip title="Chỉ Quản lý (Manager/Admin) có quyền xác nhận đối soát">
              <Button size="small" disabled icon={<CheckOutlined />}>
                🔒 Xác nhận
              </Button>
            </Tooltip>
          );
        }

        return (
          <Space>
            <Button
              type="primary"
              size="small"
              style={{ background: '#16a34a' }}
              icon={<CheckOutlined />}
              onClick={() => handleOpenConfirm(record)}
            >
              Xác nhận
            </Button>
            <Popconfirm
              title="Đánh dấu thất bại"
              description="Bạn có chắc chắn khách không chuyển tiền hoặc hủy đơn này?"
              onConfirm={() => handleFail(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                loading={actionLoadingId === record.id}
              >
                Hủy
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Alert
        title="Hàng chờ đối soát ngân hàng"
        description="Danh sách các đơn thanh toán chuyển khoản VietQR đang chờ tiền về tài khoản. Kiểm tra sao kê ngân hàng và bấm Xác nhận để tự động hoàn tất đơn hàng."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            Làm mới
          </Button>
        }
      />

      <Table
        dataSource={pendingReconcileList}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: 'Tuyệt vời! Không có giao dịch chuyển khoản nào đang chờ đối soát.',
        }}
      />

      <ReconciliationModal
        open={modalOpen}
        payment={selectedPayment}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
