import type React from 'react';
import { Skeleton } from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  AlertOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { DashboardSummary } from '../../../../types/report';

export interface DashboardKpiCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

export const formatPrice = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({ summary, loading }) => {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            data-testid="kpi-skeleton-card"
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs"
          >
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ))}
      </div>
    );
  }

  const netRevenue = summary?.netRevenue ?? 0;
  const refundedTotal = summary?.refundedTotal ?? 0;
  const totalOrders = summary?.totalOrders ?? 0;
  const pendingOrders = summary?.pendingOrders ?? 0;
  const totalLowStock = summary?.totalLowStock ?? 0;
  const totalUsers = summary?.totalUsers ?? 0;
  const totalProducts = summary?.totalProducts ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Doanh thu thuần */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Doanh thu thuần
          </span>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
            <DollarOutlined />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mb-1">
            {formatPrice(netRevenue)}
          </div>
          <div className="text-xs text-slate-500">
            Hoàn tiền: <span className="font-medium text-slate-700">{formatPrice(refundedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Tổng đơn hàng */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng đơn hàng
          </span>
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg">
            <ShoppingOutlined />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mb-1">
            {totalOrders.toLocaleString('vi-VN')}
          </div>
          <div className="text-xs text-amber-600 font-medium">
            {pendingOrders.toLocaleString('vi-VN')} đơn đang chờ xử lý
          </div>
        </div>
      </div>

      {/* Card 3: Thiết bị dưới mức tồn kho */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Thiết bị dưới mức tồn kho
          </span>
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-lg">
            <AlertOutlined />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mb-1">
            {totalLowStock.toLocaleString('vi-VN')}
          </div>
          <div>
            <Link
              to="/admin/inventory"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 transition-colors"
            >
              Xem tồn kho <ArrowRightOutlined className="text-[10px]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Card 4: Khách hàng & Sản phẩm */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Khách hàng & Sản phẩm
          </span>
          <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-lg">
            <TeamOutlined />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mb-1">
            {totalUsers.toLocaleString('vi-VN')} <span className="text-sm font-normal text-slate-500">người dùng</span>
          </div>
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{totalProducts.toLocaleString('vi-VN')}</span> sản phẩm đang kinh doanh
          </div>
        </div>
      </div>
    </div>
  );
};
