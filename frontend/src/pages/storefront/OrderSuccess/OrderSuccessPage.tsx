import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  Copy,
  QrCode,
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowRight,
  ExternalLink,
  Check,
} from 'lucide-react';
import { paymentService, type VietQrData } from '../../../services/paymentService';
import { orderService } from '../../../services/orderService';
import type { Order } from '../../../types';

export const OrderSuccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(() => {
    if (!id) return null;
    const snapshotRaw = sessionStorage.getItem(`order_${id}`);
    if (snapshotRaw) {
      try {
        return JSON.parse(snapshotRaw);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [vietQrData, setVietQrData] = useState<VietQrData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Fetch from API
    orderService
      .getOrderById(id)
      .then((data) => {
        if (data) {
          setOrder(data);
        }
      })
      .catch(() => {
        // Fallback already in snapshot
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (order && order.paymentMethod === 'VIETQR') {
      const amount = order.totalAmount || 0;
      const orderNum = order.orderNumber || id || 'ORD-UNKNOWN';
      paymentService.getVietQrCode(order.id || id || '', amount, orderNum).then((qr) => {
        setVietQrData(qr);
      });
    }
  }, [order, id]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleVNPayRedirect = async () => {
    if (!order) return;
    try {
      const res = await paymentService.createVnpayUrl({
        orderId: order.id || id || '',
        amount: order.totalAmount,
        orderInfo: `Thanh toan don hang ${order.orderNumber || id}`,
      });
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch {
      alert('Chuyển hướng cổng VNPay Sandbox đang được kết nối...');
    }
  };

  if (loading && !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">
        <p>Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  const orderNum = order?.orderNumber || id || 'ORD-98234-A7F';
  const total = order?.totalAmount || 0;
  const method = order?.paymentMethod || 'VIETQR';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Success Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
        <div className="w-18 h-18 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600">
            Đặt hàng thành công
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
            Cảm ơn bạn đã tin chọn MobileCommerce!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Hệ thống đã khóa giữ thiết bị IMEI cho đơn hàng{' '}
            <strong className="text-slate-900 font-mono">{orderNum}</strong>.
          </p>
        </div>

        <div className="inline-flex items-center gap-6 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Mã đơn hàng</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{orderNum}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Tổng thanh toán</span>
            <span className="font-extrabold text-red-600 text-base">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment Specific Section */}
      {method === 'VIETQR' && (
        <div className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-8 shadow-md shadow-blue-500/5 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Thanh toán qua mã VietQR Napas 247
              </h3>
              <p className="text-xs text-slate-500">
                Mở ứng dụng ngân hàng của bạn và quét mã QR để thanh toán tự động
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* QR Image */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              {vietQrData?.qrImageUrl ? (
                <img
                  src={vietQrData.qrImageUrl}
                  alt="VietQR Code"
                  className="w-64 h-64 object-contain rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-xs text-slate-400">
                  Đang khởi tạo mã QR ngân hàng...
                </div>
              )}
              <span className="text-[11px] text-slate-500 mt-2 font-medium">
                Quét bằng app ngân hàng bất kỳ (VCB, MB, Techcombank, VPBank,...)
              </span>
            </div>

            {/* Transfer Details with Quick Copy */}
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Ngân hàng thụ hưởng
                  </span>
                  <span className="font-bold text-slate-900">
                    {vietQrData?.bankName || 'MBBank (Ngân hàng Quân Đội)'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Số tài khoản
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {vietQrData?.accountNumber || '0987654321'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(vietQrData?.accountNumber || '0987654321', 'account')
                  }
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                >
                  {copiedField === 'account' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'account' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Tên chủ tài khoản
                  </span>
                  <span className="font-bold text-slate-900">
                    {vietQrData?.accountName || 'CONG TY MOBILECOMMERCE'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Số tiền cần chuyển
                  </span>
                  <span className="font-mono font-extrabold text-red-600 text-sm">
                    {formatPrice(total)}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(String(total), 'amount')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                >
                  {copiedField === 'amount' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'amount' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="text-amber-800 text-[10px] uppercase font-bold block">
                    Nội dung chuyển khoản (bắt buộc)
                  </span>
                  <span className="font-mono font-bold text-amber-950 text-sm">{orderNum}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(orderNum, 'content')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                >
                  {copiedField === 'content' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'content' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Confirmation state */}
              {transferConfirmed ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Đã ghi nhận thông báo chuyển tiền của bạn! Hệ thống đang đối soát và sẽ cập nhật
                    sang ĐÃ THANH TOÁN trong giây lát.
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setTransferConfirmed(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Tôi đã chuyển khoản thành công</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {method === 'VNPAY' && (
        <div className="bg-white rounded-3xl border border-indigo-200 p-8 shadow-md shadow-indigo-500/5 text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Cổng thanh toán điện tử VNPay Sandbox
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vui lòng nhấn nút bên dưới để chuyển hướng đến cổng thanh toán VNPay và hoàn tất giao dịch.
          </p>
          <button
            onClick={handleVNPayRedirect}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <span>Chuyển tới cổng thanh toán VNPay</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}

      {method === 'COD' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Thanh toán khi nhận hàng (COD)</h3>
            <p>
              Nhân viên chăm sóc khách hàng của MobileCommerce sẽ gọi điện xác nhận đơn hàng trong vòng
              15 phút.
            </p>
            <p>
              Bạn vui lòng kiểm tra hộp niêm phong và đối chiếu mã IMEI máy trước khi thanh toán cho nhân
              viên bưu tá.
            </p>
          </div>
        </div>
      )}

      {/* Customer Info & Next steps */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">Kích hoạt bảo hành điện tử</span>
            <span className="text-slate-500">
              Mã bảo hành sẽ được kích hoạt ngay khi đơn hàng chuyển sang trạng thái Đã thanh toán.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/warranty-lookup"
            className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            Tra cứu bảo hành
          </Link>
          <Link
            to="/products"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1"
          >
            <span>Tiếp tục mua hàng</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
