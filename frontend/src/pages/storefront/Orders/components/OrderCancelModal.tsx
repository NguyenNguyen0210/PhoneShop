import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import type { Order } from '../../../../types';
import { orderService } from '../../../../services/orderService';
import { notifyError } from '../../../../utils/notify';

export interface OrderCancelModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: (updatedOrder: Order) => void;
}

export const CANCEL_REASONS = [
  'Đổi ý không muốn mua nữa',
  'Muốn thay đổi sản phẩm hoặc địa chỉ nhận hàng',
  'Thời gian giao hàng dự kiến quá lâu',
  'Tìm thấy giá tốt hơn ở cửa hàng khác',
  'Lý do khác',
] as const;

export const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  order,
  isOpen,
  onClose,
  onCancelled,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(CANCEL_REASONS[0]);
      setCustomReason('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isOther = selectedReason === 'Lý do khác';
    const reasonToSend = isOther ? customReason.trim() : selectedReason;

    if (isOther && !reasonToSend) {
      notifyError('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setLoading(true);
    try {
      const updatedOrder = await orderService.cancelMyOrder(order.id, reasonToSend);
      onCancelled(updatedOrder);
      onClose();
    } catch (err: any) {
      notifyError(err, 'Có lỗi xảy ra khi hủy đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 id="cancel-modal-title" className="text-lg font-bold text-slate-900">
              Hủy đơn hàng #{order.orderNumber || order.id}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng hộp thoại"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative notice about releasing reserved devices/IMEIs and returning voucher */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Lưu ý khi hủy đơn hàng:</span>
            <span>
              Mọi thiết bị/IMEI đã giữ chỗ cho đơn hàng này sẽ được giải phóng cho khách hàng khác và lượt sử dụng mã giảm giá/voucher (nếu có) sẽ được hoàn lại vào tài khoản của bạn.
            </span>
          </div>
        </div>

        {/* Cancellation form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Chọn lý do hủy:
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {CANCEL_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={isSelected}
                      onChange={() => setSelectedReason(reason)}
                      disabled={loading}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{reason}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Textarea if 'Lý do khác' is selected */}
          {selectedReason === 'Lý do khác' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label
                htmlFor="cancel-custom-reason"
                className="block text-xs font-semibold text-slate-700"
              >
                Nhập lý do chi tiết: <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="cancel-custom-reason"
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={loading}
                placeholder="Vui lòng chia sẻ thêm lý do bạn muốn hủy đơn hàng..."
                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:text-slate-400 resize-none disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading || (selectedReason === 'Lý do khác' && !customReason.trim())}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Đang hủy...' : 'Xác nhận hủy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
