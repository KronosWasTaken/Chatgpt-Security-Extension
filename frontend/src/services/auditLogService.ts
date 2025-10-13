import { apiClient, TokenManager } from './api';
import axios from 'axios';

// Audit Log Types
export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  client_id?: string;
  msp_id?: string;
  event_type: string;
  event_category: 'authentication' | 'file_scan' | 'ai_inventory' | 'alerts' | 'compliance' | 'system' | 'user_action';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
  source: 'frontend' | 'extension' | 'backend';
  session_id?: string;
}

export interface AuditLogFilter {
  event_type?: string;
  event_category?: string;
  severity?: string;
  user_id?: string;
  client_id?: string;
  msp_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}

// Audit Log Service
class AuditLogService {
  private static instance: AuditLogService;
  private sessionId: string;
  private userAgent: string;
  private lastSendTimestamps: Map<string, number> = new Map();
  private cachedIP: string | null = null;
  private ipFetchPromise: Promise<string> | null = null;
  // One hour throttle window
  private staticThrottleMs = 3600000;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.userAgent = navigator.userAgent;
  }

  static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserInfo() {
    const user = TokenManager.getUser();
    return {
      user_id: user?.user_id,
      client_id: user?.client_id,
      msp_id: user?.msp_id,
    };
  }

  private async getClientIP(): Promise<string> {
    // Return cached IP if available
    if (this.cachedIP) {
      return this.cachedIP;
    }

    // If there's already a fetch in progress, wait for it
    if (this.ipFetchPromise) {
      return this.ipFetchPromise;
    }

    // Start a new fetch
    this.ipFetchPromise = this.fetchIP();
    
    try {
      const ip = await this.ipFetchPromise;
      this.cachedIP = ip;
      return ip;
    } finally {
      this.ipFetchPromise = null;
    }
  }

  private async fetchIP(): Promise<string> {
    try {
      // Use a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
        cache: 'force-cache' // Use browser cache if available
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      // If IP fetch fails, return 'unknown' and don't retry
      return 'unknown';
    }
  }

  // Core logging method
  async logEvent(event: Omit<AuditLogEntry, 'id' | 'timestamp' | 'session_id' | 'ip_address' | 'user_agent'>): Promise<void> {
    try {
      const userInfo = this.getCurrentUserInfo();
      const ipAddress = await this.getClientIP();

      const auditEntry: AuditLogEntry = {
        ...event,
        ...userInfo,
        session_id: this.sessionId,
        ip_address: ipAddress,
        user_agent: this.userAgent,
        timestamp: new Date().toISOString(),
      };

      // Send to backend (silent failure tolerated)
      await this.sendToBackend(auditEntry);

      // Also log to console in development
      if (import.meta.env.DEV) {
        // keep a single concise log in dev
        // console.log('Audit Log (dev):', auditEntry);
      }
    } catch {
      // Swallow audit errors to avoid impacting UX
    }
  }

  private async sendToBackend(auditEntry: AuditLogEntry): Promise<void> {
    try {
      // Throttle duplicates by event_type + route/message within staticThrottleMs
      const route = (auditEntry.details as any)?.route || '';
      const key = `${auditEntry.event_type}:${route || auditEntry.message}`;
      const now = Date.now();
      const last = this.lastSendTimestamps.get(key) || 0;
      if (now - last < this.staticThrottleMs) {
        return;
      }
      this.lastSendTimestamps.set(key, now);

      await axios.post(`${apiClient['baseURL']}/audit/events`, auditEntry, {
        headers: {
          'Content-Type': 'application/json',
          ...(TokenManager.getToken() && { 'Authorization': `Bearer ${TokenManager.getToken()}` })
        },
        timeout: 10000,
      });
    } catch {
      // Store locally if backend fails
      this.storeLocally(auditEntry);
    }
  }

  private storeLocally(auditEntry: AuditLogEntry): void {
    try {
      const stored = localStorage.getItem('audit_logs_pending');
      const logs = stored ? JSON.parse(stored) : [];
      logs.push(auditEntry);
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      localStorage.setItem('audit_logs_pending', JSON.stringify(logs));
    } catch {
      // ignore local storage failures
    }
  }

  // Specific logging methods for different event types
  async logAuthentication(action: 'login' | 'logout' | 'token_refresh' | 'login_failed', details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      event_type: `auth_${action}`,
      event_category: 'authentication',
      severity: action === 'login_failed' ? 'medium' : 'low',
      message: `User ${action}${action === 'login_failed' ? ' failed' : ''}`,
      details,
      source: 'frontend',
    });
  }

  async logFileScan(action: 'scan_initiated' | 'scan_completed' | 'scan_failed' | 'file_blocked' | 'file_allowed', details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      event_type: `file_scan_${action}`,
      event_category: 'file_scan',
      severity: action === 'file_blocked' || action === 'scan_failed' ? 'high' : 'low',
      message: `File scan ${action.replace('_', ' ')}`,
      details,
      source: 'frontend',
    });
  }

  async logAIInventory(action: 'create' | 'update' | 'delete' | 'approve' | 'reject', details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      event_type: `ai_inventory_${action}`,
      event_category: 'ai_inventory',
      severity: action === 'delete' ? 'high' : 'medium',
      message: `AI application ${action}d`,
      details,
      source: 'frontend',
    });
  }

  async logAlert(action: 'view' | 'assign' | 'resolve' | 'escalate', details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      event_type: `alert_${action}`,
      event_category: 'alerts',
      severity: action === 'escalate' ? 'high' : 'medium',
      message: `Alert ${action}d`,
      details,
      source: 'frontend',
    });
  }

  async logUserAction(action: string, details?: Record<string, any>): Promise<void> {
    // Throttle navigation logging specifically to prevent spam
    if (action === 'navigation') {
      const route = details?.route || '';
      const key = `navigation:${route}`;
      const now = Date.now();
      const last = this.lastSendTimestamps.get(key) || 0;
      if (now - last < 30000) { // 30 second throttle for navigation
        return;
      }
      this.lastSendTimestamps.set(key, now);
    }

    await this.logEvent({
      event_type: `user_action_${action}`,
      event_category: 'user_action',
      severity: 'low',
      message: `User action: ${action}`,
      details,
      source: 'frontend',
    });
  }

  async logSystemEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'low', details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      event_type: `system_${event}`,
      event_category: 'system',
      severity,
      message: `System event: ${event}`,
      details,
      source: 'frontend',
    });
  }

  // Retrieve audit logs
  async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogResponse> {
    const response = await axios.get(`${apiClient['baseURL']}/audit/logs`, {
      params: filter,
      headers: {
        ...(TokenManager.getToken() && { 'Authorization': `Bearer ${TokenManager.getToken()}` })
      },
      timeout: 10000,
    });
    return response.data;
  }

  // Export audit logs
  async exportAuditLogs(filter: AuditLogFilter = {}, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await axios.post(`${apiClient['baseURL']}/audit/export`, 
      { ...filter, format }, 
      {
        headers: {
          'Content-Type': 'application/json',
          ...(TokenManager.getToken() && { 'Authorization': `Bearer ${TokenManager.getToken()}` })
        },
        responseType: 'blob',
        timeout: 30000,
      }
    );
    return response.data;
  }

  // Retry sending pending logs
  async retryPendingLogs(): Promise<void> {
    try {
      const stored = localStorage.getItem('audit_logs_pending');
      if (!stored) return;

      const logs: AuditLogEntry[] = JSON.parse(stored);
      const successful: number[] = [];

      for (let i = 0; i < logs.length; i++) {
        try {
          await this.sendToBackend(logs[i]);
          successful.push(i);
        } catch {
          // ignore
        }
      }

      // Remove successfully sent logs
      const remaining = logs.filter((_, index) => !successful.includes(index));
      localStorage.setItem('audit_logs_pending', JSON.stringify(remaining));
    } catch {
      // ignore
    }
  }
}

// Create singleton instance
export const auditLogService = AuditLogService.getInstance();

// Hook for easy use in React components
export const useAuditLog = () => {
  return {
    logAuthentication: auditLogService.logAuthentication.bind(auditLogService),
    logFileScan: auditLogService.logFileScan.bind(auditLogService),
    logAIInventory: auditLogService.logAIInventory.bind(auditLogService),
    logAlert: auditLogService.logAlert.bind(auditLogService),
    logUserAction: auditLogService.logUserAction.bind(auditLogService),
    logSystemEvent: auditLogService.logSystemEvent.bind(auditLogService),
    getAuditLogs: auditLogService.getAuditLogs.bind(auditLogService),
    exportAuditLogs: auditLogService.exportAuditLogs.bind(auditLogService),
  };
};

// Auto-retry pending logs on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    auditLogService.retryPendingLogs();
  });
}
