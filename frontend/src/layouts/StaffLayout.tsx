import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Tag, Breadcrumb, ConfigProvider, Input } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  BarcodeOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  ShopOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  CreditCardOutlined,
  UndoOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/useAuthStore';

const { Header, Sider, Content, Footer } = Layout;

export const StaffLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/staff',
      icon: <DashboardOutlined style={{ fontSize: 16 }} />,
      label: 'Bàn làm việc (Dashboard)',
    },
    {
      key: '/staff/chat',
      icon: <MessageOutlined style={{ fontSize: 16 }} />,
      label: 'Live Chat Khách hàng',
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
      label: 'Hỗ trợ & Chat CSKH',
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
      key: '/staff/payments',
      icon: <DollarOutlined style={{ fontSize: 16 }} />,
      label: 'Tra cứu Thanh toán',
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

  const handleQuickSearch = () => {
    const query = searchValue.trim();
    if (!query) return;

    // Detect search type:
    // 15 digits -> IMEI
    // Phone number (0xxxxxxxxx or +84xxxxxxxxx) -> Customer lookup
    // Otherwise -> Orders lookup
    if (/^\d{15}$/.test(query)) {
      navigate(`/staff/inventory?tab=imei&search=${encodeURIComponent(query)}`);
    } else if (/^(0|\+84)\d{9,10}$/.test(query)) {
      navigate(`/staff/customers?search=${encodeURIComponent(query)}`);
    } else {
      navigate(`/staff/orders?search=${encodeURIComponent(query)}`);
    }
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

  // Dynamic breadcrumb label based on path
  const getBreadcrumbTitle = () => {
    if (location.pathname.startsWith('/staff/chat')) return 'Live Chat Trực Tuyến Với Khách Hàng';
    if (location.pathname.startsWith('/staff/orders')) return 'Quản lý Đơn hàng & Giao vận';
    if (location.pathname.startsWith('/staff/inventory')) return 'Quản lý Kho & Thiết bị IMEI';
    if (location.pathname.startsWith('/staff/tickets')) return 'Hệ thống Vé hỗ trợ CSKH';
    if (location.pathname.startsWith('/staff/returns')) return 'Xử lý Yêu cầu Đổi trả';
    if (location.pathname.startsWith('/staff/installments')) return 'Thẩm định Hồ sơ Trả góp';
    if (location.pathname.startsWith('/staff/reviews')) return 'Quản lý Đánh giá & Phản hồi';
    if (location.pathname.startsWith('/staff/payments')) return 'Tra cứu Giao dịch & Thanh toán';
    if (location.pathname.startsWith('/staff/customers')) return 'Tra cứu Thông tin Khách hàng';
    return 'Bàn làm việc Tổng quan';
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/staff/chat')) return '/staff/chat';
    if (path.startsWith('/staff/orders')) return '/staff/orders';
    if (path.startsWith('/staff/inventory')) return '/staff/inventory';
    if (path.startsWith('/staff/tickets')) return '/staff/tickets';
    if (path.startsWith('/staff/returns')) return '/staff/returns';
    if (path.startsWith('/staff/installments')) return '/staff/installments';
    if (path.startsWith('/staff/reviews')) return '/staff/reviews';
    if (path.startsWith('/staff/payments')) return '/staff/payments';
    if (path.startsWith('/staff/customers')) return '/staff/customers';
    return '/staff';
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
            itemSelectedBg: '#eef2ff',
            itemSelectedColor: '#4f46e5',
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
        {/* Sider */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={260}
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
                    color: '#4338ca',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    background: '#eef2ff',
                    padding: '2px 6px',
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
              selectedKeys={[getSelectedKey()]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                background: '#ffffff',
                borderRight: 'none',
              }}
            />
          </div>
        </Sider>

        {/* Main Layout Area */}
        <Layout style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
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
            {/* Left Header: Collapse Toggle & Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button
                type="text"
                aria-label="toggle collapse"
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

            {/* Center/Right Header: Quick Search, Online Pill, Storefront, Role Tag, Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Quick Search Input */}
              <Input
                placeholder="Tìm nhanh Mã đơn, IMEI, SĐT khách..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleQuickSearch();
                  }
                }}
                onPressEnter={handleQuickSearch}
                style={{ width: 280, borderRadius: 8 }}
                allowClear
              />

              {/* Online status pill */}
              <div
                style={{
                  display: 'flex',
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
              >
                <ThunderboltOutlined style={{ fontSize: 12, color: '#059669' }} />
                <span>Trực tuyến</span>
              </div>

              {/* Storefront button */}
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

              {/* Role Tag */}
              <Tag
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: 0.5,
                  background: '#eef2ff',
                  borderColor: '#c7d2fe',
                  color: '#4338ca',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                NHÂN VIÊN VẬN HÀNH
              </Tag>

              {/* Avatar Dropdown */}
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
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                    }}
                    icon={!(user?.avatar || (user as any)?.avatarUrl) && <UserOutlined />}
                  >
                    {!(user?.avatar || (user as any)?.avatarUrl) && (user?.fullName?.charAt(0) || 'S')}
                  </Avatar>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {user?.fullName || 'Nhân viên'}
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
              flex: 1,
            }}
          >
            <Outlet />
          </Content>

          {/* Footer */}
          <Footer
            style={{
              textAlign: 'center',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '14px 24px',
              fontSize: 12,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)',
              }}
            />
            <span>Ca trực Vận hành - Đồng bộ đơn hàng: Thời gian thực</span>
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default StaffLayout;
