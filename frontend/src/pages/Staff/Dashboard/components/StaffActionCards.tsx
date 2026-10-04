import React from 'react';
import { Card, Skeleton, Typography } from 'antd';
import {
  ClockCircleOutlined,
  InboxOutlined,
  CustomerServiceOutlined,
  RollbackOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Text } = Typography;

export interface StaffActionCardsProps {
  pendingOrdersCount?: number;
  packingOrdersCount?: number;
  openTicketsCount?: number;
  pendingReturnsCount?: number;
  submittedInstallmentsCount?: number;
  // Aliases for flexibility
  pendingOrders?: number;
  packingOrders?: number;
  openTickets?: number;
  pendingReturns?: number;
  submittedInstallments?: number;
  loading?: boolean;
}

export const StaffActionCards: React.FC<StaffActionCardsProps> = ({
  pendingOrdersCount,
  packingOrdersCount,
  openTicketsCount,
  pendingReturnsCount,
  submittedInstallmentsCount,
  pendingOrders,
  packingOrders,
  openTickets,
  pendingReturns,
  submittedInstallments,
  loading = false,
}) => {
  const pOrders = pendingOrdersCount ?? pendingOrders ?? 0;
  const packOrders = packingOrdersCount ?? packingOrders ?? 0;
  const oTickets = openTicketsCount ?? openTickets ?? 0;
  const pReturns = pendingReturnsCount ?? pendingReturns ?? 0;
  const sInstallments = submittedInstallmentsCount ?? submittedInstallments ?? 0;

  const cardItems = [
    {
      key: 'pending-orders',
      title: 'Đơn chờ xác nhận',
      count: pOrders,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      path: '/staff/orders?status=PENDING',
      icon: <ClockCircleOutlined />,
      testId: 'card-pending-orders',
    },
    {
      key: 'packing-orders',
      title: 'Đơn cần đóng gói',
      count: packOrders,
      color: '#3b82f6',
      bgColor: '#dbeafe',
      path: '/staff/orders?status=CONFIRMED',
      icon: <InboxOutlined />,
      testId: 'card-packing-orders',
    },
    {
      key: 'open-tickets',
      title: 'Ticket CSKH chờ phản hồi',
      count: oTickets,
      color: '#ec4899',
      bgColor: '#fce7f3',
      path: '/staff/tickets?status=OPEN',
      icon: <CustomerServiceOutlined />,
      testId: 'card-open-tickets',
    },
    {
      key: 'pending-returns',
      title: 'Đổi trả chờ xử lý',
      count: pReturns,
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      path: '/staff/returns?status=REQUESTED',
      icon: <RollbackOutlined />,
      testId: 'card-pending-returns',
    },
    {
      key: 'submitted-installments',
      title: 'Hồ sơ trả góp',
      count: sInstallments,
      color: '#10b981',
      bgColor: '#d1fae5',
      path: '/staff/installments?status=PENDING',
      icon: <CreditCardOutlined />,
      testId: 'card-submitted-installments',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}
    >
      {cardItems.map((card) => (
        <Link
          key={card.key}
          to={card.path}
          data-testid={card.testId}
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <Card
            hoverable
            style={{
              borderRadius: 12,
              borderTop: `4px solid ${card.color}`,
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              height: '100%',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '18px 16px' } }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'block',
                      color: '#64748b',
                    }}
                  >
                    {card.title}
                  </Text>
                  <div
                    data-testid={`${card.testId}-count`}
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: card.color,
                      marginTop: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    {card.count.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: card.bgColor,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {card.icon}
                </div>
              </div>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
};
