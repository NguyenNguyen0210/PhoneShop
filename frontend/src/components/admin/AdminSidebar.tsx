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
  UndoOutlined,
  CommentOutlined,
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
    key: '/admin/returns',
    icon: <UndoOutlined style={{ fontSize: 16 }} />,
    label: 'Quản lý Đổi trả',
  },
  {
    key: '/admin/installments',
    icon: <CreditCardOutlined style={{ fontSize: 16 }} />,
    label: 'Hồ sơ trả góp',
  },
  {
    key: '/admin/reviews',
    icon: <CommentOutlined style={{ fontSize: 16 }} />,
    label: 'Quản lý Đánh giá',
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
