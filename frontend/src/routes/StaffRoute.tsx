import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const StaffRoute: React.FC = () => {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();

  if (!user && !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role;
  const roles: string[] = (user as any)?.roles || [];
  const isAdminOrManager =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    roles.includes('ADMIN') ||
    roles.includes('MANAGER');

  // Strict role separation: ADMIN and MANAGER belong in /admin, not /staff
  if (isAdminOrManager) {
    return <Navigate to="/admin" replace />;
  }

  const isStaff = role === 'STAFF' || roles.includes('STAFF');
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
