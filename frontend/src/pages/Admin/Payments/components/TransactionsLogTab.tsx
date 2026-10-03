import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CodeOutlined } from '@ant-design/icons';
import type { PaymentTransaction } from '../../../../types';

const { Text } = Typography;

export interface TransactionsLogTabProps {
  transactions: PaymentTransaction[];
  loading: boolean;
}

export const TransactionsLogTab: React.FC<TransactionsLogTabProps> = ({ transactions, loading }) => {
  const [selectedPayload, setSelectedPayload] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Tag color="success">THÀNH CÔNG</Tag>;
      case 'PENDING':
        return <Tag color="warning">CHỜ XỬ LÝ</Tag>;
      case 'FAILED':
        return <Tag color="error">THẤT BẠI</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns: ColumnsType<PaymentTransaction> = [
    {
      title: 'Mã GD Hệ thống',
      dataIndex: 'transactionCode',
      key: 'transactionCode',
      width: 170,
      render: (code: string) => <Text code strong>{code}</Text>,
    },
    {
      title: 'Đơn hàng liên kết',
      key: 'order',
      render: (_: any, record: PaymentTransaction) => (
        <Text strong>
          #{record.payment?.order?.orderNumber || record.paymentId?.slice(0, 8)}
        </Text>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (val: number) => <span>{formatPrice(Number(val))}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => getStatusTag(s),
    },
    {
      title: 'Mã đối tác (providerRef)',
      dataIndex: 'providerReference',
      key: 'providerReference',
      width: 180,
      render: (val: string | null) => (val ? <Text code>{val}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (d: string) => <Text style={{ fontSize: 12 }}>{formatDate(d)}</Text>,
    },
    {
      title: 'Dữ liệu thô',
      key: 'payload',
      width: 100,
      align: 'center',
      render: (_: any, record: PaymentTransaction) => (
        <Button
          size="small"
          icon={<CodeOutlined />}
          onClick={() => {
            setSelectedPayload(record.responseData || { message: 'Không có payload phản hồi' });
            setIsModalOpen(true);
          }}
        >
          JSON
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Table
        dataSource={transactions}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title="Dữ liệu phản hồi kỹ thuật (Raw Response Payload)"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <pre
          style={{
            background: '#0f172a',
            color: '#38bdf8',
            padding: 16,
            borderRadius: 8,
            overflowX: 'auto',
            maxHeight: 400,
            fontSize: 12,
          }}
        >
          {JSON.stringify(selectedPayload, null, 2)}
        </pre>
      </Modal>
    </div>
  );
};
