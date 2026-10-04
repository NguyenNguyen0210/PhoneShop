import type React from 'react';
import { Card, Skeleton, Empty, Table, Progress, Tag, Space, Typography, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategorySalesReport, CategorySalesItem } from '../../../../types/report';

const { Text } = Typography;

interface CategorySalesChartCardProps {
  data: CategorySalesReport | null;
  loading: boolean;
}

const CATEGORY_PALETTE = [
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#2563eb', // blue
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

const OTHER_COLOR = '#94a3b8';
const TOP_N = 5;

const colorFor = (index: number, isOther: boolean): string =>
  isOther ? OTHER_COLOR : CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];

function groupTopCategories(
  items: CategorySalesItem[],
  totalAll: number
): CategorySalesItem[] {
  const sorted = [...items].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  if (rest.length === 0) return top;
  const restRevenue = rest.reduce((s, c) => s + (c.revenue || 0), 0);
  const restQty = rest.reduce((s, c) => s + (c.quantitySold || 0), 0);
  return [
    ...top,
    {
      categoryId: '__other__',
      categoryName: 'Khác',
      quantitySold: restQty,
      revenue: restRevenue,
      percentage: totalAll > 0 ? (restRevenue / totalAll) * 100 : 0,
    },
  ];
}

export const CategorySalesChartCard: React.FC<CategorySalesChartCardProps> = ({ data, loading }) => {
  const cardTitle = 'Doanh số theo Danh mục';

  if (loading && !data) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
        data-testid="category-sales-skeleton"
      >
        <Skeleton active paragraph={{ rows: 7 }} />
      </Card>
    );
  }

  const hasData = Boolean(data && data.categories && data.categories.length > 0);

  if (!hasData) {
    return (
      <Card
        title={cardTitle}
        style={{ borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}
        data-testid="category-sales-empty"
      >
        <Empty
          description="Chưa có dữ liệu doanh số theo danh mục"
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  const categories = data?.categories || [];
  const totalRevenue = data?.totalRevenue ?? categories.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalAll = categories.reduce((s, c) => s + (c.revenue || 0), 0);
  const displayCategories = groupTopCategories(categories, totalAll > 0 ? totalAll : totalRevenue);

  const columns: ColumnsType<CategorySalesItem> = [
    {
      title: 'Danh mục',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (name: string, record: CategorySalesItem, index: number) => {
        const color = colorFor(index, record.categoryId === '__other__');
        return (
          <Space size={8}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
              {name}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Đã bán',
      dataIndex: 'quantitySold',
      key: 'quantitySold',
      align: 'right',
      render: (qty: number) => (
        <span style={{ fontWeight: 600, color: '#334155' }}>
          {qty.toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      render: (rev: number) => (
        <span style={{ fontWeight: 600, color: '#0ea5e9', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {formatVND(rev)}
        </span>
      ),
    },
    {
      title: 'Tỷ lệ',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 140,
      render: (pct: number, record: CategorySalesItem, index: number) => {
        const color = colorFor(index, record.categoryId === '__other__');
        const val = Number(pct) || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Progress
              percent={Math.min(100, Math.round(val))}
              showInfo={false}
              strokeColor={color}
              size="small"
              style={{ flex: 1, margin: 0 }}
            />
            <span style={{ fontSize: 11, color: '#64748b', minWidth: 38, textAlign: 'right' }}>
              {val.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <Card
      title={cardTitle}
      extra={
        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600 }}>
          Tổng: {formatVND(totalRevenue)}
        </Tag>
      }
      style={{
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
      data-testid="category-sales-card"
    >
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} lg={9}>
          <div style={{ position: 'relative', width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatVND(Number(val)),
                    name,
                  ]}
                />
                <Pie
                  data={displayCategories}
                  dataKey="revenue"
                  nameKey="categoryName"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {displayCategories.map((entry, index) => (
                    <Cell
                      key={`cat-cell-${entry.categoryId || entry.categoryName || index}`}
                      fill={colorFor(index, entry.categoryId === '__other__')}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Col>

        <Col xs={24} lg={15}>
          <Table<CategorySalesItem>
            dataSource={displayCategories}
            columns={columns}
            rowKey={(r) => r.categoryId || r.categoryName}
            pagination={false}
            size="small"
            scroll={{ y: 240 }}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default CategorySalesChartCard;
