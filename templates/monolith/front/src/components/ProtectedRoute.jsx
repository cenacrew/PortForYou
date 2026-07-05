import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export function isLoggedIn() {
  return localStorage.getItem('logged_in') === 'true';
}

export default function ProtectedRoute() {
  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
