import type { FC, ReactNode } from 'react';
import {
  RotateCcw,
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  Search,
  XCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import type { ReturnRequest, ReturnStatus } from '../../../../types';

export interface ReturnCardProps {
  returnRequest: ReturnRequest;
  onCancel?: (returnId: string) => void;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  icon: ReactNode;
}

const STATUS_MAP: Record<ReturnStatus, StatusConfig> = {
  REQUESTED: {
    label: 'Chờ duyệt',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
  },
  APPROVED: {
    label: 'Đã duyệt gửi hàng',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
  },
  SHIPPING: {
    label: 'Đang gửi hàng hoàn',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <Truck className="w-3.5 h-3.5 text-purple-600" />,
  },
  RECEIVED: {
    label: 'Đã nhận hàng hoàn',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: <Package className="w-3.5 h-3.5 text-indigo-600" />,
  },
  INSPECTING: {
    label: 'Đang kiểm định',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <Search className="w-3.5 h-3.5 text-orange-600" />,
  },
  COMPLETED: {
    label: 'Hoàn tất',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
  REJECTED: {
    label: 'Từ chối',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />,
  },
};

export const ReturnCard: FC<ReturnCardProps> = ({
  returnRequest,
  onCancel,
}) => {
  const statusInfo = STATUS_MAP[returnRequest.status] || {
    label: returnRequest.status,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-900">
                #{returnRequest.returnNumber}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(returnRequest.requestedAt)}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <span
            data-testid="return-status-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
          >
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </span>
        </div>
      </div>

      {/* Reason and Customer Note */}
      <div className="space-y-2 text-xs">
        <div>
          <span className="text-slate-500 font-medium">Lý do yêu cầu:</span>
          <p className="text-slate-800 font-semibold mt-0.5">{returnRequest.reason}</p>
        </div>

        {returnRequest.customerNote && (
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-600">
            <span className="font-semibold text-slate-700 block mb-0.5">
              Mô tả của khách hàng:
            </span>
            <p className="italic text-slate-700">{returnRequest.customerNote}</p>
          </div>
        )}

        {returnRequest.adminNote && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900">
            <span className="font-semibold text-amber-950 block mb-0.5">
              Phản hồi từ cửa hàng:
            </span>
            <p>{returnRequest.adminNote}</p>
          </div>
        )}
      </div>

      {/* List of items returned */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Sản phẩm hoàn trả:
        </span>
        <div className="divide-y divide-slate-100" data-testid="returned-items-list">
          {returnRequest.items?.map((item) => {
            const productName =
              item.orderItem?.productName ||
              item.orderItem?.variant?.product?.name ||
              'Sản phẩm';
            const imei =
              item.orderItem?.imeiDevice?.imeiNumber ||
              item.orderItem?.imeiDevice?.imei ||
              item.orderItem?.imeiDeviceId;
            const variantSpecs = [
              item.orderItem?.variant?.color,
              item.orderItem?.variant?.storage,
            ]
              .filter(Boolean)
              .join(' • ');

            return (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-2"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <span className="font-semibold text-slate-800 block truncate">
                    {productName}
                  </span>
                  {variantSpecs && (
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      {variantSpecs}
                    </span>
                  )}
                  {imei && (
                    <span className="inline-block mt-1 font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                      IMEI: {imei}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                    x{item.quantity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel button if REQUESTED */}
      {returnRequest.status === 'REQUESTED' && (
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => onCancel?.(returnRequest.id)}
            className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl border border-rose-200 hover:border-rose-600 transition cursor-pointer shadow-2xs"
          >
            Hủy yêu cầu
          </button>
        </div>
      )}
    </div>
  );
};
