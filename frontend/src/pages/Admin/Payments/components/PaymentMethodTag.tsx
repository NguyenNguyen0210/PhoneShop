import React from 'react';
import { Tag } from 'antd';
import { QrcodeOutlined, CreditCardOutlined, CarOutlined } from '@ant-design/icons';
import type { PaymentMethod } from '../../../../types';

interface PaymentMethodTagProps {
  method: PaymentMethod;
}

export const PaymentMethodTag: React.FC<PaymentMethodTagProps> = ({ method }) => {
  switch (method) {
    case 'VNPAY':
      return (
        <Tag color="blue" icon={<CreditCardOutlined />}>
          VNPay
        </Tag>
      );
    case 'VIETQR':
      return (
        <Tag color="cyan" icon={<QrcodeOutlined />}>
          VietQR
        </Tag>
      );
    case 'COD':
      return (
        <Tag color="orange" icon={<CarOutlined />}>
          COD (Tiền mặt)
        </Tag>
      );
    default:
      return <Tag>{method}</Tag>;
  }
};
