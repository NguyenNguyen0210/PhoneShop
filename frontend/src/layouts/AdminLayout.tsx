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
} from '@ant-design/icons';
import { useAuthStore } from '../stores/useAuthStore';

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

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined style={{ fontSize: 16 }} />,
      label: 'Tổng quan (Dashboard)',
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Sản phẩm',
    },
    {
      key: '/admin/imei',
      icon: <BarcodeOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Kho & IMEI',
    },
    {
      key: '/admin/orders',
      icon: <OrderedListOutlined style={{ fontSize: 16 }} />,
      label: 'Quản lý Đơn hàng',
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
    if (location.pathname === '/admin/imei') return 'Quản trị Kho Thiết bị & Quản lý IMEI';
    if (location.pathname === '/admin/orders') return 'Quản lý Đơn hàng & Điều phối';
    return 'Tổng quan hệ thống (Dashboard)';
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
          {/* Logo & Brand Header */}
          <div
            style={{
              height: 64,
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
          <div style={{ padding: '12px 0' }}>
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
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
                position: 'absolute',
                bottom: 16,
                left: 12,
                right: 12,
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
                Lock: 15m SKIP LOCKED
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
                <span>Luhn & Lock: 100% OK</span>
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
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                    }}
                    icon={<UserOutlined />}
                  >
                    {user?.fullName?.charAt(0) || 'A'}
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
