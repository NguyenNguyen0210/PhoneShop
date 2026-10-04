import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  PackageOpen,
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ChevronRight,
  Ban,
  ShoppingBag,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import type { Order, OrderStatus } from '../../../../types';

export interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  onCancelOrder: (order: Order) => void;
}

type OrderFilterType = 'ALL' | 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

interface FilterOption {
  key: OrderFilterType;
  label: string;
}

const FILTER_CONFIG: FilterOption[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const SHIPPING_STATUSES = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPING', 'DELIVERING'];
const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED'];

const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const getStatusBadge = (status: OrderStatus | string) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Chờ xác nhận</span>
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Đã xác nhận</span>
        </span>
      );
    case 'PROCESSING':
    case 'PACKED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg">
          <Package className="w-3.5 h-3.5 text-indigo-600" />
          <span>Đang xử lý</span>
        </span>
      );
    case 'SHIPPED':
    case 'SHIPPING':
    case 'DELIVERING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg">
          <Truck className="w-3.5 h-3.5 text-purple-600" />
          <span>Đang giao hàng</span>
        </span>
      );
    case 'DELIVERED':
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Đã giao</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Đã hủy</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg">
          <span>{status}</span>
        </span>
      );
  }
};

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  loading,
  onCancelOrder,
}) => {
  const [activeFilter, setActiveFilter] = useState<OrderFilterType>('ALL');

  const filterCounts = useMemo(() => {
    const counts: Record<OrderFilterType, number> = {
      ALL: orders.length,
      PENDING: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    for (const order of orders) {
      if (order.status === 'PENDING') {
        counts.PENDING++;
      } else if (SHIPPING_STATUSES.includes(order.status)) {
        counts.SHIPPING++;
      } else if (DELIVERED_STATUSES.includes(order.status)) {
        counts.DELIVERED++;
      } else if (order.status === 'CANCELLED') {
        counts.CANCELLED++;
      }
    }

    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders;
    if (activeFilter === 'PENDING') return orders.filter((o) => o.status === 'PENDING');
    if (activeFilter === 'SHIPPING') return orders.filter((o) => SHIPPING_STATUSES.includes(o.status));
    if (activeFilter === 'DELIVERED') return orders.filter((o) => DELIVERED_STATUSES.includes(o.status));
    if (activeFilter === 'CANCELLED') return orders.filter((o) => o.status === 'CANCELLED');
    return orders;
  }, [orders, activeFilter]);

  return (
    <div id="orders-section" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Đơn hàng của tôi
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            Theo dõi tình trạng đơn hàng và quản lý các giao dịch mua sắm của bạn
          </p>
        </div>
        <Link
          to="/warranty-lookup"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Tra cứu bảo hành IMEI</span>
        </Link>
      </div>

      {/* Horizontal Status Filter Bar */}
      <div className="border-b border-slate-200 -mt-2">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth">
          {FILTER_CONFIG.map((filter) => {
            const isActive = activeFilter === filter.key;
            const count = filterCounts[filter.key];
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`flex items-center gap-2 pb-3 pt-1 px-2 sm:px-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer -mb-px ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`px-2 py-0.5 text-[11px] rounded-full font-mono font-bold transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs sm:text-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="font-medium">Đang tải danh sách đơn hàng...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty state */
        <div className="py-14 sm:py-16 text-center flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 rounded-3xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-500 mb-4 shadow-xs">
            <PackageOpen className="w-10 h-10 text-blue-500 stroke-[1.5]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            {activeFilter === 'ALL'
              ? 'Bạn chưa có đơn hàng nào'
              : 'Không có đơn hàng nào trong mục này'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-6">
            {activeFilter === 'ALL'
              ? 'Khám phá hàng ngàn thiết bị công nghệ hấp dẫn và trải nghiệm mua sắm tiện lợi ngay hôm nay.'
              : 'Chưa có đơn hàng nào khớp với bộ lọc này. Hãy kiểm tra các mục khác hoặc tiếp tục mua sắm.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Tiếp tục mua sắm</span>
          </Link>
        </div>
      ) : (
        /* Order Cards */
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const totalItems =
              order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ??
              order.items?.length ??
              0;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-slate-300 transition-all shadow-xs space-y-4"
              >
                {/* Top: Order number, date, status */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                      #{order.orderNumber || order.id.slice(0, 8)}
                    </span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Items preview if items present */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2 py-1">
                    {order.items.slice(0, 2).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2 truncate pr-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          <span className="font-medium text-slate-800 truncate">
                            {item.productName || item.variant?.product?.name || 'Sản phẩm'}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              x{item.quantity}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-slate-600 shrink-0">
                          {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[11px] text-slate-400 italic">
                        + {order.items.length - 2} sản phẩm khác
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom: Items count, Total amount, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-slate-500">
                      Tổng tiền ({totalItems} sản phẩm):
                    </span>
                    <span className="font-mono font-black text-blue-600 text-base sm:text-lg tabular-nums">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => onCancelOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Hủy đơn</span>
                      </button>
                    )}
                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer"
                    >
                      <span>Xem chi tiết</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
