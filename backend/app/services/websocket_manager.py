"""
WebSocket Connection Manager for Real-time Client Engagement Updates
"""
from typing import Dict, Set, List
from fastapi import WebSocket
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages to connected clients"""
    
    def __init__(self):
        # Store active connections by client_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store connections subscribed to MSP-wide updates
        self.msp_connections: Dict[str, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str = None, msp_id: str = None):
        """Accept a WebSocket connection and register it"""
        await websocket.accept()
        
        if client_id:
            if client_id not in self.active_connections:
                self.active_connections[client_id] = set()
            self.active_connections[client_id].add(websocket)
            logger.info(f"WebSocket connected for client {client_id}")
        
        if msp_id:
            if msp_id not in self.msp_connections:
                self.msp_connections[msp_id] = set()
            self.msp_connections[msp_id].add(websocket)
            logger.info(f"WebSocket connected for MSP {msp_id}")
    
    def disconnect(self, websocket: WebSocket, client_id: str = None, msp_id: str = None):
        """Remove a WebSocket connection"""
        if client_id and client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
            logger.info(f"WebSocket disconnected for client {client_id}")
        
        if msp_id and msp_id in self.msp_connections:
            self.msp_connections[msp_id].discard(websocket)
            if not self.msp_connections[msp_id]:
                del self.msp_connections[msp_id]
            logger.info(f"WebSocket disconnected for MSP {msp_id}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def broadcast_to_client(self, client_id: str, message: dict):
        """Broadcast a message to all connections for a specific client"""
        if client_id not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[client_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client {client_id}: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.active_connections[client_id].discard(conn)
    
    async def broadcast_to_msp(self, msp_id: str, message: dict):
        """Broadcast a message to all connections for a specific MSP"""
        if msp_id not in self.msp_connections:
            return
        
        disconnected = set()
        for connection in self.msp_connections[msp_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to MSP {msp_id}: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.msp_connections[msp_id].discard(conn)
    
    async def broadcast_engagement_update(
        self, 
        client_id: str, 
        msp_id: str,
        engagement_data: dict
    ):
        """Broadcast engagement updates to relevant connections"""
        message = {
            "type": "engagement_update",
            "client_id": client_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": engagement_data
        }
        
        # Broadcast to specific client connections
        await self.broadcast_to_client(client_id, message)
        
        # Broadcast to MSP connections
        await self.broadcast_to_msp(msp_id, message)
    
    async def broadcast_interaction_update(
        self,
        client_id: str,
        msp_id: str,
        interaction_stats: dict
    ):
        """Broadcast interaction statistics updates"""
        message = {
            "type": "interaction_update",
            "client_id": client_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": interaction_stats
        }
        
        await self.broadcast_to_client(client_id, message)
        await self.broadcast_to_msp(msp_id, message)
    
    async def broadcast_alert(
        self,
        client_id: str,
        msp_id: str,
        alert_data: dict
    ):
        """Broadcast new alerts"""
        message = {
            "type": "alert",
            "client_id": client_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": alert_data
        }
        
        await self.broadcast_to_client(client_id, message)
        await self.broadcast_to_msp(msp_id, message)
    
    def get_active_connections_count(self, client_id: str = None, msp_id: str = None) -> int:
        """Get the count of active connections"""
        if client_id:
            return len(self.active_connections.get(client_id, set()))
        if msp_id:
            return len(self.msp_connections.get(msp_id, set()))
        return sum(len(conns) for conns in self.active_connections.values())


# Global connection manager instance
connection_manager = ConnectionManager()
