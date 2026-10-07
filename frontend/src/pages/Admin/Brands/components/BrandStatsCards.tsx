import React from 'react';
import { Row, Col, Card, Skeleton } from 'antd';
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
  const statsList = [
    {
      title: 'Tổng thương hiệu',
      value: total,
      icon: <TagsOutlined className="text-blue-600 text-xs" />,
      iconBg: 'bg-blue-50 text-blue-600',
      valueColor: 'text-slate-900',
    },
    {
      title: 'Đang hoạt động',
      value: active,
      icon: <CheckCircleOutlined className="text-emerald-600 text-xs" />,
      iconBg: 'bg-emerald-50 text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      title: 'Ngừng kinh doanh',
      value: inactive,
      icon: <StopOutlined className="text-amber-600 text-xs" />,
      iconBg: 'bg-amber-50 text-amber-600',
      valueColor: 'text-amber-600',
    },
    {
      title: 'Tổng sản phẩm',
      value: totalProducts,
      icon: <ShoppingOutlined className="text-indigo-600 text-xs" />,
      iconBg: 'bg-indigo-50 text-indigo-600',
      valueColor: 'text-indigo-600',
    },
  ];

  return (
    <Row gutter={[16, 16]} className="mb-5">
      {statsList.map((item) => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <Card
            styles={{ body: { padding: '12px 16px' } }}
            className="rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all h-20"
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium text-xs uppercase tracking-wider">
                    {item.title}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${item.iconBg}`}
                  >
                    {item.icon}
                  </span>
                </div>
                <div className={`text-2xl font-bold tracking-tight ${item.valueColor} leading-none mt-1`}>
                  {item.value}
                </div>
              </div>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
};
