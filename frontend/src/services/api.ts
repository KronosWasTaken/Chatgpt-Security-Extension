import { toast } from "@/hooks/use-toast";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Types
export interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  msp_id?: string;
  client_id?: string;
  department?: string;
  permissions: string[];
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  company_size: string;
  status: string;
  subscription_tier: string;
  apps_monitored: number;
  interactions_monitored: number;
  agents_deployed: number;
  risk_score: number;
  compliance_coverage: number;
  created_at: string;
  updated_at: string;
}

export interface AIApplication {
  id: string;
  name: string;
  vendor: string;
  type: 'Application' | 'Agent' | 'API' | 'Plugin';
  status: 'Permitted' | 'Unsanctioned' | 'Under_Review' | 'Blocked';
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_score: number;
  active_users: number;
  avg_daily_interactions: number;
  integrations?: any;
  approval_conditions?: any;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  client_id: string;
  application_id?: string;
  user_id?: string;
  alert_family: string;
  subtype?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Unassigned' | 'Pending' | 'Complete' | 'AI Resolved';
  title: string;
  description: string;
  users_affected: number;
  interaction_count: number;
  frameworks?: any;
  assigned_to?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_info: User;
}

// Token management
class TokenManager {
  private static TOKEN_KEY = 'auth_token';
  private static USER_KEY = 'user_info';

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// API Client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = TokenManager.getToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          TokenManager.removeToken();
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    TokenManager.setToken(response.access_token);
    TokenManager.setUser(response.user_info);
    
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async refreshToken(): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
    });
    
    TokenManager.setToken(response.access_token);
    TokenManager.setUser(response.user_info);
    
    return response;
  }

  async logout(): Promise<void> {
    TokenManager.removeToken();
  }

  // Client endpoints
  async getClients(): Promise<Client[]> {
    return this.request<Client[]>('/clients/');
  }

  async getClient(clientId: string): Promise<Client> {
    return this.request<Client>(`/clients/${clientId}`);
  }

  async getClientDashboard(clientId: string): Promise<any> {
    return this.request<any>(`/clients/${clientId}/dashboard`);
  }

  // AI Inventory endpoints
  async getAIInventory(): Promise<AIApplication[]> {
    return this.request<AIApplication[]>('/ai-inventory/');
  }

  async getAIApplication(appId: string): Promise<AIApplication> {
    return this.request<AIApplication>(`/ai-inventory/${appId}`);
  }

  async createAIApplication(appData: Partial<AIApplication>): Promise<AIApplication> {
    return this.request<AIApplication>('/ai-inventory/', {
      method: 'POST',
      body: JSON.stringify(appData),
    });
  }

  async updateAIApplication(appId: string, appData: Partial<AIApplication>): Promise<AIApplication> {
    return this.request<AIApplication>(`/ai-inventory/${appId}`, {
      method: 'PUT',
      body: JSON.stringify(appData),
    });
  }

  async deleteAIApplication(appId: string): Promise<void> {
    return this.request<void>(`/ai-inventory/${appId}`, {
      method: 'DELETE',
    });
  }

  // Alert endpoints
  async getAlerts(params?: {
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<Alert[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/alerts/?${queryString}` : '/alerts/';
    
    return this.request<Alert[]>(endpoint);
  }

  async getAlert(alertId: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${alertId}`);
  }

  async updateAlertStatus(alertId: string, status: string, assignedTo?: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, assigned_to: assignedTo }),
    });
  }

  async assignAlert(alertId: string, assignedTo: string): Promise<void> {
    return this.request<void>(`/alerts/${alertId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
  }

  async getAlertsFeed(): Promise<{ alerts: Alert[] }> {
    return this.request<{ alerts: Alert[] }>('/alerts/feed/real-time');
  }
}

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export token manager for use in components
export { TokenManager };

// Utility functions
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  const message = error.message || 'An unexpected error occurred';
  
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
  });
  
  return message;
};

// Auth hook
export const useAuth = () => {
  const isAuthenticated = TokenManager.isAuthenticated();
  const user = TokenManager.getUser();
  
  const login = async (credentials: LoginRequest) => {
    try {
      const response = await apiClient.login(credentials);
      toast({
        title: "Welcome back!",
        description: `Hello, ${response.user_info.name}`,
      });
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      await apiClient.logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      handleApiError(error);
    }
  };
  
  return {
    isAuthenticated,
    user,
    login,
    logout,
  };
};
