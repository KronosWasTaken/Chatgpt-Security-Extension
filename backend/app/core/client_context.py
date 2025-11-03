from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from typing import Optional, List
from app.core.database import get_async_session
from app.models.clients import Client
from app.models.clients import ClientAIServices
from app.models.clients import ClientAIServiceUsage
from app.models.engagement import AgentEngagement


class ClientContext:
    """Context for client-specific operations"""
    def __init__(self, client_id: str, user_role: str, msp_id: Optional[str] = None):
        self.client_id = client_id
        self.user_role = user_role
        self.msp_id = msp_id
        self.client_uuid = UUID(client_id) if client_id else None
    
    def is_client_user(self) -> bool:
        """Check if user is a client user (client_admin or end_user)"""
        return self.user_role in ["client_admin", "end_user"]
    
    def is_msp_user(self) -> bool:
        """Check if user is an MSP user (msp_admin or msp_user)"""
        return self.user_role in ["msp_admin", "msp_user"]
    
    def can_access_client(self, target_client_id: str) -> bool:
        """Check if user can access a specific client"""
        if self.is_msp_user():
            return True  # MSP users can access any client under their MSP
        elif self.is_client_user():
            return self.client_id == target_client_id
        return False


def get_client_context(request: Request) -> ClientContext:
    """Extract client context from request state"""
    user = request.state.user
    
    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    client_id = user.get("client_id")
    user_role = user.get("role")
    msp_id = user.get("msp_id")
    
    if not client_id and user_role in ["client_admin", "end_user"]:
        raise HTTPException(status_code=400, detail="Client ID required for client users")
    
    return ClientContext(client_id, user_role, msp_id)


def get_client_id(request: Request) -> str:
    """Get client ID from request state"""
    user = request.state.user
    
    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    client_id = user.get("client_id")
    user_role = user.get("role")
    
    if not client_id and user_role in ["client_admin", "end_user"]:
        raise HTTPException(status_code=400, detail="Client ID required for client users")
    
    return client_id


def require_client_access(request: Request) -> ClientContext:
    """Require client access - only for client_admin and end_user roles"""
    user = request.state.user
    
    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    user_role = user.get("role")
    client_id = user.get("client_id")
    
    if user_role not in ["client_admin", "end_user"]:
        raise HTTPException(status_code=403, detail="This endpoint requires client user role")
    
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required for client users")
    
    return ClientContext(client_id, user_role)


def require_msp_access(request: Request) -> ClientContext:
    """Require MSP access - only for msp_admin and msp_user roles"""
    user = request.state.user
    
    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    
    user_role = user.get("role")
    msp_id = user.get("msp_id")
    
    if user_role not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="This endpoint requires MSP user role")
    
    if not msp_id:
        raise HTTPException(status_code=400, detail="MSP ID required for MSP users")
    
    return ClientContext(None, user_role, msp_id)


async def get_client_by_context(
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
) -> Optional[Client]:
    """Get client based on user context"""
    if client_context.is_client_user():
        # Client users can only access their own client
        query = select(Client).where(Client.id == client_context.client_uuid)
    elif client_context.is_msp_user():
        # MSP users can access clients under their MSP
        msp_uuid = UUID(client_context.msp_id) if client_context.msp_id else None
        query = select(Client).where(Client.msp_id == msp_uuid)
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def get_client_by_id(
    client_id: str,
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
) -> Optional[Client]:
    """Get specific client by ID with permission check"""
    if not client_context.can_access_client(client_id):
        raise HTTPException(status_code=403, detail="Access denied to this client")
    
    client_uuid = UUID(client_id)
    
    if client_context.is_client_user():
        # Client users can only access their own client
        query = select(Client).where(Client.id == client_uuid)
    elif client_context.is_msp_user():
        # MSP users can access clients under their MSP
        msp_uuid = UUID(client_context.msp_id) if client_context.msp_id else None
        query = select(Client).where(
            and_(Client.id == client_uuid, Client.msp_id == msp_uuid)
        )
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await session.execute(query)
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client


async def get_client_ai_services(
    client_context: ClientContext = Depends(require_client_access),
    session: AsyncSession = Depends(get_async_session)
) -> List[ClientAIServices]:
    """Get AI services for the client user's client"""
    query = select(ClientAIServices).where(
        ClientAIServices.client_id == client_context.client_uuid
    )
    result = await session.execute(query)
    return result.scalars().all()


async def get_client_usage_stats(
    client_context: ClientContext = Depends(require_client_access),
    session: AsyncSession = Depends(get_async_session)
) -> List[ClientAIServiceUsage]:
    """Get usage statistics for the client user's client"""
    query = select(ClientAIServiceUsage).where(
        ClientAIServiceUsage.client_id == client_context.client_uuid
    )
    result = await session.execute(query)
    return result.scalars().all()


async def get_client_agent_engagement(
    client_context: ClientContext = Depends(require_client_access),
    session: AsyncSession = Depends(get_async_session)
) -> List[AgentEngagement]:
    """Get agent engagement data for the client user's client"""
    query = select(AgentEngagement).where(
        AgentEngagement.client_id == client_context.client_uuid
    )
    result = await session.execute(query)
    return result.scalars().all()

