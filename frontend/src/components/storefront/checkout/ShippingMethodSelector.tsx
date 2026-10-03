import React from 'react';
import { Truck, Zap, Package } from 'lucide-react';
import type { ShippingMethod } from '../../../types';

export type { ShippingMethod };

export interface ShippingMethodItem {
  id: ShippingMethod;
  name: string;
  time: string;
  baseFee: number;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SHIPPING_METHODS: ShippingMethodItem[] = [
  {
    id: 'ECONOMY',
    name: 'Giao tiết kiệm',
    time: '3 - 5 ngày',
    baseFee: 15000,
    icon: Package,
  },
  {
    id: 'STANDARD',
    name: 'Giao tiêu chuẩn',
    time: '1 - 2 ngày',
    baseFee: 30000,
    badge: 'Khuyên dùng',
    icon: Truck,
  },
  {
    id: 'EXPRESS_2H',
    name: 'Giao hỏa tốc 2h',
    time: 'Nhận hàng trong 2 giờ',
    baseFee: 60000,
    badge: 'Nhanh nhất',
    icon: Zap,
  },
];

export interface ShippingFeeInfo {
  fee: number;
  baseFee: number;
  isDiscounted: boolean;
  discountTag?: string;
}

export function calculateShippingFee(method: ShippingMethod, subtotal: number): ShippingFeeInfo {
  const isFreeThreshold = subtotal > 500000;

  switch (method) {
    case 'ECONOMY':
      return {
        fee: isFreeThreshold ? 0 : 15000,
        baseFee: 15000,
        isDiscounted: isFreeThreshold,
        discountTag: isFreeThreshold ? 'Miễn phí' : undefined,
      };
    case 'STANDARD':
      return {
        fee: isFreeThreshold ? 0 : 30000,
        baseFee: 30000,
        isDiscounted: isFreeThreshold,
        discountTag: isFreeThreshold ? 'Miễn phí' : undefined,
      };
    case 'EXPRESS_2H':
      return {
        fee: isFreeThreshold ? 30000 : 60000,
        baseFee: 60000,
        isDiscounted: isFreeThreshold,
        discountTag: isFreeThreshold ? 'Giảm 30.000₫' : undefined,
      };
    default:
      return {
        fee: 30000,
        baseFee: 30000,
        isDiscounted: false,
      };
  }
}

export interface ShippingMethodSelectorProps {
  subtotal: number;
  selectedMethod: ShippingMethod;
  onChange: (method: ShippingMethod) => void;
}

export const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
  subtotal,
  selectedMethod,
  onChange,
}) => {
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Phương thức vận chuyển">
      {SHIPPING_METHODS.map((method) => {
        const isSelected = selectedMethod === method.id;
        const Icon = method.icon;
        const { fee, baseFee, isDiscounted, discountTag } = calculateShippingFee(
          method.id,
          subtotal
        );

        return (
          <label
            key={method.id}
            onClick={() => onChange(method.id)}
            className={`block p-4 rounded-2xl border-2 transition cursor-pointer ${
              isSelected
                ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600'
                : 'border-slate-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <input
                  type="radio"
                  name="shippingMethod"
                  value={method.id}
                  checked={isSelected}
                  onChange={() => onChange(method.id)}
                  className="accent-blue-600 cursor-pointer w-4 h-4 shrink-0"
                />
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{method.name}</span>
                    {method.badge && (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                          method.id === 'STANDARD'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thời gian nhận: <span className="font-medium text-slate-700">{method.time}</span>
                  </p>
                </div>
              </div>

              {/* Fee Information */}
              <div className="text-right shrink-0 pl-2">
                {isDiscounted ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 line-through">
                        {formatPrice(baseFee)}
                      </span>
                      {fee > 0 && (
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {formatPrice(fee)}
                        </span>
                      )}
                    </div>
                    {fee === 0 ? (
                      <span className="mt-0.5 inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-md">
                        Miễn phí
                      </span>
                    ) : (
                      <span className="mt-0.5 inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-md">
                        {discountTag}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {formatPrice(fee)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
};
