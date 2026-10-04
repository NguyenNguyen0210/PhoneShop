import React from 'react';
import { Truck, ShieldCheck, RotateCcw, ArrowLeftRight } from 'lucide-react';

export interface StorefrontServiceBarProps {
  className?: string;
}

interface GuaranteeItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  borderColor?: string;
}

const GUARANTEES: GuaranteeItem[] = [
  {
    id: 'fast-shipping',
    icon: Truck,
    title: 'Giao hỏa tốc 2h',
    description: 'Miễn phí nội thành',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'group-hover:border-blue-200',
  },
  {
    id: 'warranty',
    icon: ShieldCheck,
    title: 'Bảo hành 12 tháng',
    description: 'Chính hãng toàn quốc',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'group-hover:border-emerald-200',
  },
  {
    id: 'exchange',
    icon: RotateCcw,
    title: '1 đổi 1 trong 30 ngày',
    description: 'Nếu lỗi nhà sản xuất',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    borderColor: 'group-hover:border-indigo-200',
  },
  {
    id: 'trade-in',
    icon: ArrowLeftRight,
    title: 'Thu cũ đổi mới',
    description: 'Trợ giá đến 2.000.000₫',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'group-hover:border-amber-200',
  },
];

export const StorefrontServiceBar: React.FC<StorefrontServiceBarProps> = ({
  className = '',
}) => {
  return (
    <section className={`w-full ${className}`.trim()} aria-label="Cam kết dịch vụ">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {GUARANTEES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`group flex items-center gap-3 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 ${
                item.borderColor || ''
              }`}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-snug group-hover:text-blue-600 transition-colors truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StorefrontServiceBar;
