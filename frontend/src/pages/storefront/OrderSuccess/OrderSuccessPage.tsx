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
  RotateCcw,
} from 'lucide-react';
import { paymentService, type VietQrData } from '../../../services/paymentService';
import { orderService } from '../../../services/orderService';
import { notifyError, notifySuccess, notifyInfo } from '../../../utils/notify';
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
  const [vietQrError, setVietQrError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transferConfirmed, setTransferConfirmed] = useState<boolean>(() => {
    if (!id) return false;
    const snapshotRaw = sessionStorage.getItem(`order_${id}`);
    if (snapshotRaw) {
      try {
        const parsed = JSON.parse(snapshotRaw);
        return Boolean(parsed.customerReportedTransfer);
      } catch {
        return false;
      }
    }
    return false;
  });
  const [loading, setLoading] = useState(true);
  const [vnpayError, setVnpayError] = useState<string | null>(null);
  const [vnpayLoading, setVnpayLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Fetch from API
    orderService
      .getOrderById(id)
      .then((data) => {
        if (data) {
          setOrder(data);
          if (data.customerReportedTransfer) {
            setTransferConfirmed(true);
          }
        }
      })
      .catch(() => {
        // Fallback already in snapshot
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (order?.customerReportedTransfer) {
      setTransferConfirmed(true);
    }
  }, [order?.customerReportedTransfer]);

  useEffect(() => {
    // Backend stores VietQR as BANK_TRANSFER — accept both labels so the QR
    // still loads for orders fetched from the API (not just the snapshot).
    const rawMethod = (order as any)?.paymentMethod;
    const isVietQr = rawMethod === 'VIETQR' || rawMethod === 'BANK_TRANSFER';
    if (order && isVietQr) {
      const oid = order.id || id;
      if (!oid) return;
      setVietQrError(null);
      paymentService
        .createVietQr(oid)
        .then((qr) => {
          setVietQrData(qr);
        })
        .catch((err: any) => {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Không thể tạo mã QR lúc này. Bạn vẫn có thể chuyển khoản thủ công theo thông tin bên dưới.';
          notifyError(err, msg);
          setVietQrError(msg);
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

  const handleReportTransfer = async () => {
    const oid = order?.id || (order as any)?.orderId || id;
    if (!oid) return;
    try {
      await paymentService.reportTransfer(oid);
      setTransferConfirmed(true);
      setOrder((prev) => (prev ? { ...prev, customerReportedTransfer: true } : prev));
      if (id) {
        const snapshotRaw = sessionStorage.getItem(`order_${id}`);
        if (snapshotRaw) {
          try {
            const parsed = JSON.parse(snapshotRaw);
            parsed.customerReportedTransfer = true;
            sessionStorage.setItem(`order_${id}`, JSON.stringify(parsed));
          } catch {}
        }
      }
    } catch (err: any) {
      notifyError(err, 'Không ghi nhận được. Bạn bấm lại giúp shop nhé.');
    }
  };

  const [refreshingStatus, setRefreshingStatus] = useState(false);

  const handleRefreshStatus = async () => {
    const oid = order?.id || id;
    if (!oid) return;
    setRefreshingStatus(true);
    try {
      const fresh = await orderService.getOrderById(oid);
      if (fresh) {
        setOrder(fresh);
        const nowPaid =
          fresh.paymentStatus === 'PAID' ||
          (Boolean(fresh.status) &&
            ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(
              fresh.status,
            ));
        if (nowPaid) {
          notifySuccess('Đơn hàng đã được xác nhận thanh toán thành công!');
        } else if (fresh.customerReportedTransfer) {
          setTransferConfirmed(true);
          notifyInfo('Hệ thống đã nhận thông báo thanh toán và đang đối soát.');
        } else {
          notifyInfo('Đơn hàng hiện đang chờ thanh toán.');
        }
      }
    } catch (err: any) {
      notifyError(err, 'Không thể kiểm tra trạng thái lúc này.');
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleVNPayRedirect = async () => {
    if (!order) return;
    setVnpayError(null);
    setVnpayLoading(true);
    try {
      const res = await paymentService.createVnpayUrl({
        orderId: order.id || id || '',
      });
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        const msg = 'Không nhận được đường dẫn thanh toán từ VNPay. Vui lòng thử lại.';
        setVnpayError(msg);
        notifyError(msg);
      }
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message || err?.message || '';
      if (/already.*paid/i.test(rawMsg) || /already been paid/i.test(rawMsg)) {
        // Self-heal: the order was actually settled in the backend!
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: 'PAID',
                status: prev.status === 'PENDING' ? 'CONFIRMED' : prev.status,
              }
            : prev,
        );
        notifySuccess('Đơn hàng của bạn đã được thanh toán thành công trước đó!');
        return;
      }

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể kết nối cổng thanh toán VNPay lúc này. Vui lòng thử lại sau.';
      setVnpayError(msg);
      notifyError(err, msg);
    } finally {
      setVnpayLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">
        <p>Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  const orderNum = order?.orderNumber || id || 'ĐƠN HÀNG MỚI';
  const total = order?.totalAmount || 0;
  const rawMethod = (order as any)?.paymentMethod;
  const method = rawMethod === 'BANK_TRANSFER' ? 'VIETQR' : rawMethod || 'VIETQR';
  const isPaid =
    order?.paymentStatus === 'PAID' ||
    (Boolean(order?.status) &&
      ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(
        order!.status,
      ));

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
            Cảm ơn bạn đã tin chọn Phone Shop!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Đơn hàng{' '}
            <strong className="text-slate-900 font-mono">{orderNum}</strong>{' '}
            của bạn đã được tiếp nhận thành công. Phone Shop sẽ liên hệ sớm nhất để xác nhận và giao hàng.
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
      {isPaid ? (
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-md shadow-emerald-500/5 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
            <CheckCircle className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600">
              Giao dịch hoàn tất
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              Đơn hàng đã được xác nhận thanh toán!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Phone Shop đã ghi nhận thanh toán thành công cho đơn hàng{' '}
              <span className="font-mono font-bold text-slate-800">{orderNum}</span> qua{' '}
              {method === 'VNPAY' ? 'cổng thanh toán VNPay' : method === 'VIETQR' ? 'chuyển khoản VietQR' : method}.
              Nhân viên sẽ sớm xử lý và giao hàng tới bạn.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/orders/${order?.id || id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>Xem chi tiết đơn hàng</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <span>Tiếp tục mua sắm</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {method === 'VIETQR' && (
        <div className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-8 shadow-md shadow-blue-500/5 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quét mã QR để thanh toán
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
              ) : vietQrError ? (
                <div className="w-64 min-h-64 flex items-center justify-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  {vietQrError}
                </div>
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
                    {vietQrData?.accountName || 'CONG TY PHONE SHOP'}
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
                    Đã nhận được thông báo chuyển tiền của bạn! Shop đang xác nhận và sẽ cập nhật
                    sang ĐÃ THANH TOÁN trong giây lát.
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleReportTransfer}
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
        <div className="bg-white rounded-3xl border border-indigo-200 p-8 shadow-md shadow-indigo-500/5 text-center space-y-5">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Thanh toán online qua VNPay
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nếu bạn chưa hoàn tất thanh toán trên cổng VNPay, hãy nhấn nút bên dưới để thanh toán nhé.
            </p>
          </div>

          {vnpayError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5 max-w-md mx-auto font-medium">
              {vnpayError}
            </p>
          )}

          {transferConfirmed ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-medium text-left">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Đã nhận được thông báo thanh toán qua VNPay của bạn! Shop đang kiểm tra đối soát và sẽ cập nhật sang ĐÃ THANH TOÁN trong giây lát.
                </span>
              </div>
              <button
                onClick={handleRefreshStatus}
                disabled={refreshingStatus}
                className="px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
                <span>Kiểm tra trạng thái</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-w-md mx-auto">
              <button
                onClick={handleVNPayRedirect}
                disabled={vnpayLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 transition cursor-pointer"
              >
                <span>{vnpayLoading ? 'Đang kết nối VNPay...' : 'Tiếp tục thanh toán với VNPay'}</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleReportTransfer}
                  className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Tôi đã thanh toán qua VNPay</span>
                </button>
                <button
                  onClick={handleRefreshStatus}
                  disabled={refreshingStatus}
                  title="Kiểm tra lại trạng thái đơn hàng từ hệ thống"
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${refreshingStatus ? 'animate-spin' : ''}`} />
                  <span>Kiểm tra trạng thái</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {method === 'COD' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Thanh toán khi nhận hàng</h3>
            <p>
              Nhân viên chăm sóc khách hàng của Phone Shop sẽ gọi điện xác nhận đơn hàng trong vòng
              15 phút.
            </p>
            <p>
              Bạn vui lòng mở hộp kiểm tra máy trước khi trả tiền cho shipper.
            </p>
          </div>
        </div>
      )}
        </>
      )}

      {/* Customer Info & Next steps */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">Bảo hành chính hãng</span>
            <span className="text-slate-500">
              Bảo hành có hiệu lực ngay khi bạn thanh toán xong.
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
            to="/"
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
