/**
 * React hooks for WebSocket client engagement
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, WebSocketMessage, WebSocketMessageType } from '@/services/websocket';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useApi';

export interface UseWebSocketOptions {
  clientId?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    clientId,
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const wsRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (wsRef.current?.isConnected()) {
      return;
    }

    try {
      const ws = new WebSocketClient('/ws/engagement', clientId);
      wsRef.current = ws;

      await ws.connect();
      setIsConnected(true);
      setConnectionError(null);
      onConnect?.();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnected(false);
      onError?.(error);
    }
  }, [clientId, onConnect, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
      setIsConnected(false);
      onDisconnect?.();
    }
  }, [onDisconnect]);

  const subscribe = useCallback((type: WebSocketMessageType, handler: (message: WebSocketMessage) => void) => {
    if (!wsRef.current) {
      console.warn('WebSocket not initialized');
      return () => {};
    }
    return wsRef.current.on(type, handler);
  }, []);

  const send = useCallback((message: object) => {
    if (!wsRef.current) {
      console.warn('WebSocket not initialized');
      return;
    }
    wsRef.current.send(message);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    subscribe,
    send,
    ws: wsRef.current
  };
};

/**
 * Hook for real-time client engagement updates
 */
export const useClientEngagementWebSocket = (clientId?: string) => {
  const queryClient = useQueryClient();
  const [latestEngagementData, setLatestEngagementData] = useState<any>(null);
  const [latestInteractionData, setLatestInteractionData] = useState<any>(null);
  const [latestAlert, setLatestAlert] = useState<any>(null);

  const handleEngagementUpdate = useCallback((message: WebSocketMessage) => {
    console.log('Engagement update received:', message);
    setLatestEngagementData(message.data);
    
    // Invalidate relevant queries to trigger refetch
    if (message.client_id) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.clientDashboard(message.client_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['clients', message.client_id, 'interactions'] 
      });
    }
  }, [queryClient]);

  const handleInteractionUpdate = useCallback((message: WebSocketMessage) => {
    console.log('Interaction update received:', message);
    setLatestInteractionData(message.data);
    
    // Invalidate relevant queries
    if (message.client_id) {
      queryClient.invalidateQueries({ 
        queryKey: ['clients', message.client_id, 'interactions'] 
      });
      
      if (message.data?.app_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['clients', message.client_id, 'applications', message.data.app_id, 'interactions'] 
        });
      }
    }
  }, [queryClient]);

  const handleAlert = useCallback((message: WebSocketMessage) => {
    console.log('Alert received:', message);
    setLatestAlert(message.data);
    
    // Invalidate alerts queries
    queryClient.invalidateQueries({ queryKey: queryKeys.alertsFeed });
    if (message.client_id) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.alerts({ client_id: message.client_id }) 
      });
    }
  }, [queryClient]);

  const { isConnected, connectionError, connect, disconnect, subscribe, send } = useWebSocket({
    clientId,
    autoConnect: true,
    onConnect: () => {
      console.log('Client engagement WebSocket connected');
    },
    onDisconnect: () => {
      console.log('Client engagement WebSocket disconnected');
    },
    onError: (error) => {
      console.error('Client engagement WebSocket error:', error);
    }
  });

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to different message types
    const unsubscribeEngagement = subscribe('engagement_update', handleEngagementUpdate);
    const unsubscribeInteraction = subscribe('interaction_update', handleInteractionUpdate);
    const unsubscribeAlert = subscribe('alert', handleAlert);
    const unsubscribeConnection = subscribe('connection', (message) => {
      console.log('Connection status:', message);
    });

    return () => {
      unsubscribeEngagement();
      unsubscribeInteraction();
      unsubscribeAlert();
      unsubscribeConnection();
    };
  }, [isConnected, subscribe, handleEngagementUpdate, handleInteractionUpdate, handleAlert]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    send,
    latestEngagementData,
    latestInteractionData,
    latestAlert,
    subscribeToClient: (targetClientId: string) => {
      send({ type: 'subscribe', client_id: targetClientId });
    }
  };
};

/**
 * Hook for MSP-wide engagement updates
 */
export const useMSPEngagementWebSocket = () => {
  return useClientEngagementWebSocket();
};
