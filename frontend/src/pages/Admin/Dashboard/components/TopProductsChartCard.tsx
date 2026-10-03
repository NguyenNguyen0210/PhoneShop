import { useState, useMemo } from 'react';
import type React from 'react';
import { Card, Skeleton, Empty, Radio } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TopProductItem } from '../../../../types/report';

interface TopProductsChartCardProps {
  data: TopProductItem[];
  loading: boolean;
}

type MetricType = 'quantity' | 'revenue';

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

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item: TopProductItem = payload[0].payload;
    return (
      <div
        style={{
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
          maxWidth: 320,
        }}
      >
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, marginBottom: 2 }}>
          {item.productName}
        </div>
        {item.variantName && (
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
            Phiên bản: {item.variantName}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontFamily: 'monospace' }}>
          SKU: {item.sku}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          <span style={{ color: '#64748b' }}>Số lượng đã bán:</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            {item.totalQuantitySold?.toLocaleString('vi-VN') || 0}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            fontSize: 12,
          }}
        >
          <span style={{ color: '#64748b' }}>Doanh thu:</span>
          <span style={{ fontWeight: 700, color: '#2563eb' }}>
            {formatVND(item.totalRevenue || 0)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const TopProductsChartCard: React.FC<TopProductsChartCardProps> = ({ data, loading }) => {
  const [metric, setMetric] = useState<MetricType>('quantity');
  const cardTitle = 'Top sản phẩm bán chạy';

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const sorted = [...data].sort((a, b) => {
      if (metric === 'revenue') {
        return (b.totalRevenue || 0) - (a.totalRevenue || 0);
      }
      return (b.totalQuantitySold || 0) - (a.totalQuantitySold || 0);
    });
    return sorted.slice(0, 7);
  }, [data, metric]);

  if (loading && (!data || data.length === 0)) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
        data-testid="top-products-skeleton"
      >
        <Skeleton active paragraph={{ rows: 7 }} />
      </Card>
    );
  }

  const hasData = Boolean(chartData && chartData.length > 0);

  if (!hasData) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
        data-testid="top-products-empty"
      >
        <Empty
          description="Không có dữ liệu sản phẩm bán chạy"
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  return (
    <Card
      title={cardTitle}
      extra={
        <Radio.Group
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          size="small"
          buttonStyle="solid"
        >
          <Radio.Button value="quantity">Theo số lượng</Radio.Button>
          <Radio.Button value="revenue">Theo doanh thu</Radio.Button>
        </Radio.Group>
      }
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
      data-testid="top-products-card"
    >
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              tickFormatter={
                metric === 'revenue'
                  ? formatCompactVND
                  : (val) => Number(val).toLocaleString('vi-VN')
              }
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              dataKey="productName"
              type="category"
              width={130}
              tickFormatter={(name: string) =>
                name && name.length > 16 ? `${name.slice(0, 16)}...` : name
              }
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={metric === 'revenue' ? 'totalRevenue' : 'totalQuantitySold'}
              fill={metric === 'revenue' ? '#10b981' : '#3b82f6'}
              radius={[0, 6, 6, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TopProductsChartCard;
