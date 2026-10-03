import React, { useState } from 'react';
import {
  Check,
  Clock,
  Package,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Copy,
  CheckCheck,
  Calendar,
} from 'lucide-react';
import type { Order, OrderStatus } from '../../../../types';

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
  { id: 'CONFIRMED', label: 'Đã xác nhận', icon: CheckCircle2 },
  { id: 'PROCESSING', label: 'Đang chuẩn bị', icon: Package },
  { id: 'PACKED', label: 'Đã đóng gói', icon: PackageCheck },
  { id: 'SHIPPING', label: 'Đang vận chuyển', icon: Truck },
  { id: 'DELIVERED', label: 'Đã giao hàng', icon: CheckCircle2 },
  { id: 'COMPLETED', label: 'Hoàn tất & Bảo hành', icon: Check },
];

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order }) => {
  const [copied, setCopied] = useState(false);

  const getActiveStepIndex = (status: OrderStatus | string): number => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PROCESSING':
        return 2;
      case 'PACKED':
        return 3;
      case 'SHIPPING':
      case 'SHIPPED':
        return 4;
      case 'DELIVERED':
        return 5;
      case 'COMPLETED':
        return 6;
      default:
        return 0;
    }
  };

  if (order.status === 'CANCELLED') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-900">Đơn hàng đã bị hủy</h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Thời gian hủy: {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('vi-VN') : 'Đã hủy'}
            </p>
          </div>
        </div>
        {order.cancelledReason && (
          <div className="bg-white/80 rounded-xl p-3 border border-rose-200 text-xs text-rose-800">
            <span className="font-semibold">Lý do hủy: </span>
            <span>{order.cancelledReason}</span>
          </div>
        )}
      </div>
    );
  }

  const activeIndex = getActiveStepIndex(order.status);
  const shipping = order.shipping;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Hành trình đơn hàng</span>
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>Đơn vị vận chuyển:</span>
            <span className="font-semibold text-slate-800">
              {shipping?.providerName || 'Giao Hàng Tiêu Chuẩn (Happy Express)'}
            </span>
          </div>
        </div>

        {shipping?.trackingNumber && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
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
      </div>

      {/* Estimated Delivery Date Notice if available */}
      {shipping?.estimatedDeliveryDate && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Dự kiến nhận hàng:{' '}
            <strong>{new Date(shipping.estimatedDeliveryDate).toLocaleDateString('vi-VN')}</strong>
          </span>
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

      {/* Stepper Bar */}
      <div className="relative pt-2 pb-2">
        {/* Progress Background Line (Desktop) */}
        <div className="hidden sm:block absolute top-6.5 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 z-0" />
        <div
          className="hidden sm:block absolute top-6.5 left-8 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-500 z-0"
          style={{ width: `${(activeIndex / (STEPS.length - 1)) * 90}%` }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 sm:gap-2 relative z-10">
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
    </div>
  );
};
