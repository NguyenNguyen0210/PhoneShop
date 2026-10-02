import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const AdminRoute: React.FC = () => {
  const { user, accessToken, isStaffOrAdmin } = useAuthStore();
  const location = useLocation();

  if (!user && !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isStaffOrAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
