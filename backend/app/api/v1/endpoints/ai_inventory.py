from fastapi import APIRouter, Request, Depends
from enum import Enum
from app.core.database import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Client, ClientAIServices, AIService, ClientAuditLog, ClientAIServiceUsage
from sqlalchemy import select, and_
from uuid import UUID

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
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return []
    
    msp_id = UUID(user['msp_id'])
    
    # Get all clients for this MSP
    clients_query = select(Client).where(Client.msp_id == msp_id)
    clients_result = await session.execute(clients_query)
    clients = clients_result.scalars().all()
    
    inventory_data = []
    
    for client in clients:
        # Get AI services for this client that have usage (filter using usage table)
        ai_services_query = select(ClientAIServices).join(
            ClientAIServiceUsage,
            ClientAIServiceUsage.ai_service_id == ClientAIServices.id
        ).where(
            ClientAIServiceUsage.client_id == client.id
        ).group_by(ClientAIServices.id)
        ai_services_result = await session.execute(ai_services_query)
        ai_services = ai_services_result.scalars().all()
        
        
        items = []
        for service in ai_services:
            risk_score = get_risk_score_for_service(service)
            risk_level = calculate_risk(risk_score)
            
            # Calculate average daily interactions from usage table
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