import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Typography, Button, message, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { paymentService } from '../../../services/paymentService';
import { returnService } from '../../../services/returnService';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { Payment, PaymentTransaction, RefundItem } from '../../../types';
import { PaymentStatsCards } from './components/PaymentStatsCards';
import { PaymentsListTab } from './components/PaymentsListTab';
import { ReconciliationTab } from './components/ReconciliationTab';
import { RefundsLedgerTab } from './components/RefundsLedgerTab';
import { TransactionsLogTab } from './components/TransactionsLogTab';

const { Title, Text } = Typography;

export const AdminPaymentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'payments';

  const { user } = useAuthStore();
  const roles = (user?.roles as any[]) || [];
  const roleNames = roles.map((r) => (typeof r === 'string' ? r : r?.role?.name || r?.name));
  const canManage =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    roleNames.includes('ADMIN') ||
    roleNames.includes('MANAGER');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, txnRes, refRes] = await Promise.all([
        paymentService.getAllPaymentsAdmin().catch(() => []),
        paymentService.getTransactionHistoryAdmin().catch(() => []),
        returnService.getRefundHistory().catch(() => []),
      ]);
      setPayments(Array.isArray(payRes) ? payRes : []);
      setTransactions(Array.isArray(txnRes) ? txnRes : []);
      setRefunds(Array.isArray(refRes) ? refRes : []);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Không thể tải dữ liệu thanh toán');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingReconcileCount = payments.filter(
    (p) => p.status === 'PENDING' && (p.method === 'VIETQR' || p.method === 'VNPAY')
  ).length;

  const tabItems = [
    {
      key: 'payments',
      label: `Giao dịch thanh toán (${payments.length})`,
      children: <PaymentsListTab payments={payments} loading={loading} />,
    },
    {
      key: 'reconciliation',
      label: (
        <span>
          Đối soát ngân hàng{' '}
          {pendingReconcileCount > 0 && (
            <Badge count={pendingReconcileCount} style={{ backgroundColor: '#f59e0b' }} />
          )}
        </span>
      ),
      children: (
        <ReconciliationTab
          payments={payments}
          loading={loading}
          canManage={canManage}
          onRefresh={loadData}
        />
      ),
    },
    {
      key: 'refunds',
      label: `Sổ cái hoàn tiền (${refunds.length})`,
      children: (
        <RefundsLedgerTab
          refunds={refunds}
          loading={loading}
          canManage={canManage}
          onRefresh={loadData}
        />
      ),
    },
    {
      key: 'transactions',
      label: `Nhật ký Gateway (${transactions.length})`,
      children: <TransactionsLogTab transactions={transactions} loading={loading} />,
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý Thanh toán & Dòng tiền
          </Title>
          <Text type="secondary">
            Theo dõi giao dịch đa kênh, đối soát chuyển khoản ngân hàng và kiểm soát lệnh hoàn tiền
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Làm mới dữ liệu
        </Button>
      </div>

      <PaymentStatsCards payments={payments} refunds={refunds} loading={loading} />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
        items={tabItems}
        type="card"
      />
    </div>
  );
};
