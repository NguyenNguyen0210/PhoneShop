import React, { useState, useEffect } from 'react';
import { Tag, Sparkles, Check, X, Loader2, ChevronRight } from 'lucide-react';
import { voucherService, type VoucherInfo } from '../../../services/voucherService';
import { notifyError } from '../../../utils/notify';

export interface CheckoutCouponSectionProps {
  subtotal: number;
  appliedVoucher: VoucherInfo | any | null;
  onApplyVoucher: (voucher: VoucherInfo, discount: number) => void;
  onRemoveVoucher: () => void;
}

export const CheckoutCouponSection: React.FC<CheckoutCouponSectionProps> = ({
  subtotal,
  appliedVoucher,
  onApplyVoucher,
  onRemoveVoucher,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<VoucherInfo[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getVoucherDescription = (v: VoucherInfo): string => {
    if (v.description) return v.description;
    if (v.name) return v.name;
    if (v.type === 'PERCENTAGE') {
      return `Giảm ${v.value}% cho đơn hàng${
        v.maxDiscountAmount ? ` (Tối đa ${formatPrice(Number(v.maxDiscountAmount))})` : ''
      }`;
    }
    if (v.type === 'FIXED_AMOUNT') {
      return `Giảm trực tiếp ${formatPrice(Number(v.value))}`;
    }
    if (v.type === 'FREE_SHIPPING') {
      return `Miễn phí vận chuyển (Tối đa ${formatPrice(Number(v.value))})`;
    }
    return 'Ưu đãi giảm giá đơn hàng';
  };

  const getAppliedDiscountDisplay = (): string => {
    if (!appliedVoucher) return '';
    if (typeof appliedVoucher.discount === 'number' && appliedVoucher.discount > 0) {
      return `-${formatPrice(appliedVoucher.discount)}`;
    }
    if (appliedVoucher.type === 'PERCENTAGE' && appliedVoucher.value) {
      return `-${appliedVoucher.value}%`;
    }
    if (appliedVoucher.type === 'FIXED_AMOUNT' && appliedVoucher.value) {
      return `-${formatPrice(Number(appliedVoucher.value))}`;
    }
    if (appliedVoucher.type === 'FREE_SHIPPING') {
      return 'Miễn phí VC';
    }
    if (appliedVoucher.value) {
      return `-${formatPrice(Number(appliedVoucher.value))}`;
    }
    return 'Đã áp dụng';
  };

  const handleApplyCode = async (codeToApply?: string) => {
    const code = (codeToApply ?? inputCode).trim().toUpperCase();
    if (!code) {
      notifyError('Vui lòng nhập mã ưu đãi.');
      return;
    }

    setLoading(true);
    try {
      const res = await voucherService.validateVoucher(code, subtotal);
      if (res && res.valid && res.voucher) {
        onApplyVoucher(res.voucher, res.discount);
        setInputCode('');
        setIsModalOpen(false);
      } else {
        notifyError('Mã ưu đãi không hợp lệ.');
      }
    } catch (err: any) {
      notifyError(err, 'Mã ưu đãi không hợp lệ hoặc đã hết hạn sử dụng.');
    } finally {
      setLoading(false);
    }
  };

  const openVoucherModal = () => {
    setIsModalOpen(true);
    if (availableVouchers.length === 0) {
      setLoadingVouchers(true);
      voucherService
        .getActiveVouchers()
        .then((list) => {
          setAvailableVouchers(list || []);
        })
        .catch((err) => {
          console.error('Failed to load active vouchers:', err);
          notifyError('Không thể tải danh sách ưu đãi lúc này.');
        })
        .finally(() => {
          setLoadingVouchers(false);
        });
    }
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return (
    <div className="space-y-3">
      {/* Header with Modal Opener */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-sm text-slate-900">Mã ưu đãi & Giảm giá</span>
        </div>
        <button
          type="button"
          onClick={openVoucherModal}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Chọn hoặc nhập mã ưu đãi</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Applied Voucher Pill Card */}
      {appliedVoucher ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-black text-sm text-emerald-950">
                  {appliedVoucher.code}
                </span>
                <span className="text-[11px] bg-emerald-200/80 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  {getAppliedDiscountDisplay()}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 truncate mt-0.5">
                {appliedVoucher.description || appliedVoucher.name || 'Áp dụng mã ưu đãi thành công'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveVoucher}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer shrink-0"
            title="Gỡ bỏ mã ưu đãi"
          >
            <X className="w-3.5 h-3.5" />
            <span>Gỡ bỏ</span>
          </button>
        </div>
      ) : (
        /* Direct Input Form when not applied */
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleApplyCode();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputCode}
            onChange={(e) => {
              setInputCode(e.target.value.toUpperCase());
            }}
            placeholder="Nhập mã ưu đãi..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs uppercase font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
          />
          <button
            type="submit"
            disabled={loading || !inputCode.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <span>Áp dụng</span>
            )}
          </button>
        </form>
      )}

      {/* Active Vouchers Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="voucher-modal-title" className="font-bold text-sm text-slate-900">
                    Chọn mã ưu đãi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đơn hàng hiện tại: <span className="font-bold text-slate-700">{formatPrice(subtotal)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Input inside Modal */}
            <div className="shrink-0 pt-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleApplyCode();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                  }}
                  placeholder="Nhập mã ưu đãi khác..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs uppercase font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                />
                <button
                  type="submit"
                  disabled={loading || !inputCode.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kiểm tra</span>
                    </>
                  ) : (
                    <span>Áp dụng</span>
                  )}
                </button>
              </form>
            </div>

            {/* Modal Body / Active Vouchers List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[160px]">
              {loadingVouchers ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs">Đang tải danh sách ưu đãi...</span>
                </div>
              ) : availableVouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Sparkles className="w-8 h-8 stroke-1 text-slate-300" />
                  <span className="text-xs">Hiện chưa có mã ưu đãi nào khả dụng</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-slate-500 block">
                    Danh sách mã ưu đãi khả dụng:
                  </span>
                  {availableVouchers.map((v) => {
                    const minOrder = Number(v.minOrderValue ?? 0);
                    const isEligible = subtotal >= minOrder;
                    const isCurrent = appliedVoucher?.code === v.code;
                    const shortfall = minOrder - subtotal;

                    return (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-2xl border transition ${
                          isCurrent
                            ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                            : isEligible
                            ? 'border-slate-200 bg-white hover:border-blue-400'
                            : 'border-slate-200 bg-slate-50/80 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                {v.code}
                              </span>
                              {minOrder > 0 && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Đơn tối thiểu {formatPrice(minOrder)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 font-medium">
                              {getVoucherDescription(v)}
                            </p>
                            {!isEligible && (
                              <p className="text-[11px] text-amber-700 font-medium">
                                Cần mua thêm {formatPrice(shortfall)} để áp dụng mã này
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="shrink-0">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Đang dùng</span>
                              </span>
                            ) : !isEligible ? (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed border border-slate-200"
                              >
                                Chưa đủ ĐK
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => void handleApplyCode(v.code)}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                              >
                                Áp dụng
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
