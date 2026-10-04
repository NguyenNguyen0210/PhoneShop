import React, { useEffect } from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import type { Order } from '../../../../types';

interface OrderInvoiceModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({ order, isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  // 10% VAT calculation (VAT included)
  const vatAmount = Math.round((order.totalAmount / 1.1) * 0.1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Container */}
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 space-y-6 print:shadow-none print:border-none print:p-4 print:max-w-none print:rounded-none">
        {/* Action Header - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
              Hóa đơn điện tử & Phiếu bảo hành
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In hóa đơn / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              aria-label="Đóng hóa đơn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE BODY */}
        <div className="space-y-6 text-slate-800">
          {/* Company Branding & Invoice Metadata */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-black text-blue-600 tracking-tight">HAPPY GARDEN MOBILE</h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hệ thống bán lẻ Smartphone & Thiết bị công nghệ chính hãng
                <br />
                Địa chỉ: 123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh
                <br />
                Hotline: 1900 6868 • Email: support@happygarden.vn
              </p>
            </div>
            <div className="sm:text-right text-xs space-y-1">
              <div className="font-mono font-bold text-sm text-slate-900">
                MÃ ĐƠN: #{order.orderNumber || order.id.slice(0, 8)}
              </div>
              <div className="text-slate-500">
                Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
              </div>
              <div className="font-semibold text-emerald-700">
                Trạng thái: {order.paymentStatus === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN (COD)'}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-2">
            <h2
              id="invoice-modal-title"
              className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900"
            >
              HÓA ĐƠN BÁN LẺ KIÊM PHIẾU BẢO HÀNH THEO IMEI
            </h2>
            <p className="text-[11px] text-slate-500 italic mt-0.5">
              (Hóa đơn có giá trị để bảo hành chính hãng)
            </p>
          </div>

          {/* Customer Information */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Khách hàng:</span>{' '}
              <strong className="text-slate-900">{order.customerName}</strong>
            </div>
            <div>
              <span className="text-slate-500">Số điện thoại:</span>{' '}
              <strong className="text-slate-900">{order.shippingPhone}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Địa chỉ giao hàng:</span>{' '}
              <span className="text-slate-900">{order.shippingAddress}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Sản phẩm & Thông tin IMEI</th>
                  <th className="py-2.5 px-3 w-16 text-center">SL</th>
                  <th className="py-2.5 px-3 w-28 text-right">Đơn giá</th>
                  <th className="py-2.5 px-3 w-28 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items?.map((item, index) => {
                  const imeiNum = item.imeiDevice?.imeiNumber || item.imeiDevice?.imei;
                  return (
                    <tr key={item.id} className="align-top">
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">{index + 1}</td>
                      <td className="py-3 px-3 space-y-1">
                        <div className="font-bold text-slate-900">
                          {item.productName || item.variant?.product?.name || 'Điện thoại'}
                        </div>
                        {(item.variant?.color || item.variant?.storage) && (
                          <div className="text-[11px] text-slate-500">
                            {[item.variant?.color, item.variant?.storage].filter(Boolean).join(' • ')}
                          </div>
                        )}
                        {imeiNum && (
                          <div className="inline-flex items-center gap-1 font-mono text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">
                            <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>IMEI: {imeiNum}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatPrice(item.unitPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span className="font-mono text-slate-900 font-semibold">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Chiết khấu Voucher:</span>
                  <span className="font-mono">-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span>{order.shippingFee === 0 ? 'Miễn phí' : formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Đã gồm thuế GTGT (VAT 10%):</span>
                <span className="font-mono">{formatPrice(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                <span>TỔNG THANH TOÁN:</span>
                <span className="font-mono text-blue-600 text-base">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Warranty & Signature Footer */}
          <div className="pt-4 border-t border-slate-200 space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Quy định bảo hành:</strong> Máy được bảo hành 12 tháng theo số IMEI ghi trên hóa đơn. Bao test 1 đổi 1 trong 30 ngày đầu tiên đối với lỗi phần cứng từ nhà sản xuất. Không áp dụng bảo hành đối với các trường hợp rơi vỡ, vào nước hoặc can thiệp phần mềm trái phép.
            </div>

            <div className="grid grid-cols-3 gap-4 text-center pt-2">
              <div>
                <p className="font-bold text-slate-800">Người mua hàng</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Nhân viên giao nhận</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">Đại diện cửa hàng</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký số & Đóng dấu)</p>
                <div className="mt-3 font-mono font-bold text-xs text-blue-600 border border-blue-200 bg-blue-50 py-1 px-2 rounded inline-block">
                  HAPPY GARDEN VERIFIED
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
