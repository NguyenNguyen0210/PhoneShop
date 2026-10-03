import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { StorefrontLayout } from '../layouts/StorefrontLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Storefront Pages
import { HomePage } from '../pages/storefront/Home/HomePage';
import { ProductListingPage } from '../pages/storefront/Products/ProductListingPage';
import { ProductDetailPage } from '../pages/storefront/ProductDetail/ProductDetailPage';
import { CartPage } from '../pages/storefront/Cart/CartPage';
import { CheckoutPage } from '../pages/storefront/Checkout/CheckoutPage';
import { OrderSuccessPage } from '../pages/storefront/OrderSuccess/OrderSuccessPage';
import { OrderDetailPage } from '../pages/storefront/Orders/OrderDetailPage';
import { WarrantyLookupPage } from '../pages/storefront/WarrantyLookup/WarrantyLookupPage';
import { ProfilePage } from '../pages/storefront/Profile/ProfilePage';
import { WishlistPage } from '../pages/storefront/Wishlist/WishlistPage';

// Auth Pages
import { LoginPage } from '../pages/storefront/Auth/LoginPage';
import { RegisterPage } from '../pages/storefront/Auth/RegisterPage';
import { OAuthCallbackPage } from '../pages/storefront/Auth/OAuthCallbackPage';
import { ResetPasswordPage } from '../pages/storefront/Auth/ResetPasswordPage';

// Admin Pages
import { AdminDashboard } from '../pages/Admin/Dashboard/AdminDashboard';
import { AdminProductsPage } from '../pages/Admin/Products/AdminProductsPage';
import { AdminImeiPage } from '../pages/Admin/InventoryImei/AdminImeiPage';
import { AdminOrdersPage } from '../pages/Admin/Orders/AdminOrdersPage';
import { AdminInstallmentsPage } from '../pages/Admin/Installments/AdminInstallmentsPage';

// Route Guards
import { AdminRoute } from './AdminRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { ROLES } from '../types';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Customer Storefront Routes */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListingPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route path="/order-success/:id" element={<OrderSuccessPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/warranty-lookup" element={<WarrantyLookupPage />} />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<ProfilePage />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/oauth/callback" element={<OAuthCallbackPage />} />

      {/* Admin Portal Routes (Protected) */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/imei" element={<AdminImeiPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route
            path="/admin/installments"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
                <AdminInstallmentsPage />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
