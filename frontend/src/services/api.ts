import { toast } from "@/hooks/use-toast";
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { auditLogService } from "./auditLogService";

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
    options: RequestInit & { params?: Record<string, any> } = {}
  ): Promise<T> {
    const token = TokenManager.getToken();
    
    // Handle query parameters
    let url = `${this.baseURL}${endpoint}`;
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    const axiosConfig: AxiosRequestConfig = {
      url,
      method: (options.method as AxiosRequestConfig["method"]) || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
      data: options.body,
    };

    const attempt = async (): Promise<T> => {
      const response = await axios.request<T>(axiosConfig);
      return response.data;
    };

    try {
      return await attempt();
    } catch (err) {
      const error = err as AxiosError<any>;
      if (error.response) {
        if (error.response.status === 429) {
          // Simple backoff then one retry
          await new Promise((r) => setTimeout(r, 1000));
          try {
            return await attempt();
          } catch (retryErr) {
            const re = retryErr as AxiosError<any>;
            const detail2 = (re.response?.data as any)?.detail;
            throw new Error(detail2 || `HTTP ${re.response?.status}`);
          }
        }
        if (error.response.status === 401) {
          TokenManager.removeToken();
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }
        const detail = (error.response.data as any)?.detail;
        throw new Error(detail || `HTTP ${error.response.status}`);
      }
      if (error.request) {
        throw new Error('Network error: No response received');
      }
      throw new Error(error.message || 'API request failed');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      TokenManager.setToken(response.access_token);
      TokenManager.setUser(response.user_info);
      
      // Log successful login
      console.log('🔍 Attempting to log successful login...');
      try {
        await auditLogService.logAuthentication('login', {
          user_email: credentials.email,
          user_role: response.user_info.role,
          login_time: new Date().toISOString(),
        });
        console.log('✅ Login audit log successful');
      } catch (auditError) {
        console.error('❌ Login audit log failed:', auditError);
      }
      
      return response;
    } catch (error) {
      // Log failed login attempt
      console.log('🔍 Attempting to log failed login...');
      try {
        await auditLogService.logAuthentication('login_failed', {
          user_email: credentials.email,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          attempt_time: new Date().toISOString(),
        });
        console.log('✅ Failed login audit log successful');
      } catch (auditError) {
        console.error('❌ Failed login audit log failed:', auditError);
      }
      throw error;
    }
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
    const user = TokenManager.getUser();
    
    // Log logout before removing token
    console.log('🔍 Attempting to log logout...');
    try {
      await auditLogService.logAuthentication('logout', {
        user_email: user?.email,
        user_role: user?.role,
        logout_time: new Date().toISOString(),
      });
      console.log('✅ Logout audit log successful');
    } catch (auditError) {
      console.error('❌ Logout audit log failed:', auditError);
    }
    
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
    const raw = await this.request<any>('/ai-inventory/');
    // Backend returns: [{ clientId, clientName, items: [...] }]
    const entries: any[] = Array.isArray(raw) ? raw : [];
    const flat: AIApplication[] = entries.flatMap((entry) => {
      const items: any[] = Array.isArray(entry?.items) ? entry.items : [];
      return items.map((it) => ({
        id: String(it.id),
        name: String(it.name),
        vendor: String(it.vendor || ''),
        type: it.type as AIApplication['type'],
        status: it.status as AIApplication['status'],
        risk_level: (it.risk_level || 'Low') as AIApplication['risk_level'],
        risk_score: Number(it.risk_score || 0),
        active_users: Number(it.active_users || it.users || 0),
        avg_daily_interactions: Number(it.avgDailyInteractions || it.avg_daily_interactions || 0),
        integrations: it.integrations,
        approval_conditions: it.approval_conditions,
        approved_by: it.approved_by,
        approved_at: it.approved_at,
        created_at: it.created_at || new Date().toISOString(),
        updated_at: it.updated_at || new Date().toISOString(),
      }));
    });
    return flat;
  }

  async getClientInventory(clientId: string): Promise<AIApplication[]> {
    const data = await this.request<any>(`/clients/${clientId}/inventory`);
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    return items.map((it: any) => ({
      id: String(it.id || it.name || Math.random()),
      name: String(it.name || it.application || ''),
      vendor: String(it.vendor || ''),
      type: (it.type || 'Application') as AIApplication['type'],
      status: (it.status || 'Permitted') as AIApplication['status'],
      risk_level: (it.risk_level || 'Low') as AIApplication['risk_level'],
      risk_score: Number(it.risk_score || 0),
      active_users: Number(it.active_users || it.users || 0),
      avg_daily_interactions: Number(it.avgDailyInteractions || it.avg_daily_interactions || 0),
      integrations: it.integrations,
      approval_conditions: it.approval_conditions,
      approved_by: it.approved_by,
      approved_at: it.approved_at,
      created_at: it.created_at || new Date().toISOString(),
      updated_at: it.updated_at || new Date().toISOString(),
    }));
  }

  async getAIApplication(appId: string): Promise<AIApplication> {
    return this.request<AIApplication>(`/ai-inventory/${appId}`);
  }

  async createAIApplication(appData: Partial<AIApplication>): Promise<AIApplication> {
    const response = await this.request<AIApplication>('/ai-inventory/', {
      method: 'POST',
      body: JSON.stringify(appData),
    });
    
    // Log AI application creation
    await auditLogService.logAIInventory('create', {
      application_id: response.id,
      application_name: response.name,
      application_type: response.type,
      vendor: response.vendor,
      risk_level: response.risk_level,
    });
    
    return response;
  }

  async updateAIApplication(appId: string, appData: Partial<AIApplication>): Promise<AIApplication> {
    const response = await this.request<AIApplication>(`/ai-inventory/${appId}`, {
      method: 'PUT',
      body: JSON.stringify(appData),
    });
    
    // Log AI application update
    await auditLogService.logAIInventory('update', {
      application_id: appId,
      application_name: response.name,
      changes: appData,
      previous_status: appData.status,
    });
    
    return response;
  }

  async deleteAIApplication(appId: string): Promise<void> {
    // Get application details before deletion for logging
    const app = await this.getAIApplication(appId);
    
    await this.request<void>(`/ai-inventory/${appId}`, {
      method: 'DELETE',
    });
    
    // Log AI application deletion
    await auditLogService.logAIInventory('delete', {
      application_id: appId,
      application_name: app.name,
      application_type: app.type,
      vendor: app.vendor,
      risk_level: app.risk_level,
    });
  }

  // Alert endpoints
  async getAlerts(params?: {
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<Alert[]> {
    return this.request<Alert[]>('/alerts/', {
      method: 'GET',
      params
    });
  }

  async getAlert(alertId: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${alertId}`);
  }

  async updateAlertStatus(alertId: string, status: string, assignedTo?: string): Promise<Alert> {
    const response = await this.request<Alert>(`/alerts/${alertId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, assigned_to: assignedTo }),
    });
    
    // Log alert status update
    await auditLogService.logAlert('resolve', {
      alert_id: alertId,
      alert_title: response.title,
      alert_severity: response.severity,
      new_status: status,
      assigned_to: assignedTo,
    });
    
    return response;
  }

  async assignAlert(alertId: string, assignedTo: string): Promise<void> {
    await this.request<void>(`/alerts/${alertId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
    
    // Log alert assignment
    await auditLogService.logAlert('assign', {
      alert_id: alertId,
      assigned_to: assignedTo,
    });





 
  }

  
 async GetAIEngagement(days?: number): Promise<any> {
    return this.request<any>(`/ai-engagement/msp/clients`, {
      method: 'GET',
      params: days ? { days } : undefined
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
