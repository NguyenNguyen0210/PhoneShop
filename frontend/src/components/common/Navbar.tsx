import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Sparkles,
  Command,
  Package,
  Ticket,
  Heart,
  Settings,
  LayoutDashboard,
  Copy,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCartStore } from '../../stores/useCartStore';
import { orderService } from '../../services/orderService';
import { voucherService, type VoucherInfo } from '../../services/voucherService';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isStaffOrAdmin } = useAuthStore();
  const { totalCount } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0);
  // Real data only: fetched from GET /vouchers/active (seed: WELCOME50, FREESHIP, VIP10).
  // No hardcoded fallback — empty array means "no vouchers from API yet".
  const [availableVouchers, setAvailableVouchers] = useState<VoucherInfo[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatVoucherLabel = (voucher: VoucherInfo): string => {
    if (voucher.type === 'FIXED_AMOUNT') {
      return `-${Number(voucher.value).toLocaleString('vi-VN')}₫`;
    }
    if (voucher.type === 'PERCENTAGE') {
      return `-${Number(voucher.value)}%`;
    }
    return 'Freeship';
  };

  // Best real discount badge for dropdown shortcut (first voucher from API, if any)
  const topVoucherLabel = availableVouchers.length > 0 ? formatVoucherLabel(availableVouchers[0]) : null;

  // Fetch user orders & public active vouchers — real API only, no mock.
  useEffect(() => {
    let isMounted = true;
    if (user) {
      orderService
        .getMyOrders()
        .then((data) => {
          if (isMounted && Array.isArray(data)) {
            const active = data.filter(
              (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'DELIVERED'
            ).length;
            setActiveOrdersCount(active);
          }
        })
        .catch(() => {
          if (isMounted) setActiveOrdersCount(0);
        });

      setVouchersLoading(true);
      voucherService
        .getActiveVouchers()
        .then((data) => {
          if (isMounted) {
            setAvailableVouchers(Array.isArray(data) ? data : []);
          }
        })
        .catch(() => {
          // Real API failed → keep empty (show empty state), never inject fake voucher.
          if (isMounted) setAvailableVouchers([]);
        })
        .finally(() => {
          if (isMounted) setVouchersLoading(false);
        });
    } else {
      setActiveOrdersCount(0);
      setAvailableVouchers([]);
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global shortcut (Ctrl+K / Cmd+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate('/');
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Floating Glassmorphism Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs rounded-2xl px-3 sm:px-6 py-2.5 transition-all duration-200 text-slate-800">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Official PhoneShop Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group" aria-label="PhoneShop">
              <img
                src="/logo-horizontal.png"
                alt="PhoneShop - Smartphone • Better Life"
                className="h-8 sm:h-9.5 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-[9px] uppercase font-bold tracking-widest text-blue-600 flex items-center gap-1">
                  <span>Chính hãng 100%</span>
                  <Sparkles className="w-2.5 h-2.5 text-blue-500 inline" />
                </span>
              </div>
            </Link>

            {/* Desktop Command Bar Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden lg:block mx-4 lg:mx-8">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Bạn tìm iPhone 16 Pro Max, Galaxy S24, Xiaomi..."
                  className="w-full h-11 pl-10 pr-28 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
                    <Command className="w-2.5 h-2.5" />K
                  </kbd>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </div>
            </form>

            {/* Right Action Utilities */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Direct Warranty Lookup Link (Desktop) */}
              <Link
                to="/warranty-lookup"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tra cứu bảo hành</span>
              </Link>

              {/* Cart Page Direct Link */}
              <Link
                to="/cart"
                className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl transition cursor-pointer shadow-2xs"
                aria-label="Giỏ hàng"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {totalCount()}
                  </span>
                )}
              </Link>

              {/* User Authentication Menu */}
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/80 hover:bg-slate-100 transition text-left cursor-pointer shadow-2xs group"
                  >
                    {user.avatar || (user as any).avatarUrl ? (
                      <img
                        src={user.avatar || (user as any).avatarUrl}
                        alt="Avatar"
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold text-xs flex items-center justify-center">
                        {user.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-800 max-w-[110px] truncate hidden md:inline">
                      {user.fullName || user.email}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 mr-0.5 transition-transform duration-200 ${
                        userDropdownOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'
                      }`}
                    />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-76 sm:w-80 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 border border-slate-200/90 p-2 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                      {/* 1. USER HEADER */}
                      <div className="flex items-center gap-3 p-3">
                        {user.avatar || (user as any).avatarUrl ? (
                          <img
                            src={user.avatar || (user as any).avatarUrl}
                            alt="Avatar"
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold text-sm flex items-center justify-center shrink-0">
                            {user.fullName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {user.fullName || 'Khách hàng'}
                          </h4>
                          <p className="text-xs text-slate-400 truncate font-mono">
                            {user.email}
                          </p>

                          {/* Loyalty / Voucher Pills — real API count only, no points system in backend */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                setVoucherModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-50 hover:bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60 transition cursor-pointer"
                              title="Xem ví voucher ưu đãi"
                            >
                              <span>
                                {vouchersLoading
                                  ? '🎁 Đang tải...'
                                  : `🎁 ${availableVouchers.length} Voucher`}
                              </span>
                            </button>
                            {(user.role === 'ADMIN' || user.role === 'STAFF' || isStaffOrAdmin()) && (
                              <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-700 border border-purple-200 uppercase tracking-wider">
                                {user.role === 'STAFF' ? 'Staff' : 'Admin'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. NHÓM 1: ĐƠN HÀNG & QUYỀN LỢI (Quan trọng nhất) */}
                      <div className="py-1.5">
                        <Link
                          to="/orders"
                          onClick={() => setUserDropdownOpen(false)}
                          className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <div className="flex items-center gap-2.5">
                            <Package className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                            <span>Đơn hàng của tôi</span>
                          </div>
                          {activeOrdersCount > 0 ? (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              {activeOrdersCount} Đang giao
                            </span>
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                          )}
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setVoucherModalOpen(true);
                          }}
                          className="w-full group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-amber-50 hover:text-amber-700 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <Ticket className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                            <span>Ví Voucher &amp; Ưu đãi</span>
                          </div>
                          {topVoucherLabel ? (
                            <span className="text-[11px] font-bold text-amber-600 font-mono bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200">
                              {topVoucherLabel}
                            </span>
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
                          )}
                        </button>

                        <Link
                          to="/products"
                          onClick={() => setUserDropdownOpen(false)}
                          className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <div className="flex items-center gap-2.5">
                            <Heart className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                            <span>Sản phẩm yêu thích</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
                        </Link>
                      </div>

                      {/* 3. NHÓM 2: DỊCH VỤ & THIẾT BỊ */}
                      <div className="py-1.5">
                        <Link
                          to="/warranty-lookup"
                          onClick={() => setUserDropdownOpen(false)}
                          className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                            <span>Thiết bị &amp; Bảo hành</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <div className="flex items-center gap-2.5">
                            <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                            <span>Cài đặt tài khoản</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-700 transition-colors" />
                        </Link>
                      </div>

                      {/* 4. SHORTCUT DÀNH CHO ADMIN / STAFF (NẾU CÓ) */}
                      {(user.role === 'ADMIN' || user.role === 'STAFF' || isStaffOrAdmin()) && (
                        <div className="py-1.5">
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50/70 hover:bg-purple-100 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <LayoutDashboard className="h-4 w-4 text-purple-600" />
                              <span>Trang Quản Trị (Admin)</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-200/80 text-purple-800 px-1.5 py-0.5 rounded">
                              CMS
                            </span>
                          </Link>
                        </div>
                      )}

                      {/* 5. NÚT ĐĂNG XUẤT */}
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 text-rose-500 group-hover:text-rose-600" />
                          <span>Đăng xuất tài khoản</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Đăng nhập</span>
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu with zero overflow */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleSearch} className="mb-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </form>

            <div className="space-y-1">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              >
                📱 Tất cả điện thoại
              </Link>
              <Link
                to="/products?brand=Apple"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              >
                Apple (iPhone)
              </Link>
              <Link
                to="/products?brand=Samsung"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              >
                Samsung Galaxy
              </Link>
              <Link
                to="/products?brand=Xiaomi"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              >
                Xiaomi Flagship
              </Link>
              <Link
                to="/warranty-lookup"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tra cứu bảo hành</span>
              </Link>
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition flex items-center justify-between"
              >
                <span>🛒 Giỏ hàng</span>
                {totalCount() > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                    {totalCount()}
                  </span>
                )}
              </Link>
            </div>

            {user ? (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="px-3 py-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Tài khoản: <strong className="text-slate-800">{user.fullName || user.email}</strong></span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                    {vouchersLoading ? '🎁 Đang tải...' : `🎁 ${availableVouchers.length} Voucher`}
                  </span>
                </div>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Đơn hàng của tôi</span>
                  </span>
                  {activeOrdersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">
                      {activeOrdersCount}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setVoucherModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-600" />
                    <span>Ví Voucher &amp; Ưu đãi</span>
                  </span>
                  {topVoucherLabel && (
                    <span className="text-[10px] font-bold text-amber-600 font-mono">{topVoucherLabel}</span>
                  )}
                </button>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Cài đặt tài khoản</span>
                </Link>
                {(user.role === 'ADMIN' || user.role === 'STAFF' || isStaffOrAdmin()) && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-purple-600" />
                      <span>Trang Quản Trị (Admin)</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">
                      CMS
                    </span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VOUCHER WALLET MODAL (VÍ VOUCHER & ƯU ĐÃI)
          ───────────────────────────────────────────────────────────── */}
      {voucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200/60">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ví Voucher &amp; Ưu đãi</h3>
                  <p className="text-xs text-slate-500">Mã giảm giá áp dụng khi thanh toán đơn hàng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoucherModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher List — real API only */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {vouchersLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải ưu đãi từ hệ thống...</span>
                </div>
              ) : availableVouchers.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Ticket className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Hiện chưa có ưu đãi khả dụng</p>
                  <p className="text-[11px] text-slate-500">
                    Vui lòng quay lại sau. Các chương trình khuyến mãi mới sẽ xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                availableVouchers.map((voucher) => (
                  <div
                    key={voucher.id || voucher.code}
                    className="p-4 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/50 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/70">
                          {voucher.code}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 bg-white/80 px-1.5 py-0.5 rounded border border-amber-200/60">
                          {formatVoucherLabel(voucher)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {voucher.name}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {voucher.description || 'Áp dụng cho đơn hàng điện thoại chính hãng'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyVoucher(voucher.code)}
                      className="shrink-0 px-3 py-2 bg-white hover:bg-amber-100/80 text-amber-800 border border-amber-200/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      {copiedCode === voucher.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-600" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setVoucherModalOpen(false);
                  navigate('/cart');
                }}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition text-center shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Dùng mã tại Giỏ hàng
              </button>
              <button
                type="button"
                onClick={() => setVoucherModalOpen(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
