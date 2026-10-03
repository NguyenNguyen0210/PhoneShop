import { useMemo } from 'react';
import type React from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { OrderStatusItem } from '../../../../types/report';

interface OrderStatusChartCardProps {
  data: OrderStatusItem[];
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xử lý', color: '#f59e0b' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#06b6d4' },
  PROCESSING: { label: 'Đang xử lý', color: '#3b82f6' },
  PACKED: { label: 'Đã đóng gói', color: '#8b5cf6' },
  SHIPPING: { label: 'Đang giao hàng', color: '#6366f1' },
  DELIVERED: { label: 'Đã giao hàng', color: '#10b981' },
  COMPLETED: { label: 'Hoàn tất', color: '#10b981' },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444' },
};

export const OrderStatusChartCard: React.FC<OrderStatusChartCardProps> = ({ data, loading }) => {
  const cardTitle = 'Trạng thái Đơn hàng';

  const totalOrders = useMemo(() => {
    if (!data || !Array.isArray(data)) return 0;
    return data.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  }, [data]);

  if (loading && (!data || data.length === 0)) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
        data-testid="order-status-skeleton"
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  const hasData = Boolean(data && data.length > 0 && totalOrders > 0);

  if (!hasData) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
        data-testid="order-status-empty"
      >
        <Empty
          description="Không có dữ liệu trạng thái đơn hàng"
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  const nonZeroItems = data.filter((item) => item.count > 0);

  return (
    <Card
      title={cardTitle}
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
      data-testid="order-status-card"
    >
      {/* Donut Chart with Center Total */}
      <div style={{ position: 'relative', width: '100%', height: 210 }}>
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Tooltip
              formatter={(value: any, name: any) => {
                const count = Number(value);
                const pct = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(1) : '0';
                const label = STATUS_CONFIG[name]?.label || name;
                return [`${count} đơn (${pct}%)`, label];
              }}
            />
            <Pie
              data={nonZeroItems}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {nonZeroItems.map((entry) => {
                const color = STATUS_CONFIG[entry.status]?.color || '#94a3b8';
                return <Cell key={`cell-${entry.status}`} fill={color} />;
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Count */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
            {totalOrders.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Tổng đơn</div>
        </div>
      </div>

      {/* Status Legend Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          marginTop: 16,
          paddingTop: 8,
          borderTop: '1px solid #f1f5f9',
        }}
      >
        {data.map((item) => {
          const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: '#94a3b8' };
          const percentage = totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(1) : '0';
          return (
            <div
              key={item.status}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: cfg.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#334155',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={cfg.label}
                >
                  {cfg.label}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  <strong style={{ color: '#0f172a' }}>{item.count}</strong> ({percentage}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default OrderStatusChartCard;
