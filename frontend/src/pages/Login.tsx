import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";


const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, isLoading, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  // Redirect if already authenticated
  if (user) {
    if (user.role === 'msp_admin' || user.role === 'msp_user') {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/client", { replace: true });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(formData);
      // Navigation will be handled by the redirect logic above
    } catch (error: any) {
      setError(error.message || "Invalid credentials");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4 relative">
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-slate-100/20 pointer-events-none" />
      
      <Card className={`w-full max-w-md bg-white shadow-xl border-0 relative animate-fade-up ${shake ? 'animate-shake' : ''}`}>
        {/* Gradient border ring */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl p-[1px]">
          <div className="bg-white rounded-2xl h-full w-full" />
        </div>
        
        <div className="relative z-10 p-8">
          <CardHeader className="text-center space-y-6 p-0 pb-8">
            {/* Logo */}
            <div className="mx-auto">
              <img 
                src="/lovable-uploads/78a6b696-f5a7-4c55-ac46-34ccd0c1b32d.png" 
                alt="Cybercept Logo" 
                className="h-48 w-auto mx-auto"
              />
            </div>
          </CardHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 h-12 border-slate-200 focus:border-primary focus:ring-primary"
                  aria-invalid={error ? 'true' : 'false'}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 h-12 border-slate-200 focus:border-primary focus:ring-primary"
                  aria-invalid={error ? 'true' : 'false'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}


            {/* Submit Button */}
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Access Platform
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>

            {/* Helper Text */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Authorized personnel only. All access is monitored and logged.
              </p>
            </div>
          </form>
        </div>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-slate-400">
          © 2025 Cybercept. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;