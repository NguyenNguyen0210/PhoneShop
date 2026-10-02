import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Search,
  ShoppingCart,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  LogOut,
  SlidersHorizontal,
  Menu,
  X,
  Sparkles,
  Command,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCartStore } from '../../stores/useCartStore';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isStaffOrAdmin } = useAuthStore();
  const { totalCount, toggleDrawer } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Top Ambient Ticker Bar */}
      <div className="bg-[#05070a]/90 backdrop-blur-md text-slate-300 text-[11px] sm:text-xs py-1.5 px-4 border-b border-white/5 flex items-center justify-center gap-3 sm:gap-6 tracking-wide">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>⚡ Miễn phí vận chuyển toàn quốc</span>
        </span>
        <span className="hidden sm:inline text-slate-700">|</span>
        <span className="hidden sm:flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>Bảo hành chính hãng 12 tháng đổi mới</span>
        </span>
        <span className="hidden md:inline text-slate-700">|</span>
        <span className="hidden md:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span>BullMQ 15m Lock Active</span>
        </span>
      </div>

      {/* Floating Glassmorphism Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="bg-[#07090e]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl px-3 sm:px-6 py-2.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Glowing Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-xl blur-xs opacity-50 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0e1526] border border-white/10 flex items-center justify-center text-white">
                  <Smartphone className="w-5 h-5 text-indigo-400 group-hover:text-sky-300 transition duration-200" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-slate-100 transition">
                  MobileCommerce
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-sky-400 -mt-1 flex items-center gap-1">
                  <span>Chính hãng 100%</span>
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400 inline" />
                </span>
              </div>
            </Link>

            {/* Desktop Command Bar Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md hidden lg:block mx-4">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm iPhone 16 Pro Max, S24 Ultra, Xiaomi..."
                  className="w-full pl-10 pr-28 py-2 bg-[#0e1526]/80 hover:bg-[#151d30] focus:bg-[#151d30] border border-white/10 focus:border-indigo-500/60 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
                    <Command className="w-2.5 h-2.5" />K
                  </kbd>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-lg shadow-sm transition cursor-pointer"
                  >
                    Tìm
                  </button>
                </div>
              </div>
            </form>

            {/* Right Action Utilities */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Direct Warranty Lookup Link (Desktop) */}
              <Link
                to="/warranty-lookup"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Tra cứu bảo hành</span>
              </Link>

              {/* Cart Drawer Trigger */}
              <button
                onClick={toggleDrawer}
                className="relative p-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition cursor-pointer"
                aria-label="Giỏ hàng"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#07090e] shadow-md shadow-indigo-500/40">
                    {totalCount()}
                  </span>
                )}
              </button>

              {/* User Authentication Menu */}
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-white/10 hover:border-indigo-500/40 bg-[#0e1526]/80 hover:bg-[#151d30] transition text-left cursor-pointer"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="w-7 h-7 rounded-lg object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
                        {user.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate hidden md:inline">
                      {user.fullName || user.email}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-[#0e1526] rounded-xl shadow-2xl border border-white/10 py-1.5 z-50 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2.5">
                        <p className="text-xs font-bold text-slate-100 truncate">{user.fullName}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">{user.email}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold rounded-md uppercase tracking-wider">
                          {user.role}
                        </span>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition"
                        >
                          <UserIcon className="w-4 h-4 text-indigo-400" />
                          <span>Hồ sơ tài khoản & Avatar</span>
                        </Link>

                        {isStaffOrAdmin() && (
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                            <span>Admin Portal</span>
                          </Link>
                        )}

                        <Link
                          to="/warranty-lookup"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Tra cứu bảo hành thiết bị</span>
                        </Link>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Đăng nhập</span>
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Desktop Quick Links Bar */}
          <nav className="hidden lg:flex items-center gap-6 pt-2.5 mt-2.5 border-t border-white/5 text-xs font-medium text-slate-400">
            <Link to="/products" className="hover:text-white transition flex items-center gap-1.5">
              <span>📱 Tất cả điện thoại</span>
            </Link>
            <Link
              to="/products?brand=Apple"
              className="hover:text-white transition hover:text-indigo-400"
            >
              Apple (iPhone)
            </Link>
            <Link
              to="/products?brand=Samsung"
              className="hover:text-white transition hover:text-indigo-400"
            >
              Samsung Galaxy
            </Link>
            <Link
              to="/products?brand=Xiaomi"
              className="hover:text-white transition hover:text-indigo-400"
            >
              Xiaomi Flagship
            </Link>
            <Link
              to="/products?brand=OPPO"
              className="hover:text-white transition hover:text-indigo-400"
            >
              OPPO & Sony
            </Link>
            <Link
              to="/products?category=Tablet"
              className="hover:text-white transition hover:text-indigo-400"
            >
              Máy tính bảng
            </Link>
            <Link
              to="/products?category=Phụ+kiện"
              className="hover:text-white transition hover:text-indigo-400"
            >
              Phụ kiện chính hãng
            </Link>
            <Link
              to="/warranty-lookup"
              className="ml-auto text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tra cứu bảo hành online</span>
            </Link>
          </nav>
        </div>

        {/* Mobile Dropdown Menu with zero overflow */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 bg-[#0e1526]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleSearch} className="mb-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full pl-9 pr-4 py-2 bg-[#151d30] border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </form>

            <div className="space-y-1">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                📱 Tất cả điện thoại
              </Link>
              <Link
                to="/products?brand=Apple"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                Apple (iPhone)
              </Link>
              <Link
                to="/products?brand=Samsung"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                Samsung Galaxy
              </Link>
              <Link
                to="/products?brand=Xiaomi"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                Xiaomi Flagship
              </Link>
              <Link
                to="/warranty-lookup"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-bold text-sky-400 hover:text-sky-300 hover:bg-white/5 rounded-lg transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Tra cứu bảo hành</span>
              </Link>
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition flex items-center justify-between"
              >
                <span>🛒 Giỏ hàng</span>
                {totalCount() > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                    {totalCount()}
                  </span>
                )}
              </Link>
            </div>

            {!user && (
              <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 px-3 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
