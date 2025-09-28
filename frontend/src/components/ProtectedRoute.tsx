

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { TokenManager } from "@/services/api";

interface ProtectedRouteProps {
  requiredRole?: string[];
}

export const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const location = useLocation();
  const isAuthenticated = TokenManager.isAuthenticated();
  const user = TokenManager.getUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />; 
};


export const RoleBasedRedirect = () => {
  const user = TokenManager.getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'msp_admin' || user.role === 'msp_user') {
    return <Navigate to="/dashboard" replace />;
  } else if (user.role === 'client_admin' || user.role === 'end_user') {
    return <Navigate to="/client" replace />;
  }

  return <Outlet />; 
};