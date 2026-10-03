import React from 'react';
import { Row, Col, Card, Statistic, Skeleton } from 'antd';
import {
  TagsOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';

export interface BrandStatsCardsProps {
  total: number;
  active: number;
  inactive: number;
  totalProducts: number;
  loading?: boolean;
}

export const BrandStatsCards: React.FC<BrandStatsCardsProps> = ({
  total,
  active,
  inactive,
  totalProducts,
  loading = false,
}) => {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Tổng thương hiệu</span>}
              value={total}
              prefix={<TagsOutlined className="text-blue-600 bg-blue-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#0f172a' }}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Đang hoạt động</span>}
              value={active}
              prefix={<CheckCircleOutlined className="text-emerald-600 bg-emerald-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#10b981' }}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Ngừng kinh doanh</span>}
              value={inactive}
              prefix={<StopOutlined className="text-amber-600 bg-amber-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#f59e0b' }}
            />
          )}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={<span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Tổng sản phẩm</span>}
              value={totalProducts}
              prefix={<ShoppingOutlined className="text-indigo-600 bg-indigo-50 p-2 rounded-lg text-lg mr-2" />}
              valueStyle={{ fontWeight: 700, color: '#6366f1' }}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
};
