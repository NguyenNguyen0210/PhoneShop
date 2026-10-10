import React from 'react';
import { Row, Col, Card, Typography, Spin } from 'antd';
import {
  DollarOutlined,
  QrcodeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { Payment } from '../../../../types';

const { Text, Title } = Typography;

export interface PaymentStatsCardsProps {
  payments: Payment[];
  loading: boolean;
}

export const PaymentStatsCards: React.FC<PaymentStatsCardsProps> = ({ payments, loading }) => {
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const paidPayments = payments.filter((p) => p.status === 'PAID');
  const totalRevenue = paidPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const pendingReconcile = payments.filter((p) => p.method === 'VIETQR' && p.status === 'PENDING').length;

  const vnpayTotal = paidPayments.filter((p) => p.method === 'VNPAY').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const vietqrTotal = paidPayments.filter((p) => p.method === 'VIETQR').reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tổng doanh thu đã thu
                </Text>
                <Title level={4} style={{ margin: '4px 0 0', color: '#16a34a' }}>
                  {formatPrice(totalRevenue)}
                </Title>
              </div>
              <div style={{ background: '#dcfce7', padding: 10, borderRadius: 10, color: '#16a34a' }}>
                <DollarOutlined style={{ fontSize: 20 }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              Từ {paidPayments.length} giao dịch thành công
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Cổng VNPay & VietQR
                </Text>
                <Title level={4} style={{ margin: '4px 0 0', color: '#2563eb' }}>
                  {formatPrice(vnpayTotal + vietqrTotal)}
                </Title>
              </div>
              <div style={{ background: '#eff6ff', padding: 10, borderRadius: 10, color: '#2563eb' }}>
                <QrcodeOutlined style={{ fontSize: 20 }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              VNPay: {formatPrice(vnpayTotal)} | VietQR: {formatPrice(vietqrTotal)}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Chờ đối soát VietQR
                </Text>
                <Title level={4} style={{ margin: '4px 0 0', color: pendingReconcile > 0 ? '#d97706' : '#64748b' }}>
                  {pendingReconcile}
                </Title>
              </div>
              <div
                style={{
                  background: pendingReconcile > 0 ? '#fef3c7' : '#f1f5f9',
                  padding: 10,
                  borderRadius: 10,
                  color: pendingReconcile > 0 ? '#d97706' : '#64748b',
                }}
              >
                <ExclamationCircleOutlined style={{ fontSize: 20 }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              {pendingReconcile > 0 ? 'Cần kiểm tra biến động số dư' : 'Đã đối soát toàn bộ'}
            </Text>
          </Card>
        </Col>
      </Row>
    </Spin>
  );
};
