import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { storageService } from '../../../services/storageService';
import { apiClient } from '../../../services/apiClient';
import { orderService } from '../../../services/orderService';
import { returnService } from '../../../services/returnService';
import type { Order, ReturnRequest } from '../../../types';
import { ReturnCard } from '../Orders/components/ReturnCard';
import { OrderCancelModal } from '../Orders/components/OrderCancelModal';
import {
  Camera,
  CheckCircle2,
  User,
  Mail,
  AlertCircle,
  Clock,
  RotateCcw,
  Headphones,
  Phone,
  Pencil,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChangePasswordCard } from './components/ChangePasswordCard';
import { CustomerTicketsTab } from './components/CustomerTicketsTab';
import { EditProfileModal } from './components/EditProfileModal';
import { ProfileSidebar } from './components/ProfileSidebar';
import type { ProfileTabKey } from './components/ProfileSidebar';
import { OrdersTab } from './components/OrdersTab';
import { AddressesTab } from './components/AddressesTab';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, fetchProfile, logout } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const role = user?.role || (user as any)?.roles?.[0];
  const roles: string[] = Array.isArray((user as any)?.roles) ? (user as any).roles : [];
  const isAdminOrManager =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    roles.includes('ADMIN') ||
    roles.includes('MANAGER');
  const isStaff = role === 'STAFF' || roles.includes('STAFF');
  const isInternalStaff = isAdminOrManager || isStaff;

  const getInitialTab = (): ProfileTabKey => {
    const queryTab = searchParams.get('tab') as ProfileTabKey | null;
    const allowedTabs: ProfileTabKey[] = isInternalStaff
      ? ['profile', 'password']
      : ['profile', 'orders', 'addresses', 'returns', 'tickets', 'password'];

    if (queryTab && allowedTabs.includes(queryTab)) {
      return queryTab;
    }
    if (!isInternalStaff) {
      if (location.pathname === '/orders' || location.hash === '#orders') return 'orders';
      if (location.hash === '#returns') return 'returns';
      if (location.hash === '#tickets' || location.search.includes('tab=tickets')) return 'tickets';
      if (location.hash === '#addresses') return 'addresses';
    }
    if (location.hash === '#password' || location.hash === '#change-password') return 'password';
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState<ProfileTabKey>(getInitialTab);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(() => Boolean(user && !isInternalStaff));
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(() => Boolean(user && !isInternalStaff));
  const [addressCount, setAddressCount] = useState<number>(0);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tab = getInitialTab();
    setActiveTab(tab);
  }, [searchParams, location.pathname, location.hash, isInternalStaff]);

  const handleTabChange = (newTab: ProfileTabKey) => {
    if (isInternalStaff && !['profile', 'password'].includes(newTab)) {
      setActiveTab('profile');
      setSearchParams({ tab: 'profile' });
      return;
    }
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  useEffect(() => {
    fetchProfile().catch(() => {});
  }, [fetchProfile]);

  const fetchReturns = () => {
    if (!user || isInternalStaff) return;
    setLoadingReturns(true);
    returnService
      .getMyReturns()
      .then(setReturnRequests)
      .catch(() => setReturnRequests([]))
      .finally(() => setLoadingReturns(false));
  };

  useEffect(() => {
    fetchReturns();
  }, [user, isInternalStaff]);

  useEffect(() => {
    let isMounted = true;
    if (user && !isInternalStaff) {
      orderService
        .getMyOrders()
        .then((data) => {
          if (isMounted) setOrders(data);
        })
        .catch(() => {
          if (isMounted) setOrders([]);
        })
        .finally(() => {
          if (isMounted) setLoadingOrders(false);
        });
    } else {
      setLoadingOrders(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user, isInternalStaff]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước ảnh tối đa là 5MB.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const res = await storageService.uploadAvatar(file);
      try {
        await apiClient.put('/users/profile', { avatarUrl: res.url });
      } catch {
        await apiClient.patch('/users/profile', { avatarUrl: res.url });
      }

      if (user) {
        updateUser({ avatar: res.url });
      }
      setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Tải ảnh thất bại. Vui lòng thử lại!',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
      await logout();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Chưa đăng nhập tài khoản</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Vui lòng đăng nhập để xem thông tin hồ sơ, quản lý đơn hàng và bảo mật tài khoản.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>Đăng nhập ngay</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = user.avatar || (user as any).avatarUrl;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb / Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Quản lý tài khoản
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isInternalStaff
                ? 'Trung tâm quản lý thông tin cá nhân và bảo mật tài khoản nhân sự'
                : 'Trung tâm quản lý thông tin cá nhân, đơn hàng, sổ địa chỉ và bảo mật'}
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-medium border animate-in fade-in duration-200 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* 12-Column Dashboard Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar (3 cols) */}
          <div className="md:col-span-3 md:sticky md:top-24">
            <ProfileSidebar
              user={user}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              orderCount={orders.length}
              addressCount={addressCount}
              returnCount={returnRequests.length}
              onLogout={handleLogout}
            />
          </div>

          {/* Right Main Content (9 cols) */}
          <main className="md:col-span-9">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              {/* TAB 1: Profile Info */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <span>Hồ sơ cá nhân</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Quản lý ảnh đại diện, thông tin liên lạc và bảo mật tài khoản
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditProfileModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs sm:text-sm font-bold rounded-xl border border-blue-200 transition cursor-pointer self-start sm:self-auto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa thông tin</span>
                    </button>
                  </div>

                  {/* Avatar Upload Banner */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-slate-50/80 rounded-3xl border border-slate-200/80">
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden bg-white border-2 border-slate-200 flex items-center justify-center shadow-xs">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt="Avatar"
                            className="w-full h-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-black text-blue-600">
                            {(user.fullName || user.email || 'U')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                        title="Đổi ảnh đại diện"
                      >
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="text-center sm:text-left space-y-1">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {user.fullName || 'Khách hàng'}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Định dạng hỗ trợ: PNG, JPG, WEBP. Dung lượng tối đa: 5MB.
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tài khoản đã xác thực</span>
                        </span>
                        {isAdminOrManager && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 uppercase">
                            Admin
                          </span>
                        )}
                        {isStaff && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 uppercase">
                            Staff
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personal Information Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>Họ và tên</span>
                      </div>
                      <p className="text-slate-900 font-bold text-sm sm:text-base">
                        {user.fullName || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Số điện thoại</span>
                      </div>
                      <p
                        className={`text-sm sm:text-base ${
                          user.phone
                            ? 'text-slate-900 font-bold font-mono'
                            : 'text-slate-400 italic font-medium'
                        }`}
                      >
                        {user.phone || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>Địa chỉ Email</span>
                      </div>
                      <p
                        className="text-slate-900 font-semibold text-sm sm:text-base truncate"
                        title={user.email}
                      >
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Orders */}
              {!isInternalStaff && activeTab === 'orders' && (
                <OrdersTab
                  orders={orders}
                  loading={loadingOrders}
                  onCancelOrder={(order) => setCancellingOrder(order)}
                />
              )}

              {/* TAB 3: Addresses */}
              {!isInternalStaff && activeTab === 'addresses' && (
                <AddressesTab onAddressesLoaded={(count) => setAddressCount(count)} />
              )}

              {/* TAB 4: Returns & Refunds */}
              {!isInternalStaff && activeTab === 'returns' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-blue-600" />
                        <span>Yêu cầu Đổi trả & Hoàn tiền</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Quản lý và theo dõi tiến trình xử lý các yêu cầu đổi trả hoặc bảo hành sản phẩm
                      </p>
                    </div>
                  </div>

                  {loadingReturns ? (
                    <div className="py-12 text-center text-slate-400">
                      <Clock className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                      <p className="text-xs font-medium">Đang tải danh sách đổi trả...</p>
                    </div>
                  ) : returnRequests.length === 0 ? (
                    <div className="py-16 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
                        🔄
                      </div>
                      <h3 className="text-base font-bold text-slate-800">
                        Chưa có yêu cầu đổi trả nào
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Khi bạn gửi yêu cầu đổi trả hoặc bảo hành cho các đơn hàng đã nhận, tiến
                        trình sẽ hiển thị tại đây.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {returnRequests.map((req) => (
                        <ReturnCard
                          key={req.id}
                          returnRequest={req}
                          onCancel={async (id) => {
                            if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu đổi trả này?')) return;
                            try {
                              await returnService.cancelReturn(id);
                              fetchReturns();
                              setMessage({
                                type: 'success',
                                text: 'Đã hủy yêu cầu đổi trả thành công.',
                              });
                            } catch (err: any) {
                              setMessage({
                                type: 'error',
                                text: err?.message || 'Không thể hủy yêu cầu đổi trả.',
                              });
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Support Tickets (CSKH) */}
              {!isInternalStaff && activeTab === 'tickets' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                    <Headphones className="w-5 h-5 text-blue-600" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        Trung tâm Hỗ trợ & Khiếu nại (CSKH)
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Gửi yêu cầu hỗ trợ hoặc trao đổi trực tiếp với nhân viên chăm sóc khách hàng
                      </p>
                    </div>
                  </div>
                  <CustomerTicketsTab
                    initialOrderId={new URLSearchParams(location.search).get('orderId')}
                  />
                </div>
              )}

              {/* TAB 6: Change Password */}
              {activeTab === 'password' && <ChangePasswordCard />}
            </div>
          </main>
        </div>

        {/* Edit Profile Modal */}
        {user && (
          <EditProfileModal
            isOpen={isEditProfileModalOpen}
            onClose={() => setIsEditProfileModalOpen(false)}
            user={user}
            onSuccess={(updatedUser) => {
              updateUser(updatedUser);
              setMessage({
                type: 'success',
                text: 'Cập nhật thông tin cá nhân thành công!',
              });
              fetchProfile().catch(() => {});
            }}
          />
        )}

        {/* Cancel Modal */}
        {cancellingOrder && (
          <OrderCancelModal
            order={cancellingOrder}
            isOpen={Boolean(cancellingOrder)}
            onClose={() => setCancellingOrder(null)}
            onCancelled={(updated) => {
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              setMessage({
                type: 'success',
                text: `Hủy đơn hàng #${updated.orderNumber || updated.id.slice(0, 8)} thành công!`,
              });
            }}
          />
        )}
      </div>
    </div>
  );
};
