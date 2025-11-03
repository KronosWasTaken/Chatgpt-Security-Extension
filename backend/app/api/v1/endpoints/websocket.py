"""
WebSocket Endpoints for Real-time Client Engagement Updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.services.websocket_manager import connection_manager
from app.models import Client
from sqlalchemy import select
from uuid import UUID
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)


async def authenticate_websocket(
    websocket: WebSocket,
    token: str = Query(...)
) -> dict:
    """Authenticate WebSocket connection using token"""
    from app.core.auth import JWTManager
    
    try:
        payload = JWTManager.verify_token(token)
        return payload
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        await websocket.close(code=1008, reason="Authentication failed")
        return None


@router.websocket("/ws/engagement")
async def websocket_engagement_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    session: AsyncSession = Depends(get_async_session)
):
    """
    WebSocket endpoint for real-time engagement updates
    
    Query params:
        token: JWT authentication token
    
    Connection types:
        - MSP users: Receive updates for all clients under their MSP
        - Client users: Receive updates only for their specific client
    """
    # Authenticate the WebSocket connection
    user_data = await authenticate_websocket(websocket, token)
    if not user_data:
        return
    
    user_role = user_data.get('role')
    msp_id = user_data.get('msp_id')
    client_id = user_data.get('client_id')
    
    # Determine connection scope
    if user_role in ['msp_admin', 'msp_user']:
        # MSP users subscribe to all clients under their MSP
        await connection_manager.connect(websocket, msp_id=msp_id)
        connection_scope = f"MSP {msp_id}"
    elif user_role in ['client_admin', 'client_user']:
        # Client users subscribe only to their client
        await connection_manager.connect(websocket, client_id=client_id)
        connection_scope = f"Client {client_id}"
    else:
        await websocket.close(code=1008, reason="Invalid role")
        return
    
    # Send connection confirmation
    await connection_manager.send_personal_message({
        "type": "connection",
        "status": "connected",
        "scope": connection_scope,
        "user_role": user_role
    }, websocket)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get('type')
                
                # Handle different message types
                if message_type == 'ping':
                    await connection_manager.send_personal_message({
                        "type": "pong",
                        "timestamp": message.get('timestamp')
                    }, websocket)
                
                elif message_type == 'subscribe':
                    # Allow subscribing to specific client (if authorized)
                    target_client_id = message.get('client_id')
                    
                    if user_role in ['msp_admin', 'msp_user']:
                        # Verify client belongs to MSP
                        client_query = select(Client).where(
                            Client.id == UUID(target_client_id),
                            Client.msp_id == UUID(msp_id)
                        )
                        result = await session.execute(client_query)
                        client = result.scalar_one_or_none()
                        
                        if client:
                            await connection_manager.connect(websocket, client_id=target_client_id)
                            await connection_manager.send_personal_message({
                                "type": "subscribed",
                                "client_id": target_client_id
                            }, websocket)
                        else:
                            await connection_manager.send_personal_message({
                                "type": "error",
                                "message": "Client not found or access denied"
                            }, websocket)
                
                elif message_type == 'request_update':
                    # Client requests latest data
                    await connection_manager.send_personal_message({
                        "type": "info",
                        "message": "Updates are pushed automatically"
                    }, websocket)
                
            except json.JSONDecodeError:
                await connection_manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {connection_scope}")
        connection_manager.disconnect(websocket, client_id=client_id, msp_id=msp_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket, client_id=client_id, msp_id=msp_id)


@router.websocket("/ws/client/{client_id}/engagement")
async def websocket_client_engagement_endpoint(
    websocket: WebSocket,
    client_id: str,
    token: str = Query(...),
    session: AsyncSession = Depends(get_async_session)
):
    """
    WebSocket endpoint for real-time engagement updates for a specific client
    
    Path params:
        client_id: Client UUID
    
    Query params:
        token: JWT authentication token
    """
    # Authenticate the WebSocket connection
    user_data = await authenticate_websocket(websocket, token)
    if not user_data:
        return
    
    user_role = user_data.get('role')
    msp_id = user_data.get('msp_id')
    user_client_id = user_data.get('client_id')
    
    # Verify access to this client
    if user_role in ['msp_admin', 'msp_user']:
        # Verify client belongs to MSP
        client_query = select(Client).where(
            Client.id == UUID(client_id),
            Client.msp_id == UUID(msp_id)
        )
        result = await session.execute(client_query)
        client = result.scalar_one_or_none()
        
        if not client:
            await websocket.close(code=1008, reason="Client not found or access denied")
            return
            
    elif user_role in ['client_admin', 'client_user']:
        # Verify user belongs to this client
        if user_client_id != client_id:
            await websocket.close(code=1008, reason="Access denied")
            return
    else:
        await websocket.close(code=1008, reason="Invalid role")
        return
    
    # Connect to this specific client's channel
    await connection_manager.connect(websocket, client_id=client_id)
    
    # Send connection confirmation
    await connection_manager.send_personal_message({
        "type": "connection",
        "status": "connected",
        "client_id": client_id,
        "user_role": user_role
    }, websocket)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get('type')
                
                if message_type == 'ping':
                    await connection_manager.send_personal_message({
                        "type": "pong",
                        "timestamp": message.get('timestamp')
                    }, websocket)
                
            except json.JSONDecodeError:
                await connection_manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for client {client_id}")
        connection_manager.disconnect(websocket, client_id=client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket, client_id=client_id)


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "total_connections": connection_manager.get_active_connections_count(),
        "client_connections": {
            client_id: connection_manager.get_active_connections_count(client_id=client_id)
            for client_id in connection_manager.active_connections.keys()
        },
        "msp_connections": {
            msp_id: connection_manager.get_active_connections_count(msp_id=msp_id)
            for msp_id in connection_manager.msp_connections.keys()
        }
    }
