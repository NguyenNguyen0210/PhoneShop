import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { paymentService } from '../../../services/paymentService';

interface VNPayVerificationResult {
  success: boolean;
  isValid: boolean;
  orderNumber?: string;
  amount?: number;
  responseCode?: string;
  transactionNo?: string;
  message?: string;
}

const VNPAY_ERROR_CODES: Record<string, string> = {
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
  '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ Internet Banking tại ngân hàng.',
  '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.',
  '12': 'Thẻ/Tài khoản của khách hàng bị khóa.',
  '13': 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin vui lòng thực hiện lại.',
  '24': 'Khách hàng đã hủy giao dịch thanh toán.',
  '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì hệ thống.',
  '79': 'Khách hàng nhập sai mật khẩu thanh toán quá số lần quy định.',
  '99': 'Lỗi không xác định hoặc người dùng hủy giao dịch.',
};

export const VNPayReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VNPayVerificationResult | null>(null);

  useEffect(() => {
    const rawParams: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      rawParams[key] = val;
    });

    if (Object.keys(rawParams).length === 0) {
      setLoading(false);
      setResult({
        success: false,
        isValid: false,
        message: 'Không tìm thấy thông tin phản hồi từ cổng thanh toán VNPay.',
      });
      return;
    }

    paymentService
      .verifyVnpayReturn(rawParams)
      .then((res) => {
        setResult(res);
      })
      .catch((err) => {
        const responseCode = rawParams['vnp_ResponseCode'];
        const isSuccess = responseCode === '00';
        setResult({
          success: isSuccess,
          isValid: true,
          orderNumber: rawParams['vnp_TxnRef'],
          amount: rawParams['vnp_Amount'] ? Number(rawParams['vnp_Amount']) / 100 : undefined,
          responseCode,
          transactionNo: rawParams['vnp_TransactionNo'],
          message: err?.response?.data?.message || (isSuccess ? 'Giao dịch thành công' : 'Thanh toán không thành công'),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams]);

  const formatPrice = (val?: number) => {
    if (!val) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-700">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Đang xác nhận thanh toán...</h2>
        <p className="text-sm text-slate-500 mt-1">Hệ thống đang xác thực chữ ký số và cập nhật đơn hàng của bạn.</p>
      </div>
    );
  }

  const isSuccess = result?.success || result?.responseCode === '00';
  const responseCode = result?.responseCode || searchParams.get('vnp_ResponseCode') || '99';
  const errorMessage =
    VNPAY_ERROR_CODES[responseCode] ||
    result?.message ||
    'Giao dịch không thể hoàn tất hoặc người dùng đã hủy thanh toán.';
  const orderNumber = result?.orderNumber || searchParams.get('vnp_TxnRef') || 'N/A';
  const amount = result?.amount ?? (searchParams.get('vnp_Amount') ? Number(searchParams.get('vnp_Amount')) / 100 : 0);
  const transactionNo = result?.transactionNo || searchParams.get('vnp_TransactionNo') || 'N/A';
  const bankCode = searchParams.get('vnp_BankCode') || 'VNPAY-QR';

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-6">
          {isSuccess ? (
            <>
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600">
                  Thanh toán trực tuyến thành công
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Thanh toán thành công!
                </h1>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Cảm ơn bạn đã lựa chọn mua sắm tại Phone Shop. Đơn hàng của bạn đã được xác nhận thanh toán tự động.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-md shadow-rose-500/10">
                <XCircle className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-extrabold tracking-widest text-rose-600">
                  Giao dịch chưa hoàn tất
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Thanh toán không thành công
                </h1>
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 mt-2">
                  {errorMessage}
                </p>
              </div>
            </>
          )}

          {/* Details Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
              <span className="text-slate-500">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-slate-900">{orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
              <span className="text-slate-500">Số tiền thanh toán:</span>
              <span className="font-black text-blue-600 text-base">{formatPrice(amount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
              <span className="text-slate-500">Thanh toán qua:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                Qua VNPay ({bankCode})
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
              <span className="text-slate-500">Mã giao dịch VNPAY:</span>
              <span className="font-mono text-slate-700">{transactionNo}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Trạng thái xác thực:</span>
              <span className={`font-semibold flex items-center gap-1 ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isSuccess ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Đã xác thực chữ ký số
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" /> Thất bại (Code {responseCode})
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {isSuccess ? (
              <>
                <Link
                  to="/profile"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Xem đơn hàng của tôi</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/"
                  className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Tiếp tục mua hàng</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/cart"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Quay lại giỏ hàng thanh toán lại</span>
                </Link>
                <Link
                  to="/"
                  className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <span>Trang chủ</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Support Note */}
        <p className="text-xs text-center text-slate-400">
          Nếu có thắc mắc về khoản thanh toán này, bạn gọi hotline{' '}
          <strong className="text-slate-600">1800 6868</strong> để được hỗ trợ nhé.
        </p>
      </div>
    </div>
  );
};

export default VNPayReturnPage;
