import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Calendar,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  User,
  Phone,
  MapPin,
  ChevronLeft,
  ShieldCheck,
  Printer,
  RotateCcw,
  Ban,
  Undo2,
  Check,
  Star,
  Edit3,
  Headphones,
} from 'lucide-react';
import { orderService } from '../../../services/orderService';
import { installmentService } from '../../../services/installmentService';
import { reviewService } from '../../../services/reviewService';
import { ReviewModal } from '../../../components/storefront/reviews';
import type { Order, InstallmentApplication, InstallmentStatus, Review } from '../../../types';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';
import { OrderTrackingTimeline } from './components/OrderTrackingTimeline';
import { OrderInvoiceModal } from './components/OrderInvoiceModal';
import { OrderCancelModal } from './components/OrderCancelModal';
import { ReturnRequestModal } from './components/ReturnRequestModal';
import { reorderOrderItems } from './utils/reorderHelper';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [installment, setInstallment] = useState<InstallmentApplication | null>(null);
  const [loading, setLoading] = useState(() => Boolean(id));
  const [error, setError] = useState<string | null>(null);

  // Modals & Action States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<string | null>(null);

  // Review states for delivered orders
  const [reviewedProducts, setReviewedProducts] = useState<
    Record<string, { canReview: boolean; myReview: Review | null }>
  >({});
  const [selectedReviewProduct, setSelectedReviewProduct] = useState<{
    productId: string;
    productName: string;
    productImage?: string;
    initialData?: Review | null;
  } | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    if (order && (order.status === 'DELIVERED' || order.status === 'COMPLETED')) {
      const productIds = Array.from(
        new Set(
          (order.items || [])
            .map((item) => item.variant?.productId || item.variant?.product?.id)
            .filter(Boolean) as string[],
        ),
      );
      productIds.forEach(async (pId) => {
        try {
          const res = await reviewService.getMyReviewStatus(pId);
          setReviewedProducts((prev) => ({ ...prev, [pId]: res }));
        } catch {
          // ignore
        }
      });
    }
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    orderService
      .getOrderById(id)
      .then(async (orderData) => {
        if (!isMounted) return;
        setOrder(orderData);

        // If order has embedded installment application or payment method is INSTALLMENT
        if (orderData?.installmentApplication) {
          setInstallment(orderData.installmentApplication);
        } else if (orderData?.paymentMethod === 'INSTALLMENT') {
          try {
            const inst = await installmentService.getInstallmentByOrderId(orderData.id);
            if (isMounted && inst) {
              setInstallment(inst);
            }
          } catch {
            // Not fatal if installment endpoint isn't ready or handled
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Không thể tìm thấy thông tin đơn hàng.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getInstallmentStatusBadge = (status?: InstallmentStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Hồ sơ đã được phê duyệt</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Hồ sơ bị từ chối</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-slate-500" />
            <span>Đã hủy</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-pulse">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Chờ thẩm định hồ sơ (24h)</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Không tìm thấy đơn hàng</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'Đơn hàng không tồn tại hoặc đã bị xóa.'}</p>
        <Link
          to="/profile#orders"
          onClick={(e) => {
            if (window.history.length > 1) {
              e.preventDefault();
              navigate(-1);
            }
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại danh sách đơn hàng</span>
        </Link>
      </div>
    );
  }

  const isInstallment = order.paymentMethod === 'INSTALLMENT' || Boolean(installment);
  const instApp = installment || order.installmentApplication;

  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status) && order.paymentStatus !== 'PAID';
  const isReturnEligible =
    ['DELIVERED', 'COMPLETED'].includes(order.status) &&
    Date.now() - new Date(order.deliveredAt || order.completedAt || order.createdAt).getTime() <=
      7 * 24 * 60 * 60 * 1000;

  const handleReorder = () => {
    const result = reorderOrderItems(order);
    setReorderSuccessMsg(`Đã thêm ${result.addedCount} sản phẩm vào giỏ hàng`);
    setTimeout(() => setReorderSuccessMsg(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb / Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <Link
              to="/profile#orders"
              onClick={(e) => {
                if (window.history.length > 1) {
                  e.preventDefault();
                  navigate(-1);
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mb-1.5 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Lịch sử đơn hàng</span>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Chi tiết đơn hàng #{order.orderNumber || order.id.slice(0, 8)}
              </h1>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-bold rounded-md">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}</span>
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Xem & In hóa đơn</span>
            </button>

            <button
              type="button"
              onClick={handleReorder}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mua lại đơn này</span>
            </button>

            {canCancel && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Hủy đơn hàng</span>
              </button>
            )}

            {isReturnEligible && (
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Yêu cầu đổi trả</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/profile?tab=tickets&orderId=${order.id}#tickets`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Cần hỗ trợ về đơn này?</span>
            </button>
          </div>
        </div>

        {/* Reorder Notification Toast */}
        {reorderSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
            <span className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              {reorderSuccessMsg}
            </span>
          </div>
        )}

        {/* ORDER TRACKING TIMELINE */}
        <OrderTrackingTimeline order={order} />

        {/* ELEVATED INSTALLMENT STATUS BANNER */}
        {isInstallment && (
          <div className="bg-white rounded-3xl border-2 border-blue-300 p-6 sm:p-7 shadow-md shadow-blue-500/5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Hồ sơ trả góp 0% qua{' '}
                      {instApp?.provider === 'FE_CREDIT' ? 'FE Credit' : 'Home Credit'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mã hồ sơ thẩm định tài chính liên kết đơn hàng
                  </p>
                </div>
              </div>
              <div>{getInstallmentStatusBadge(instApp?.status)}</div>
            </div>

            {/* Financial Package Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Đối tác tài chính
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {instApp?.provider === 'FE_CREDIT' ? 'FE Credit' : 'Home Credit'}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">0% Lãi suất</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Kỳ hạn vay
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {instApp?.termMonths || 6} Tháng
                </span>
                <span className="text-[10px] text-slate-500">Kỳ trả cố định</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Trả trước (Thu khi nhận)
                </span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block font-mono">
                  {formatPrice(
                    instApp?.prepayAmount ??
                      Math.round((order.totalAmount * (instApp?.prepayPercent ?? 20)) / 100)
                  )}
                </span>
                <span className="text-[10px] text-slate-500">
                  {instApp?.prepayPercent ?? 20}% Giá trị máy
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200">
                <span className="text-blue-600 text-[10px] uppercase font-bold block">
                  Góp mỗi tháng
                </span>
                <span className="font-mono font-black text-red-600 text-base mt-0.5 block">
                  {formatPrice(
                    instApp?.monthlyAmount ??
                      Math.round(
                        (order.totalAmount -
                          Math.round((order.totalAmount * (instApp?.prepayPercent ?? 20)) / 100)) /
                          (instApp?.termMonths || 6)
                      )
                  )}
                </span>
                <span className="text-[10px] text-blue-700 font-semibold">Đã gồm lãi 0%</span>
              </div>
            </div>

            {/* Rejection notice if rejected */}
            {instApp?.status === 'REJECTED' && instApp?.rejectionReason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                <span className="font-bold text-sm block text-rose-900">Lý do từ chối hồ sơ:</span>
                <p>{instApp.rejectionReason}</p>
              </div>
            )}

            {/* Official Review Note */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Quy trình thẩm định hồ sơ:</span>
                <p className="text-amber-800 leading-relaxed">
                  Nhân viên thẩm định sẽ liên hệ qua số điện thoại để xác nhận thông tin trước khi giao máy.
                  Thiết bị của bạn đang được khóa giữ ưu tiên tại kho trong vòng 24 giờ.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items & Summary */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Danh sách sản phẩm trong đơn
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {order.items?.map((item) => {
              const pId = item.variant?.productId || item.variant?.product?.id;
              const reviewInfo = pId ? reviewedProducts[pId] : null;
              const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED';

              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
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
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {item.productName || item.variant?.product?.name || 'Điện thoại'}
                      </h4>
                      <p className="text-slate-500 mt-0.5">
                        {item.variant?.color} • {item.variant?.storage} • Số lượng: x{item.quantity}
                      </p>
                      {item.imeiDevice && (
                        <span className="inline-block mt-1 font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          IMEI: {item.imeiDevice.imeiNumber || item.imeiDevice.imei}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-blue-600 block">
                        {formatPrice(item.totalPrice || item.unitPrice * item.quantity)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatPrice(item.unitPrice)} / cái
                      </span>
                    </div>

                    {isDelivered && pId && (
                      <div>
                        {reviewInfo?.myReview ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReviewProduct({
                                productId: pId,
                                productName:
                                  item.productName || item.variant?.product?.name || 'Sản phẩm',
                                productImage:
                                  item.variant?.images?.[0] ||
                                  item.variant?.imageUrl ||
                                  item.variant?.product?.thumbnail,
                                initialData: reviewInfo.myReview,
                              });
                              setIsReviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Xem / Sửa đánh giá</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReviewProduct({
                                productId: pId,
                                productName:
                                  item.productName || item.variant?.product?.name || 'Sản phẩm',
                                productImage:
                                  item.variant?.images?.[0] ||
                                  item.variant?.imageUrl ||
                                  item.variant?.product?.thumbnail,
                                initialData: null,
                              });
                              setIsReviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>Đánh giá sản phẩm</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Totals */}
          <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính:</span>
              <span className="font-mono font-bold text-slate-900">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Giảm giá:</span>
                <span className="font-mono">-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Phí giao hàng:</span>
              <span>
                {order.shippingFee === 0 ? (
                  <span className="text-emerald-600 font-bold">Miễn phí</span>
                ) : (
                  <span className="font-mono text-slate-900">{formatPrice(order.shippingFee)}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Tổng thanh toán đơn hàng:</span>
              <span className="text-xl font-black text-blue-600 font-mono">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Truck className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Địa chỉ nhận hàng
              </h4>
            </div>
            <div className="text-xs space-y-2 text-slate-600">
              <p className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900">{order.customerName}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.shippingPhone}</span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{order.shippingAddress}</span>
              </p>
              {order.notes && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 mt-2">
                  <span className="font-bold block text-slate-700">Ghi chú giao hàng:</span>
                  <span>{order.notes}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Thông tin thanh toán
              </h4>
            </div>
            <div className="text-xs space-y-2.5 text-slate-600">
              <div className="flex justify-between items-center">
                <span>Phương thức:</span>
                <span className="font-bold text-slate-900">
                  {order.paymentMethod === 'INSTALLMENT'
                    ? 'Trả góp 0% qua công ty tài chính'
                    : order.paymentMethod === 'VIETQR'
                    ? 'Chuyển khoản VietQR'
                    : order.paymentMethod === 'VNPAY'
                    ? 'Cổng trực tuyến VNPAY'
                    : 'Thanh toán khi nhận hàng (COD)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Trạng thái thanh toán:</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {order.paymentStatus}
                </span>
              </div>
              <div className="pt-2">
                <Link
                  to="/warranty-lookup"
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Tra cứu bảo hành theo IMEI &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* MODALS */}
        <OrderCancelModal
          order={order}
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onCancelled={(updated) => {
            setOrder(updated);
          }}
        />

        <OrderInvoiceModal
          order={order}
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
        />

        <ReturnRequestModal
          order={order}
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          onSubmitted={() => {
            if (id) {
              orderService.getOrderById(id).then(setOrder).catch(() => {});
            }
          }}
        />
      </div>

      {selectedReviewProduct && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          productId={selectedReviewProduct.productId}
          productName={selectedReviewProduct.productName}
          productImage={selectedReviewProduct.productImage}
          initialData={selectedReviewProduct.initialData}
          onSuccess={async () => {
            if (selectedReviewProduct.productId) {
              try {
                const res = await reviewService.getMyReviewStatus(selectedReviewProduct.productId);
                setReviewedProducts((prev) => ({
                  ...prev,
                  [selectedReviewProduct.productId]: res,
                }));
              } catch {
                // ignore
              }
            }
          }}
        />
      )}
    </div>
  );
};
