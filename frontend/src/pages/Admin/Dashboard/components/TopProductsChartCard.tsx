import { useState, useMemo } from 'react';
import type React from 'react';
import { Card, Skeleton, Empty, Radio, Table, Avatar, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TopProductItem } from '../../../../types/report';

const { Text } = Typography;

interface TopProductsChartCardProps {
  data: TopProductItem[];
  loading: boolean;
}

type MetricType = 'quantity' | 'revenue';

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

const RANK_STYLE = [
  { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' },
];

const rankColumns: ColumnsType<TopProductItem> = [
  {
    title: '#',
    key: 'rank',
    width: 56,
    align: 'center',
    render: (_: unknown, __: TopProductItem, index: number) => {
      const style = RANK_STYLE[index] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: style.bg,
            color: style.color,
            border: `1px solid ${style.border}`,
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {index + 1}
        </span>
      );
    },
  },
  {
    title: 'Sản phẩm',
    key: 'product',
    render: (_: unknown, item: TopProductItem) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar
          style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 700, flexShrink: 0 }}
        >
          {(item.productName || '?').charAt(0)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{item.productName}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {[item.variantName, item.sku].filter(Boolean).join(' • ')}
          </Text>
        </div>
      </div>
    ),
  },
  {
    title: 'Đã bán',
    dataIndex: 'totalQuantitySold',
    key: 'totalQuantitySold',
    align: 'right',
    width: 110,
    render: (qty: number) => (
      <span style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
        {(qty || 0).toLocaleString('vi-VN')}
      </span>
    ),
  },
  {
    title: 'Doanh thu',
    dataIndex: 'totalRevenue',
    key: 'totalRevenue',
    align: 'right',
    width: 180,
    render: (rev: number) => (
      <span style={{ fontWeight: 700, color: '#2563eb', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        {formatVND(rev || 0)}
      </span>
    ),
  },
];

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
      <Table<TopProductItem>
        dataSource={chartData}
        columns={rankColumns}
        rowKey={(r) => r.variantId || r.sku}
        pagination={false}
        size="small"
      />
    </Card>
  );
};

export default TopProductsChartCard;
