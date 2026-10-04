import { useState, useEffect, type FC, type FormEvent } from 'react';
import {
  X,
  RotateCcw,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { returnService } from '../../../../services/returnService';
import { notifyError } from '../../../../utils/notify';
import type { Order, OrderItem } from '../../../../types';
import { FALLBACK_PRODUCT_IMAGE } from '../../../../utils/imageFallback';

export interface ReturnRequestModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const RETURN_REASONS = [
  'Lỗi kỹ thuật phần cứng (Lỗi do nhà sản xuất)',
  'Giao sai màu sắc / phiên bản dung lượng',
  'Thiết bị hoặc hộp bị trầy xước, cấn móp khi nhận',
  'Thiếu phụ kiện hoặc quà tặng theo máy',
  'Lý do khác',
] as const;

const ReturnRequestModalDialog: FC<ReturnRequestModalProps> = ({
  order,
  onClose,
  onSubmitted,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    order.items?.forEach((item) => {
      initial[item.id] = 1;
    });
    return initial;
  });
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [customerNote, setCustomerNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleQuantityChange = (itemId: string, delta: number, maxQty: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 1;
      const updated = Math.min(Math.max(1, current + delta), maxQty);
      return { ...prev, [itemId]: updated };
    });
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const selectedItems = (order.items || []).filter((item) => selectedItemIds.has(item.id));
    if (selectedItems.length === 0) {
      notifyError('Vui lòng chọn ít nhất một sản phẩm cần hoàn trả.');
      return;
    }

    setLoading(true);

    try {
      await returnService.createReturn({
        orderId: order.id,
        reason,
        customerNote: customerNote.trim() || undefined,
        items: selectedItems.map((item) => ({
          orderItemId: item.id,
          quantity: quantities[item.id] || 1,
        })),
      });

      onSubmitted();
      onClose();
    } catch (err: any) {
      notifyError(err, 'Không thể gửi yêu cầu hoàn trả. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-request-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="return-request-modal-title"
                className="text-lg font-bold text-slate-900 tracking-tight"
              >
                Yêu cầu trả hàng / hoàn tiền
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Đơn hàng #{order.orderNumber || order.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[calc(85vh-160px)] overflow-y-auto">
            {/* Product Selection List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Chọn sản phẩm cần hoàn trả <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">
                  Đã chọn: {selectedItemIds.size}/{order.items?.length || 0}
                </span>
              </div>

              <div className="space-y-3" data-testid="return-items-checklist">
                {order.items?.map((item: OrderItem) => {
                  const isChecked = selectedItemIds.has(item.id);
                  const currentQty = quantities[item.id] || 1;
                  const maxQty = item.quantity || 1;
                  const imei =
                    item.imeiDevice?.imeiNumber ||
                    item.imeiDevice?.imei ||
                    item.imeiDeviceId;
                  const variantSpecs = [item.variant?.color, item.variant?.storage]
                    .filter(Boolean)
                    .join(' • ');

                  return (
                    <div
                      key={item.id}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            id={`item-check-${item.id}`}
                            checked={isChecked}
                            onChange={() => handleToggleItem(item.id)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={
                              item.variant?.images?.[0] ||
                              item.variant?.imageUrl ||
                              item.variant?.product?.thumbnail ||
                              FALLBACK_PRODUCT_IMAGE
                            }
                            alt={item.productName || 'Sản phẩm'}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`item-check-${item.id}`}
                            className="text-sm font-bold text-slate-900 truncate block cursor-pointer"
                          >
                            {item.productName || item.variant?.product?.name || 'Sản phẩm'}
                          </label>

                          {variantSpecs && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {variantSpecs}
                            </p>
                          )}

                          {imei && (
                            <span className="inline-block mt-1 font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-semibold">
                              IMEI: {imei}
                            </span>
                          )}

                          <div className="mt-1 text-xs font-bold text-slate-900 font-mono">
                            {formatPrice(item.unitPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-xs text-slate-500 sm:hidden">Số lượng trả:</span>
                        <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, -1, maxQty)}
                            disabled={!isChecked || currentQty <= 1 || loading}
                            aria-label={`Giảm số lượng cho ${item.productName || 'sản phẩm'}`}
                            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span
                            data-testid={`qty-${item.id}`}
                            className="w-10 text-center font-mono font-bold text-xs text-slate-900"
                          >
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, 1, maxQty)}
                            disabled={!isChecked || currentQty >= maxQty || loading}
                            aria-label={`Tăng số lượng cho ${item.productName || 'sản phẩm'}`}
                            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          / {maxQty}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return Reason Select */}
            <div className="space-y-1.5">
              <label
                htmlFor="return-reason-select"
                className="text-xs font-bold uppercase tracking-wider text-slate-700 block"
              >
                Lý do đổi trả <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="return-reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-hidden transition cursor-pointer disabled:bg-slate-100"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Detailed Notes / Condition Textarea */}
            <div className="space-y-1.5">
              <label
                htmlFor="return-customer-note"
                className="text-xs font-bold uppercase tracking-wider text-slate-700 block"
              >
                Mô tả chi tiết & tình trạng thiết bị
              </label>
              <textarea
                id="return-customer-note"
                rows={3}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                disabled={loading}
                placeholder="Mô tả cụ thể vấn đề gặp phải, tình trạng máy, phụ kiện và hộp kèm theo..."
                className="w-full p-3.5 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden transition resize-none disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-400">
                Lưu ý: Sản phẩm hoàn trả cần giữ nguyên tem bảo hành, phụ kiện và hộp (nếu có).
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <span>Gửi yêu cầu hoàn trả</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ReturnRequestModal: FC<ReturnRequestModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <ReturnRequestModalDialog {...props} />;
};
