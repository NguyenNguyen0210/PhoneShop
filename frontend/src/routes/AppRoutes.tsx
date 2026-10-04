import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layouts
import { StorefrontLayout } from '../layouts/StorefrontLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { StaffLayout } from '../layouts/StaffLayout';

// Storefront Pages
import { HomePage } from '../pages/storefront/Home/HomePage';
import { ProductDetailPage } from '../pages/storefront/ProductDetail/ProductDetailPage';
import { CartPage } from '../pages/storefront/Cart/CartPage';
import { CheckoutPage } from '../pages/storefront/Checkout/CheckoutPage';
import { OrderSuccessPage } from '../pages/storefront/OrderSuccess/OrderSuccessPage';
import { VNPayReturnPage } from '../pages/storefront/OrderSuccess/VNPayReturnPage';
import { OrderDetailPage } from '../pages/storefront/Orders/OrderDetailPage';
import { WarrantyLookupPage } from '../pages/storefront/WarrantyLookup/WarrantyLookupPage';
import { ProfilePage } from '../pages/storefront/Profile/ProfilePage';
import { WishlistPage } from '../pages/storefront/Wishlist/WishlistPage';
import { NotificationPage } from '../pages/storefront/Notifications/NotificationPage';

// Auth Pages
import { LoginPage } from '../pages/storefront/Auth/LoginPage';
import { RegisterPage } from '../pages/storefront/Auth/RegisterPage';
import { OAuthCallbackPage } from '../pages/storefront/Auth/OAuthCallbackPage';
import { ResetPasswordPage } from '../pages/storefront/Auth/ResetPasswordPage';

// Admin Pages
import { AdminDashboard } from '../pages/Admin/Dashboard/AdminDashboard';
import { AdminProductsPage } from '../pages/Admin/Products/AdminProductsPage';
import { AdminCategoriesPage } from '../pages/Admin/Categories/AdminCategoriesPage';
import { AdminBrandsPage } from '../pages/Admin/Brands/AdminBrandsPage';
import { AdminSuppliersPage } from '../pages/Admin/Suppliers/AdminSuppliersPage';
import { AdminInventoryPage } from '../pages/Admin/Inventory/AdminInventoryPage';
import { AdminOrdersPage } from '../pages/Admin/Orders/AdminOrdersPage';
import { AdminPaymentsPage } from '../pages/Admin/Payments/AdminPaymentsPage';
import { AdminReturnsPage } from '../pages/Admin/Returns/AdminReturnsPage';
import { AdminInstallmentsPage } from '../pages/Admin/Installments/AdminInstallmentsPage';
import { AdminReviewsPage } from '../pages/Admin/Reviews/AdminReviewsPage';
import { AdminCustomersPage } from '../pages/Admin/Customers/AdminCustomersPage';
import { AdminCustomer360Page } from '../pages/Admin/Customers/AdminCustomer360Page';
import { AdminTicketsPage } from '../pages/Admin/Tickets/AdminTicketsPage';
import { AdminTicketDetailPage } from '../pages/Admin/Tickets/AdminTicketDetailPage';
import { AdminUsersPage } from '../pages/Admin/Users/AdminUsersPage';
import { AdminAuditLogsPage } from '../pages/Admin/AuditLogs/AdminAuditLogsPage';
import { AdminSettingsPage } from '../pages/Admin/Settings/AdminSettingsPage';
import { AdminPromotionsPage } from '../pages/Admin/Promotions/AdminPromotionsPage';

// Staff Operational Pages
import { StaffDashboardPage } from '../pages/Staff/Dashboard/StaffDashboardPage';
import { StaffCustomersPage } from '../pages/Staff/Customers/StaffCustomersPage';
import { StaffCustomer360Page } from '../pages/Staff/Customers/StaffCustomer360Page';
import { StaffInventoryPage } from '../pages/Staff/Inventory/StaffInventoryPage';

// Route Guards
import { AdminRoute } from './AdminRoute';
import { StaffRoute } from './StaffRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { ROLES } from '../types';

export const ProductsRedirect: React.FC = () => {
  const location = useLocation();
  return <Navigate to={{ pathname: '/', search: location.search, hash: location.hash }} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Customer Storefront Routes */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsRedirect />} />
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
        <Route path="/order/vnpay-return" element={<VNPayReturnPage />} />
        <Route path="/vnpay-return" element={<VNPayReturnPage />} />
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
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationPage />
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
          <Route
            path="/admin/categories"
            element={
              <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminCategoriesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/brands"
            element={
              <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminBrandsPage />
              </RoleGuard>
            }
          />
          <Route path="/admin/suppliers" element={<AdminSuppliersPage />} />
          <Route path="/admin/inventory" element={<AdminInventoryPage />} />
          <Route path="/admin/imei" element={<Navigate to="/admin/inventory?tab=imei" replace />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/promotions" element={<AdminPromotionsPage />} />
          <Route
            path="/admin/payments"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminPaymentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/returns"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminReturnsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/installments"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
                <AdminInstallmentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminReviewsPage />
              </RoleGuard>
            }
          />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/customers/:id" element={<AdminCustomer360Page />} />
          <Route
            path="/admin/users"
            element={
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <AdminUsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <AdminAuditLogsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <AdminSettingsPage />
              </RoleGuard>
            }
          />
          <Route path="/admin/tickets" element={<AdminTicketsPage />} />
          <Route path="/admin/tickets/:id" element={<AdminTicketDetailPage />} />
        </Route>
      </Route>

      {/* Staff Operational Portal Routes (Protected) */}
      <Route element={<StaffRoute />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff" element={<StaffDashboardPage />} />
          <Route path="/staff/orders" element={<AdminOrdersPage />} />
          <Route path="/staff/inventory" element={<StaffInventoryPage />} />
          <Route path="/staff/imei" element={<Navigate to="/staff/inventory?tab=imei" replace />} />
          <Route path="/staff/tickets" element={<AdminTicketsPage />} />
          <Route path="/staff/tickets/:id" element={<AdminTicketDetailPage />} />
          <Route path="/staff/returns" element={<AdminReturnsPage />} />
          <Route path="/staff/installments" element={<AdminInstallmentsPage />} />
          <Route path="/staff/reviews" element={<AdminReviewsPage />} />
          <Route path="/staff/customers" element={<StaffCustomersPage />} />
          <Route path="/staff/customers/:id" element={<StaffCustomer360Page />} />
        </Route>
      </Route>

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
