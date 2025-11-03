from fastapi import APIRouter, Request, Depends, HTTPException
from enum import Enum
from app.core.database import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Client, ClientAIServices, AIService, ClientAuditLog, ClientAIServiceUsage
from sqlalchemy import select, and_
from uuid import UUID
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

def get_risk_score_for_service(service: ClientAIServices) -> int:
    """Calculate risk score for an AI service based on its properties"""
    risk_score = 0
    
    # Base risk from service status
    if service.status == "Unsanctioned":
        risk_score += 40
    elif service.status == "Under_Review":
        risk_score += 20
    elif service.status == "Blocked":
        risk_score += 60
    else:  # Permitted
        risk_score += 10
    
    # Risk from user count (more users = higher risk)
    if service.users > 100:
        risk_score += 20
    elif service.users > 50:
        risk_score += 10
    elif service.users > 20:
        risk_score += 5
    
    # Risk from daily interactions (more interactions = higher risk)
    if service.avg_daily_interactions > 1000:
        risk_score += 15
    elif service.avg_daily_interactions > 500:
        risk_score += 10
    elif service.avg_daily_interactions > 100:
        risk_score += 5
    
    # Risk from service type
    if service.type == "Agent":
        risk_score += 15  # Agents are generally riskier
    elif service.type == "API":
        risk_score += 10
    
    # Cap at 100
    return min(risk_score, 100)

class ApplicationType(str, Enum):
    APPLICATION = "Application"
    AGENT = "Agent"
    API = "API"
    PLUGIN = "Plugin"

class ApplicationStatus(str, Enum):
    PERMITTED = "Permitted"
    UNSANCTIONED = "Unsanctioned"
    UNDER_REVIEW = "Under_Review"
    BLOCKED = "Blocked"

class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

# Pydantic models for request/response
class AIApplicationCreate(BaseModel):
    name: str
    vendor: str
    type: ApplicationType
    status: ApplicationStatus = ApplicationStatus.UNDER_REVIEW
    risk_level: RiskLevel = RiskLevel.MEDIUM
    client_id: Optional[str] = None

class AIApplicationUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    type: Optional[ApplicationType] = None
    status: Optional[ApplicationStatus] = None
    risk_level: Optional[RiskLevel] = None

class AIApplicationResponse(BaseModel):
    id: str
    name: str
    vendor: str
    type: str
    status: str
    risk_level: str
    risk_score: int
    active_users: int
    avg_daily_interactions: int
    integrations: list
    

def calculate_risk(score: float) -> RiskLevel:
    if score < 25:
        return RiskLevel.LOW
    elif score < 50:
        return RiskLevel.MEDIUM
    elif score < 75:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL

async def calculate_avg_daily_interactions(session: AsyncSession, client_id: str, ai_service_id: str) -> int:
    """Calculate average daily interactions from ClientAIServiceUsage table"""
    from sqlalchemy import func
    from datetime import date, timedelta
    
    # Get usage data for the last 30 days
    thirty_days_ago = date.today() - timedelta(days=30)
    
    usage_query = select(
        func.avg(ClientAIServiceUsage.daily_interactions)
    ).where(
        and_(
            ClientAIServiceUsage.client_id == UUID(client_id),
            ClientAIServiceUsage.ai_service_id == UUID(ai_service_id),
            ClientAIServiceUsage.created_at >= thirty_days_ago
        )
    )
    
    result = await session.execute(usage_query)
    avg_interactions = result.scalar()
    
    # Return the average or fallback to 0
    return int(avg_interactions) if avg_interactions else 0

@router.get("/")
async def get_ai_inventory(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get AI inventory for all clients"""
    user = request.state.user
    
    if user['role'] in ["msp_admin", "msp_user"]:
        # MSP users can see all clients
        msp_id = UUID(user['msp_id'])
        
        # Get all clients for this MSP
        clients_query = select(Client).where(Client.msp_id == msp_id)
        clients_result = await session.execute(clients_query)
        clients = clients_result.scalars().all()
        
        inventory_data = []
        
        for client in clients:
            # Get ALL AI services for this client (not just those with usage data)
            ai_services_query = select(ClientAIServices).where(
                ClientAIServices.client_id == client.id
            )
            ai_services_result = await session.execute(ai_services_query)
            ai_services = ai_services_result.scalars().all()
            
            items = []
            for service in ai_services:
                risk_score = get_risk_score_for_service(service)
                risk_level = calculate_risk(risk_score)
                
                # Calculate average daily interactions from usage table (if usage data exists)
                avg_daily_interactions = await calculate_avg_daily_interactions(
                    session, str(client.id), str(service.id)
                )
                
                items.append({
                    "id": str(service.id),
                    "type": service.type,
                    "name": service.name,
                    "vendor": service.vendor,
                    "users": service.users,
                    "avgDailyInteractions": avg_daily_interactions,
                    "status": service.status,
                    "integrations": service.integrations or [],
                    "risk_level": risk_level,
                    "risk_score": risk_score,
                    "active_users": service.users  # Using users as active_users for now
                })
            
            inventory_data.append({
                "clientId": str(client.id),
                "clientName": client.name,
                "items": items
            })
        
        return inventory_data
    
    elif user['role'] in ["client_admin", "end_user"]:
        # Client users can only see their own client's inventory
        client_id = UUID(user['client_id'])
        
        # Get client
        client_query = select(Client).where(Client.id == client_id)
        client_result = await session.execute(client_query)
        client = client_result.scalar_one_or_none()
        
        if not client:
            return []
        
        # Get AI services for this client
        ai_services_query = select(ClientAIServices).where(
            ClientAIServices.client_id == client.id
        )
        ai_services_result = await session.execute(ai_services_query)
        ai_services = ai_services_result.scalars().all()
        
        items = []
        for service in ai_services:
            risk_score = get_risk_score_for_service(service)
            risk_level = calculate_risk(risk_score)
            
            # Calculate average daily interactions from usage table (if usage data exists)
            avg_daily_interactions = await calculate_avg_daily_interactions(
                session, str(client.id), str(service.id)
            )
            
            items.append({
                "id": str(service.id),
                "type": service.type,
                "name": service.name,
                "vendor": service.vendor,
                "users": service.users,
                "avgDailyInteractions": avg_daily_interactions,
                "status": service.status,
                "integrations": service.integrations or [],
                "risk_level": risk_level,
                "risk_score": risk_score,
                "active_users": service.users  # Using users as active_users for now
            })
        
        return [{
            "clientId": str(client.id),
            "clientName": client.name,
            "items": items
        }]
    
    else:
        return []

@router.post("/", response_model=AIApplicationResponse)
async def create_ai_application(
    app_data: AIApplicationCreate,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new AI application"""
    user = request.state.user
    
    if user['role'] in ["msp_admin", "msp_user"]:
        msp_id = UUID(user['msp_id'])
        
        # If no client_id provided, use the first client for this MSP
        if not app_data.client_id:
            client_query = select(Client).where(Client.msp_id == msp_id).limit(1)
            client_result = await session.execute(client_query)
            client = client_result.scalar_one_or_none()
            if not client:
                raise HTTPException(status_code=404, detail="No clients found for this MSP")
            client_id = client.id
        else:
            client_id = UUID(app_data.client_id)
            # Verify client belongs to this MSP
            client_query = select(Client).where(
                and_(Client.id == client_id, Client.msp_id == msp_id)
            )
            client_result = await session.execute(client_query)
            client = client_result.scalar_one_or_none()
            if not client:
                raise HTTPException(status_code=404, detail="Client not found or access denied")
    
    elif user['role'] in ["client_admin", "end_user"]:
        # Client users can only create applications for their own client
        client_id = UUID(user['client_id'])
        
        # Get client
        client_query = select(Client).where(Client.id == client_id)
        client_result = await session.execute(client_query)
        client = client_result.scalar_one_or_none()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # First, create or find an AIService record
    ai_service_query = select(AIService).where(
        and_(
            AIService.name == app_data.name,
            AIService.vendor == app_data.vendor
        )
    ).limit(1)
    ai_service_result = await session.execute(ai_service_query)
    ai_service = ai_service_result.scalar_one_or_none()
    
    if not ai_service:
        # Create new AIService if it doesn't exist
        ai_service = AIService(
            name=app_data.name,
            vendor=app_data.vendor,
            domain_patterns=[f"*.{app_data.vendor.lower()}.com"],  # Default domain pattern
            category=app_data.type.value,  # Use type as category
            risk_level=app_data.risk_level.value,
            detection_patterns={},
            service_metadata={"created_via": "api"}
        )
        session.add(ai_service)
        await session.flush()  # Flush to get the ID
    
    # Create new AI service
    new_service = ClientAIServices(
        client_id=client_id,
        ai_service_id=ai_service.id,
        name=app_data.name,
        vendor=app_data.vendor,
        type=app_data.type.value,
        status=app_data.status.value,
        users=0,  # Default to 0 users
        avg_daily_interactions=0,  # Default to 0 interactions
        integrations=[],
        risk_tolerance=app_data.risk_level.value
    )
    
    session.add(new_service)
    await session.commit()
    await session.refresh(new_service)
    
    # Calculate risk score and level
    risk_score = get_risk_score_for_service(new_service)
    risk_level = calculate_risk(risk_score)
    
    return AIApplicationResponse(
        id=str(new_service.id),
        name=new_service.name,
        vendor=new_service.vendor,
        type=new_service.type,
        status=new_service.status,
        risk_level=risk_level.value,
        risk_score=risk_score,
        active_users=new_service.users,
        avg_daily_interactions=new_service.avg_daily_interactions,
        integrations=new_service.integrations or []
    )

@router.put("/{app_id}", response_model=AIApplicationResponse)
async def update_ai_application(
    app_id: str,
    app_data: AIApplicationUpdate,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Update an existing AI application"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    msp_id = UUID(user['msp_id'])
    
    # Find the service and verify it belongs to this MSP
    service_query = select(ClientAIServices).join(Client).where(
        and_(
            ClientAIServices.id == UUID(app_id),
            Client.msp_id == msp_id
        )
    )
    service_result = await session.execute(service_query)
    service = service_result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="AI application not found or access denied")
    
    # Update fields if provided
    if app_data.name is not None:
        service.name = app_data.name
    if app_data.vendor is not None:
        service.vendor = app_data.vendor
    if app_data.type is not None:
        service.type = app_data.type.value
    if app_data.status is not None:
        service.status = app_data.status.value
    
    await session.commit()
    await session.refresh(service)
    
    # Calculate risk score and level
    risk_score = get_risk_score_for_service(service)
    risk_level = calculate_risk(risk_score)
    
    return AIApplicationResponse(
        id=str(service.id),
        name=service.name,
        vendor=service.vendor,
        type=service.type,
        status=service.status,
        risk_level=risk_level.value,
        risk_score=risk_score,
        active_users=service.users,
        avg_daily_interactions=service.avg_daily_interactions,
        integrations=service.integrations or []
    )

@router.delete("/{app_id}")
async def delete_ai_application(
    app_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Delete an AI application"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    msp_id = UUID(user['msp_id'])
    
    # Find the service and verify it belongs to this MSP
    service_query = select(ClientAIServices).join(Client).where(
        and_(
            ClientAIServices.id == UUID(app_id),
            Client.msp_id == msp_id
        )
    )
    service_result = await session.execute(service_query)
    service = service_result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="AI application not found or access denied")
    
    await session.delete(service)
    await session.commit()
    
    return {"message": "AI application deleted successfully"}