import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { CartDrawer } from '../components/storefront/CartDrawer';
import { LiveSupportChatWidget } from '../components/storefront/LiveSupportChatWidget';
import { useAuthStore } from '../stores/useAuthStore';

export const StorefrontLayout: React.FC = () => {
  const { isStaffOrAdmin } = useAuthStore();
  const hideCustomerWidgets = isStaffOrAdmin();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-500/20 selection:text-blue-900">
      {/* Global Floating Clean Light Navbar */}
      <Navbar />

      {/* Main Page Content */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Slide-over Cart Drawer (Customer only) */}
      {!hideCustomerWidgets && <CartDrawer />}

      {/* Live Support Chat Widget (Customer only) */}
      {!hideCustomerWidgets && <LiveSupportChatWidget />}

      {/* Clean Light Architecture Footer */}
      <Footer />
    </div>
  );
};
