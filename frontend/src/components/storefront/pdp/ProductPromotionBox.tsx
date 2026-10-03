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
      className={`bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 mt-4 text-xs sm:text-sm shadow-xs ${className}`.trim()}
    >
      <div className="font-extrabold text-rose-700 tracking-wide text-xs sm:text-sm flex items-center gap-2">
        <Gift className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-600 shrink-0" aria-hidden="true" />
        <span>KHUYẾN MẠI ĐẶC QUYỀN TẠI PHONESHOP</span>
      </div>

      <ul className="mt-3 space-y-2">
        {PROMOTIONS.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductPromotionBox;
