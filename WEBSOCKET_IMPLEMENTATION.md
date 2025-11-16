# WebSocket Implementation for Real-time Client Engagement

This document describes the WebSocket implementation for real-time client engagement updates in the AI Compliance Platform.

## Overview

The WebSocket implementation enables real-time communication between the backend and frontend for:
- **Engagement updates**: Real-time AI engagement metrics and statistics
- **Interaction updates**: Live tracking of user interactions with AI services
- **Alerts**: Immediate notification of security and compliance alerts

## Architecture

### Backend Components

#### 1. WebSocket Manager (`backend/app/services/websocket_manager.py`)
- **ConnectionManager**: Central class managing all WebSocket connections
- Supports client-scoped and MSP-scoped connections
- Handles broadcasting to multiple clients
- Automatic connection cleanup

**Key Features:**
- Connection pooling by client_id and msp_id
- Broadcast engagement, interaction, and alert updates
- Connection statistics tracking

#### 2. WebSocket Endpoints (`backend/app/api/v1/endpoints/websocket.py`)

**Endpoints:**

1. **`/ws/engagement`** - General engagement updates
   - MSP users: Receive updates for all clients
   - Client users: Receive updates for their client only
   - Query param: `token` (JWT authentication)

2. **`/ws/client/{client_id}/engagement`** - Client-specific engagement
   - Targeted updates for a specific client
   - Automatic authorization checking
   - Path param: `client_id`
   - Query param: `token`

3. **`/ws/stats`** (GET) - WebSocket connection statistics
   - Returns active connection counts
   - Useful for monitoring

**Message Types:**
- `connection`: Connection established/status
- `engagement_update`: New engagement data
- `interaction_update`: Interaction statistics
- `alert`: New alerts
- `ping`/`pong`: Keep-alive
- `subscribe`: Subscribe to specific client (MSP users)

### Frontend Components

#### 1. WebSocket Service (`frontend/src/services/websocket.ts`)

**WebSocketClient Class:**
- Handles WebSocket connection lifecycle
- Automatic reconnection with exponential backoff
- Keep-alive ping mechanism (30s interval)
- Type-safe message handling

**Usage:**
```typescript
import { WebSocketClient } from '@/services/websocket';

const ws = new WebSocketClient('/ws/engagement', clientId);
await ws.connect();

ws.on('engagement_update', (message) => {
  console.log('Engagement update:', message.data);
});

ws.disconnect();
```

#### 2. React Hooks (`frontend/src/hooks/useWebSocket.ts`)

**useWebSocket Hook:**
Basic WebSocket connection management
```typescript
const { isConnected, subscribe, send, disconnect } = useWebSocket({
  clientId: 'optional-client-id',
  autoConnect: true,
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  onError: (error) => console.error(error)
});
```

**useClientEngagementWebSocket Hook:**
High-level hook with automatic query invalidation
```typescript
const {
  isConnected,
  latestEngagementData,
  latestInteractionData,
  latestAlert,
  subscribeToClient
} = useClientEngagementWebSocket(clientId);
```

**useMSPEngagementWebSocket Hook:**
For MSP-wide engagement monitoring
```typescript
const mspWebSocket = useMSPEngagementWebSocket();
```

## Integration Examples

### Example 1: Real-time Engagement Dashboard

```tsx
import { useClientEngagementWebSocket } from '@/hooks/useWebSocket';

function EngagementDashboard({ clientId }: { clientId: string }) {
  const {
    isConnected,
    latestEngagementData,
    connectionError
  } = useClientEngagementWebSocket(clientId);

  return (
    <div>
      <div>Status: {isConnected ? ' Connected' : ' Disconnected'}</div>
      {connectionError && <div>Error: {connectionError}</div>}
      
      {latestEngagementData && (
        <div>
          <h3>Latest Update</h3>
          <pre>{JSON.stringify(latestEngagementData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Live Interaction Counter

```tsx
function InteractionCounter({ clientId }: { clientId: string }) {
  const [interactionCount, setInteractionCount] = useState(0);
  
  const { subscribe, isConnected } = useWebSocket({ 
    clientId,
    autoConnect: true 
  });

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('interaction_update', (message) => {
      if (message.data?.interaction_count) {
        setInteractionCount(prev => prev + message.data.interaction_count);
      }
    });

    return unsubscribe;
  }, [isConnected, subscribe]);

  return <div>Total Interactions: {interactionCount}</div>;
}
```

### Example 3: Real-time Alert Notifications

```tsx
function AlertNotifications() {
  const { latestAlert, isConnected } = useClientEngagementWebSocket();
  const { toast } = useToast();

  useEffect(() => {
    if (latestAlert) {
      toast({
        title: 'New Alert',
        description: latestAlert.details || 'A new alert has been triggered',
        variant: latestAlert.severity === 'high' ? 'destructive' : 'default'
      });
    }
  }, [latestAlert, toast]);

  return (
    <div>
      WebSocket Status: {isConnected ? ' Active' : ' Inactive'}
    </div>
  );
}
```

### Example 4: MSP Multi-Client Monitoring

```tsx
function MSPDashboard() {
  const { isConnected, subscribeToClient } = useMSPEngagementWebSocket();
  const [clients] = useState(['client-1', 'client-2', 'client-3']);

  useEffect(() => {
    if (isConnected) {
      // Subscribe to specific clients
      clients.forEach(clientId => {
        subscribeToClient(clientId);
      });
    }
  }, [isConnected, clients, subscribeToClient]);

  return <div>Monitoring {clients.length} clients</div>;
}
```

## Backend Broadcast Usage

To broadcast updates from backend services:

```python
from app.services.websocket_manager import connection_manager

# Broadcast engagement update
await connection_manager.broadcast_engagement_update(
    client_id="client-uuid",
    msp_id="msp-uuid",
    engagement_data={
        "departments": [...],
        "applications": [...],
        "agents": [...]
    }
)

# Broadcast interaction update
await connection_manager.broadcast_interaction_update(
    client_id="client-uuid",
    msp_id="msp-uuid",
    interaction_stats={
        "app_id": "app-uuid",
        "interaction_count": 5,
        "total_daily_interactions": 150
    }
)

# Broadcast alert
await connection_manager.broadcast_alert(
    client_id="client-uuid",
    msp_id="msp-uuid",
    alert_data={
        "severity": "high",
        "details": "Suspicious activity detected",
        "app": "ChatGPT"
    }
)
```

## Authentication

WebSocket connections use JWT token authentication:
- Token passed as query parameter: `?token=<jwt_token>`
- Same token used for REST API authentication
- Automatic role-based access control

**Authorization:**
- **MSP users** (`msp_admin`, `msp_user`): Access all clients under their MSP
- **Client users** (`client_admin`, `client_user`): Access only their client data

## Connection Management

### Automatic Reconnection
- Max reconnection attempts: 5
- Exponential backoff: 3s, 6s, 12s, 24s, 48s
- Automatic cleanup on intentional disconnect

### Keep-alive
- Client sends ping every 30 seconds
- Server responds with pong
- Connection dropped if no response

### Connection Lifecycle
1. Connect with authentication token
2. Receive connection confirmation
3. Subscribe to message types
4. Receive real-time updates
5. Automatic reconnection on disconnect
6. Manual disconnect when component unmounts

## Message Format

All WebSocket messages follow this structure:

```typescript
interface WebSocketMessage {
  type: 'connection' | 'engagement_update' | 'interaction_update' | 'alert' | 'pong' | 'error';
  timestamp?: string;        // ISO 8601 timestamp
  client_id?: string;        // Client UUID
  data?: any;                // Message payload
  message?: string;          // Error/info messages
  status?: string;           // Connection status
  scope?: string;            // Connection scope
  user_role?: string;        // User role
}
```

## Error Handling

### Connection Errors
- Authentication failures (1008 close code)
- Network errors (automatic reconnection)
- Invalid role/permissions

### Message Errors
- JSON parsing errors
- Invalid message format
- Authorization errors for subscriptions

## Monitoring

### WebSocket Statistics Endpoint
```bash
GET /api/v1/ws/stats

Response:
{
  "total_connections": 15,
  "client_connections": {
    "client-uuid-1": 3,
    "client-uuid-2": 2
  },
  "msp_connections": {
    "msp-uuid-1": 10
  }
}
```

### Logging
- Connection/disconnection events
- Broadcast failures
- Authentication failures
- Message handling errors

## Testing

### Test WebSocket Connection
```typescript
const ws = new WebSocketClient('/ws/engagement');
await ws.connect();

ws.on('connection', (message) => {
  console.log('Connected:', message);
});

// Send ping
ws.send({ type: 'ping', timestamp: new Date().toISOString() });
```

### Test From Browser Console
```javascript
const token = localStorage.getItem('token');
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/engagement?token=${token}`);

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
ws.onerror = (error) => console.error('Error:', error);
```

## Performance Considerations

- **Connection pooling**: Connections grouped by client/MSP for efficient broadcasting
- **Message batching**: Consider batching frequent updates
- **Selective subscriptions**: MSP users can subscribe to specific clients
- **Automatic cleanup**: Disconnected sockets removed immediately

## Security Considerations

-  JWT authentication required
-  Role-based access control
-  Client/MSP isolation
-  Connection limit per user (can be added)
-  Message validation
-  Consider rate limiting for messages
-  Consider encryption for sensitive data

## Future Enhancements

1. **Message compression**: For large engagement datasets
2. **Binary messages**: For more efficient data transfer
3. **Channel subscriptions**: Fine-grained topic subscriptions
4. **Presence detection**: Track online users
5. **Message persistence**: Queue messages for offline clients
6. **Load balancing**: Redis pub/sub for horizontal scaling

## Troubleshooting

### Connection Fails Immediately
- Check JWT token validity
- Verify user has correct role
- Check CORS settings

### No Updates Received
- Verify WebSocket connection is established
- Check backend is broadcasting updates
- Verify user has access to client data

### Frequent Disconnections
- Check network stability
- Verify server resources
- Check for authentication token expiration

### Messages Not Invalidating Queries
- Verify React Query is properly configured
- Check query keys match in useWebSocket hook
- Verify queryClient is available in context

## Support

For issues or questions:
1. Check browser console for WebSocket errors
2. Check backend logs for connection/broadcast errors
3. Verify authentication and authorization
4. Test with WebSocket statistics endpoint
