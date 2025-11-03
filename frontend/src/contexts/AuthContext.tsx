import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, TokenManager, apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = TokenManager.getToken();
        const storedUser = TokenManager.getUser();
        
        if (token && storedUser) {
          // Verify token is still valid by fetching current user
          try {
            const currentUser = await apiClient.getCurrentUser();
            setUser(currentUser);
          } catch (error) {
            // Token is invalid, clear storage
            TokenManager.removeToken();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
  try {
      setIsLoading(true);
      const response = await apiClient.login(credentials);
      setUser(response.user_info);
      
      toast({
        title: "Welcome back!",
        description: `Hello, ${response.user_info.name}`,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      TokenManager.removeToken();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
      TokenManager.setUser(currentUser);
    } catch (error) {
      console.error('Refresh user error:', error);
      // If refresh fails, user might be logged out
      setUser(null);
      TokenManager.removeToken();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
