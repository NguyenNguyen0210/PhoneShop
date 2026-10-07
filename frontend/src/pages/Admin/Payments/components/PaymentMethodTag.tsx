import React from 'react';
import { Tag } from 'antd';
import { QrcodeOutlined, CreditCardOutlined, CarOutlined, BankOutlined } from '@ant-design/icons';
import type { PaymentMethod } from '../../../../types';

interface PaymentMethodTagProps {
  method: PaymentMethod | string;
  showFee?: boolean;
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
    case 'BANK_TRANSFER':
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
    case 'INSTALLMENT':
      return (
        <Tag color="purple" icon={<BankOutlined />}>
          Trả góp (Home / FE Credit)
        </Tag>
      );
    default:
      return <Tag color="default">{method}</Tag>;
  }
};
