import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layouts
const StorefrontLayout = React.lazy(() => import('../layouts/StorefrontLayout').then((module) => ({ default: module.StorefrontLayout })));
const AdminLayout = React.lazy(() => import('../layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const StaffLayout = React.lazy(() => import('../layouts/StaffLayout').then((module) => ({ default: module.StaffLayout })));

// Storefront Pages
const HomePage = React.lazy(() => import('../pages/storefront/Home/HomePage').then((module) => ({ default: module.HomePage })));
const ProductDetailPage = React.lazy(() => import('../pages/storefront/ProductDetail/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })));
const CartPage = React.lazy(() => import('../pages/storefront/Cart/CartPage').then((module) => ({ default: module.CartPage })));
const CheckoutPage = React.lazy(() => import('../pages/storefront/Checkout/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));
const OrderSuccessPage = React.lazy(() => import('../pages/storefront/OrderSuccess/OrderSuccessPage').then((module) => ({ default: module.OrderSuccessPage })));
const VNPayReturnPage = React.lazy(() => import('../pages/storefront/OrderSuccess/VNPayReturnPage').then((module) => ({ default: module.VNPayReturnPage })));
const OrderDetailPage = React.lazy(() => import('../pages/storefront/Orders/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })));
const WarrantyLookupPage = React.lazy(() => import('../pages/storefront/WarrantyLookup/WarrantyLookupPage').then((module) => ({ default: module.WarrantyLookupPage })));
const ProfilePage = React.lazy(() => import('../pages/storefront/Profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const WishlistPage = React.lazy(() => import('../pages/storefront/Wishlist/WishlistPage').then((module) => ({ default: module.WishlistPage })));
const NotificationPage = React.lazy(() => import('../pages/storefront/Notifications/NotificationPage').then((module) => ({ default: module.NotificationPage })));

// Auth Pages
const LoginPage = React.lazy(() => import('../pages/storefront/Auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('../pages/storefront/Auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const OAuthCallbackPage = React.lazy(() => import('../pages/storefront/Auth/OAuthCallbackPage').then((module) => ({ default: module.OAuthCallbackPage })));
const ResetPasswordPage = React.lazy(() => import('../pages/storefront/Auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));

// Admin Pages
const AdminDashboard = React.lazy(() => import('../pages/Admin/Dashboard/AdminDashboardPage').then((module) => ({ default: module.AdminDashboard })));
const AdminProductsPage = React.lazy(() => import('../pages/Admin/Products/AdminProductsPage').then((module) => ({ default: module.AdminProductsPage })));
const AdminBrandsPage = React.lazy(() => import('../pages/Admin/Brands/AdminBrandsPage').then((module) => ({ default: module.AdminBrandsPage })));
const AdminSuppliersPage = React.lazy(() => import('../pages/Admin/Suppliers/AdminSuppliersPage').then((module) => ({ default: module.AdminSuppliersPage })));
const AdminInventoryPage = React.lazy(() => import('../pages/Admin/Inventory/AdminInventoryPage').then((module) => ({ default: module.AdminInventoryPage })));
const AdminOrdersPage = React.lazy(() => import('../pages/Admin/Orders/AdminOrdersPage').then((module) => ({ default: module.AdminOrdersPage })));
const AdminPaymentsPage = React.lazy(() => import('../pages/Admin/Payments/AdminPaymentsPage').then((module) => ({ default: module.AdminPaymentsPage })));
const AdminReviewsPage = React.lazy(() => import('../pages/Admin/Reviews/AdminReviewsPage').then((module) => ({ default: module.AdminReviewsPage })));
const AdminCustomersPage = React.lazy(() => import('../pages/Admin/Customers/AdminCustomersPage').then((module) => ({ default: module.AdminCustomersPage })));
const AdminCustomer360Page = React.lazy(() => import('../pages/Admin/Customers/AdminCustomer360Page').then((module) => ({ default: module.AdminCustomer360Page })));
const AdminTicketsPage = React.lazy(() => import('../pages/Admin/Tickets/AdminTicketsPage').then((module) => ({ default: module.AdminTicketsPage })));
const AdminTicketDetailPage = React.lazy(() => import('../pages/Admin/Tickets/AdminTicketDetailPage').then((module) => ({ default: module.AdminTicketDetailPage })));
const AdminUsersPage = React.lazy(() => import('../pages/Admin/Users/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const AdminAuditLogsPage = React.lazy(() => import('../pages/Admin/AuditLogs/AdminAuditLogsPage').then((module) => ({ default: module.AdminAuditLogsPage })));
const AdminSettingsPage = React.lazy(() => import('../pages/Admin/Settings/AdminSettingsPage').then((module) => ({ default: module.AdminSettingsPage })));
const AdminPromotionsPage = React.lazy(() => import('../pages/Admin/Promotions/AdminPromotionsPage').then((module) => ({ default: module.AdminPromotionsPage })));
const AdminCategoriesPage = React.lazy(() => import('../pages/Admin/Categories/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage })));
const AdminWarrantiesPage = React.lazy(() => import('../pages/Admin/Warranties/AdminWarrantiesPage').then((module) => ({ default: module.AdminWarrantiesPage })));

// Staff Operational Pages
const StaffDashboardPage = React.lazy(() => import('../pages/Staff/Dashboard/StaffDashboardPage').then((module) => ({ default: module.StaffDashboardPage })));
const StaffCustomersPage = React.lazy(() => import('../pages/Staff/Customers/StaffCustomersPage').then((module) => ({ default: module.StaffCustomersPage })));
const StaffCustomer360Page = React.lazy(() => import('../pages/Staff/Customers/StaffCustomer360Page').then((module) => ({ default: module.StaffCustomer360Page })));
const StaffInventoryPage = React.lazy(() => import('../pages/Staff/Inventory/StaffInventoryPage').then((module) => ({ default: module.StaffInventoryPage })));
const StaffLiveChatPage = React.lazy(() => import('../pages/Staff/Chat/StaffLiveChatPage').then((module) => ({ default: module.StaffLiveChatPage })));

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
    <React.Suspense fallback={<div role="status" className="p-8 text-center">Đang tải...</div>}>
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
          <Route path="/admin/orders/:id" element={<AdminOrdersPage />} />
          <Route
            path="/admin/warranties"
            element={
              <RoleGuard allowedRoles={[ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminWarrantiesPage />
              </RoleGuard>
            }
          />
          <Route path="/admin/promotions" element={<AdminPromotionsPage />} />
          <Route
            path="/admin/payments"
            element={
              <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
                <AdminPaymentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <RoleGuard allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]}>
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
          <Route path="/staff/chat" element={<StaffLiveChatPage />} />
          <Route path="/staff/orders" element={<AdminOrdersPage />} />
          <Route path="/staff/orders/:id" element={<AdminOrdersPage />} />
          <Route path="/staff/warranties" element={<AdminWarrantiesPage />} />
          <Route path="/staff/inventory" element={<StaffInventoryPage />} />
          <Route path="/staff/imei" element={<Navigate to="/staff/inventory?tab=imei" replace />} />
          <Route path="/staff/tickets" element={<AdminTicketsPage />} />
          <Route path="/staff/tickets/:id" element={<AdminTicketDetailPage />} />
          <Route path="/staff/reviews" element={<AdminReviewsPage />} />
          <Route path="/staff/payments" element={<AdminPaymentsPage />} />
          <Route path="/staff/customers" element={<StaffCustomersPage />} />
          <Route path="/staff/customers/:id" element={<StaffCustomer360Page />} />
        </Route>
      </Route>

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </React.Suspense>
  );
};
