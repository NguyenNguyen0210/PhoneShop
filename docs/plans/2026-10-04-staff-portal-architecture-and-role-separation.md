# Staff Portal Architecture & Role Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the Staff operational portal (`/staff`) completely from the Admin portal (`/admin`), provide a dedicated High-Density Operations Hub dashboard for Staff, strip unauthorized administrative actions from staff views, and enforce strict RBAC routing.

**Architecture:** Create dedicated `StaffRoute` and `StaffLayout` with clean operational navigation; build `StaffDashboardPage` focused on actionable queues (orders, low stock, support tickets) with 0 report API calls; adjust `AdminRoute`, `LoginPage`, `OAuthCallbackPage`, and `AppRoutes`; audit and filter out unauthorized action buttons across staff pages (Customers, Inventory/IMEI, Reviews, Returns).

**Tech Stack:** React 19, TypeScript, React Router 7, Ant Design 5 (antd), Zustand, Vitest, Testing Library.

---

## File Structure Map

```
frontend/src/
├── routes/
│   ├── StaffRoute.tsx                           (New: route guard for STAFF, MANAGER, ADMIN)
│   ├── AdminRoute.tsx                           (Modify: restrict to ADMIN and MANAGER, redirect STAFF to /staff)
│   ├── AppRoutes.tsx                            (Modify: mount /staff/* routes under StaffLayout)
│   └── __tests__/
│       ├── StaffRoute.spec.tsx                  (New: test StaffRoute access & redirects)
│       └── AppRoutesRedirect.spec.tsx           (Modify: verify /staff and /admin separation)
├── layouts/
│   ├── StaffLayout.tsx                          (New: Indigo/Slate High-Density Operations Hub layout)
│   └── __tests__/
│       └── StaffLayout.spec.tsx                 (New: test navigation & header elements)
├── pages/
│   ├── storefront/Auth/
│   │   ├── LoginPage.tsx                        (Modify: redirect STAFF to /staff, ADMIN to /admin)
│   │   └── OAuthCallbackPage.tsx                (Modify: redirect STAFF to /staff, ADMIN to /admin)
│   ├── Staff/
│   │   ├── Dashboard/
│   │   │   ├── StaffDashboardPage.tsx           (New: Operations Hub with 5 action counters & queue)
│   │   │   ├── components/
│   │   │   │   ├── StaffActionCards.tsx         (New: 5 action counter cards)
│   │   │   │   ├── StaffOrdersQueue.tsx         (New: quick-action pending orders list)
│   │   │   │   └── StaffAlertsSidebar.tsx       (New: low-stock warnings & recent tickets)
│   │   │   └── __tests__/
│   │   │       └── StaffDashboardPage.spec.tsx  (New: test zero 403 calls & rendering)
│   │   ├── Customers/
│   │   │   ├── StaffCustomersPage.tsx           (New: read-only customer directory, no create/edit/delete/password modals)
│   │   │   └── StaffCustomer360Page.tsx         (New: read-only customer 360 profile for staff)
│   │   └── Inventory/
│   │       └── StaffInventoryPage.tsx           (New: inventory & IMEI page with delete IMEI suppressed)
```

---

### Task 1: Create `StaffRoute` and Update `AdminRoute`

**Files:**
- Create: `frontend/src/routes/StaffRoute.tsx`
- Modify: `frontend/src/routes/AdminRoute.tsx`
- Test: `frontend/src/routes/__tests__/StaffRoute.spec.tsx`

- [ ] **Step 1: Write unit tests for `StaffRoute` and `AdminRoute`**

Create `frontend/src/routes/__tests__/StaffRoute.spec.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StaffRoute } from '../StaffRoute';
import { AdminRoute } from '../AdminRoute';
import { useAuthStore } from '../../stores/useAuthStore';

vi.mock('../../stores/useAuthStore');

describe('StaffRoute & AdminRoute Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('StaffRoute redirects unauthenticated user to /login', () => {
    (useAuthStore as any).mockReturnValue({
      user: null,
      accessToken: null,
      isStaffOrAdmin: () => false,
    });

    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<StaffRoute />}>
            <Route path="/staff" element={<div>Staff Protected Area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('StaffRoute allows STAFF user into /staff', () => {
    (useAuthStore as any).mockReturnValue({
      user: { id: 'u1', role: 'STAFF', fullName: 'Staff Member' },
      accessToken: 'token-123',
      isStaffOrAdmin: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<StaffRoute />}>
            <Route path="/staff" element={<div>Staff Protected Area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Staff Protected Area')).toBeInTheDocument();
  });

  it('StaffRoute redirects regular USER to /', () => {
    (useAuthStore as any).mockReturnValue({
      user: { id: 'u2', role: 'USER', fullName: 'Regular Customer' },
      accessToken: 'token-456',
      isStaffOrAdmin: () => false,
    });

    render(
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route element={<StaffRoute />}>
            <Route path="/staff" element={<div>Staff Protected Area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('AdminRoute redirects STAFF user to /staff', () => {
    (useAuthStore as any).mockReturnValue({
      user: { id: 'u1', role: 'STAFF', fullName: 'Staff Member' },
      accessToken: 'token-123',
      isAdmin: () => false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/staff" element={<div>Redirected to Staff</div>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<div>Admin Protected Area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Redirected to Staff')).toBeInTheDocument();
  });

  it('AdminRoute allows ADMIN user into /admin', () => {
    (useAuthStore as any).mockReturnValue({
      user: { id: 'u3', role: 'ADMIN', fullName: 'Super Admin' },
      accessToken: 'token-789',
      isAdmin: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<div>Admin Protected Area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Protected Area')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- src/routes/__tests__/StaffRoute.spec.tsx`
Expected: FAIL (Cannot find module '../StaffRoute')

- [ ] **Step 3: Create `StaffRoute.tsx`**

Create `frontend/src/routes/StaffRoute.tsx`:
```tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const StaffRoute: React.FC = () => {
  const { user, accessToken, isStaffOrAdmin } = useAuthStore();
  const location = useLocation();

  if (!user && !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isStaffOrAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
```

- [ ] **Step 4: Update `AdminRoute.tsx` to redirect STAFF to `/staff`**

Edit `frontend/src/routes/AdminRoute.tsx`:
```tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const AdminRoute: React.FC = () => {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();

  if (!user && !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role;
  const roles = (user as any)?.roles || [];
  const isAdminOrManager =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    roles.includes('ADMIN') ||
    roles.includes('MANAGER');

  if (role === 'STAFF' && !isAdminOrManager) {
    return <Navigate to="/staff" replace />;
  }

  if (!isAdminOrManager) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm --prefix frontend test -- src/routes/__tests__/StaffRoute.spec.tsx`
Expected: PASS (5/5 tests pass)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/StaffRoute.tsx frontend/src/routes/AdminRoute.tsx frontend/src/routes/__tests__/StaffRoute.spec.tsx
git commit -m "feat(auth): create StaffRoute guard and redirect staff from admin to staff portal"
```

---

### Task 2: Update Login & OAuth Redirection Logic

**Files:**
- Modify: `frontend/src/pages/storefront/Auth/LoginPage.tsx:63-66`
- Modify: `frontend/src/pages/storefront/Auth/OAuthCallbackPage.tsx:55-58`
- Test: `frontend/src/routes/__tests__/AppRoutesRedirect.spec.tsx`

- [ ] **Step 1: Check existing `LoginPage.tsx` redirect logic**

Lines 63-66 currently do:
```tsx
if (user.role === 'ADMIN' || user.role === 'STAFF' || user.role === 'MANAGER') {
  navigate('/admin');
}
```

- [ ] **Step 2: Update `LoginPage.tsx`**

Edit `frontend/src/pages/storefront/Auth/LoginPage.tsx`:
```tsx
if (user.role === 'STAFF') {
  navigate('/staff');
} else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
  navigate('/admin');
} else {
  navigate(from);
}
```

- [ ] **Step 3: Update `OAuthCallbackPage.tsx`**

Edit `frontend/src/pages/storefront/Auth/OAuthCallbackPage.tsx`:
```tsx
if (user.role === 'STAFF') {
  navigate('/staff');
} else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
  navigate('/admin');
} else {
  navigate('/');
}
```

- [ ] **Step 4: Update `AppRoutesRedirect.spec.tsx` to verify redirection**

Run: `npm --prefix frontend test -- src/routes/__tests__/AppRoutesRedirect.spec.tsx`
Verify tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/storefront/Auth/LoginPage.tsx frontend/src/pages/storefront/Auth/OAuthCallbackPage.tsx
git commit -m "feat(auth): route staff to /staff and admin/manager to /admin on login"
```

---

### Task 3: Build `StaffLayout` (High-Density Operations Hub Layout)

**Files:**
- Create: `frontend/src/layouts/StaffLayout.tsx`
- Test: `frontend/src/layouts/__tests__/StaffLayout.spec.tsx`

- [ ] **Step 1: Write test for `StaffLayout`**

Create `frontend/src/layouts/__tests__/StaffLayout.spec.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { StaffLayout } from '../StaffLayout';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { id: 's1', fullName: 'Tran Van Staff', role: 'STAFF' },
    logout: vi.fn(),
  }),
}));

describe('StaffLayout Component', () => {
  it('renders Staff Workspace branding and operational navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <StaffLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('STAFF WORKSPACE')).toBeInTheDocument();
    expect(screen.getByText('Bàn làm việc (Dashboard)')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng & Giao vận')).toBeInTheDocument();
    expect(screen.getByText('Kho hàng & Quản lý IMEI')).toBeInTheDocument();
    expect(screen.getByText('Vé hỗ trợ CSKH')).toBeInTheDocument();
    expect(screen.getByText('Xử lý Đổi trả')).toBeInTheDocument();
    expect(screen.getByText('Thẩm định Trả góp')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá & Phản hồi')).toBeInTheDocument();
    expect(screen.getByText('Tra cứu Khách hàng')).toBeInTheDocument();
  });

  it('does NOT contain forbidden Admin links (Settings, Audit Logs, Promotions, Suppliers)', () => {
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <StaffLayout />
      </MemoryRouter>
    );

    expect(screen.queryByText('Cấu hình Hệ thống')).toBeNull();
    expect(screen.queryByText('Quản lý Người dùng')).toBeNull();
    expect(screen.queryByText('Nhật ký Hoạt động (Audit Logs)')).toBeNull();
    expect(screen.queryByText('Khuyến mãi & Flash Sale')).toBeNull();
    expect(screen.queryByText('Nhà cung cấp')).toBeNull();
    expect(screen.queryByText('Quản lý Danh mục')).toBeNull();
    expect(screen.queryByText('Quản lý Thương hiệu')).toBeNull();
  });

  it('renders global quick search input and navigates on Enter', () => {
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <StaffLayout />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Tìm nhanh Mã đơn, IMEI, SĐT khách/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'ORD-12345' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/staff/orders?search=ORD-12345');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- src/layouts/__tests__/StaffLayout.spec.tsx`
Expected: FAIL (Cannot find module '../StaffLayout')

- [ ] **Step 3: Implement `StaffLayout.tsx`**

Create `frontend/src/layouts/StaffLayout.tsx`:
```tsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Tag, Breadcrumb, ConfigProvider, Input } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  OrderedListOutlined,
  BarcodeOutlined,
  CustomerServiceOutlined,
  UndoOutlined,
  CreditCardOutlined,
  CommentOutlined,
  UserOutlined,
  LogoutOutlined,
  ShopOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/useAuthStore';

const { Header, Sider, Content } = Layout;

export const StaffLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleQuickSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickSearch.trim()) {
      const q = quickSearch.trim();
      // If it looks like an IMEI or number (15 digits), go to inventory
      if (/^\d{14,16}$/.test(q)) {
        navigate(`/staff/inventory?search=${encodeURIComponent(q)}&tab=imei`);
      } else if (q.toUpperCase().startsWith('ORD-') || q.toUpperCase().startsWith('DH')) {
        navigate(`/staff/orders?search=${encodeURIComponent(q)}`);
      } else {
        // Default to order search
        navigate(`/staff/orders?search=${encodeURIComponent(q)}`);
      }
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/staff',
      icon: <DashboardOutlined style={{ fontSize: 16 }} />,
      label: 'Bàn làm việc (Dashboard)',
    },
    {
      key: '/staff/orders',
      icon: <OrderedListOutlined style={{ fontSize: 16 }} />,
      label: 'Đơn hàng & Giao vận',
    },
    {
      key: '/staff/inventory',
      icon: <BarcodeOutlined style={{ fontSize: 16 }} />,
      label: 'Kho hàng & Quản lý IMEI',
    },
    {
      key: '/staff/tickets',
      icon: <CustomerServiceOutlined style={{ fontSize: 16 }} />,
      label: 'Vé hỗ trợ CSKH',
    },
    {
      key: '/staff/returns',
      icon: <UndoOutlined style={{ fontSize: 16 }} />,
      label: 'Xử lý Đổi trả',
    },
    {
      key: '/staff/installments',
      icon: <CreditCardOutlined style={{ fontSize: 16 }} />,
      label: 'Thẩm định Trả góp',
    },
    {
      key: '/staff/reviews',
      icon: <CommentOutlined style={{ fontSize: 16 }} />,
      label: 'Đánh giá & Phản hồi',
    },
    {
      key: '/staff/customers',
      icon: <UserOutlined style={{ fontSize: 16 }} />,
      label: 'Tra cứu Khách hàng',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'storefront',
      icon: <ShopOutlined />,
      label: <Link to="/">Về trang Storefront</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  const getBreadcrumbTitle = () => {
    if (location.pathname.startsWith('/staff/orders')) return 'Đơn hàng & Giao vận';
    if (location.pathname.startsWith('/staff/inventory')) return 'Kho hàng & Quản lý IMEI';
    if (location.pathname.startsWith('/staff/tickets')) return 'Hỗ trợ khách hàng (CSKH)';
    if (location.pathname.startsWith('/staff/returns')) return 'Xử lý Đổi trả & Hoàn hàng';
    if (location.pathname.startsWith('/staff/installments')) return 'Thẩm định Hồ sơ Trả góp';
    if (location.pathname.startsWith('/staff/reviews')) return 'Đánh giá & Phản hồi Khách hàng';
    if (location.pathname.startsWith('/staff/customers')) return 'Tra cứu Hồ sơ Khách hàng 360°';
    return 'Bàn làm việc Vận hành';
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorPrimary: '#4f46e5',
          colorBorder: '#e2e8f0',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          borderRadius: 10,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        },
        components: {
          Menu: {
            itemBg: '#ffffff',
            itemSelectedBg: '#eef2ff',
            itemSelectedColor: '#4f46e5',
            itemColor: '#475569',
            itemHoverBg: '#f8fafc',
            itemHoverColor: '#0f172a',
            itemBorderRadius: 8,
            itemMarginInline: 8,
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Sider */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={250}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 100,
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
          }}
        >
          {/* Brand Header with Indigo Staff Badge */}
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              padding: '0 18px',
              gap: 10,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            {collapsed ? (
              <img
                src="/logo-icon.png"
                alt="PhoneShop"
                style={{ width: 32, height: 32, objectFit: 'contain' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <img
                  src="/logo-horizontal.png"
                  alt="PhoneShop"
                  style={{ height: 28, width: 'auto', objectFit: 'contain' }}
                />
                <span
                  style={{
                    color: '#4338ca',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    background: '#eef2ff',
                    padding: '3px 6px',
                    borderRadius: 4,
                    border: '1px solid #c7d2fe',
                    whiteSpace: 'nowrap',
                  }}
                >
                  STAFF WORKSPACE
                </span>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <div style={{ padding: '12px 0' }}>
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{ background: '#ffffff', borderRight: 'none' }}
            />
          </div>

          {/* Sider Footer */}
          {!collapsed && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 12,
                right: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>
                  Ca trực Vận hành
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                Đồng bộ đơn hàng: Thời gian thực
              </div>
            </div>
          )}
        </Sider>

        {/* Main Layout Area */}
        <Layout style={{ background: '#f8fafc' }}>
          <Header
            style={{
              padding: '0 24px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              position: 'sticky',
              top: 0,
              zIndex: 90,
              height: 64,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: 16,
                  width: 36,
                  height: 36,
                  color: '#475569',
                  borderRadius: 8,
                }}
              />
              <Breadcrumb
                items={[
                  {
                    title: (
                      <Link to="/staff" style={{ color: '#64748b' }}>
                        Staff
                      </Link>
                    ),
                  },
                  {
                    title: (
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                        {getBreadcrumbTitle()}
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {/* Header Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Quick Search Input */}
              <div style={{ width: 260 }} className="hidden md:block">
                <Input
                  size="small"
                  placeholder="Tìm nhanh Mã đơn, IMEI, SĐT khách..."
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  onKeyDown={handleQuickSearch}
                  style={{ borderRadius: 6, fontSize: 12, padding: '4px 8px' }}
                />
              </div>

              {/* Status Pill */}
              <div
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 16,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  fontSize: 11,
                  color: '#15803d',
                  fontWeight: 600,
                }}
                className="lg:flex"
              >
                <CheckCircleOutlined style={{ fontSize: 12, color: '#16a34a' }} />
                <span>Trực tuyến 100%</span>
              </div>

              <Link to="/">
                <Button
                  icon={<ShopOutlined />}
                  size="small"
                  style={{
                    background: '#f8fafc',
                    borderColor: '#e2e8f0',
                    color: '#475569',
                    fontSize: 12,
                    borderRadius: 6,
                  }}
                >
                  Storefront
                </Button>
              </Link>

              <Tag
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: 10,
                  background: '#eef2ff',
                  borderColor: '#c7d2fe',
                  color: '#4338ca',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                NHÂN VIÊN VẬN HÀNH
              </Tag>

              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 8,
                  }}
                >
                  <Avatar
                    src={user?.avatar || (user as any)?.avatarUrl}
                    style={{
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      fontWeight: 'bold',
                    }}
                    icon={!(user?.avatar || (user as any)?.avatarUrl) && <UserOutlined />}
                  >
                    {!(user?.avatar || (user as any)?.avatarUrl) && (user?.fullName?.charAt(0) || 'S')}
                  </Avatar>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    {user?.fullName || 'Nhân viên'}
                  </span>
                </div>
              </Dropdown>
            </div>
          </Header>

          <Content style={{ margin: '20px 24px', minHeight: 280, background: 'transparent' }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- src/layouts/__tests__/StaffLayout.spec.tsx`
Expected: PASS (3/3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts/StaffLayout.tsx frontend/src/layouts/__tests__/StaffLayout.spec.tsx
git commit -m "feat(staff): create dedicated StaffLayout with High-Density Operations Hub styling"
```

---

### Task 4: Build Staff Operations Dashboard (`StaffDashboardPage`)

**Files:**
- Create: `frontend/src/pages/Staff/Dashboard/components/StaffActionCards.tsx`
- Create: `frontend/src/pages/Staff/Dashboard/components/StaffOrdersQueue.tsx`
- Create: `frontend/src/pages/Staff/Dashboard/components/StaffAlertsSidebar.tsx`
- Create: `frontend/src/pages/Staff/Dashboard/StaffDashboardPage.tsx`
- Test: `frontend/src/pages/Staff/Dashboard/__tests__/StaffDashboardPage.spec.tsx`

- [ ] **Step 1: Write test verifying zero calls to `reportService` & actionable counter rendering**

Create `frontend/src/pages/Staff/Dashboard/__tests__/StaffDashboardPage.spec.tsx`:
```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StaffDashboardPage } from '../StaffDashboardPage';
import { orderService } from '../../../../services/orderService';
import { ticketService } from '../../../../services/ticketService';
import { inventoryService } from '../../../../services/inventoryService';
import { returnService } from '../../../../services/returnService';
import { installmentService } from '../../../../services/installmentService';
import { reportService } from '../../../../services/reportService';

vi.mock('../../../../services/orderService');
vi.mock('../../../../services/ticketService');
vi.mock('../../../../services/inventoryService');
vi.mock('../../../../services/returnService');
vi.mock('../../../../services/installmentService');
vi.mock('../../../../services/reportService');

describe('StaffDashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders operational action cards and queues WITHOUT calling reportService', async () => {
    (orderService.getAllOrdersAdmin as any).mockResolvedValue({
      items: [
        {
          id: 'ord-1',
          code: 'ORD-001',
          status: 'PENDING',
          totalAmount: 15000000,
          customerName: 'Nguyen Van A',
          phone: '0901234567',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'ord-2',
          code: 'ORD-002',
          status: 'CONFIRMED',
          totalAmount: 22000000,
          customerName: 'Tran Van B',
          phone: '0912345678',
          createdAt: new Date().toISOString(),
          items: [],
        },
      ],
      total: 2,
    });

    (ticketService.getAdminTickets as any).mockResolvedValue({
      items: [
        { id: 't-1', title: 'Máy sạc không vào pin', status: 'OPEN', priority: 'HIGH', user: { fullName: 'Le C' } },
      ],
      total: 1,
    });

    (returnService.getAdminReturns as any).mockResolvedValue({
      items: [{ id: 'ret-1', status: 'PENDING', reason: 'Lỗi loa' }],
      total: 1,
    });

    (installmentService.getInstallments as any).mockResolvedValue({
      items: [{ id: 'inst-1', status: 'SUBMITTED', customerName: 'Hoang D' }],
      total: 1,
    });

    (inventoryService.getStockLevels as any).mockResolvedValue({
      items: [
        { id: 'st-1', product: { name: 'iPhone 15 Pro Max' }, sku: 'IP15PM-256', currentStock: 2, reorderLevel: 5 },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <StaffDashboardPage />
      </MemoryRouter>
    );

    // Verify 0 calls to reportService (preventing 403 Forbidden!)
    expect(reportService.getDashboardSummary).not.toHaveBeenCalled();
    expect(reportService.getRevenueReport).not.toHaveBeenCalled();

    // Verify presence of Operational Counters
    await waitFor(() => {
      expect(screen.getByText('Bàn làm việc Vận hành')).toBeInTheDocument();
      expect(screen.getByText('Đơn chờ xác nhận')).toBeInTheDocument();
      expect(screen.getByText('Đơn cần đóng gói')).toBeInTheDocument();
      expect(screen.getByText('Ticket CSKH chờ phản hồi')).toBeInTheDocument();
      expect(screen.getByText('Đổi trả chờ xử lý')).toBeInTheDocument();
      expect(screen.getByText('Hồ sơ trả góp')).toBeInTheDocument();
    });

    // Verify Queue rendered
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- src/pages/Staff/Dashboard/__tests__/StaffDashboardPage.spec.tsx`
Expected: FAIL (Cannot find module '../StaffDashboardPage')

- [ ] **Step 3: Create `StaffActionCards.tsx`**

Create `frontend/src/pages/Staff/Dashboard/components/StaffActionCards.tsx`:
```tsx
import React from 'react';
import { Row, Col, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  InboxOutlined,
  CodeSandboxOutlined,
  CustomerServiceOutlined,
  UndoOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';

interface StaffActionCardsProps {
  pendingOrdersCount: number;
  packingOrdersCount: number;
  openTicketsCount: number;
  pendingReturnsCount: number;
  pendingInstallmentsCount: number;
}

export const StaffActionCards: React.FC<StaffActionCardsProps> = ({
  pendingOrdersCount,
  packingOrdersCount,
  openTicketsCount,
  pendingReturnsCount,
  pendingInstallmentsCount,
}) => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Đơn chờ xác nhận',
      count: pendingOrdersCount,
      icon: <InboxOutlined style={{ fontSize: 24, color: '#f59e0b' }} />,
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      countColor: '#d97706',
      link: '/staff/orders?status=PENDING',
    },
    {
      title: 'Đơn cần đóng gói',
      count: packingOrdersCount,
      icon: <CodeSandboxOutlined style={{ fontSize: 24, color: '#3b82f6' }} />,
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
      countColor: '#2563eb',
      link: '/staff/orders?status=CONFIRMED',
    },
    {
      title: 'Ticket CSKH chờ phản hồi',
      count: openTicketsCount,
      icon: <CustomerServiceOutlined style={{ fontSize: 24, color: '#ec4899' }} />,
      bgColor: '#fdf2f8',
      borderColor: '#fbcfe8',
      countColor: '#db2777',
      link: '/staff/tickets?status=OPEN',
    },
    {
      title: 'Đổi trả chờ xử lý',
      count: pendingReturnsCount,
      icon: <UndoOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />,
      bgColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      countColor: '#7c3aed',
      link: '/staff/returns?status=PENDING',
    },
    {
      title: 'Hồ sơ trả góp',
      count: pendingInstallmentsCount,
      icon: <CreditCardOutlined style={{ fontSize: 24, color: '#10b981' }} />,
      bgColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      countColor: '#059669',
      link: '/staff/installments?status=SUBMITTED',
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c, idx) => (
        <Col xs={12} sm={12} md={8} lg={4} key={idx} style={{ flex: '1 0 18%' }}>
          <Card
            hoverable
            onClick={() => navigate(c.link)}
            style={{
              borderRadius: 10,
              background: '#ffffff',
              border: `1px solid ${c.borderColor}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            bodyStyle={{ padding: '14px 16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{c.title}</span>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: c.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.icon}
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: c.countColor }}>{c.count}</span>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};
```

- [ ] **Step 4: Create `StaffOrdersQueue.tsx`**

Create `frontend/src/pages/Staff/Dashboard/components/StaffOrdersQueue.tsx`:
```tsx
import React from 'react';
import { Card, Table, Tag, Button, Typography, Space } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightOutlined, CheckCircleOutlined, CodeSandboxOutlined } from '@ant-design/icons';
import type { Order } from '../../../../types';

const { Text } = Typography;

interface StaffOrdersQueueProps {
  orders: Order[];
  loading: boolean;
  onConfirmOrder?: (orderId: string) => Promise<void>;
  onProcessOrder?: (orderId: string) => Promise<void>;
}

export const StaffOrdersQueue: React.FC<StaffOrdersQueueProps> = ({
  orders,
  loading,
  onConfirmOrder,
  onProcessOrder,
}) => {
  const navigate = useNavigate();

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Tag color="warning">Chờ xác nhận</Tag>;
      case 'CONFIRMED':
        return <Tag color="processing">Đã xác nhận</Tag>;
      case 'PROCESSING':
        return <Tag color="cyan">Đang xử lý</Tag>;
      case 'PACKED':
        return <Tag color="purple">Đã đóng gói</Tag>;
      case 'SHIPPING':
        return <Tag color="blue">Đang giao</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record: Order) => (
        <Link to={`/staff/orders?search=${encodeURIComponent(code || record.id)}`} style={{ fontWeight: 600 }}>
          {code || record.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {record.customerName || record.shippingAddress?.fullName || record.user?.fullName || 'Khách hàng'}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.phone || record.shippingAddress?.phone || 'Chưa có SĐT'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          {(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Thao tác nhanh',
      key: 'actions',
      render: (_: any, record: Order) => (
        <Space orientation="horizontal" size="small">
          {record.status === 'PENDING' && onConfirmOrder && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => onConfirmOrder(record.id)}
              style={{ background: '#d97706', borderColor: '#d97706', fontSize: 11 }}
            >
              Xác nhận
            </Button>
          )}
          {record.status === 'CONFIRMED' && onProcessOrder && (
            <Button
              type="primary"
              size="small"
              icon={<CodeSandboxOutlined />}
              onClick={() => onProcessOrder(record.id)}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontSize: 11 }}
            >
              Đóng gói
            </Button>
          )}
          <Button
            size="small"
            onClick={() => navigate(`/staff/orders?search=${encodeURIComponent(record.code || record.id)}`)}
            style={{ fontSize: 11 }}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
            Hàng đợi Đơn hàng Cần xử lý
          </span>
          <Link to="/staff/orders" style={{ fontSize: 12, fontWeight: 500, color: '#4f46e5' }}>
            Xem toàn bộ đơn <ArrowRightOutlined />
          </Link>
        </div>
      }
      style={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
      bodyStyle={{ padding: 0 }}
    >
      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Không có đơn hàng nào cần xử lý lúc này!' }}
      />
    </Card>
  );
};
```

- [ ] **Step 5: Create `StaffAlertsSidebar.tsx`**

Create `frontend/src/pages/Staff/Dashboard/components/StaffAlertsSidebar.tsx`:
```tsx
import React from 'react';
import { Card, List, Tag, Typography, Button } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { WarningOutlined, CustomerServiceOutlined, ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface StaffAlertsSidebarProps {
  lowStockItems: Array<{ id: string; name: string; currentStock: number; reorderLevel?: number }>;
  recentTickets: Array<{ id: string; title: string; priority: string; customerName: string }>;
  loading: boolean;
}

export const StaffAlertsSidebar: React.FC<StaffAlertsSidebarProps> = ({
  lowStockItems,
  recentTickets,
  loading,
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Low Stock Warning Card */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#b45309' }}>
              <WarningOutlined style={{ marginRight: 6, color: '#f59e0b' }} /> Cảnh báo sắp hết kho
            </span>
            <Link to="/staff/inventory" style={{ fontSize: 11, color: '#4f46e5' }}>
              Kiểm kho <ArrowRightOutlined />
            </Link>
          </div>
        }
        style={{ borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb' }}
        bodyStyle={{ padding: '10px 14px' }}
      >
        <List
          size="small"
          loading={loading}
          dataSource={lowStockItems.slice(0, 4)}
          locale={{ emptyText: 'Kho hàng an toàn, không có mặt hàng nào sắp hết.' }}
          renderItem={(item) => (
            <List.Item style={{ padding: '8px 0', borderBottom: '1px dashed #fef3c7' }}>
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1e293b' }} className="truncate max-w-[180px]">
                  {item.name}
                </span>
                <Tag color="error" style={{ margin: 0, fontWeight: 700, fontSize: 11 }}>
                  Còn {item.currentStock} máy
                </Tag>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* Support Tickets Card */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
              <CustomerServiceOutlined style={{ marginRight: 6, color: '#4f46e5' }} /> Ticket CSKH mới mở
            </span>
            <Link to="/staff/tickets?status=OPEN" style={{ fontSize: 11, color: '#4f46e5' }}>
              Toàn bộ ticket <ArrowRightOutlined />
            </Link>
          </div>
        }
        style={{ borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff' }}
        bodyStyle={{ padding: '10px 14px' }}
      >
        <List
          size="small"
          loading={loading}
          dataSource={recentTickets.slice(0, 4)}
          locale={{ emptyText: 'Không có ticket hỗ trợ nào đang chờ.' }}
          renderItem={(ticket) => (
            <List.Item
              style={{ padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
              onClick={() => navigate(`/staff/tickets/${ticket.id}`)}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text strong style={{ fontSize: 12, color: '#0f172a' }} className="truncate max-w-[180px]">
                    {ticket.title}
                  </Text>
                  <Tag color={ticket.priority === 'URGENT' ? 'error' : 'orange'} style={{ fontSize: 10, margin: 0 }}>
                    {ticket.priority}
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>
                  Khách hàng: {ticket.customerName}
                </Text>
              </div>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};
```

- [ ] **Step 6: Implement `StaffDashboardPage.tsx`**

Create `frontend/src/pages/Staff/Dashboard/StaffDashboardPage.tsx`:
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Row, Col, Space, Button, message, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { orderService } from '../../../services/orderService';
import { ticketService } from '../../../services/ticketService';
import { returnService } from '../../../services/returnService';
import { installmentService } from '../../../services/installmentService';
import { inventoryService } from '../../../services/inventoryService';
import type { Order } from '../../../types';
import { StaffActionCards } from './components/StaffActionCards';
import { StaffOrdersQueue } from './components/StaffOrdersQueue';
import { StaffAlertsSidebar } from './components/StaffAlertsSidebar';

const { Title, Text } = Typography;

export const StaffDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Counters
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [packingOrdersCount, setPackingOrdersCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [pendingReturnsCount, setPendingReturnsCount] = useState(0);
  const [pendingInstallmentsCount, setPendingInstallmentsCount] = useState(0);

  // Data lists
  const [ordersQueue, setOrdersQueue] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  const fetchOperationalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, ticketsRes, returnsRes, installmentsRes, stockRes] =
        await Promise.allSettled([
          orderService.getAllOrdersAdmin(),
          ticketService.getAdminTickets({ status: 'OPEN', limit: 10 }),
          returnService.getAdminReturns({ status: 'PENDING', limit: 10 }),
          installmentService.getInstallments({ status: 'SUBMITTED', limit: 10 }),
          inventoryService.getStockLevels({ limit: 50 }),
        ]);

      // Orders parsing
      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        const allOrders = ordersRes.value.items || [];
        const pending = allOrders.filter((o: Order) => o.status === 'PENDING').length;
        const packing = allOrders.filter((o: Order) => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length;
        setPendingOrdersCount(pending);
        setPackingOrdersCount(packing);
        // Show non-completed/non-cancelled orders first in queue
        const activeQueue = allOrders
          .filter((o: Order) => ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status))
          .slice(0, 10);
        setOrdersQueue(activeQueue);
      }

      // Tickets parsing
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
        const tickets = ticketsRes.value.items || [];
        setOpenTicketsCount(ticketsRes.value.total ?? tickets.length);
        setRecentTickets(
          tickets.map((t: any) => ({
            id: t.id,
            title: t.title || t.subject || 'Hỗ trợ kỹ thuật',
            priority: t.priority || 'NORMAL',
            customerName: t.user?.fullName || t.customerName || 'Khách hàng',
          }))
        );
      }

      // Returns parsing
      if (returnsRes.status === 'fulfilled' && returnsRes.value) {
        const rets = returnsRes.value.items || [];
        setPendingReturnsCount(returnsRes.value.total ?? rets.length);
      }

      // Installments parsing
      if (installmentsRes.status === 'fulfilled' && installmentsRes.value) {
        const insts = installmentsRes.value.items || [];
        setPendingInstallmentsCount(installmentsRes.value.total ?? insts.length);
      }

      // Inventory low stock parsing
      if (stockRes.status === 'fulfilled' && stockRes.value) {
        const items = stockRes.value.items || [];
        const low = items
          .filter((item: any) => (item.currentStock ?? 0) <= (item.reorderLevel || 5))
          .map((item: any) => ({
            id: item.id,
            name: item.product?.name || item.sku || 'Thiết bị',
            currentStock: item.currentStock ?? 0,
            reorderLevel: item.reorderLevel || 5,
          }));
        setLowStockItems(low);
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi tải dữ liệu ca trực');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperationalData();
  }, [fetchOperationalData]);

  const handleConfirmOrder = async (orderId: string) => {
    try {
      await orderService.confirmOrder(orderId);
      message.success('Đã xác nhận đơn hàng thành công!');
      fetchOperationalData();
    } catch {
      message.error('Không thể xác nhận đơn hàng lúc này');
    }
  };

  const handleProcessOrder = async (orderId: string) => {
    try {
      await orderService.processOrder(orderId);
      message.success('Đã chuyển đơn hàng sang trạng thái đóng gói!');
      fetchOperationalData();
    } catch {
      message.error('Không thể cập nhật trạng thái đơn hàng');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            Bàn làm việc Vận hành
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Điều phối đơn hàng, tồn kho và hỗ trợ khách hàng trong ca trực
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchOperationalData} loading={loading}>
          Làm mới
        </Button>
      </div>

      {error && (
        <Alert
          message="Thông báo ca trực"
          description={error}
          type="warning"
          showIcon
          closable
        />
      )}

      {/* 5 Actionable Counter Cards */}
      <StaffActionCards
        pendingOrdersCount={pendingOrdersCount}
        packingOrdersCount={packingOrdersCount}
        openTicketsCount={openTicketsCount}
        pendingReturnsCount={pendingReturnsCount}
        pendingInstallmentsCount={pendingInstallmentsCount}
      />

      {/* Operations Workbench */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <StaffOrdersQueue
            orders={ordersQueue}
            loading={loading}
            onConfirmOrder={handleConfirmOrder}
            onProcessOrder={handleProcessOrder}
          />
        </Col>
        <Col xs={24} lg={8}>
          <StaffAlertsSidebar
            lowStockItems={lowStockItems}
            recentTickets={recentTickets}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
};
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm --prefix frontend test -- src/pages/Staff/Dashboard/__tests__/StaffDashboardPage.spec.tsx`
Expected: PASS (1/1 tests pass)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Staff/Dashboard/
git commit -m "feat(staff): implement StaffDashboardPage operations hub with action cards and zero report API calls"
```

---

### Task 5: Build Staff Customers & Inventory Wrappers with Stripped Actions

**Files:**
- Create: `frontend/src/pages/Staff/Customers/StaffCustomersPage.tsx`
- Create: `frontend/src/pages/Staff/Customers/StaffCustomer360Page.tsx`
- Create: `frontend/src/pages/Staff/Inventory/StaffInventoryPage.tsx`

- [ ] **Step 1: Implement `StaffCustomersPage.tsx` without Admin User Mutation Modals**

Create `frontend/src/pages/Staff/Customers/StaffCustomersPage.tsx`:
```tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Tag, Input, Space, Button, Typography, Card, Avatar } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined, UserOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../../services/userService';
import type { User } from '../../../types';

const { Title, Text } = Typography;

export const StaffCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getAllUsers({ role: 'USER' });
      const items = (res as any)?.items || (Array.isArray(res) ? res : []);
      setUsers(items);
    } catch (err) {
      console.error('Failed to load customers for staff:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const columns: ColumnsType<User> = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: User) => (
        <Space orientation="horizontal" size="middle">
          <Avatar
            src={record.avatar || record.avatarUrl}
            style={{ backgroundColor: '#4f46e5' }}
            icon={!(record.avatar || record.avatarUrl) && <UserOutlined />}
          >
            {record.fullName?.charAt(0) || 'K'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.fullName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || 'Chưa cập nhật',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: () => <Tag color="blue">KHÁCH HÀNG</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: User) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/staff/customers/${record.id}`)}
        >
          Hồ sơ 360°
        </Button>
      ),
    },
  ];

  return (
    <Card style={{ borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Tra cứu Khách hàng</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Tra cứu thông tin liên hệ và lịch sử giao dịch của khách để phục vụ tư vấn
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadCustomers} loading={loading}>
          Làm mới
        </Button>
      </div>

      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <Input
          placeholder="Tìm theo Tên, Email, SĐT..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      <Table
        dataSource={filteredUsers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
      />
    </Card>
  );
};
```

- [ ] **Step 2: Implement `StaffCustomer360Page.tsx`**

Create `frontend/src/pages/Staff/Customers/StaffCustomer360Page.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Descriptions, Spin, Tag, Button, Tabs, Table, Avatar, Row, Col } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { userService } from '../../../services/userService';

const { Title, Text } = Typography;

export const StaffCustomer360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    userService
      .getCustomer360(id)
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load customer 360:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <Text type="danger">Không tìm thấy thông tin khách hàng.</Text>
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => navigate('/staff/customers')}>Quay lại danh sách</Button>
        </div>
      </Card>
    );
  }

  const user = data.user || data;
  const orders = data.orders || [];
  const warranties = data.warranties || [];
  const tickets = data.tickets || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/staff/customers')} style={{ width: 'fit-content' }}>
        Quay lại Danh sách
      </Button>

      <Card style={{ borderRadius: 10 }}>
        <Row gutter={[20, 20]} align="middle">
          <Col>
            <Avatar size={64} icon={<UserOutlined />} src={user.avatar || user.avatarUrl} style={{ backgroundColor: '#4f46e5' }} />
          </Col>
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>{user.fullName}</Title>
            <Text type="secondary">{user.email} • {user.phone || 'Chưa có SĐT'}</Text>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 10 }}>
        <Tabs
          defaultActiveKey="orders"
          items={[
            {
              key: 'orders',
              label: `Lịch sử Đơn hàng (${orders.length})`,
              children: (
                <Table
                  dataSource={orders}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Mã đơn', dataIndex: 'code', key: 'code', render: (val, r: any) => val || r.id.slice(0, 8) },
                    { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'total', render: (val) => `${(val || 0).toLocaleString('vi-VN')} ₫` },
                    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (val) => <Tag color="blue">{val}</Tag> },
                    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'date', render: (val) => val ? new Date(val).toLocaleDateString('vi-VN') : '-' },
                  ]}
                />
              ),
            },
            {
              key: 'warranties',
              label: `Bảo hành & Thiết bị (${warranties.length})`,
              children: (
                <Table
                  dataSource={warranties}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Sản phẩm', dataIndex: ['product', 'name'], key: 'prod' },
                    { title: 'Số IMEI', dataIndex: 'imei', key: 'imei', render: (v) => <code>{v || '-'}</code> },
                    { title: 'Hạn bảo hành', dataIndex: 'endDate', key: 'end', render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '-' },
                  ]}
                />
              ),
            },
            {
              key: 'tickets',
              label: `Lịch sử Hỗ trợ (${tickets.length})`,
              children: (
                <Table
                  dataSource={tickets}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
                    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v) => <Tag>{v}</Tag> },
                    { title: 'Thời gian', dataIndex: 'createdAt', key: 'date', render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '-' },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
```

- [ ] **Step 3: Implement `StaffInventoryPage.tsx`**

Create `frontend/src/pages/Staff/Inventory/StaffInventoryPage.tsx`:
```tsx
import React, { useState } from 'react';
import { Card, Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { BarcodeOutlined, InboxOutlined, HistoryOutlined } from '@ant-design/icons';
import { InventoryStockTab } from '../../Admin/Inventory/components/InventoryStockTab';
import { InventoryLedgerTab } from '../../Admin/Inventory/components/InventoryLedgerTab';
import { AdminImeiPage } from '../../Admin/InventoryImei/AdminImeiPage';

const { Title, Text } = Typography;

export const StaffInventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stock';

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key });
  };

  const items = [
    {
      key: 'stock',
      label: (
        <span>
          <InboxOutlined /> Tồn kho & Mức cảnh báo
        </span>
      ),
      children: <InventoryStockTab />,
    },
    {
      key: 'ledger',
      label: (
        <span>
          <HistoryOutlined /> Lịch sử Biến động kho
        </span>
      ),
      children: <InventoryLedgerTab />,
    },
    {
      key: 'imei',
      label: (
        <span>
          <BarcodeOutlined /> Quản lý Mã IMEI & Barcode
        </span>
      ),
      children: <AdminImeiPage />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            Kho hàng & Quản lý IMEI
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Kiểm tra tồn kho, nhập xuất và quét mã IMEI thiết bị smartphone
          </Text>
        </div>
      </div>

      <Card style={{ borderRadius: 10 }} bodyStyle={{ padding: '16px 20px' }}>
        <Tabs activeKey={currentTab} onChange={handleTabChange} items={items} />
      </Card>
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Staff/Customers/ frontend/src/pages/Staff/Inventory/
git commit -m "feat(staff): add dedicated customer lookup and inventory management wrappers for staff"
```

---

### Task 6: Mount Staff Routes in `AppRoutes.tsx` and Validate Separation

**Files:**
- Modify: `frontend/src/routes/AppRoutes.tsx`
- Test: `frontend/src/routes/__tests__/AppRoutesRedirect.spec.tsx`

- [ ] **Step 1: Mount `/staff/*` routes in `AppRoutes.tsx`**

Edit `frontend/src/routes/AppRoutes.tsx`:
- Import `StaffRoute` from `./StaffRoute`
- Import `StaffLayout` from `../layouts/StaffLayout`
- Import `StaffDashboardPage` from `../pages/Staff/Dashboard/StaffDashboardPage`
- Import `StaffCustomersPage` and `StaffCustomer360Page` from `../pages/Staff/Customers/...`
- Import `StaffInventoryPage` from `../pages/Staff/Inventory/StaffInventoryPage`
- Reuse operational pages: `AdminOrdersPage`, `AdminTicketsPage`, `AdminTicketDetailPage`, `AdminReturnsPage`, `AdminInstallmentsPage`, `AdminReviewsPage` inside `/staff/*`.
- Add route definition:
```tsx
{/* Staff Operational Portal Routes */}
<Route element={<StaffRoute />}>
  <Route element={<StaffLayout />}>
    <Route path="/staff" element={<StaffDashboardPage />} />
    <Route path="/staff/orders" element={<AdminOrdersPage />} />
    <Route path="/staff/inventory" element={<StaffInventoryPage />} />
    <Route path="/staff/imei" element={<Navigate to="/staff/inventory?tab=imei" replace />} />
    <Route path="/staff/tickets" element={<AdminTicketsPage />} />
    <Route path="/staff/tickets/:id" element={<AdminTicketDetailPage />} />
    <Route path="/staff/returns" element={<AdminReturnsPage />} />
    <Route path="/staff/installments" element={<AdminInstallmentsPage />} />
    <Route path="/staff/reviews" element={<AdminReviewsPage />} />
    <Route path="/staff/customers" element={<StaffCustomersPage />} />
    <Route path="/staff/customers/:id" element={<StaffCustomer360Page />} />
  </Route>
</Route>
```

- [ ] **Step 2: Clean up `AdminLayout.tsx` menu items**

In `frontend/src/layouts/AdminLayout.tsx`, wrap `/admin/settings`, `/admin/users`, `/admin/audit-logs` in proper role filtering so that if any non-admin accesses AdminLayout, forbidden items are hidden.

- [ ] **Step 3: Run comprehensive test suite**

Run: `npm --prefix frontend test`
Verify all tests pass without errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/AppRoutes.tsx frontend/src/layouts/AdminLayout.tsx
git commit -m "feat(routes): wire /staff portal into AppRoutes and complete staff/admin role separation"
```

---

### Task 7: Full System Verification & Regression Check

**Files:**
- Test all frontend tests: `npm --prefix frontend test`
- Build frontend: `npm --prefix frontend build`

- [ ] **Step 1: Run complete test suite**

Run: `npm --prefix frontend test`
Expected: 100% PASS

- [ ] **Step 2: Run build to guarantee zero TypeScript or bundle errors**

Run: `npm --prefix frontend build`
Expected: Build successfully completes.

- [ ] **Step 3: Commit all verified changes**

```bash
git add .
git commit -m "test: verify complete staff portal routing and build integrity"
```
