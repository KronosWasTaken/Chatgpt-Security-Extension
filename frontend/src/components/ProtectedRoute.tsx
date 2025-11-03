
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  requiredRole?: string[];
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ requiredRole, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading skeleton while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 p-6">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (user) {
    // If requiredRole is specified, user must have one of those roles
    if (requiredRole && !requiredRole.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }

    // If allowedRoles is specified, user must have one of those roles
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />; 
};

export const RoleBasedRedirect = () => {
  const { user, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 p-6">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route based on user role
  if (user.role === 'msp_admin' || user.role === 'msp_user') {
    return <Navigate to="/dashboard" replace />;
  } else if (user.role === 'client_admin' || user.role === 'end_user') {
    return <Navigate to="/client" replace />;
  }

  // Fallback for unknown roles
  return <Navigate to="/unauthorized" replace />;
};