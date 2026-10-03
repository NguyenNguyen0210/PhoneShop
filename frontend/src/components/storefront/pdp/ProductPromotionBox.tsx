import React from 'react';
import { Gift, CheckCircle2 } from 'lucide-react';

export interface ProductPromotionBoxProps {
  className?: string;
}

const PROMOTIONS = [
  'Giảm thêm 300.000₫ khi thanh toán qua ví điện tử VNPay hoặc MoMo.',
  'Tặng củ sạc siêu nhanh chính hãng + Ốp lưng thời trang cao cấp.',
  'Thu cũ đổi mới trợ giá lên đến 1.000.000₫.',
  'Tặng gói bảo hành vàng rơi vỡ màn hình 12 tháng chính hãng.',
];

export const ProductPromotionBox: React.FC<ProductPromotionBoxProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 mt-4 text-xs sm:text-sm shadow-xs ${className}`.trim()}
    >
      <div className="font-extrabold text-slate-900 tracking-tight text-xs sm:text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
        <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <Gift className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <span className="font-extrabold text-rose-600 tracking-wide uppercase">
          Khuyến mại đặc quyền tại PhoneShop
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {PROMOTIONS.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed text-xs sm:text-[13px]">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductPromotionBox;
