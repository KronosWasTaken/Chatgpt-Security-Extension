from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from typing import List, Optional
from datetime import date
from uuid import UUID
from app.models import Client, AgentEngagement, ProductivityCorrelation, UserEngagement
from app.services.engagement_service import EngagementService
from sqlalchemy import select, and_, desc

router = APIRouter()

# Response Models
class DepartmentEngagementResponse(BaseModel):
    department: str
    interactions: int
    active_users: int
    pct_change_vs_prev_7d: float

class ApplicationEngagementResponse(BaseModel):
    application: str
    vendor: str
    icon: str
    active_users: int
    interactions_per_day: int
    trend_pct_7d: float
    utilization: str  # 'High', 'Medium', 'Low'
    recommendation: str

class AgentEngagementResponse(BaseModel):
    agent: str
    vendor: str
    icon: str
    deployed: int
    avg_prompts_per_day: int
    flagged_actions: int
    trend_pct_7d: float
    status: str  # 'Rising', 'Stable', 'Dormant'
    last_activity_iso: str
    associated_apps: List[str]

class UserEngagementResponse(BaseModel):
    name: str
    department: Optional[str]
    avgDailyInteractions: int
    delta7dPct: float

class ProductivityCorrelationResponse(BaseModel):
    ai_interactions_7d: List[int]
    output_metric_7d: List[int]
    note: str

class AIEngagementDataResponse(BaseModel):
    departments: List[DepartmentEngagementResponse]
    applications: List[ApplicationEngagementResponse]
    agents: List[AgentEngagementResponse]
    productivity_correlations: dict

# Endpoints
@router.get("/clients/{client_id}", response_model=AIEngagementDataResponse)
async def get_client_engagement(
    client_id: str,
    request: Request,
    department: Optional[str] = Query(None, description="Filter by department"),
    target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
    session: AsyncSession = Depends(get_async_session)
):
    """Get AI engagement data for a specific client with optional department filtering"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify client belongs to user's MSP
    client_query = select(Client).where(
        and_(
            Client.id == UUID(client_id),
            Client.msp_id == UUID(user['msp_id'])
        )
    )
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Use new engagement service
    engagement_service = EngagementService(session)
    target_date = target_date or date.today()
    
    # Get engagement data calculated at runtime
    engagement_data = await engagement_service.get_engagement_summary(
        client_id, target_date, department
    )
    
    # Convert to response format
    departments = [
        DepartmentEngagementResponse(
            department=dept['department'],
            interactions=dept['interactions'],
            active_users=dept['active_users'],
            pct_change_vs_prev_7d=dept['pct_change_vs_prev_7d']
        )
        for dept in engagement_data['departments']
    ]
    
    applications = [
        ApplicationEngagementResponse(
            application=app['application'],
            vendor=app['vendor'],
            icon=app['icon'] or "default",
            active_users=app['active_users'],
            interactions_per_day=app['interactions_per_day'],
            trend_pct_7d=app['trend_pct_7d'],
            utilization=app['utilization'],
            recommendation=app['recommendation']
        )
        for app in engagement_data['applications']
    ]
    
    # Get data from kept tables (agents and productivity correlations)
    agents_data = await engagement_service.get_agent_engagement_from_table(client_id, target_date)
    productivity_data = await engagement_service.get_productivity_correlations_from_table(client_id, target_date)
    
    # Convert agents to response format
    agents = [
        AgentEngagementResponse(
            agent=agent['agent'],
            vendor=agent['vendor'],
            icon=agent['icon'],
            deployed=agent['deployed'],
            avg_prompts_per_day=agent['avg_prompts_per_day'],
            flagged_actions=agent['flagged_actions'],
            trend_pct_7d=agent['trend_pct_7d'],
            status=agent['status'],
            last_activity_iso=agent['last_activity_iso'],
            associated_apps=agent['associated_apps']
        )
        for agent in agents_data
    ]
    
    # Convert productivity correlations to response format
    productivity_correlations = {
        dept: ProductivityCorrelationResponse(
            ai_interactions_7d=corr['ai_interactions_7d'],
            output_metric_7d=corr['output_metric_7d'],
            note=corr['note']
        )
        for dept, corr in productivity_data.items()
    }
    
    return AIEngagementDataResponse(
        departments=departments,
        applications=applications,
        agents=agents,
        productivity_correlations=productivity_correlations
    )

@router.get("/clients/{client_id}/departments", response_model=List[DepartmentEngagementResponse])
async def get_department_engagement(
    client_id: str,
    request: Request,
    department: Optional[str] = Query(None, description="Filter by department"),
    target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
    session: AsyncSession = Depends(get_async_session)
):
    """Get department engagement data for a specific client with optional department filtering"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return []
    
    # Verify client belongs to user's MSP
    client_query = select(Client).where(
        and_(
            Client.id == UUID(client_id),
            Client.msp_id == UUID(user['msp_id'])
        )
    )
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        return []
    
    # Use new engagement service
    engagement_service = EngagementService(session)
    target_date = target_date or date.today()
    
    # Get department engagement data calculated at runtime
    departments_data = await engagement_service.get_department_engagement(
        client_id, target_date, department
    )
    
    # Convert to response format and sort by interactions
    departments = [
        DepartmentEngagementResponse(
            department=dept['department'],
            interactions=dept['interactions'],
            active_users=dept['active_users'],
            pct_change_vs_prev_7d=dept['pct_change_vs_prev_7d']
        )
        for dept in sorted(departments_data, key=lambda x: x['interactions'], reverse=True)
    ]
    
    return departments

@router.get("/clients/{client_id}/applications", response_model=List[ApplicationEngagementResponse])
async def get_application_engagement(
    client_id: str,
    request: Request,
    department: Optional[str] = Query(None, description="Filter by department"),
    target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
    session: AsyncSession = Depends(get_async_session)
):
    """Get application engagement data for a specific client with optional department filtering"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return []
    
    # Verify client belongs to user's MSP
    client_query = select(Client).where(
        and_(
            Client.id == UUID(client_id),
            Client.msp_id == UUID(user['msp_id'])
        )
    )
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        return []
    
    # Use new engagement service
    engagement_service = EngagementService(session)
    target_date = target_date or date.today()
    
    # Get application engagement data calculated at runtime
    applications_data = await engagement_service.get_application_engagement(
        client_id, target_date, department
    )
    
    # Convert to response format and sort by interactions
    applications = [
        ApplicationEngagementResponse(
            application=app['application'],
            vendor=app['vendor'],
            icon=app['icon'] or "default",
            active_users=app['active_users'],
            interactions_per_day=app['interactions_per_day'],
            trend_pct_7d=app['trend_pct_7d'],
            utilization=app['utilization'],
            recommendation=app['recommendation']
        )
        for app in sorted(applications_data, key=lambda x: x['interactions_per_day'], reverse=True)
    ]
    
    return applications

@router.get("/clients/{client_id}/agents", response_model=List[AgentEngagementResponse])
async def get_agent_engagement(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get agent engagement data for a specific client"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return []
    
    # Verify client belongs to user's MSP
    client_query = select(Client).where(
        and_(
            Client.id == UUID(client_id),
            Client.msp_id == UUID(user['msp_id'])
        )
    )
    client_result = await session.execute(client_query)
    client = client_result.scalar_one_or_none()
    
    if not client:
        return []
    
    # Get latest agent engagement data
    today = date.today()
    agent_query = select(AgentEngagement).where(
        and_(
            AgentEngagement.client_id == UUID(client_id),
            AgentEngagement.date == today
        )
    ).order_by(desc(AgentEngagement.avg_prompts_per_day))
    
    agent_result = await session.execute(agent_query)
    agents = []
    for agent in agent_result.scalars().all():
        agents.append(AgentEngagementResponse(
            agent=agent.agent,
            vendor=agent.vendor,
            icon=agent.icon or "bot",
            deployed=agent.deployed,
            avg_prompts_per_day=agent.avg_prompts_per_day,
            flagged_actions=agent.flagged_actions,
            trend_pct_7d=float(agent.trend_pct_7d),
            status=agent.status,
            last_activity_iso=agent.last_activity_iso or "",
            associated_apps=agent.associated_apps or []
        ))
    
    return agents
