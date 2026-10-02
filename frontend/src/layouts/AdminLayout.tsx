import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Tag, Breadcrumb, theme, ConfigProvider } from 'antd';
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
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer: '#0e1526',
          colorBgElevated: '#151d30',
          colorBgLayout: '#07090e',
          colorPrimary: '#6366f1',
          colorBorder: 'rgba(255, 255, 255, 0.08)',
          colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',
          colorText: '#f8fafc',
          colorTextSecondary: '#94a3b8',
          borderRadius: 10,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        },
        components: {
          Menu: {
            darkItemBg: '#07090e',
            darkSubMenuItemBg: '#07090e',
            darkItemSelectedBg: 'rgba(99, 102, 241, 0.18)',
            darkItemSelectedColor: '#818cf8',
            itemBorderRadius: 8,
            itemMarginInline: 8,
          },
          Card: {
            colorBgContainer: '#0e1526',
            colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
          },
          Table: {
            colorBgContainer: '#0e1526',
            headerBg: '#151d30',
            headerColor: '#94a3b8',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            rowHoverBg: 'rgba(99, 102, 241, 0.06)',
          },
          Modal: {
            contentBg: '#0e1526',
            headerBg: '#0e1526',
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#07090e' }}>
        {/* Sider - Obsidian Deep Dark */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="dark"
          width={250}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 100,
            background: '#07090e',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
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
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 0.5,
                flexShrink: 0,
              }}
            >
              MC
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    color: '#f8fafc',
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: -0.2,
                    lineHeight: 1.2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  MobileCommerce
                </div>
                <div
                  style={{
                    color: '#6366f1',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    marginTop: 2,
                  }}
                >
                  Command Center
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <div style={{ padding: '12px 0' }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                background: 'transparent',
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
                background: '#0e1526',
                border: '1px solid rgba(255, 255, 255, 0.06)',
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
                    boxShadow: '0 0 8px #10b981',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#f8fafc' }}>
                  Obsidian Engine Active
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                Lock: 15m SKIP LOCKED
              </div>
            </div>
          )}
        </Sider>

        {/* Main Layout */}
        <Layout style={{ background: '#07090e' }}>
          {/* Header */}
          <Header
            style={{
              padding: '0 24px',
              background: '#0e1526',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                  color: '#94a3b8',
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
                      <span style={{ color: '#f8fafc', fontWeight: 500 }}>
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
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: 11,
                  color: '#34d399',
                  fontWeight: 600,
                }}
                className="sm:flex"
              >
                <ThunderboltOutlined style={{ fontSize: 12, color: '#10b981' }} />
                <span>Luhn & Lock: 100% OK</span>
              </div>

              <Link to="/">
                <Button
                  icon={<ShopOutlined />}
                  size="small"
                  style={{
                    background: '#151d30',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontSize: 12,
                  }}
                >
                  Storefront
                </Button>
              </Link>

              <Tag
                color="indigo"
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: 0.5,
                  background: 'rgba(99, 102, 241, 0.15)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: '#818cf8',
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
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)',
                    }}
                    icon={<UserOutlined />}
                  >
                    {user?.fullName?.charAt(0) || 'A'}
                  </Avatar>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#f8fafc',
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
