import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const ProtectedRoute: React.FC = () => {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();

  if (!user && !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
