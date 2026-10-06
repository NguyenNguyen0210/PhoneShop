import React, { useState } from 'react';
import { Modal } from 'antd';
import { CreditCard } from 'lucide-react';

export interface ProductInstallmentModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  price: number;
  onProceedCheckout: (plan: { prepayPercent: number; termMonths: number }) => void;
}

const PREPAY_OPTIONS = [0, 20, 30, 50];
const TERM_OPTIONS = [3, 6, 9, 12];

export const ProductInstallmentModal: React.FC<ProductInstallmentModalProps> = ({
  open,
  onClose,
  productName,
  price,
  onProceedCheckout,
}) => {
  const [prepayPercent, setPrepayPercent] = useState<number>(0);
  const [termMonths, setTermMonths] = useState<number>(6);

  const formatPrice = (n: number) => n.toLocaleString('vi-VN') + '₫';

  const prepayAmount = Math.round((price * prepayPercent) / 100);
  const loanAmount = price - prepayAmount;
  const monthlyPay = Math.round(loanAmount / termMonths);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={520}
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800">
          <CreditCard className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
          <span>Dự toán trả góp 0% lãi suất</span>
        </div>
      }
    >
      <div className="pt-2 pb-1 space-y-5">
        {/* Product information */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
          <div className="text-sm font-semibold text-slate-800 line-clamp-1">{productName}</div>
          <div className="text-xs text-slate-500 mt-1">
            Giá bán hiện tại:{' '}
            <span className="font-bold text-slate-900 font-mono text-sm">{formatPrice(price)}</span>
          </div>
        </div>

        {/* Prepayment percentage selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Chọn số tiền trả trước:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PREPAY_OPTIONS.map((percent) => {
              const isSelected = prepayPercent === percent;
              return (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setPrepayPercent(percent)}
                  className={`py-2 px-3 text-xs sm:text-sm rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {percent}%
                </button>
              );
            })}
          </div>
        </div>

        {/* Term months selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Chọn kỳ hạn trả góp:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TERM_OPTIONS.map((term) => {
              const isSelected = termMonths === term;
              return (
                <button
                  key={term}
                  type="button"
                  onClick={() => setTermMonths(term)}
                  className={`py-2 px-3 text-xs sm:text-sm rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-medium'
                  }`}
                >
                  {term} tháng
                </button>
              );
            })}
          </div>
        </div>

        {/* Calculation summary box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center text-slate-600">
            <span>Trả trước:</span>
            <span className="font-semibold text-slate-900 font-mono">{formatPrice(prepayAmount)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
            <span className="font-medium text-slate-700">Góp mỗi tháng:</span>
            <span className="text-xl font-black text-rose-600 font-mono">
              {formatPrice(monthlyPay)}/tháng
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Chênh lệch với mua thẳng:</span>
            <span className="font-semibold text-emerald-600">0₫ (0% lãi suất)</span>
          </div>

          <div className="flex justify-between items-start gap-3 pt-1 border-t border-slate-200/60 text-slate-600">
            <span className="shrink-0 font-medium">Thủ tục cần:</span>
            <span className="text-right font-medium text-slate-800">
              CCCD gắn chip (từ 18 tuổi) hoặc Thẻ tín dụng
            </span>
          </div>
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={() => onProceedCheckout({ prepayPercent, termMonths })}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl w-full transition-colors cursor-pointer text-sm sm:text-base shadow-sm"
        >
          Tiến hành đăng ký & Giữ máy 24 giờ
        </button>
      </div>
    </Modal>
  );
};

export default ProductInstallmentModal;
