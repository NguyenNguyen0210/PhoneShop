import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { PaymentStatus } from '../../../../types';

interface PaymentStatusTagProps {
  status: PaymentStatus;
}

export const PaymentStatusTag: React.FC<PaymentStatusTagProps> = ({ status }) => {
  switch (status) {
    case 'PAID':
      return (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          Đã thanh toán
        </Tag>
      );
    case 'PENDING':
      return (
        <Tag color="warning" icon={<ClockCircleOutlined />}>
          Chờ thanh toán
        </Tag>
      );
    case 'FAILED':
      return (
        <Tag color="error" icon={<CloseCircleOutlined />}>
          Thất bại
        </Tag>
      );
    case 'REFUNDED':
      return (
        <Tag color="purple" icon={<CheckCircleOutlined />}>
          Đã hoàn tiền
        </Tag>
      );
    default:
      return <Tag>{status}</Tag>;
  }
};
