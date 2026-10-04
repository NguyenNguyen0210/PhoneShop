import React from 'react';
import {
  User as UserIcon,
  Package,
  MapPin,
  RotateCcw,
  Headphones,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import type { User } from '../../../../types';

export type ProfileTabKey = 'profile' | 'orders' | 'addresses' | 'returns' | 'tickets' | 'password';

export interface ProfileSidebarProps {
  user: User;
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  orderCount?: number;
  addressCount?: number;
  returnCount?: number;
  onLogout: () => void;
}

interface NavItem {
  key: ProfileTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  orderCount,
  addressCount,
  returnCount,
  onLogout,
}) => {
  const avatarSrc = user.avatar || user.avatarUrl;
  const initial = (user.fullName || user.email || 'U').trim().charAt(0).toUpperCase();

  const navItems: NavItem[] = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: UserIcon,
    },
    {
      key: 'orders',
      label: 'Đơn hàng của tôi',
      icon: Package,
      badge: orderCount,
    },
    {
      key: 'addresses',
      label: 'Sổ địa chỉ',
      icon: MapPin,
      badge: addressCount,
    },
    {
      key: 'returns',
      label: 'Đổi trả & Hoàn tiền',
      icon: RotateCcw,
      badge: returnCount,
    },
    {
      key: 'tickets',
      label: 'Khiếu nại (CSKH)',
      icon: Headphones,
    },
    {
      key: 'password',
      label: 'Đổi mật khẩu',
      icon: Lock,
    },
  ];

  return (
    <aside className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col gap-5">
      {/* 1. Mini Profile Card */}
      <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
        <div className="relative shrink-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user.fullName || 'Avatar'}
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 font-bold text-xl flex items-center justify-center border-2 border-blue-100 shadow-xs">
              {initial}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900 text-base leading-snug truncate" title={user.fullName}>
            {user.fullName || 'Tài khoản của tôi'}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Thành viên thân thiết</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Menu */}
      <nav className="flex flex-col gap-1" aria-label="Menu tài khoản">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          const showBadge = typeof item.badge === 'number' && item.badge > 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-sm text-left group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {showBadge && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Logout Button */}
      <div className="pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors rounded-2xl group"
        >
          <LogOut className="w-5 h-5 shrink-0 text-rose-500 transition-transform group-hover:-translate-x-0.5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
