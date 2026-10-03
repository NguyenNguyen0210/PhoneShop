import React from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ShoppingOutlined,
  BarcodeOutlined,
  OrderedListOutlined,
  CreditCardOutlined,
  UserOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';

const adminMenuItems: MenuProps['items'] = [
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
    key: '/admin/inventory',
    icon: <BarcodeOutlined style={{ fontSize: 16 }} />,
    label: 'Quản lý Kho & IMEI',
  },
  {
    key: '/admin/orders',
    icon: <OrderedListOutlined style={{ fontSize: 16 }} />,
    label: 'Quản lý Đơn hàng',
  },
  {
    key: '/admin/installments',
    icon: <CreditCardOutlined style={{ fontSize: 16 }} />,
    label: 'Hồ sơ trả góp',
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
];

interface AdminSidebarProps {
  collapsed?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  const currentKey = location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/imei')
    ? '/admin/inventory'
    : location.pathname;

  return (
    <div style={{ padding: '12px 0' }}>
      <Menu
        mode="inline"
        selectedKeys={[currentKey]}
        items={adminMenuItems}
        onClick={handleMenuClick}
        inlineCollapsed={collapsed}
        style={{
          background: '#ffffff',
          borderRight: 'none',
        }}
      />
    </div>
  );
};

export default AdminSidebar;
