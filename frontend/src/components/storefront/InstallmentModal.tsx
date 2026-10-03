import React, { useState } from 'react';
import { Modal } from 'antd';
import { CreditCard, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import type { Product, ProductVariant } from '../../types';

interface InstallmentModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  variant: ProductVariant;
  onProceedCheckout: () => void;
}

const PREPAID_PERCENTAGES = [0, 20, 30, 50];
const TENURE_TERMS = [3, 6, 9, 12];

export const InstallmentModal: React.FC<InstallmentModalProps> = ({
  open,
  onClose,
  product,
  variant,
  onProceedCheckout,
}) => {
  const [prepaidPercent, setPrepaidPercent] = useState<number>(0);
  const [tenure, setTenure] = useState<number>(6);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const totalPrice = variant.price;
  const prepaidAmount = Math.round((totalPrice * prepaidPercent) / 100);
  const loanAmount = totalPrice - prepaidAmount;
  const monthlyPayment = Math.round(loanAmount / tenure);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      centered
      className="pdp-installment-modal"
    >
      <div className="space-y-6 pt-2">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-snug">
              Tính toán Trả góp 0% Lãi suất
            </h3>
            <p className="text-xs text-slate-500">
              Duyệt hồ sơ nhanh 5 phút qua CCCD gắn chip hoặc Thẻ tín dụng
            </p>
          </div>
        </div>

        {/* Selected Product Card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <img
            src={variant.images?.[0] || product.thumbnail || product.thumbnailUrl}
            alt={product.name}
            className="w-14 h-14 object-contain rounded-lg bg-white p-1 border border-slate-200 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">{product.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">
              {variant.color} • {variant.storage}
            </div>
            <div className="text-sm font-black text-rose-600 font-mono mt-0.5">
              {formatPrice(totalPrice)}
            </div>
          </div>
        </div>

        {/* 1. Down Payment Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
            1. Chọn số tiền trả trước:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PREPAID_PERCENTAGES.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setPrepaidPercent(pct)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center justify-center ${
                  prepaidPercent === pct
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{pct}%</span>
                <span className="text-[10px] font-normal text-slate-500 mt-0.5">
                  {formatPrice(Math.round((totalPrice * pct) / 100))}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Tenure Terms Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
            2. Chọn kỳ hạn trả góp:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TENURE_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setTenure(term)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center justify-center ${
                  tenure === term
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{term} tháng</span>
                <span className="text-[10px] font-mono text-emerald-600 mt-0.5">0% lãi suất</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-2xl space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Số tiền trả trước ({prepaidPercent}%):</span>
            <span className="font-bold font-mono text-slate-900">{formatPrice(prepaidAmount)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Số tiền còn lại trả góp:</span>
            <span className="font-bold font-mono text-slate-900">{formatPrice(loanAmount)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-rose-200/80 text-sm">
            <span className="font-bold text-slate-900">Mỗi tháng chỉ cần đóng:</span>
            <span className="text-xl font-black text-rose-600 font-mono">
              {formatPrice(monthlyPayment)}
              <span className="text-xs font-normal text-slate-500">/tháng</span>
            </span>
          </div>
        </div>

        {/* Guarantees */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Không phí chuyển đổi</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Kích hoạt bảo hành chính hãng</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onProceedCheckout();
          }}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>Tiến hành đăng ký & Giữ máy 15 phút</span>
        </button>
      </div>
    </Modal>
  );
};
