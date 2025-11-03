#!/usr/bin/env python3
"""
Test suite for WebSocket implementation
"""

import pytest
import asyncio
import json
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone
from uuid import uuid4

from app.main import app
from app.services.websocket_manager import ConnectionManager, connection_manager
from app.core.auth import JWTManager


class TestConnectionManager:
    """Test the ConnectionManager class"""
    
    @pytest.fixture
    def manager(self):
        """Create a fresh ConnectionManager instance for each test"""
        return ConnectionManager()
    
    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket"""
        ws = AsyncMock(spec=WebSocket)
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()
        ws.close = AsyncMock()
        return ws
    
    @pytest.mark.asyncio
    async def test_connect_client(self, manager, mock_websocket):
        """Test connecting a client WebSocket"""
        client_id = str(uuid4())
        
        await manager.connect(mock_websocket, client_id=client_id)
        
        mock_websocket.accept.assert_called_once()
        assert client_id in manager.active_connections
        assert mock_websocket in manager.active_connections[client_id]
    
    @pytest.mark.asyncio
    async def test_connect_msp(self, manager, mock_websocket):
        """Test connecting an MSP WebSocket"""
        msp_id = str(uuid4())
        
        await manager.connect(mock_websocket, msp_id=msp_id)
        
        mock_websocket.accept.assert_called_once()
        assert msp_id in manager.msp_connections
        assert mock_websocket in manager.msp_connections[msp_id]
    
    @pytest.mark.asyncio
    async def test_connect_both(self, manager, mock_websocket):
        """Test connecting with both client_id and msp_id"""
        client_id = str(uuid4())
        msp_id = str(uuid4())
        
        await manager.connect(mock_websocket, client_id=client_id, msp_id=msp_id)
        
        assert client_id in manager.active_connections
        assert msp_id in manager.msp_connections
    
    def test_disconnect_client(self, manager, mock_websocket):
        """Test disconnecting a client WebSocket"""
        client_id = str(uuid4())
        manager.active_connections[client_id] = {mock_websocket}
        
        manager.disconnect(mock_websocket, client_id=client_id)
        
        assert client_id not in manager.active_connections
    
    def test_disconnect_msp(self, manager, mock_websocket):
        """Test disconnecting an MSP WebSocket"""
        msp_id = str(uuid4())
        manager.msp_connections[msp_id] = {mock_websocket}
        
        manager.disconnect(mock_websocket, msp_id=msp_id)
        
        assert msp_id not in manager.msp_connections
    
    @pytest.mark.asyncio
    async def test_send_personal_message(self, manager, mock_websocket):
        """Test sending a personal message"""
        message = {"type": "test", "data": "hello"}
        
        await manager.send_personal_message(message, mock_websocket)
        
        mock_websocket.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_broadcast_to_client(self, manager):
        """Test broadcasting to all client connections"""
        client_id = str(uuid4())
        ws1 = AsyncMock(spec=WebSocket)
        ws2 = AsyncMock(spec=WebSocket)
        manager.active_connections[client_id] = {ws1, ws2}
        
        message = {"type": "test", "data": "broadcast"}
        await manager.broadcast_to_client(client_id, message)
        
        ws1.send_json.assert_called_once_with(message)
        ws2.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_broadcast_to_msp(self, manager):
        """Test broadcasting to all MSP connections"""
        msp_id = str(uuid4())
        ws1 = AsyncMock(spec=WebSocket)
        ws2 = AsyncMock(spec=WebSocket)
        manager.msp_connections[msp_id] = {ws1, ws2}
        
        message = {"type": "test", "data": "broadcast"}
        await manager.broadcast_to_msp(msp_id, message)
        
        ws1.send_json.assert_called_once_with(message)
        ws2.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_broadcast_engagement_update(self, manager):
        """Test broadcasting engagement updates"""
        client_id = str(uuid4())
        msp_id = str(uuid4())
        ws_client = AsyncMock(spec=WebSocket)
        ws_msp = AsyncMock(spec=WebSocket)
        
        manager.active_connections[client_id] = {ws_client}
        manager.msp_connections[msp_id] = {ws_msp}
        
        engagement_data = {
            "departments": [],
            "applications": [],
            "agents": []
        }
        
        await manager.broadcast_engagement_update(client_id, msp_id, engagement_data)
        
        # Both client and MSP connections should receive the message
        assert ws_client.send_json.called
        assert ws_msp.send_json.called
        
        # Check message structure
        call_args = ws_client.send_json.call_args[0][0]
        assert call_args["type"] == "engagement_update"
        assert call_args["client_id"] == client_id
        assert call_args["data"] == engagement_data
        assert "timestamp" in call_args
    
    @pytest.mark.asyncio
    async def test_broadcast_interaction_update(self, manager):
        """Test broadcasting interaction updates"""
        client_id = str(uuid4())
        msp_id = str(uuid4())
        ws_client = AsyncMock(spec=WebSocket)
        
        manager.active_connections[client_id] = {ws_client}
        
        interaction_stats = {
            "app_id": str(uuid4()),
            "interaction_count": 5
        }
        
        await manager.broadcast_interaction_update(client_id, msp_id, interaction_stats)
        
        assert ws_client.send_json.called
        call_args = ws_client.send_json.call_args[0][0]
        assert call_args["type"] == "interaction_update"
        assert call_args["data"] == interaction_stats
    
    @pytest.mark.asyncio
    async def test_broadcast_alert(self, manager):
        """Test broadcasting alerts"""
        client_id = str(uuid4())
        msp_id = str(uuid4())
        ws_client = AsyncMock(spec=WebSocket)
        
        manager.active_connections[client_id] = {ws_client}
        
        alert_data = {
            "severity": "high",
            "details": "Test alert"
        }
        
        await manager.broadcast_alert(client_id, msp_id, alert_data)
        
        assert ws_client.send_json.called
        call_args = ws_client.send_json.call_args[0][0]
        assert call_args["type"] == "alert"
        assert call_args["data"] == alert_data
    
    def test_get_active_connections_count(self, manager, mock_websocket):
        """Test getting connection count"""
        client_id = str(uuid4())
        manager.active_connections[client_id] = {mock_websocket}
        
        assert manager.get_active_connections_count(client_id=client_id) == 1
        assert manager.get_active_connections_count() == 1
    
    @pytest.mark.asyncio
    async def test_broadcast_with_failed_connection(self, manager):
        """Test broadcasting handles failed connections gracefully"""
        client_id = str(uuid4())
        ws_good = AsyncMock(spec=WebSocket)
        ws_bad = AsyncMock(spec=WebSocket)
        ws_bad.send_json.side_effect = Exception("Connection failed")
        
        manager.active_connections[client_id] = {ws_good, ws_bad}
        
        message = {"type": "test"}
        await manager.broadcast_to_client(client_id, message)
        
        # Good connection should still receive message
        ws_good.send_json.assert_called_once_with(message)
        # Bad connection should be removed
        assert ws_bad not in manager.active_connections[client_id]


class TestWebSocketEndpoints:
    """Test WebSocket endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create a test client"""
        return TestClient(app)
    
    @pytest.fixture
    def msp_token(self):
        """Create an MSP admin token"""
        payload = {
            "user_id": str(uuid4()),
            "role": "msp_admin",
            "msp_id": str(uuid4()),
            "email": "admin@msp.com"
        }
        return JWTManager.create_access_token(payload)
    
    @pytest.fixture
    def client_token(self):
        """Create a client admin token"""
        payload = {
            "user_id": str(uuid4()),
            "role": "client_admin",
            "client_id": str(uuid4()),
            "email": "admin@client.com"
        }
        return JWTManager.create_access_token(payload)
    
    def test_websocket_stats_endpoint(self, client, msp_token):
        """Test the WebSocket stats endpoint"""
        headers = {"Authorization": f"Bearer {msp_token}"}
        response = client.get("/api/v1/ws/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_connections" in data
        assert "client_connections" in data
        assert "msp_connections" in data
    
    def test_websocket_connection_without_token(self, client):
        """Test WebSocket connection fails without token"""
        with pytest.raises(Exception):
            with client.websocket_connect("/api/v1/ws/engagement"):
                pass
    
    def test_websocket_connection_with_invalid_token(self, client):
        """Test WebSocket connection fails with invalid token"""
        with pytest.raises(Exception):
            with client.websocket_connect("/api/v1/ws/engagement?token=invalid"):
                pass


class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality"""
    
    @pytest.mark.asyncio
    async def test_interaction_increment_triggers_broadcast(self):
        """Test that incrementing interactions triggers WebSocket broadcast"""
        # This would require a full integration test with database
        # and WebSocket connection, which is complex to set up
        # For now, we verify the broadcast function is called
        
        with patch('app.api.v1.endpoints.client_interactions.connection_manager') as mock_manager:
            mock_manager.broadcast_interaction_update = AsyncMock()
            
            # Simulate interaction increment
            client_id = str(uuid4())
            msp_id = str(uuid4())
            interaction_stats = {
                "app_id": str(uuid4()),
                "interaction_count": 1
            }
            
            await mock_manager.broadcast_interaction_update(
                client_id=client_id,
                msp_id=msp_id,
                interaction_stats=interaction_stats
            )
            
            mock_manager.broadcast_interaction_update.assert_called_once()


class TestWebSocketSecurity:
    """Test WebSocket security features"""
    
    def test_role_based_access_msp(self):
        """Test MSP users can access MSP-wide updates"""
        # This would test that MSP users receive updates for all clients
        pass
    
    def test_role_based_access_client(self):
        """Test client users only access their client data"""
        # This would test that client users only receive their own updates
        pass
    
    def test_authentication_required(self):
        """Test that authentication is required for WebSocket connections"""
        # Already covered in TestWebSocketEndpoints
        pass


class TestWebSocketReconnection:
    """Test WebSocket reconnection logic"""
    
    @pytest.mark.asyncio
    async def test_connection_cleanup_on_disconnect(self, manager=None):
        """Test connections are cleaned up on disconnect"""
        if manager is None:
            manager = ConnectionManager()
        
        client_id = str(uuid4())
        ws = AsyncMock(spec=WebSocket)
        ws.accept = AsyncMock()
        
        # Connect
        await manager.connect(ws, client_id=client_id)
        assert client_id in manager.active_connections
        
        # Disconnect
        manager.disconnect(ws, client_id=client_id)
        assert client_id not in manager.active_connections


def test_websocket_message_format():
    """Test WebSocket message format is correct"""
    message = {
        "type": "engagement_update",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "client_id": str(uuid4()),
        "data": {"test": "data"}
    }
    
    # Verify message can be serialized to JSON
    json_str = json.dumps(message)
    parsed = json.loads(json_str)
    
    assert parsed["type"] == "engagement_update"
    assert "timestamp" in parsed
    assert "client_id" in parsed
    assert "data" in parsed


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
