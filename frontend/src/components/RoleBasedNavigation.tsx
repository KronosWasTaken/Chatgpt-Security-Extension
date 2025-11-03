import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield, Building2 } from "lucide-react";

interface RoleBasedNavigationProps {
  className?: string;
}

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({ className = "" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'msp_admin':
      case 'msp_user':
        return <Building2 className="w-4 h-4" />;
      case 'client_admin':
      case 'end_user':
        return <User className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'msp_admin':
        return 'MSP Administrator';
      case 'msp_user':
        return 'MSP User';
      case 'client_admin':
        return 'Client Administrator';
      case 'end_user':
        return 'End User';
      default:
        return role;
    }
  };

  const getDashboardPath = (role: string) => {
    switch (role) {
      case 'msp_admin':
      case 'msp_user':
        return '/dashboard';
      case 'client_admin':
      case 'end_user':
        return '/client';
      default:
        return '/';
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* User info */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {getRoleIcon(user.role)}
        <span className="font-medium">{user.name}</span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-500">{getRoleDisplayName(user.role)}</span>
      </div>

      {/* Dashboard button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(getDashboardPath(user.role))}
        className="text-slate-600 hover:text-slate-900"
      >
        Dashboard
      </Button>

      {/* Logout button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-slate-600 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4 mr-1" />
        Logout
      </Button>
    </div>
  );
};
