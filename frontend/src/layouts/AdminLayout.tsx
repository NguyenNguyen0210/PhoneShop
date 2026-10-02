import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Tag, Breadcrumb, theme } from 'antd';
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
} from '@ant-design/icons';
import { useAuthStore } from '../stores/useAuthStore';

const { Header, Sider, Content } = Layout;

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Tổng quan (Dashboard)',
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined />,
      label: 'Quản lý Sản phẩm',
    },
    {
      key: '/admin/imei',
      icon: <BarcodeOutlined />,
      label: 'Quản lý Kho & IMEI',
    },
    {
      key: '/admin/orders',
      icon: <OrderedListOutlined />,
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
    if (location.pathname === '/admin/imei') return 'Quản trị Kho định danh IMEI';
    if (location.pathname === '/admin/orders') return 'Quản lý Đơn hàng & Điều phối';
    return 'Bảng điều khiển kinh doanh';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sider */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          zIndex: 100,
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            MC
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, lineHeight: 1.2 }}>
                MobileCommerce
              </div>
              <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                Admin Portal
              </div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 44, height: 44 }}
            />
            <Breadcrumb
              items={[
                { title: <Link to="/admin">Admin</Link> },
                { title: getBreadcrumbTitle() },
              ]}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/">
              <Button icon={<ShopOutlined />} size="small">
                Xem Storefront
              </Button>
            </Link>

            <Tag color={user?.role === 'ADMIN' ? 'volcano' : 'blue'} style={{ margin: 0, fontWeight: 'bold' }}>
              {user?.role || 'STAFF'}
            </Tag>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar
                  style={{ backgroundColor: '#2563eb' }}
                  icon={<UserOutlined />}
                >
                  {user?.fullName?.charAt(0)}
                </Avatar>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {user?.fullName || 'Quản trị viên'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px 24px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
