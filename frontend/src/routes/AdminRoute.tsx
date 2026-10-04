import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const AdminRoute: React.FC = () => {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();

  if (!user && !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role;
  const roles = (user as any)?.roles || [];
  const isAdminOrManager =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    roles.includes('ADMIN') ||
    roles.includes('MANAGER');

  const isStaff = role === 'STAFF' || roles.includes('STAFF');
  if (isStaff && !isAdminOrManager) {
    return <Navigate to="/staff" replace />;
  }

  if (!isAdminOrManager) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
