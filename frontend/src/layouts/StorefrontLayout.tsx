import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { CartDrawer } from '../components/storefront/CartDrawer';

export const StorefrontLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Global Floating Glassmorphism Navbar */}
      <Navbar />

      {/* Main Page Content */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Obsidian Dark Architecture Footer */}
      <Footer />
    </div>
  );
};
