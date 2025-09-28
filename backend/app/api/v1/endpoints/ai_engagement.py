from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from typing import List, Optional
from datetime import date
from uuid import UUID
from app.models import (
    Client, DepartmentEngagement, ApplicationEngagement, 
    AgentEngagement, UserEngagement, ProductivityCorrelation
)
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
    session: AsyncSession = Depends(get_async_session)
):
    """Get AI engagement data for a specific client"""
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
    
    # Get latest engagement data (today's data)
    today = date.today()
    
    # Department engagement
    dept_query = select(DepartmentEngagement).where(
        and_(
            DepartmentEngagement.client_id == UUID(client_id),
            DepartmentEngagement.date == today
        )
    )
    dept_result = await session.execute(dept_query)
    departments = []
    for dept in dept_result.scalars().all():
        departments.append(DepartmentEngagementResponse(
            department=dept.department,
            interactions=dept.interactions,
            active_users=dept.active_users,
            pct_change_vs_prev_7d=float(dept.pct_change_vs_prev_7d)
        ))
    
    # Application engagement
    app_query = select(ApplicationEngagement).where(
        and_(
            ApplicationEngagement.client_id == UUID(client_id),
            ApplicationEngagement.date == today
        )
    )
    app_result = await session.execute(app_query)
    applications = []
    for app in app_result.scalars().all():
        applications.append(ApplicationEngagementResponse(
            application=app.application,
            vendor=app.vendor,
            icon=app.icon or "default",
            active_users=app.active_users,
            interactions_per_day=app.interactions_per_day,
            trend_pct_7d=float(app.trend_pct_7d),
            utilization=app.utilization,
            recommendation=app.recommendation or ""
        ))
    
    # Agent engagement
    agent_query = select(AgentEngagement).where(
        and_(
            AgentEngagement.client_id == UUID(client_id),
            AgentEngagement.date == today
        )
    )
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
    
    # Productivity correlations
    prod_query = select(ProductivityCorrelation).where(
        and_(
            ProductivityCorrelation.client_id == UUID(client_id),
            ProductivityCorrelation.date == today
        )
    )
    prod_result = await session.execute(prod_query)
    productivity_correlations = {}
    for prod in prod_result.scalars().all():
        productivity_correlations[prod.department] = ProductivityCorrelationResponse(
            ai_interactions_7d=prod.ai_interactions_7d,
            output_metric_7d=prod.output_metric_7d,
            note=prod.note or ""
        )
    
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
    session: AsyncSession = Depends(get_async_session)
):
    """Get department engagement data for a specific client"""
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
    
    # Get latest department engagement data
    today = date.today()
    dept_query = select(DepartmentEngagement).where(
        and_(
            DepartmentEngagement.client_id == UUID(client_id),
            DepartmentEngagement.date == today
        )
    ).order_by(desc(DepartmentEngagement.interactions))
    
    dept_result = await session.execute(dept_query)
    departments = []
    for dept in dept_result.scalars().all():
        departments.append(DepartmentEngagementResponse(
            department=dept.department,
            interactions=dept.interactions,
            active_users=dept.active_users,
            pct_change_vs_prev_7d=float(dept.pct_change_vs_prev_7d)
        ))
    
    return departments

@router.get("/clients/{client_id}/applications", response_model=List[ApplicationEngagementResponse])
async def get_application_engagement(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get application engagement data for a specific client"""
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
    
    # Get latest application engagement data
    today = date.today()
    app_query = select(ApplicationEngagement).where(
        and_(
            ApplicationEngagement.client_id == UUID(client_id),
            ApplicationEngagement.date == today
        )
    ).order_by(desc(ApplicationEngagement.interactions_per_day))
    
    app_result = await session.execute(app_query)
    applications = []
    for app in app_result.scalars().all():
        applications.append(ApplicationEngagementResponse(
            application=app.application,
            vendor=app.vendor,
            icon=app.icon or "default",
            active_users=app.active_users,
            interactions_per_day=app.interactions_per_day,
            trend_pct_7d=float(app.trend_pct_7d),
            utilization=app.utilization,
            recommendation=app.recommendation or ""
        ))
    
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
