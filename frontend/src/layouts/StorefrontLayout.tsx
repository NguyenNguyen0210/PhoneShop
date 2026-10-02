import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Search,
  ShoppingCart,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  LogOut,
  SlidersHorizontal,
  Headphones,
  Truck,
  RotateCcw,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useCartStore } from '../stores/useCartStore';
import { CartDrawer } from '../components/storefront/CartDrawer';

export const StorefrontLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isStaffOrAdmin } = useAuthStore();
  const { totalCount, toggleDrawer } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top notification announcement */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 text-center font-medium border-b border-slate-800 flex items-center justify-center gap-4">
        <span>⚡ Miễn phí giao hàng cho đơn từ 500k</span>
        <span className="hidden sm:inline">|</span>
        <span className="hidden sm:inline">🛡️ Bảo hành chính hãng 12 tháng đổi mới</span>
        <span className="hidden md:inline">|</span>
        <span className="hidden md:inline">📱 Kiểm soát vòng đời IMEI & Khóa giữ hàng 15 phút</span>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-950 via-slate-800 to-blue-700 bg-clip-text text-transparent">
                  MobileCommerce
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 -mt-1">
                  Chính hãng 100%
                </span>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden sm:block">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm iPhone 15 Pro Max, Galaxy S24, Xiaomi..."
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden transition shadow-inner"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full shadow-xs transition"
                >
                  Tìm kiếm
                </button>
              </div>
            </form>

            {/* Nav Utilities */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/warranty-lookup"
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tra cứu bảo hành</span>
              </Link>

              {/* Cart Button */}
              <button
                onClick={toggleDrawer}
                className="relative p-2.5 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
                aria-label="Giỏ hàng"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {totalCount()}
                  </span>
                )}
              </button>

              {/* User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition text-left"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {user.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-800 max-w-[90px] truncate hidden md:inline">
                      {user.fullName || user.email}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                          {user.role}
                        </span>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                      >
                        <UserIcon className="w-4 h-4 text-blue-600" />
                        <span>Hồ sơ tài khoản & Avatar</span>
                      </Link>

                      {isStaffOrAdmin() && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          <span>Admin Portal</span>
                        </Link>
                      )}

                      <Link
                        to="/warranty-lookup"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Tra cứu bảo hành thiết bị</span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Đăng nhập</span>
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links Bar */}
          <nav className="hidden lg:flex items-center gap-8 py-2.5 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <Link to="/products" className="hover:text-blue-600 transition flex items-center gap-1.5">
              <span>📱 Tất cả điện thoại</span>
            </Link>
            <Link
              to="/products?brand=Apple"
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <span>Apple (iPhone)</span>
            </Link>
            <Link
              to="/products?brand=Samsung"
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <span>Samsung Galaxy</span>
            </Link>
            <Link
              to="/products?brand=Xiaomi"
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <span>Xiaomi Flagship</span>
            </Link>
            <Link
              to="/products?brand=OPPO"
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <span>OPPO & Sony</span>
            </Link>
            <Link
              to="/products?category=Tablet"
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <span>Máy tính bảng</span>
            </Link>
            <Link
              to="/products?category=Phụ+kiện"
              className="hover:text-blue-600 transition flex items-center gap-1"
            >
              <span>Phụ kiện chính hãng</span>
            </Link>
            <Link
              to="/warranty-lookup"
              className="ml-auto text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tra cứu bảo hành online</span>
            </Link>
          </nav>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </form>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-800 hover:text-blue-600"
            >
              📱 Tất cả điện thoại
            </Link>
            <Link
              to="/products?brand=Apple"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-800 hover:text-blue-600"
            >
              Apple (iPhone)
            </Link>
            <Link
              to="/products?brand=Samsung"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-800 hover:text-blue-600"
            >
              Samsung Galaxy
            </Link>
            <Link
              to="/products?brand=Xiaomi"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-800 hover:text-blue-600"
            >
              Xiaomi Flagship
            </Link>
            <Link
              to="/warranty-lookup"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-blue-600"
            >
              🛡️ Tra cứu bảo hành điện tử
            </Link>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-slate-800"
            >
              🛒 Giỏ hàng ({totalCount()})
            </Link>
          </div>
        )}
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Value Proposition Badges */}
      <section className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Giao hàng hoả tốc</h4>
              <p className="text-xs text-slate-500">Miễn phí toàn quốc từ 500k</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Cam kết chính hãng 100%</h4>
              <p className="text-xs text-slate-500">Đầy đủ hoá đơn VAT & IMEI</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">1 đổi 1 trong 30 ngày</h4>
              <p className="text-xs text-slate-500">Nếu phát sinh lỗi từ NSX</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Hỗ trợ kỹ thuật 24/7</h4>
              <p className="text-xs text-slate-500">Hotline 1900 6868 miễn phí</p>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">MobileCommerce</span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              Hệ thống bán lẻ thiết bị di động thông minh hàng đầu Việt Nam. Công nghệ quản lý chuỗi
              cung ứng và phân phối định danh thiết bị theo chuẩn mã IMEI quốc tế.
            </p>
            <p className="text-slate-500">© 2026 MobileCommerce Corp. All rights reserved.</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/warranty-lookup" className="hover:text-white transition">
                  Tra cứu bảo hành điện tử (IMEI)
                </Link>
              </li>
              <li>
                <a href="#policy" className="hover:text-white transition">
                  Chính sách đổi trả 30 ngày
                </a>
              </li>
              <li>
                <a href="#shipping" className="hover:text-white transition">
                  Chính sách giao hàng & kiểm tra hàng
                </a>
              </li>
              <li>
                <a href="#installment" className="hover:text-white transition">
                  Hướng dẫn mua hàng trả góp 0%
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Về MobileCommerce
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#about" className="hover:text-white transition">
                  Giới thiệu công ty
                </a>
              </li>
              <li>
                <a href="#stores" className="hover:text-white transition">
                  Hệ thống cửa hàng toàn quốc
                </a>
              </li>
              <li>
                <a href="#careers" className="hover:text-white transition">
                  Tuyển dụng nhân sự
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition">
                  Liên hệ hợp tác kinh doanh
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Cổng thanh toán hỗ trợ
            </h4>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded font-semibold text-slate-300">
                💵 COD
              </span>
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded font-semibold text-slate-300">
                ⚡ VietQR (Napas)
              </span>
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded font-semibold text-slate-300">
                💳 VNPay
              </span>
              <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded font-semibold text-slate-300">
                🏧 ATM Nội địa
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Bảo mật giao dịch đa tầng qua chuẩn mã hóa HMAC-SHA512 & xác thực ngân hàng.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
