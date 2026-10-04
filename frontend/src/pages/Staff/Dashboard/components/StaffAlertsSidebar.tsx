import React from 'react';
import { Card, Tag, Typography, Empty, Skeleton } from 'antd';
import {
  AlertOutlined,
  CustomerServiceOutlined,
  WarningOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { InventoryRecord } from '../../../../types';
import type { Ticket, TicketPriority } from '../../../../types/ticket';

const { Text } = Typography;

export interface StaffAlertsSidebarProps {
  lowStockItems: InventoryRecord[];
  openTickets: Ticket[];
  loading?: boolean;
}

const renderPriorityTag = (priority?: TicketPriority) => {
  switch (priority) {
    case 'URGENT':
      return <Tag color="error">Khẩn cấp</Tag>;
    case 'HIGH':
      return <Tag color="warning">Ưu tiên cao</Tag>;
    case 'MEDIUM':
      return <Tag color="blue">Trung bình</Tag>;
    case 'LOW':
      return <Tag color="default">Thấp</Tag>;
    default:
      return <Tag color="blue">{priority || 'Mới'}</Tag>;
  }
};

export const StaffAlertsSidebar: React.FC<StaffAlertsSidebarProps> = ({
  lowStockItems,
  openTickets,
  loading = false,
}) => {
  // Filter items where available stock is <= reorder level
  const filteredLowStock = lowStockItems.filter((item) => {
    const qty = item.availableQty ?? item.quantity ?? 0;
    const reorder = item.reorderLevel ?? 0;
    return qty <= reorder;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Card 1: Cảnh báo sắp hết kho */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOutlined style={{ color: '#ef4444' }} />
            <span>Cảnh báo sắp hết kho</span>
          </div>
        }
        extra={
          <Link
            to="/staff/inventory?lowStock=true"
            style={{
              fontSize: 12,
              color: '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            Chi tiết <ArrowRightOutlined style={{ fontSize: 10 }} />
          </Link>
        }
        style={{
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : filteredLowStock.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có sản phẩm nào sắp hết kho"
            style={{ margin: '16px 0' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredLowStock.slice(0, 6).map((item) => {
              const productName =
                item.variant?.product?.name ||
                item.variant?.sku ||
                item.variantId ||
                'Sản phẩm';
              const variantDetails = [item.variant?.color, item.variant?.storage]
                .filter(Boolean)
                .join(' - ');
              const currentQty = item.availableQty ?? item.quantity ?? 0;

              return (
                <div
                  key={item.id || item.variantId}
                  data-testid="low-stock-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 10,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={productName}
                    >
                      {productName}
                    </div>
                    {variantDetails && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, display: 'block', color: '#64748b' }}
                      >
                        {variantDetails}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 11, color: '#94a3b8' }}>
                      Còn lại: <strong style={{ color: '#ef4444' }}>{currentQty}</strong> / Ngưỡng: {item.reorderLevel}
                    </Text>
                  </div>
                  <Tag
                    color="error"
                    icon={<WarningOutlined />}
                    style={{ borderRadius: 6, margin: 0, fontWeight: 600 }}
                  >
                    Nguy cấp
                  </Tag>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Card 2: Ticket CSKH mới mở */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CustomerServiceOutlined style={{ color: '#ec4899' }} />
            <span>Ticket CSKH mới mở</span>
          </div>
        }
        extra={
          <Link
            to="/staff/tickets?status=OPEN"
            style={{
              fontSize: 12,
              color: '#ec4899',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            Xem tất cả <ArrowRightOutlined style={{ fontSize: 10 }} />
          </Link>
        }
        style={{
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : openTickets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có ticket nào chờ phản hồi"
            style={{ margin: '16px 0' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {openTickets.slice(0, 6).map((ticket) => (
              <Link
                key={ticket.id}
                to={`/staff/tickets/${ticket.id}`}
                data-testid={`ticket-link-${ticket.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  paddingBottom: 10,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: '#2563eb',
                          fontWeight: 600,
                        }}
                      >
                        {ticket.code || `#${ticket.id.slice(0, 8)}`}
                      </span>
                      {renderPriorityTag(ticket.priority)}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={ticket.title}
                    >
                      {ticket.title}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, color: '#64748b' }}>
                      {[ticket.user?.firstName, ticket.user?.lastName].filter(Boolean).join(' ') ||
                        (ticket.user as any)?.fullName ||
                        ticket.user?.email ||
                        'Khách hàng'}
                    </Text>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
