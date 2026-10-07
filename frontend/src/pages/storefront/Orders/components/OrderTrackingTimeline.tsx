import React, { useState } from 'react';
import {
  Clock,
  Package,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Copy,
  CheckCheck,
  Calendar,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { shippingService } from '../../../../services/shippingService';
import type { Order } from '../../../../types';

interface OrderTrackingTimelineProps {
  order: Order;
}

interface StepItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const STEPS: StepItem[] = [
  { id: 'PENDING', label: 'Đã đặt hàng', icon: Clock },
  { id: 'READY_TO_SHIP', label: 'Đã đóng gói', icon: Package },
  { id: 'PICKED_UP', label: 'Bưu tá đã lấy', icon: PackageCheck },
  { id: 'IN_TRANSIT', label: 'Đang giao hàng', icon: Truck },
  { id: 'DELIVERED', label: 'Đã nhận hàng', icon: CheckCircle2 },
];

interface ActivityLogItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  timeFormatted: string;
}

const formatDateTimeVN = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getActiveStepIndex = (order: Order): number => {
  const shippingStatus = order.shipping?.status;
  if (shippingStatus) {
    switch (shippingStatus) {
      case 'PENDING':
        return 0;
      case 'READY_TO_SHIP':
        return 1;
      case 'PICKED_UP':
        return 2;
      case 'IN_TRANSIT':
        return 3;
      case 'DELIVERED':
        return 4;
      case 'FAILED':
      case 'RETURNED':
        return 3;
      default:
        break;
    }
  }

  // Fallback to order.status (only when no usable shipping.status exists).
  // NOTE: CONFIRMED/PROCESSING means "received, not packed yet" — showing the
  // "packed" step as current would fabricate progress just like the old
  // activity-log bug. PACKED must highlight the packed step, not "placed".
  switch (order.status) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'PROCESSING':
      return 0;
    case 'PACKED':
      return 1;
    case 'SHIPPING':
      return 3;
    case 'DELIVERED':
    case 'COMPLETED':
      return 4;
    default:
      return 0;
  }
};

const buildActivityLog = (order: Order): ActivityLogItem[] => {
  const activities: ActivityLogItem[] = [];
  const shipping = order.shipping;

  // 1. Delivered: shipping.deliveredAt
  if (shipping?.deliveredAt) {
    activities.push({
      id: 'delivered',
      title: 'Giao hàng thành công',
      description: 'Kiện hàng đã được phát thành công tới người nhận.',
      timestamp: shipping.deliveredAt,
      timeFormatted: formatDateTimeVN(shipping.deliveredAt),
    });
  }

  // 2. In transit: shipping.updatedAt (or fallback if in transit)
  const inTransitTime =
    shipping?.updatedAt ||
    (shipping?.status === 'IN_TRANSIT' && !shipping?.deliveredAt
      ? shipping?.shippedAt
      : undefined);

  if (
    inTransitTime &&
    (shipping?.status === 'IN_TRANSIT' ||
      shipping?.status === 'DELIVERED' ||
      shipping?.status === 'FAILED' ||
      shipping?.status === 'RETURNED')
  ) {
    let title = 'Đang vận chuyển';
    let desc = 'Bưu kiện đang trên đường vận chuyển tới địa chỉ nhận hàng.';
    if (shipping?.status === 'FAILED') {
      title = 'Giao hàng không thành công';
      desc = 'Bưu tá không thể liên hệ người nhận hoặc phát hàng thất bại.';
    } else if (shipping?.status === 'RETURNED') {
      title = 'Kiện hàng chuyển hoàn';
      desc = 'Kiện hàng đang được chuyển hoàn về kho người bán.';
    }

    if (inTransitTime !== shipping?.deliveredAt) {
      activities.push({
        id: 'in_transit',
        title,
        description: desc,
        timestamp: inTransitTime,
        timeFormatted: formatDateTimeVN(inTransitTime),
      });
    }
  }

  // 3. Picked up: shipping.shippedAt
  if (shipping?.shippedAt) {
    activities.push({
      id: 'picked_up',
      title: 'Bưu tá đã lấy hàng',
      description: 'Bưu tá đã tiếp nhận bưu kiện từ shop và nhập kho xuất phát.',
      timestamp: shipping.shippedAt,
      timeFormatted: formatDateTimeVN(shipping.shippedAt),
    });
  }

  // 4. Packed & Tracking assigned: staff actually packed the order
  // (order.packedAt). NEVER derive this from shipping.createdAt — the shipping
  // row is created at checkout with status PENDING, so that fabricated a
  // "packed" milestone (with checkout time) on fresh, unconfirmed orders.
  if (order.packedAt) {
    activities.push({
      id: 'packed',
      title: 'Đã đóng gói & Tạo mã vận đơn',
      description: shipping?.trackingNumber
        ? `Đã tạo mã vận đơn ${shipping.trackingNumber}. Kiện hàng đã đóng gói sẵn sàng.`
        : 'Kiện hàng đã đóng gói hoàn tất và sẵn sàng giao cho đơn vị vận chuyển.',
      timestamp: order.packedAt,
      timeFormatted: formatDateTimeVN(order.packedAt),
    });
  }

  // 5. Order placed: order.createdAt
  if (order.createdAt) {
    activities.push({
      id: 'order_placed',
      title: 'Đơn hàng đã đặt',
      description: `Đơn hàng #${order.orderNumber} đã được đặt thành công trên hệ thống.`,
      timestamp: order.createdAt,
      timeFormatted: formatDateTimeVN(order.createdAt),
    });
  }

  const priorityMap: Record<string, number> = {
    delivered: 5,
    in_transit: 4,
    picked_up: 3,
    packed: 2,
    order_placed: 1,
  };

  return activities.sort((a, b) => {
    const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (diff !== 0) return diff;
    return (priorityMap[b.id] ?? 0) - (priorityMap[a.id] ?? 0);
  });
};

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order }) => {
  const [copied, setCopied] = useState(false);


  const shipping = order.shipping;
  const activeIndex = getActiveStepIndex(order);
  const activities = buildActivityLog(order);
  const carrierTrackingUrl = shippingService.getCarrierTrackingUrl(
    shipping?.providerName,
    shipping?.trackingNumber
  );

  const activeReturn = order.returns?.find(
    (r) => r.status !== 'CANCELLED' && r.status !== 'REJECTED'
  );

  const handleCopyTrackingNumber = async () => {
    if (!shipping?.trackingNumber) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shipping.trackingNumber);
      }
    } catch {
      // Ignore clipboard write failures in restricted environments
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Hành trình đơn hàng</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
            <span>Đơn vị vận chuyển:</span>
            <span className="font-semibold text-slate-800">
              {shipping?.providerName || 'Giao Hàng Tiêu Chuẩn (Happy Express)'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tracking Number with Copy button */}
          {shipping?.trackingNumber && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Mã vận đơn:</span>
              <span className="font-mono font-bold text-blue-600">{shipping.trackingNumber}</span>
              <button
                onClick={handleCopyTrackingNumber}
                className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                title="Sao chép mã vận đơn"
                type="button"
                aria-label="Sao chép mã vận đơn"
              >
                {copied ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          {/* Carrier Lookup Link */}
          {carrierTrackingUrl && (
            <a
              href={carrierTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition"
              title="Tra cứu trực tiếp trên hệ thống nhà vận chuyển"
              aria-label="Tra cứu trực tiếp trên hệ thống nhà vận chuyển"
            >
              <span>Tra cứu trực tiếp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Estimated Delivery Date */}
          {shipping?.estimatedDeliveryDate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Dự kiến nhận hàng:{' '}
                <strong>{new Date(shipping.estimatedDeliveryDate).toLocaleDateString('vi-VN')}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Special Alert: Cancelled Order */}
      {order.status === 'CANCELLED' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-200 text-slate-500 rounded-xl shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Đơn hàng đã bị hủy</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Thời gian hủy: {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('vi-VN') : 'Đã hủy'}
              </p>
            </div>
          </div>
          {order.cancelledReason && (
            <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold">Lý do hủy: </span>
              <span>{order.cancelledReason}</span>
            </div>
          )}
        </div>
      )}

      {/* Special Alert: Delivery Failed */}
      {shipping?.status === 'FAILED' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-700 shadow-xs">
          <div className="p-2 bg-slate-200 text-slate-500 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Giao hàng không thành công</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Đơn vị vận chuyển không thể phát kiện hàng tới địa chỉ nhận. Vui lòng liên hệ bộ phận hỗ trợ khách hàng để được xử lý.
            </p>
          </div>
        </div>
      )}

      {/* Special Alert: Returned */}
      {shipping?.status === 'RETURNED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-800 shadow-xs">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">Kiện hàng đã chuyển hoàn</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Bưu kiện đã được hoàn trả về cho kho người bán.
            </p>
          </div>
        </div>
      )}

      {/* Informative box for PACKED status */}
      {order.status === 'PACKED' && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
          <PackageCheck className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Kiện hàng đã được đóng gói cẩn thận và đang chờ bàn giao cho đơn vị vận chuyển.</span>
        </div>
      )}

      {/* Active Return Banner if applicable */}
      {activeReturn && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Đơn hàng đang có yêu cầu đổi trả ({activeReturn.returnNumber})</span>
            <span className="text-amber-600">• Trạng thái: {activeReturn.status}</span>
          </div>
          <a href="/profile#returns" className="font-bold text-amber-700 hover:underline text-xs">
            Xem chi tiết
          </a>
        </div>
      )}

      {/* Layer 1: Stepper (shown when not CANCELLED) */}
      {order.status !== 'CANCELLED' && (
        <div className="relative pt-2 pb-2">
          {/* Progress Background Line (Desktop) */}
          <div className="hidden sm:block absolute top-6.5 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 z-0" />
          <div
            className="hidden sm:block absolute top-6.5 left-8 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-500 z-0"
            style={{ width: `${(activeIndex / (STEPS.length - 1)) * 90}%` }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2 relative z-10">
            {STEPS.map((step, idx) => {
              const isCompleted = idx <= activeIndex;
              const isCurrent = idx === activeIndex;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center"
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/20'
                        : isCompleted
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                    data-testid={`step-icon-${step.id}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left sm:text-center">
                    <div
                      className={`text-xs font-bold leading-tight ${
                        isCurrent
                          ? 'text-blue-600 font-extrabold'
                          : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </div>
                    {isCurrent && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-md border border-blue-200">
                        Hiện tại
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Layer 2: Activity Log Timeline */}
      {activities.length > 0 && (
        <div className="pt-5 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Lịch sử hành trình bưu kiện
            </h4>
            <span className="text-[11px] text-slate-400">
              ({activities.length} mốc cập nhật)
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-4">
            {/* Vertical timeline line */}
            <div className="absolute top-2 bottom-2 left-2.5 sm:left-3.5 w-0.5 bg-slate-200 -translate-x-1/2" />

            {activities.map((activity, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={activity.id}
                  className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4"
                >
                  {/* Bullet */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1 w-3 h-3 rounded-full border-2 transition-all ${
                      isFirst
                        ? 'bg-blue-600 border-white ring-4 ring-blue-100'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        isFirst ? 'text-blue-700 font-extrabold' : 'text-slate-800'
                      }`}
                    >
                      {activity.title}
                    </div>
                    {activity.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                    )}
                  </div>
                  <time className="text-[11px] font-medium text-slate-400 shrink-0 sm:text-right">
                    {activity.timeFormatted}
                  </time>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
