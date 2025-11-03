/**
 * WebSocket Service for Real-time Client Engagement Updates
 */

import { TokenManager } from './api';

export type WebSocketMessageType = 
  | 'connection'
  | 'engagement_update'
  | 'interaction_update'
  | 'alert'
  | 'pong'
  | 'subscribed'
  | 'error'
  | 'info';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp?: string;
  client_id?: string;
  data?: any;
  message?: string;
  status?: string;
  scope?: string;
  user_role?: string;
}

export type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: Map<WebSocketMessageType, Set<MessageHandler>> = new Map();
  private isIntentionallyClosed = false;
  
  constructor(
    private endpoint: string,
    private clientId?: string
  ) {}
  
  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isIntentionallyClosed = false;
      
      const token = TokenManager.getToken();
      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }
      
      // Build WebSocket URL
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const wsUrl = baseUrl.replace(/^http/, 'ws');
      
      let url: string;
      if (this.clientId) {
        url = `${wsUrl}/ws/client/${this.clientId}/engagement?token=${token}`;
      } else {
        url = `${wsUrl}/ws/engagement?token=${token}`;
      }
      
      console.log('Connecting to WebSocket:', url.replace(token, 'TOKEN'));
      
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startPingInterval();
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.stopPingInterval();
        
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
    });
  }
  
  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  /**
   * Send a message to the server
   */
  send(message: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }
  
  /**
   * Subscribe to a specific message type
   */
  on(type: WebSocketMessageType, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }
  
  /**
   * Subscribe to a specific client (for MSP users)
   */
  subscribeToClient(clientId: string): void {
    this.send({
      type: 'subscribe',
      client_id: clientId
    });
  }
  
  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
    
    // Also call generic handlers
    const allHandlers = this.messageHandlers.get('connection' as WebSocketMessageType);
    if (allHandlers && message.type !== 'connection') {
      // Note: This allows subscribing to all messages via 'connection' type
      // You might want to create a dedicated 'all' type instead
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }
  
  /**
   * Start sending periodic pings
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Ping every 30 seconds
  }
  
  /**
   * Stop sending periodic pings
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

/**
 * Create a WebSocket client for general engagement updates
 */
export const createEngagementWebSocket = () => {
  return new WebSocketClient('/ws/engagement');
};

/**
 * Create a WebSocket client for specific client engagement updates
 */
export const createClientEngagementWebSocket = (clientId: string) => {
  return new WebSocketClient('/ws/engagement', clientId);
};
