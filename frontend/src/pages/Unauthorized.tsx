import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, Home, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    if (user?.role === 'msp_admin' || user?.role === 'msp_user') {
      navigate('/dashboard');
    } else if (user?.role === 'client_admin' || user?.role === 'end_user') {
      navigate('/client');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Access Denied
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <Shield className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You don't have permission to access this resource. 
              {user && (
                <span className="block mt-1 text-sm">
                  Your current role: <strong>{user.role}</strong>
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={handleGoBack}
              variant="outline" 
              className="w-full justify-start"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            <Button 
              onClick={handleGoHome}
              className="w-full justify-start"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="destructive" 
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
