# Account Dashboard Architecture & Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/profile` into a 2-column e-commerce account dashboard (12-column grid: 3-column sticky sidebar + 9-column dynamic tab content), matching modern e-commerce standards with URL query synchronization, Address Book management, horizontal order status filter tabs with CTA empty state, and a compact stacked change-password card.

**Architecture:** Split the monolithic single-column `/profile` into modular components: `ProfileSidebar`, `OrdersTab`, `AddressesTab` (with `AddressCreateModal`), `ChangePasswordCard`, `CustomerTicketsTab`, and `ProfileInfoTab`. Orchestrate them in `ProfilePage` using a 12-column grid (`md:col-span-3` sidebar + `md:col-span-9` main content) synchronized with URL query params (`?tab=...`) and backward-compatible with legacy hashes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide icons, Vitest, Testing Library, NestJS, Prisma.

---

### Task 1: Create ProfileSidebar Component

**Files:**
- Create: `frontend/src/pages/storefront/Profile/components/ProfileSidebar.tsx`
- Test: `frontend/src/pages/storefront/Profile/__tests__/ProfileSidebar.spec.tsx`

- [ ] **Step 1: Write the unit tests for ProfileSidebar**

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileSidebar, ProfileTabKey } from '../components/ProfileSidebar';
import type { User } from '../../../../types';

describe('ProfileSidebar', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'customer@gmail.com',
    fullName: 'Customer Nguyen',
    role: 'USER',
  };

  const defaultProps = {
    user: mockUser,
    activeTab: 'profile' as ProfileTabKey,
    onTabChange: vi.fn(),
    orderCount: 3,
    addressCount: 2,
    returnCount: 1,
    onLogout: vi.fn(),
  };

  it('renders user mini card with avatar, name, and loyalty badge', () => {
    render(<ProfileSidebar {...defaultProps} />);
    expect(screen.getByText('Customer Nguyen')).toBeDefined();
    expect(screen.getByText('Thành viên thân thiết')).toBeDefined();
  });

  it('renders all 6 navigation tabs with badge counts', () => {
    render(<ProfileSidebar {...defaultProps} />);
    expect(screen.getByText('Hồ sơ cá nhân')).toBeDefined();
    expect(screen.getByText('Đơn hàng của tôi')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined(); // Order badge
    expect(screen.getByText('Sổ địa chỉ')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined(); // Address badge
    expect(screen.getByText('Đổi trả & Hoàn tiền')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined(); // Return badge
    expect(screen.getByText('Khiếu nại (CSKH)')).toBeDefined();
    expect(screen.getByText('Đổi mật khẩu')).toBeDefined();
  });

  it('calls onTabChange when a tab is clicked', () => {
    render(<ProfileSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Đơn hàng của tôi'));
    expect(defaultProps.onTabChange).toHaveBeenCalledWith('orders');
  });

  it('calls onLogout when clicking logout button', () => {
    render(<ProfileSidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Đăng xuất tài khoản'));
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test src/pages/storefront/Profile/__tests__/ProfileSidebar.spec.tsx`
Expected: FAIL due to missing `ProfileSidebar.tsx`.

- [ ] **Step 3: Implement ProfileSidebar component**

```typescript
import React from 'react';
import {
  User,
  Package,
  MapPin,
  RotateCcw,
  Headphones,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import type { User as UserType } from '../../../../types';

export type ProfileTabKey =
  | 'profile'
  | 'orders'
  | 'addresses'
  | 'returns'
  | 'tickets'
  | 'password';

export interface ProfileSidebarProps {
  user: UserType;
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  orderCount?: number;
  addressCount?: number;
  returnCount?: number;
  onLogout: () => void;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  orderCount = 0,
  addressCount = 0,
  returnCount = 0,
  onLogout,
}) => {
  const navItems = [
    { key: 'profile' as const, label: 'Hồ sơ cá nhân', icon: User },
    {
      key: 'orders' as const,
      label: 'Đơn hàng của tôi',
      icon: Package,
      badge: orderCount > 0 ? orderCount : undefined,
    },
    {
      key: 'addresses' as const,
      label: 'Sổ địa chỉ',
      icon: MapPin,
      badge: addressCount > 0 ? addressCount : undefined,
    },
    {
      key: 'returns' as const,
      label: 'Đổi trả & Hoàn tiền',
      icon: RotateCcw,
      badge: returnCount > 0 ? returnCount : undefined,
    },
    { key: 'tickets' as const, label: 'Khiếu nại (CSKH)', icon: Headphones },
    { key: 'password' as const, label: 'Đổi mật khẩu', icon: Lock },
  ];

  const initial = (user.fullName || user.email || 'U')[0].toUpperCase();

  return (
    <aside className="space-y-4">
      {/* Mini Profile Card */}
      <div className="bg-white p-4 rounded-3xl shadow-xs border border-slate-200 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
          {user.avatar || user.avatarUrl ? (
            <img
              src={user.avatar || user.avatarUrl}
              alt={user.fullName || user.email}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-900 text-sm truncate">
            {user.fullName || user.email}
          </div>
          <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            <span>Thành viên thân thiết</span>
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium text-xs sm:text-sm transition cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Logout Divider */}
        <div className="pt-2 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-semibold text-xs sm:text-sm text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test src/pages/storefront/Profile/__tests__/ProfileSidebar.spec.tsx`
Expected: PASS with 4 passed tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/storefront/Profile/components/ProfileSidebar.tsx frontend/src/pages/storefront/Profile/__tests__/ProfileSidebar.spec.tsx
git commit -m "feat(profile): create ProfileSidebar component with user mini card and navigation"
```

---

### Task 2: Create Address Book Components (`AddressesTab` and `AddressCreateModal`)

**Files:**
- Create: `frontend/src/pages/storefront/Profile/components/AddressCreateModal.tsx`
- Create: `frontend/src/pages/storefront/Profile/components/AddressesTab.tsx`
- Test: `frontend/src/pages/storefront/Profile/__tests__/AddressCreateModal.spec.tsx`
- Test: `frontend/src/pages/storefront/Profile/__tests__/AddressesTab.spec.tsx`

- [ ] **Step 1: Write test for AddressCreateModal**

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressCreateModal } from '../components/AddressCreateModal';
import { addressService } from '../../../../services/addressService';

vi.mock('../../../../services/addressService', () => ({
  addressService: {
    createAddress: vi.fn(),
  },
}));

describe('AddressCreateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with required fields', () => {
    render(<AddressCreateModal {...defaultProps} />);
    expect(screen.getByText('Thêm địa chỉ nhận hàng')).toBeDefined();
    expect(screen.getByLabelText(/Họ và tên người nhận/i)).toBeDefined();
    expect(screen.getByLabelText(/Số điện thoại/i)).toBeDefined();
    expect(screen.getByLabelText(/Tỉnh \/ Thành phố/i)).toBeDefined();
    expect(screen.getByLabelText(/Địa chỉ chi tiết/i)).toBeDefined();
  });

  it('validates Vietnamese phone number', async () => {
    render(<AddressCreateModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Họ và tên người nhận/i), {
      target: { value: 'Nguyen Van A' },
    });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu địa chỉ/i }));

    expect(await screen.findByText(/Số điện thoại không hợp lệ/i)).toBeDefined();
    expect(addressService.createAddress).not.toHaveBeenCalled();
  });

  it('calls addressService.createAddress with valid payload', async () => {
    const mockCreated = {
      id: 'addr-1',
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      addressLine1: '123 Le Loi',
      city: 'Ho Chi Minh',
      isDefault: true,
    };
    vi.mocked(addressService.createAddress).mockResolvedValue(mockCreated as any);

    render(<AddressCreateModal {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Họ và tên người nhận/i), {
      target: { value: 'Nguyen Van A' },
    });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), {
      target: { value: '0901234567' },
    });
    fireEvent.change(screen.getByLabelText(/Tỉnh \/ Thành phố/i), {
      target: { value: 'Ho Chi Minh' },
    });
    fireEvent.change(screen.getByLabelText(/Địa chỉ chi tiết/i), {
      target: { value: '123 Le Loi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu địa chỉ/i }));

    await waitFor(() => {
      expect(addressService.createAddress).toHaveBeenCalled();
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockCreated);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Implement AddressCreateModal**

```typescript
import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Phone, Home, Building2, Loader2, Save } from 'lucide-react';
import { addressService } from '../../../../services/addressService';
import type { Address } from '../../../../types';

export interface AddressCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAddress: Address) => void;
}

export const AddressCreateModal: React.FC<AddressCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [type, setType] = useState<'HOME' | 'OFFICE'>('HOME');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecipientName('');
      setPhone('');
      setCity('');
      setDistrict('');
      setWard('');
      setAddressLine1('');
      setType('HOME');
      setIsDefault(false);
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = recipientName.trim();
    const trimmedPhone = phone.trim();
    const trimmedCity = city.trim();
    const trimmedAddress = addressLine1.trim();

    if (!trimmedName) {
      setError('Vui lòng nhập họ và tên người nhận.');
      return;
    }
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam 10 chữ số.');
      return;
    }
    if (!trimmedCity) {
      setError('Vui lòng nhập Tỉnh / Thành phố.');
      return;
    }
    if (!trimmedAddress) {
      setError('Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường).');
      return;
    }

    setLoading(true);
    try {
      const created = await addressService.createAddress({
        recipientName: trimmedName,
        phone: trimmedPhone,
        city: trimmedCity,
        district: district.trim() || undefined,
        ward: ward.trim() || undefined,
        addressLine1: trimmedAddress,
        type,
        isDefault,
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Thêm địa chỉ thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={() => !loading && onClose()} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thêm địa chỉ nhận hàng</h3>
              <p className="text-xs text-slate-500">Lưu thông tin giao hàng cho các đơn hàng kế tiếp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="addr-name" className="block text-xs font-semibold text-slate-700">
                Họ và tên người nhận *
              </label>
              <input
                id="addr-name"
                type="text"
                disabled={loading}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="addr-phone" className="block text-xs font-semibold text-slate-700">
                Số điện thoại *
              </label>
              <input
                id="addr-phone"
                type="tel"
                disabled={loading}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-city" className="block text-xs font-semibold text-slate-700">
              Tỉnh / Thành phố *
            </label>
            <input
              id="addr-city"
              type="text"
              disabled={loading}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="TP. Hồ Chí Minh / Hà Nội..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="addr-district" className="block text-xs font-semibold text-slate-700">
                Quận / Huyện
              </label>
              <input
                id="addr-district"
                type="text"
                disabled={loading}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Quận 1, Cầu Giấy..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="addr-ward" className="block text-xs font-semibold text-slate-700">
                Phường / Xã
              </label>
              <input
                id="addr-ward"
                type="text"
                disabled={loading}
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="Phường Bến Nghé..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-street" className="block text-xs font-semibold text-slate-700">
              Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) *
            </label>
            <input
              id="addr-street"
              type="text"
              disabled={loading}
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Số 123 Đường Nguyễn Huệ..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <span className="text-xs font-semibold text-slate-700">Loại địa chỉ:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setType('HOME')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  type === 'HOME'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Nhà riêng</span>
              </button>
              <button
                type="button"
                onClick={() => setType('OFFICE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  type === 'OFFICE'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Văn phòng</span>
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">Đặt làm địa chỉ giao hàng mặc định</span>
          </label>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu địa chỉ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Write test for AddressesTab**

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressesTab } from '../components/AddressesTab';
import { addressService } from '../../../../services/addressService';

vi.mock('../../../../services/addressService', () => ({
  addressService: {
    getAddresses: vi.fn(),
    setDefaultAddress: vi.fn(),
    deleteAddress: vi.fn(),
  },
}));

describe('AddressesTab', () => {
  const mockAddresses = [
    {
      id: 'addr-1',
      recipientName: 'Nguyen Van A',
      phone: '0901234567',
      addressLine1: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'Quan 1',
      city: 'Ho Chi Minh',
      isDefault: true,
      type: 'HOME',
    },
    {
      id: 'addr-2',
      recipientName: 'Nguyen Van B',
      phone: '0988776655',
      addressLine1: '456 Hai Ba Trung',
      city: 'Ho Chi Minh',
      isDefault: false,
      type: 'OFFICE',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders address list with default badges', async () => {
    vi.mocked(addressService.getAddresses).mockResolvedValue(mockAddresses as any);

    render(<AddressesTab />);

    expect(await screen.findByText('Nguyen Van A')).toBeDefined();
    expect(screen.getByText(/0901234567/)).toBeDefined();
    expect(screen.getByText('Mặc định')).toBeDefined();
    expect(screen.getByText('Nguyen Van B')).toBeDefined();
  });

  it('calls setDefaultAddress when clicking "Đặt làm mặc định"', async () => {
    vi.mocked(addressService.getAddresses).mockResolvedValue(mockAddresses as any);
    vi.mocked(addressService.setDefaultAddress).mockResolvedValue({} as any);

    render(<AddressesTab />);

    const setDefaultBtn = await screen.findByRole('button', { name: /Đặt làm mặc định/i });
    fireEvent.click(setDefaultBtn);

    await waitFor(() => {
      expect(addressService.setDefaultAddress).toHaveBeenCalledWith('addr-2');
    });
  });
});
```

- [ ] **Step 4: Implement AddressesTab**

```typescript
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Star, Trash2, Home, Building2, Loader2, AlertCircle } from 'lucide-react';
import { addressService } from '../../../../services/addressService';
import { AddressCreateModal } from './AddressCreateModal';
import type { Address } from '../../../../types';

export interface AddressesTabProps {
  onAddressesLoaded?: (count: number) => void;
}

export const AddressesTab: React.FC<AddressesTabProps> = ({ onAddressesLoaded }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      onAddressesLoaded?.(data.length);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách địa chỉ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSetDefault = async (id: string) => {
    setActionLoadingId(id);
    try {
      await addressService.setDefaultAddress(id);
      await fetchAddresses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể đặt địa chỉ mặc định.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    setActionLoadingId(id);
    try {
      await addressService.deleteAddress(id);
      await fetchAddresses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể xóa địa chỉ.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span>Sổ địa chỉ nhận hàng</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quản lý danh sách địa chỉ nhận hàng giúp đặt hàng nhanh chóng và thuận tiện
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Đang tải sổ địa chỉ...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs sm:text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={fetchAddresses}
            className="text-xs font-bold text-rose-700 underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : addresses.length === 0 ? (
        <div className="py-16 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
            📍
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có địa chỉ giao hàng nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Thêm địa chỉ nhận hàng đầu tiên để tiết kiệm thời gian khi thanh toán các đơn hàng sắp tới.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm địa chỉ nhận hàng</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {addresses.map((addr) => {
            const isProcessing = actionLoadingId === addr.id;
            const fullAddress = [addr.addressLine1, addr.ward, addr.district, addr.city]
              .filter(Boolean)
              .join(', ');

            return (
              <div
                key={addr.id}
                className={`p-5 rounded-3xl border transition ${
                  addr.isDefault
                    ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {addr.recipientName}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600 font-mono text-xs sm:text-sm font-semibold">
                        {addr.phone}
                      </span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                          <Star className="w-3 h-3 fill-current" />
                          <span>Mặc định</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {addr.type === 'OFFICE' ? (
                          <>
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>Văn phòng</span>
                          </>
                        ) : (
                          <>
                            <Home className="w-3 h-3 text-slate-500" />
                            <span>Nhà riêng</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {fullAddress}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSetDefault(addr.id)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        Đặt làm mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDelete(addr.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                      title="Xóa địa chỉ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AddressCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchAddresses()}
      />
    </div>
  );
};
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm --prefix frontend test src/pages/storefront/Profile/__tests__/Address`
Expected: PASS for both `AddressCreateModal.spec.tsx` and `AddressesTab.spec.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/storefront/Profile/components/AddressCreateModal.tsx frontend/src/pages/storefront/Profile/components/AddressesTab.tsx frontend/src/pages/storefront/Profile/__tests__/AddressCreateModal.spec.tsx frontend/src/pages/storefront/Profile/__tests__/AddressesTab.spec.tsx
git commit -m "feat(profile): add address book management components and tests"
```

---

### Task 3: Create OrdersTab with Horizontal Filter Tabs & Empty State CTA

**Files:**
- Create: `frontend/src/pages/storefront/Profile/components/OrdersTab.tsx`
- Test: `frontend/src/pages/storefront/Profile/__tests__/OrdersTab.spec.tsx`

- [ ] **Step 1: Write test for OrdersTab**

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrdersTab } from '../components/OrdersTab';
import type { Order } from '../../../../types';

describe('OrdersTab', () => {
  const mockOrders: Order[] = [
    {
      id: 'order-1',
      orderNumber: 'ORD-001',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      finalAmount: 10000000,
      createdAt: '2026-10-01T10:00:00Z',
      items: [
        {
          id: 'item-1',
          productId: 'p-1',
          productName: 'iPhone 15 Pro',
          quantity: 1,
          price: 10000000,
        },
      ],
    } as any,
    {
      id: 'order-2',
      orderNumber: 'ORD-002',
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      finalAmount: 20000000,
      createdAt: '2026-10-02T10:00:00Z',
      items: [],
    } as any,
  ];

  const defaultProps = {
    orders: mockOrders,
    loading: false,
    onCancelOrder: vi.fn(),
  };

  it('renders all filter tabs with correct order counts', () => {
    render(
      <MemoryRouter>
        <OrdersTab {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Tất cả (2)')).toBeDefined();
    expect(screen.getByText('Chờ xác nhận (1)')).toBeDefined();
    expect(screen.getByText('Đã giao (1)')).toBeDefined();
  });

  it('filters orders when clicking status tab', () => {
    render(
      <MemoryRouter>
        <OrdersTab {...defaultProps} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Chờ xác nhận (1)'));
    expect(screen.getByText('#ORD-001')).toBeDefined();
    expect(screen.queryByText('#ORD-002')).toBeNull();
  });

  it('displays empty state with CTA button when no orders match filter', () => {
    render(
      <MemoryRouter>
        <OrdersTab {...defaultProps} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Đang giao (0)'));
    expect(screen.getByText('Không tìm thấy đơn hàng nào')).toBeDefined();
    expect(screen.getByRole('link', { name: /Tiếp tục mua sắm/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement OrdersTab component**

```typescript
import React, { useState } from 'react';
import { Package, Clock, ShieldCheck, ChevronRight, Ban, PackageOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Order } from '../../../../types';

export type OrderStatusFilter = 'ALL' | 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  onCancelOrder: (order: Order) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ orders, loading, onCancelOrder }) => {
  const [selectedFilter, setSelectedFilter] = useState<OrderStatusFilter>('ALL');

  const filterCounts = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === 'PENDING').length,
    SHIPPING: orders.filter((o) =>
      ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERING'].includes(o.status)
    ).length,
    DELIVERED: orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length,
    CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
  };

  const filteredOrders = orders.filter((order) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'PENDING') return order.status === 'PENDING';
    if (selectedFilter === 'SHIPPING') {
      return ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERING'].includes(order.status);
    }
    if (selectedFilter === 'DELIVERED') {
      return ['DELIVERED', 'COMPLETED'].includes(order.status);
    }
    if (selectedFilter === 'CANCELLED') return order.status === 'CANCELLED';
    return true;
  });

  const filterTabs: Array<{ key: OrderStatusFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'Tất cả', count: filterCounts.ALL },
    { key: 'PENDING', label: 'Chờ xác nhận', count: filterCounts.PENDING },
    { key: 'SHIPPING', label: 'Đang giao', count: filterCounts.SHIPPING },
    { key: 'DELIVERED', label: 'Đã giao', count: filterCounts.DELIVERED },
    { key: 'CANCELLED', label: 'Đã hủy', count: filterCounts.CANCELLED },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Đơn hàng của tôi</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Theo dõi tiến trình vận chuyển và lịch sử mua sắm của bạn
          </p>
        </div>
        <Link
          to="/warranty-lookup"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer self-start sm:self-auto"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tra cứu bảo hành IMEI</span>
        </Link>
      </div>

      {/* Horizontal Status Filter Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedFilter(tab.key)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List / Empty State */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <Clock className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs font-medium">Đang tải danh sách đơn hàng...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shadow-xs">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Không tìm thấy đơn hàng nào</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {selectedFilter === 'ALL'
              ? 'Bạn chưa có đơn đặt hàng nào trong tài khoản. Hãy khám phá ngay các sản phẩm mới nhất!'
              : `Không có đơn hàng nào ở trạng thái này.`}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition"
            >
              <span>Tiếp tục mua sắm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const orderNum = order.orderNumber || order.id.slice(0, 8);
            const total = order.finalAmount || order.totalAmount || 0;

            return (
              <div
                key={order.id}
                className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="font-bold text-slate-900">#{orderNum}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">
                      {order.items?.length || 0} sản phẩm
                    </p>
                    <p className="text-base font-black text-blue-600">
                      {total.toLocaleString('vi-VN')} ₫
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onCancelOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Hủy đơn</span>
                      </button>
                    )}
                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                    >
                      <span>Xem chi tiết</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Run test and verify it passes**

Run: `npm --prefix frontend test src/pages/storefront/Profile/__tests__/OrdersTab.spec.tsx`
Expected: PASS with 3 passed tests.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/storefront/Profile/components/OrdersTab.tsx frontend/src/pages/storefront/Profile/__tests__/OrdersTab.spec.tsx
git commit -m "feat(profile): create OrdersTab with horizontal status filters and empty state CTA"
```

---

### Task 4: Refactor ChangePasswordCard to Vertical Stacked Layout

**Files:**
- Modify: `frontend/src/pages/storefront/Profile/components/ChangePasswordCard.tsx`
- Test: `frontend/src/pages/storefront/Profile/__tests__/ChangePasswordCard.spec.tsx`

- [ ] **Step 1: Write test for ChangePasswordCard**

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangePasswordCard } from '../components/ChangePasswordCard';
import { authService } from '../../../../services/authService';

vi.mock('../../../../services/authService', () => ({
  authService: {
    changePassword: vi.fn(),
  },
}));

describe('ChangePasswordCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stacked password form with max-w-lg constraint', () => {
    const { container } = render(<ChangePasswordCard />);
    expect(screen.getByText('Bảo mật & Đổi mật khẩu')).toBeDefined();
    expect(screen.getByLabelText(/Mật khẩu hiện tại/i)).toBeDefined();
    expect(screen.getByLabelText(/^Mật khẩu mới/i)).toBeDefined();
    expect(screen.getByLabelText(/Xác nhận mật khẩu mới/i)).toBeDefined();
    expect(container.querySelector('.max-w-lg')).not.toBeNull();
  });

  it('validates password mismatch before calling API', async () => {
    render(<ChangePasswordCard />);
    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), {
      target: { value: 'OldPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/i), {
      target: { value: 'NewPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/i), {
      target: { value: 'Different123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi mật khẩu/i }));

    expect(await screen.findByText(/không khớp/i)).toBeDefined();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('calls authService.changePassword on valid submission', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue({ success: true } as any);

    render(<ChangePasswordCard />);
    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/i), {
      target: { value: 'OldPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/i), {
      target: { value: 'NewPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/i), {
      target: { value: 'NewPassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi mật khẩu/i }));

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith({
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
      });
      expect(screen.getByText(/thành công/i)).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Update ChangePasswordCard component with stacked layout**

```typescript
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../../../../services/authService';

export const ChangePasswordCard: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!oldPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({ oldPassword, newPassword });
      setSuccessMsg('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại!';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="password-section" className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" />
          <span>Bảo mật & Đổi mật khẩu</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Để bảo vệ tài khoản, vui lòng không chia sẻ mật khẩu của bạn cho người khác
        </p>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="card-oldPassword" className="block text-xs font-semibold text-slate-700">
              Mật khẩu hiện tại *
            </label>
            <div className="relative">
              <input
                id="card-oldPassword"
                type={showOld ? 'text' : 'password'}
                disabled={loading}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-newPassword" className="block text-xs font-semibold text-slate-700">
              Mật khẩu mới *
            </label>
            <div className="relative">
              <input
                id="card-newPassword"
                type={showNew ? 'text' : 'password'}
                disabled={loading}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-confirmPassword" className="block text-xs font-semibold text-slate-700">
              Xác nhận mật khẩu mới *
            </label>
            <div className="relative">
              <input
                id="card-confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu thay đổi mật khẩu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run test and verify it passes**

Run: `npm --prefix frontend test src/pages/storefront/Profile/__tests__/ChangePasswordCard.spec.tsx`
Expected: PASS with 3 passed tests.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/storefront/Profile/components/ChangePasswordCard.tsx frontend/src/pages/storefront/Profile/__tests__/ChangePasswordCard.spec.tsx
git commit -m "refactor(profile): convert ChangePasswordCard to stacked max-w-lg layout with tests"
```

---

### Task 5: Orchestrate ProfilePage with 12-Column Dashboard Grid & URL Query Sync

**Files:**
- Modify: `frontend/src/pages/storefront/Profile/ProfilePage.tsx`
- Test: `frontend/src/pages/storefront/Profile/__tests__/ProfilePage.spec.tsx`

- [ ] **Step 1: Write comprehensive test for ProfilePage dashboard orchestration**

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProfilePage } from '../ProfilePage';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { orderService } from '../../../../services/orderService';
import { returnService } from '../../../../services/returnService';
import { addressService } from '../../../../services/addressService';

vi.mock('../../../../stores/useAuthStore');
vi.mock('../../../../services/orderService', () => ({
  orderService: { getMyOrders: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../../services/returnService', () => ({
  returnService: { getMyReturns: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../../services/addressService', () => ({
  addressService: { getAddresses: vi.fn().mockResolvedValue([]) },
}));

describe('ProfilePage - Dashboard Layout & Tab Routing', () => {
  const mockUser = {
    id: 'user-1',
    fullName: 'Customer Nguyen',
    email: 'customer@gmail.com',
    phone: '0901234567',
    role: 'USER',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      updateUser: vi.fn(),
      fetchProfile: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('renders 2-column layout with sidebar and defaults to profile tab', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Thành viên thân thiết')).toBeDefined();
    expect(screen.getByText('Thông tin cá nhân')).toBeDefined();
    expect(screen.getByText('0901234567')).toBeDefined();
  });

  it('switches to orders tab when query param ?tab=orders is set', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/profile?tab=orders']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Đơn hàng của tôi')).toBeDefined();
    expect(screen.getByText('Tất cả (0)')).toBeDefined();
  });

  it('switches to addresses tab when clicking Sổ địa chỉ in sidebar', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const addrTabBtn = screen.getByText('Sổ địa chỉ');
    await act(async () => {
      fireEvent.click(addrTabBtn);
    });

    expect(screen.getByText('Sổ địa chỉ nhận hàng')).toBeDefined();
  });
});
```

- [ ] **Step 2: Update ProfilePage to integrate 2-column layout, sidebar, and tab rendering**

Refactor `frontend/src/pages/storefront/Profile/ProfilePage.tsx` to:
1. Parse `searchParams.get('tab')`, checking legacy `#orders`, `/orders`, and `#password`.
2. Sync tab switches with `setSearchParams({ tab: newTab })`.
3. Render `ProfileSidebar` in `md:col-span-3`.
4. Render selected tab in `md:col-span-9` inside a unified card wrapper (`bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs`).
5. Wire logout confirmation and order cancellation modal.

- [ ] **Step 3: Run all profile unit tests to verify they pass**

Run: `npm --prefix frontend test src/pages/storefront/Profile/__tests__`
Expected: PASS with 100% passing tests across all components.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/storefront/Profile/ProfilePage.tsx frontend/src/pages/storefront/Profile/__tests__/ProfilePage.spec.tsx
git commit -m "feat(profile): refactor ProfilePage to 2-column e-commerce dashboard with URL sync"
```

---

### Task 6: End-to-End Verification & Merge to Branch `Nguyen`

**Files:**
- Repository branches: feature worktree & `Nguyen` branch at `C:/Users/Nguyen Nguyen/OneDrive/Desktop/CNPM/MobileCommerce`

- [ ] **Step 1: Run full frontend test suite for Profile and Navbar**

Run: `npm --prefix frontend test src/pages/storefront/Profile/__tests__ src/components/common/__tests__/Navbar.spec.tsx`
Expected: All tests PASS.

- [ ] **Step 2: Run frontend production build**

Run: `npm --prefix frontend run build`
Expected: Exit code 0, 0 TypeScript errors.

- [ ] **Step 3: Run backend unit tests and build**

Run: `npm --prefix backend test test/unit/users-profile.spec.ts`
Run: `npm --prefix backend run build`
Expected: All tests pass, build exit code 0.

- [ ] **Step 4: Merge changes into branch `Nguyen`**

Run in `C:/Users/Nguyen Nguyen/OneDrive/Desktop/CNPM/MobileCommerce`:
```bash
git merge <feature-commit> -m "feat(profile): refactor account dashboard to e-commerce standard with address book, order filters, and sidebar"
```

- [ ] **Step 5: Verify tests and build directly on branch `Nguyen`**

Run tests and build in the main workspace to guarantee absolute integrity.
