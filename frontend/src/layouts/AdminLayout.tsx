import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Tag, Breadcrumb, ConfigProvider } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  BarcodeOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  ShopOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  DollarOutlined,
  UndoOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  FolderOpenOutlined,
  TagOutlined,
  TagsOutlined,
  SettingOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/useAuthStore';
import './AdminLayout.css';

const { Header, Sider, Content } = Layout;

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: 'Tổng quan',
      children: [
        {
          key: '/admin',
          icon: <DashboardOutlined style={{ fontSize: 16 }} />,
          label: 'Tổng quan (Dashboard)',
        },
      ],
    },
    {
      type: 'group',
      label: 'Bán hàng & Đơn hàng',
      children: [
        {
          key: '/admin/orders',
          icon: <OrderedListOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Đơn hàng',
        },
        {
          key: '/admin/returns',
          icon: <UndoOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Đổi trả',
        },
        {
          key: '/admin/installments',
          icon: <CreditCardOutlined style={{ fontSize: 16 }} />,
          label: 'Hồ sơ trả góp',
        },
      ],
    },
    {
      type: 'group',
      label: 'Kho vận & Sản phẩm',
      children: [
        {
          key: '/admin/products',
          icon: <ShoppingOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Sản phẩm',
        },
        {
          key: '/admin/categories',
          icon: <FolderOpenOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Danh mục',
        },
        {
          key: '/admin/brands',
          icon: <TagsOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Thương hiệu',
        },
        {
          key: '/admin/inventory',
          icon: <BarcodeOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Kho & IMEI',
        },
        {
          key: '/admin/suppliers',
          icon: <ShopOutlined style={{ fontSize: 16 }} />,
          label: 'Nhà cung cấp',
        },
      ],
    },
    {
      type: 'group',
      label: 'Marketing & CSKH',
      children: [
        {
          key: '/admin/promotions',
          icon: <TagOutlined style={{ fontSize: 16 }} />,
          label: 'Khuyến mãi & Flash Sale',
        },
        {
          key: '/admin/payments',
          icon: <DollarOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Thanh toán',
        },
        {
          key: '/admin/customers',
          icon: <UserOutlined style={{ fontSize: 16 }} />,
          label: 'Khách hàng (360°)',
        },
        {
          key: '/admin/tickets',
          icon: <CustomerServiceOutlined style={{ fontSize: 16 }} />,
          label: 'Hỗ trợ khách hàng',
        },
        {
          key: '/admin/reviews',
          icon: <CommentOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Đánh giá',
        },
      ],
    },
    {
      type: 'group',
      label: 'Hệ thống',
      children: [
        {
          key: '/admin/users',
          icon: <TeamOutlined style={{ fontSize: 16 }} />,
          label: 'Quản lý Người dùng',
        },
        {
          key: '/admin/audit-logs',
          icon: <SafetyCertificateOutlined style={{ fontSize: 16 }} />,
          label: 'Nhật ký kiểm toán',
        },
        {
          key: '/admin/settings',
          icon: <SettingOutlined style={{ fontSize: 16 }} />,
          label: 'Cấu hình Hệ thống',
        },
      ],
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

  // Dynamic breadcrumb labels
  const getBreadcrumbTitle = () => {
    if (location.pathname === '/admin/products') return 'Quản lý Sản phẩm & Biến thể';
    if (location.pathname === '/admin/categories') return 'Quản lý Danh mục Smartphone';
    if (location.pathname === '/admin/brands') return 'Quản lý Thương hiệu Smartphone';
    if (location.pathname === '/admin/suppliers') return 'Quản lý Nhà cung cấp';
    if (location.pathname === '/admin/imei') return 'Quản trị Kho Thiết bị & Quản lý IMEI';
    if (location.pathname === '/admin/orders') return 'Quản lý Đơn hàng & Điều phối';
    if (location.pathname.startsWith('/admin/promotions')) return 'Quản lý Khuyến mãi & Flash Sale';
    if (location.pathname === '/admin/payments') return 'Quản lý Thanh toán & Đối soát';
    if (location.pathname === '/admin/returns') return 'Quản lý Đổi trả & Hoàn tiền';
    if (location.pathname.startsWith('/admin/customers')) return 'Hồ sơ Khách hàng Customer 360°';
    if (location.pathname.startsWith('/admin/tickets')) return 'Hệ thống Vé Hỗ trợ & Khiếu nại';
    if (location.pathname === '/admin/installments') return 'Quản lý Hồ sơ trả góp & Thẩm định';
    if (location.pathname === '/admin/users') return 'Quản lý Người dùng & Phân quyền';
    if (location.pathname === '/admin/audit-logs') return 'Nhật ký Hoạt động (Audit Logs)';
    if (location.pathname === '/admin/reviews') return 'Quản lý Đánh giá & Phản hồi';
    if (location.pathname === '/admin/settings') return 'Cấu hình & Tham số Hệ thống';
    return 'Tổng quan hệ thống (Dashboard)';
  };

  // Map any nested admin path to its top-level menu key
  // (detail pages /admin/orders/:id etc. keep the parent highlighted,
  // and the legacy /admin/imei URL maps to the inventory entry).
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/admin/inventory') || path.startsWith('/admin/imei')) return '/admin/inventory';
    if (path.startsWith('/admin/orders')) return '/admin/orders';
    if (path.startsWith('/admin/customers')) return '/admin/customers';
    if (path.startsWith('/admin/tickets')) return '/admin/tickets';
    if (path.startsWith('/admin/promotions')) return '/admin/promotions';
    if (path.startsWith('/admin/products')) return '/admin/products';
    if (path.startsWith('/admin/categories')) return '/admin/categories';
    if (path.startsWith('/admin/brands')) return '/admin/brands';
    if (path.startsWith('/admin/suppliers')) return '/admin/suppliers';
    if (path.startsWith('/admin/payments')) return '/admin/payments';
    if (path.startsWith('/admin/returns')) return '/admin/returns';
    if (path.startsWith('/admin/installments')) return '/admin/installments';
    if (path.startsWith('/admin/reviews')) return '/admin/reviews';
    if (path.startsWith('/admin/users')) return '/admin/users';
    if (path.startsWith('/admin/audit-logs')) return '/admin/audit-logs';
    if (path.startsWith('/admin/settings')) return '/admin/settings';
    return '/admin';
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorPrimary: '#2563eb',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          borderRadius: 12,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        },
        components: {
          Menu: {
            itemBg: '#ffffff',
            subMenuItemBg: '#ffffff',
            itemSelectedBg: '#eff6ff',
            itemSelectedColor: '#2563eb',
            itemColor: '#475569',
            itemHoverBg: '#f8fafc',
            itemHoverColor: '#0f172a',
            itemBorderRadius: 8,
            itemMarginInline: 8,
          },
          Card: {
            colorBgContainer: '#ffffff',
            colorBorderSecondary: '#e2e8f0',
          },
          Table: {
            colorBgContainer: '#ffffff',
            headerBg: '#f8fafc',
            headerColor: '#475569',
            borderColor: '#e2e8f0',
            rowHoverBg: '#f8fafc',
          },
          Modal: {
            contentBg: '#ffffff',
            headerBg: '#ffffff',
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Sider - Clean Light Mode */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={250}
          className="admin-sider"
          style={{
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 100,
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Logo & Brand Header */}
          <div
            style={{
              height: 64,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              gap: 12,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            {collapsed ? (
              <img
                src="/logo-icon.png"
                alt="PhoneShop"
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <img
                  src="/logo-horizontal.png"
                  alt="PhoneShop"
                  style={{
                    height: 30,
                    width: 'auto',
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: '#2563eb',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    background: '#eff6ff',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid #dbeafe',
                  }}
                >
                  Admin
                </span>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '12px 0',
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey()]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                background: '#ffffff',
                borderRight: 'none',
              }}
            />
          </div>

          {/* Sider Footer System Metric */}
          {!collapsed && (
            <div
              style={{
                flexShrink: 0,
                margin: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  Hệ thống Quản trị
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                Đồng bộ kho: Thời gian thực
              </div>
            </div>
          )}
        </Sider>

        {/* Main Layout */}
        <Layout style={{ background: '#f8fafc' }}>
          {/* Header */}
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
                  fontSize: '16px',
                  width: 38,
                  height: 38,
                  color: '#475569',
                  borderRadius: 8,
                }}
              />
              <Breadcrumb
                items={[
                  {
                    title: (
                      <Link to="/admin" style={{ color: '#64748b' }}>
                        Admin
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

            {/* Right Header System Metrics & Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* System status pill */}
              <div
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  fontSize: 11,
                  color: '#059669',
                  fontWeight: 600,
                }}
                className="sm:flex"
              >
                <ThunderboltOutlined style={{ fontSize: 12, color: '#059669' }} />
                <span>Hệ thống trực tuyến 100%</span>
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
                    borderRadius: 8,
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
                  letterSpacing: 0.5,
                  background: '#eff6ff',
                  borderColor: '#bfdbfe',
                  color: '#2563eb',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                {user?.role || 'ADMIN'}
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
                    transition: 'background 0.2s',
                  }}
                >
                  <Avatar
                    src={user?.avatar || (user as any)?.avatarUrl}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                    }}
                    icon={!(user?.avatar || (user as any)?.avatarUrl) && <UserOutlined />}
                  >
                    {!(user?.avatar || (user as any)?.avatarUrl) && (user?.fullName?.charAt(0) || 'A')}
                  </Avatar>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {user?.fullName || 'Quản trị viên'}
                  </span>
                </div>
              </Dropdown>
            </div>
          </Header>

          {/* Content Body */}
          <Content
            style={{
              margin: '20px 24px',
              padding: 0,
              minHeight: 280,
              background: 'transparent',
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};
