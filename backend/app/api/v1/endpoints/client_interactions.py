from fastapi import APIRouter, Request, Depends, HTTPException
from app.core.database import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Client, ClientAIServices, ClientAIServiceUsage, ClientAuditLog
from sqlalchemy import select, and_, func, desc
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta
from app.services.websocket_manager import connection_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ClientInteractionStats(BaseModel):
    client_id: str
    client_name: str
    total_interactions: int
    daily_interactions: int
    weekly_interactions: int
    monthly_interactions: int
    top_applications: List[dict]
    interaction_trends: List[dict]
    risk_score: float
    compliance_status: str

class ApplicationInteractionStats(BaseModel):
    application_id: str
    application_name: str
    vendor: str
    type: str
    status: str
    daily_interactions: int
    weekly_interactions: int
    monthly_interactions: int
    active_users: int
    risk_score: int
    last_interaction: Optional[datetime]

@router.get("/{client_id}/interactions")
async def get_client_interactions(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get comprehensive interaction statistics for a specific client"""
    user = request.state.user
    
    # Check if user has access to this client
    if user['role'] in ["msp_admin", "msp_user"]:
        # MSP users can access any client under their MSP
        msp_id = UUID(user['msp_id'])
        client_query = select(Client).where(
            and_(Client.id == UUID(client_id), Client.msp_id == msp_id)
        )
    elif user['role'] in ["client_admin", "end_user"]:
        # Client users can only access their own client
        if user['client_id'] != client_id:
            raise HTTPException(status_code=403, detail="Access denied")
        client_query = select(Client).where(Client.id == UUID(client_id))
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
    
    # Get interaction statistics
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    client_uuid = UUID(client_id)
    
    # Total interactions
    total_query = select(func.sum(ClientAIServiceUsage.total_interactions)).where(
        ClientAIServiceUsage.client_id == client_uuid
    )
    total_result = await session.execute(total_query)
    total_interactions = total_result.scalar() or 0
    
    # Daily interactions (today)
    daily_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= today
        )
    )
    daily_result = await session.execute(daily_query)
    daily_interactions = daily_result.scalar() or 0
    
    # Weekly interactions
    weekly_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= week_ago
        )
    )
    weekly_result = await session.execute(weekly_query)
    weekly_interactions = weekly_result.scalar() or 0
    
    # Monthly interactions
    monthly_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= month_ago
        )
    )
    monthly_result = await session.execute(monthly_query)
    monthly_interactions = monthly_result.scalar() or 0
    
    # Top applications by interactions
    top_apps_query = select(
        ClientAIServices.id,
        ClientAIServices.name,
        ClientAIServices.vendor,
        ClientAIServices.type,
        ClientAIServices.status,
        func.sum(ClientAIServiceUsage.daily_interactions).label('total_interactions'),
        func.max(ClientAIServiceUsage.created_at).label('last_interaction')
    ).join(
        ClientAIServiceUsage, 
        ClientAIServices.id == ClientAIServiceUsage.ai_service_id
    ).where(
        and_(
            ClientAIServices.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= month_ago
        )
    ).group_by(
        ClientAIServices.id,
        ClientAIServices.name,
        ClientAIServices.vendor,
        ClientAIServices.type,
        ClientAIServices.status
    ).order_by(desc('total_interactions')).limit(10)
    
    top_apps_result = await session.execute(top_apps_query)
    top_applications = []
    
    for row in top_apps_result:
        top_applications.append({
            "application_id": str(row.id),
            "application_name": row.name,
            "vendor": row.vendor,
            "type": row.type,
            "status": row.status,
            "total_interactions": row.total_interactions or 0,
            "last_interaction": row.last_interaction.isoformat() if row.last_interaction else None
        })
    
    # Interaction trends (last 30 days)
    trends_query = select(
        func.date(ClientAIServiceUsage.created_at).label('date'),
        func.sum(ClientAIServiceUsage.daily_interactions).label('interactions')
    ).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= month_ago
        )
    ).group_by(
        func.date(ClientAIServiceUsage.created_at)
    ).order_by('date')
    
    trends_result = await session.execute(trends_query)
    interaction_trends = []
    
    for row in trends_result:
        interaction_trends.append({
            "date": row.date.isoformat(),
            "interactions": row.interactions or 0
        })
    
    # Calculate realistic risk score based on interaction velocity and patterns
    risk_score = 0
    
    # Get active user count for context
    active_users_query = select(func.count(func.distinct(ClientAIServiceUsage.user_id))).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= month_ago
        )
    )
    active_users_result = await session.execute(active_users_query)
    active_users = active_users_result.scalar() or 1
    
    # Calculate per-user interaction rate for realistic assessment
    per_user_monthly = monthly_interactions / max(active_users, 1)
    
    # Risk from abnormally high usage (potential data exfiltration or abuse)
    # Typical enterprise user: 5-20 AI interactions per day = 150-600/month
    if per_user_monthly > 1000:  # >33/day per user - extremely high
        risk_score += 40
    elif per_user_monthly > 600:  # >20/day per user - very high
        risk_score += 25
    elif per_user_monthly > 300:  # >10/day per user - moderate-high
        risk_score += 10
    
    # Calculate interaction velocity (weekly growth)
    two_weeks_ago = today - timedelta(days=14)
    recent_week_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= week_ago
        )
    )
    previous_week_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.created_at >= two_weeks_ago,
            ClientAIServiceUsage.created_at < week_ago
        )
    )
    recent_week_result = await session.execute(recent_week_query)
    previous_week_result = await session.execute(previous_week_query)
    recent_week = recent_week_result.scalar() or 0
    previous_week = previous_week_result.scalar() or 1
    
    # Risk from rapid growth (>100% week-over-week = potential compromise)
    growth_rate = ((recent_week - previous_week) / previous_week) * 100 if previous_week > 0 else 0
    if growth_rate > 200:  # 200%+ growth - critical
        risk_score += 30
    elif growth_rate > 100:  # 100%+ growth - high concern
        risk_score += 20
    elif growth_rate > 50:  # 50%+ growth - moderate concern
        risk_score += 10
    
    # Add risk from unsanctioned applications
    unsanctioned_query = select(func.count(ClientAIServices.id)).where(
        and_(
            ClientAIServices.client_id == client_uuid,
            ClientAIServices.status == "Unsanctioned"
        )
    )
    unsanctioned_result = await session.execute(unsanctioned_query)
    unsanctioned_count = unsanctioned_result.scalar() or 0
    risk_score += unsanctioned_count * 15
    
    risk_score = min(risk_score, 100)
    
    # Determine compliance status
    compliance_status = "Compliant"
    if risk_score > 70:
        compliance_status = "High Risk"
    elif risk_score > 40:
        compliance_status = "Medium Risk"
    elif unsanctioned_count > 0:
        compliance_status = "Needs Review"
    
    return ClientInteractionStats(
        client_id=client_id,
        client_name=client.name,
        total_interactions=total_interactions,
        daily_interactions=daily_interactions,
        weekly_interactions=weekly_interactions,
        monthly_interactions=monthly_interactions,
        top_applications=top_applications,
        interaction_trends=interaction_trends,
        risk_score=risk_score,
        compliance_status=compliance_status
    )

@router.get("/{client_id}/applications/{app_id}/interactions")
async def get_application_interactions(
    client_id: str,
    app_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get detailed interaction statistics for a specific application within a client"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    msp_id = UUID(user['msp_id'])
    client_uuid = UUID(client_id)
    app_uuid = UUID(app_id)
    
    # Verify client belongs to this MSP
    client_query = select(Client).where(
        and_(Client.id == client_uuid, Client.msp_id == msp_id)
    )
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
    
    # Get application details
    app_query = select(ClientAIServices).where(
        and_(
            ClientAIServices.id == app_uuid,
            ClientAIServices.client_id == client_uuid
        )
    )
    app_result = await session.execute(app_query)
    app = app_result.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Get interaction statistics
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Daily interactions
    daily_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.ai_service_id == app_uuid,
            ClientAIServiceUsage.created_at >= today
        )
    )
    daily_result = await session.execute(daily_query)
    daily_interactions = daily_result.scalar() or 0
    
    # Weekly interactions
    weekly_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.ai_service_id == app_uuid,
            ClientAIServiceUsage.created_at >= week_ago
        )
    )
    weekly_result = await session.execute(weekly_query)
    weekly_interactions = weekly_result.scalar() or 0
    
    # Monthly interactions
    monthly_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.ai_service_id == app_uuid,
            ClientAIServiceUsage.created_at >= month_ago
        )
    )
    monthly_result = await session.execute(monthly_query)
    monthly_interactions = monthly_result.scalar() or 0
    
    # Last interaction
    last_interaction_query = select(func.max(ClientAIServiceUsage.created_at)).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.ai_service_id == app_uuid
        )
    )
    last_interaction_result = await session.execute(last_interaction_query)
    last_interaction = last_interaction_result.scalar()
    
    # Calculate realistic risk score for this application
    risk_score = 0
    
    # Status-based risk (fundamental security posture)
    if app.status == "Blocked":
        risk_score += 70  # Using blocked app = critical violation
    elif app.status == "Unsanctioned":
        risk_score += 50  # Shadow IT risk
    elif app.status == "Under_Review":
        risk_score += 25  # Pending approval
    
    # Get active users for context
    active_users_query = select(func.count(func.distinct(ClientAIServiceUsage.user_id))).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.ai_service_id == app_uuid,
            ClientAIServiceUsage.created_at >= month_ago
        )
    )
    active_users_result = await session.execute(active_users_query)
    active_users_count = active_users_result.scalar() or 1
    
    # Per-user interaction risk (abnormal usage patterns)
    per_user_monthly = monthly_interactions / max(active_users_count, 1)
    if per_user_monthly > 800:  # >26/day - extremely high
        risk_score += 25
    elif per_user_monthly > 400:  # >13/day - very high
        risk_score += 15
    elif per_user_monthly > 200:  # >6/day - moderate
        risk_score += 5
    
    # Type-based risk (inherent risk profile)
    if app.type == "Agent":
        risk_score += 20  # Autonomous agents = higher risk
    elif app.type == "API":
        risk_score += 15  # Direct API access = data risk
    elif app.type == "ChatApp":
        risk_score += 5  # Interactive = lower risk
    
    risk_score = min(risk_score, 100)
    
    return ApplicationInteractionStats(
        application_id=app_id,
        application_name=app.name,
        vendor=app.vendor,
        type=app.type,
        status=app.status,
        daily_interactions=daily_interactions,
        weekly_interactions=weekly_interactions,
        monthly_interactions=monthly_interactions,
        active_users=app.users,
        risk_score=risk_score,
        last_interaction=last_interaction
    )

@router.post("/{client_id}/interactions/increment")
async def increment_interaction_count(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Increment interaction count for a specific application (used by extension)"""
    user = request.state.user
    
    # Get request body
    try:
        body = await request.json()
        app_id = body.get('app_id')
        interaction_count = body.get('interaction_count', 1)
    except:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    if not app_id:
        raise HTTPException(status_code=400, detail="app_id is required")
    
    # Check if user has access to this client
    if user['role'] in ["msp_admin", "msp_user"]:
        # MSP users can access any client under their MSP
        msp_id = UUID(user['msp_id'])
        client_query = select(Client).where(
            and_(Client.id == UUID(client_id), Client.msp_id == msp_id)
        )
    elif user['role'] in ["client_admin", "end_user"]:
        # Client users can only access their own client
        if user['client_id'] != client_id:
            raise HTTPException(status_code=403, detail="Access denied")
        client_query = select(Client).where(Client.id == UUID(client_id))
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")
    
    client_uuid = UUID(client_id)
    app_uuid = UUID(app_id)
    
    # Verify application exists
    app_query = select(ClientAIServices).where(
        and_(
            ClientAIServices.id == app_uuid,
            ClientAIServices.client_id == client_uuid
        )
    )
    app_result = await session.execute(app_query)
    app = app_result.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Create or update usage record for today
    today = date.today()
    usage_query = select(ClientAIServiceUsage).where(
        and_(
            ClientAIServiceUsage.client_id == client_uuid,
            ClientAIServiceUsage.ai_service_id == app_uuid,
            func.date(ClientAIServiceUsage.created_at) == today
        )
    )
    usage_result = await session.execute(usage_query)
    usage_record = usage_result.scalar_one_or_none()
    
    if usage_record:
        # Update existing record
        usage_record.daily_interactions += interaction_count
        usage_record.total_interactions += interaction_count
    else:
        # Create new record
        new_usage = ClientAIServiceUsage(
            client_id=client_uuid,
            ai_service_id=app_uuid,
            user_id=UUID(user['user_id']),
            daily_interactions=interaction_count,
            total_interactions=interaction_count,
            department=user.get('department', 'Unknown')
        )
        session.add(new_usage)
    
    await session.commit()
    
    # Broadcast WebSocket update to connected clients
    try:
        interaction_stats = {
            "client_id": client_id,
            "app_id": app_id,
            "interaction_count": interaction_count,
            "total_daily_interactions": usage_record.daily_interactions if usage_record else interaction_count
        }
        await connection_manager.broadcast_interaction_update(
            client_id=client_id,
            msp_id=str(client.msp_id),
            interaction_stats=interaction_stats
        )
    except Exception as e:
        # Don't fail the request if broadcast fails
        logger.error(f"Failed to broadcast interaction update: {e}")
    
    return {"success": True, "message": f"Incremented interaction count by {interaction_count}"}
