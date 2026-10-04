import type React from 'react';
import { Card, Skeleton, Empty, Tag, Space } from 'antd';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RevenueReport } from '../../../../types/report';

interface RevenueChartCardProps {
  data: RevenueReport | null;
  loading: boolean;
}

const formatCompactVND = (val: number): string => {
  if (Math.abs(val) >= 1_000_000_000) {
    const formatted = (val / 1_000_000_000).toFixed(val % 1_000_000_000 === 0 ? 0 : 1);
    return `${formatted} tỷ`;
  }
  if (Math.abs(val) >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1);
    return `${formatted} tr`;
  }
  if (Math.abs(val) >= 1_000) {
    const formatted = (val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1);
    return `${formatted} k`;
  }
  return String(val);
};

const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return dateStr;
};

const formatFullDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('vi-VN');
  }
  return dateStr;
};

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>
          {formatFullDate(label)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>
          {formatVND(Number(payload[0].value))}
        </div>
      </div>
    );
  }
  return null;
};

export const RevenueChartCard: React.FC<RevenueChartCardProps> = ({ data, loading }) => {
  const cardTitle = 'Biến động Doanh thu theo ngày';

  if (loading && !data) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
        data-testid="revenue-chart-skeleton"
      >
        <Skeleton active paragraph={{ rows: 7 }} />
      </Card>
    );
  }

  const hasData = Boolean(data && data.dailyBreakdown && data.dailyBreakdown.length > 0);

  if (!hasData) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
        data-testid="revenue-chart-empty"
      >
        <Empty
          description="Không có dữ liệu giao dịch trong khoảng thời gian này"
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  const netRevenue = data?.netRevenue ?? 0;
  const paymentCount = data?.paymentCount ?? 0;

  return (
    <Card
      title={cardTitle}
      extra={
        <Space wrap size={8}>
          <Tag
            color="blue"
            style={{ borderRadius: 6, fontWeight: 600, padding: '2px 8px' }}
          >
            {paymentCount} giao dịch
          </Tag>
          <Tag
            color="green"
            style={{ borderRadius: 6, fontWeight: 600, padding: '2px 8px' }}
          >
            Tổng thực thu: {formatVND(netRevenue)}
          </Tag>
        </Space>
      }
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
      data-testid="revenue-chart-card"
    >
      <div style={{ width: '100%', flex: 1, minHeight: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data?.dailyBreakdown}
            margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tickFormatter={formatCompactVND}
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default RevenueChartCard;
