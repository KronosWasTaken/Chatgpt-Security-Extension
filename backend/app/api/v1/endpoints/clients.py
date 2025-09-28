from pydantic import BaseModel
from fastapi import APIRouter, Depends,Request

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID
from app.models import (
    Client, ClientAIServices, MSPAuditSummary, ClientMetrics, 
    Alert, DepartmentEngagement, ApplicationEngagement, 
    AgentEngagement, UserEngagement, ProductivityCorrelation,
    AIService, ClientComplianceReport, PortfolioValueReport, MSP,
    ClientAIServiceUsage
)
from sqlalchemy import select, func, case, join
from sqlalchemy.orm import aliased
from app.core.utils import *
from app.services.metrics_calculator import MetricsCalculator
from datetime import date

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

async def calculate_avg_daily_interactions(session: AsyncSession, client_id: str, ai_service_id: str) -> int:
    """Calculate average daily interactions from ClientAIServiceUsage table"""
    from datetime import timedelta
    
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

async def update_client_metrics_in_db(session: AsyncSession, client_id: str, metrics: dict):
    """Update client metrics in the database"""
    from uuid import UUID
    
    # Check if metrics already exist for today
    existing_query = select(ClientMetrics).where(
        ClientMetrics.client_id == UUID(client_id),
        ClientMetrics.date == date.today()
    )
    existing_result = await session.execute(existing_query)
    existing_metrics = existing_result.scalar_one_or_none()
    
    if existing_metrics:
        # Update existing metrics
        existing_metrics.apps_monitored = metrics["apps_monitored"]
        existing_metrics.interactions_monitored = metrics["interactions_monitored"]
        existing_metrics.agents_deployed = metrics["agents_deployed"]
        existing_metrics.risk_score = metrics["risk_score"]
        existing_metrics.compliance_coverage = metrics["compliance_coverage"]
    else:
        # Create new metrics record
        new_metrics = ClientMetrics(
            client_id=UUID(client_id),
            date=date.today(),
            apps_monitored=metrics["apps_monitored"],
            interactions_monitored=metrics["interactions_monitored"],
            agents_deployed=metrics["agents_deployed"],
            risk_score=metrics["risk_score"],
            compliance_coverage=metrics["compliance_coverage"]
        )
        session.add(new_metrics)

class ClientResponse(BaseModel):
    id: str
    name: str
    industry: str
    company_size: str
    status: str
    subscription_tier: str
    apps_monitored: int
    interactions_monitored: int
    agents_deployed: int
    risk_score: int
    compliance_coverage: int
    created_at: datetime
    updated_at: datetime

class ClientCreate(BaseModel):
    name: str
    industry: str
    company_size: str = "small"
    subscription_tier: str = "Basic"
    business_type: str
    contact_info: str

# Additional Response Models for Dashboard Data
class InventoryItemResponse(BaseModel):
    id: str
    type: str  # 'Application' or 'Agent'
    name: str
    vendor: str
    users: int
    avgDailyInteractions: int
    status: str  # 'Permitted' or 'Unsanctioned'
    integrations: List[str]
    risk_score: int
    active_users: int

class ClientInventoryResponse(BaseModel):
    clientId: str
    items: List[InventoryItemResponse]

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

class AlertResponse(BaseModel):
    id: str
    ts: str
    clientId: str
    app: Optional[str]
    assetKind: str
    family: str
    subtype: Optional[str]
    severity: str
    usersAffected: Optional[int]
    count: Optional[int]
    details: str
    frameworks: List[str]
    status: str

router = APIRouter()



@router.get("/", response_model=List[ClientResponse])
async def get_clients(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    user = request.state.user  
    print(user)
    clients = []
    
    if user['role'] in ["msp_admin", "msp_user"]:
        msp_id = UUID(user['msp_id'])
       
        
        # Get basic client data
        client_query = select(Client).where(Client.msp_id == msp_id).order_by(Client.created_at.desc())
        client_result = await session.execute(client_query)
        client_rows = client_result.scalars().all()
        
        # Initialize metrics calculator
        calculator = MetricsCalculator(session)
        
        print("hmm")
        for client in client_rows:
          
            # Calculate and update metrics in real-time
            metrics = await calculator.calculate_client_metrics(str(client.id))
            
            # Update metrics in database
            await update_client_metrics_in_db(session, str(client.id), metrics)
            
            clients.append(ClientResponse(
                id=str(client.id),
                name=client.name,
                industry=client.industry,
                company_size=client.company_size,
                status=client.status,
                subscription_tier=client.subscription_tier,
                apps_monitored=metrics["apps_monitored"],
                interactions_monitored=metrics["interactions_monitored"],
                agents_deployed=metrics["agents_deployed"],
                risk_score=int(metrics["risk_score"]),
                compliance_coverage=int(metrics["compliance_coverage"]),
                created_at=client.created_at,
                updated_at=client.updated_at
            ))
      
    return clients


@router.get("/{client_id}/inventory", response_model=ClientInventoryResponse)
async def get_client_inventory(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get AI inventory for a specific client"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return ClientInventoryResponse(clientId=client_id, items=[])
    
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
        return ClientInventoryResponse(clientId=client_id, items=[])
    
    # Get AI services for this client
    ai_services_query = select(ClientAIServices).where(
        ClientAIServices.client_id == UUID(client_id)
    )
    ai_services_result = await session.execute(ai_services_query)
    ai_services = ai_services_result.scalars().all()
    
    items = []
    for service in ai_services:
        # Calculate average daily interactions from usage table
        avg_daily_interactions = await calculate_avg_daily_interactions(
            session, client_id, str(service.ai_service_id)
        )
        
        items.append(InventoryItemResponse(
            id=str(service.id),
            type=service.type,
            name=service.name,
            vendor=service.vendor,
            users=service.users,
            avgDailyInteractions=avg_daily_interactions,
            status=service.status,
            integrations=service.integrations or [],
            risk_score=get_risk_score_for_service(service),
            active_users=service.users
        ))
    
    return ClientInventoryResponse(clientId=client_id, items=items)


@router.get("/{client_id}/engagement", response_model=AIEngagementDataResponse)
async def get_client_engagement(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get AI engagement data for a specific client"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return AIEngagementDataResponse(
            departments=[], applications=[], agents=[], productivity_correlations={}
        )
    
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
        return AIEngagementDataResponse(
            departments=[], applications=[], agents=[], productivity_correlations={}
        )
    
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


@router.get("/{client_id}/alerts", response_model=List[AlertResponse])
async def get_client_alerts(
    client_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get alerts for a specific client"""
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
    
    # Get alerts for this client
    alerts_query = select(Alert).where(
        Alert.client_id == UUID(client_id)
    ).order_by(desc(Alert.created_at))
    
    alerts_result = await session.execute(alerts_query)
    alerts = []
    for alert in alerts_result.scalars().all():
        alerts.append(AlertResponse(
            id=str(alert.id),
            ts=alert.created_at.isoformat(),
            clientId=client_id,
            app=alert.app,
            assetKind=alert.asset_kind,
            family=alert.family,
            subtype=alert.subtype,
            severity=alert.severity,
            usersAffected=alert.users_affected,
            count=alert.count,
            details=alert.details,
            frameworks=alert.frameworks or [],
            status=alert.status
        ))
    
    return alerts


@router.get("/portfolio-totals")
async def get_portfolio_totals(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get portfolio totals for MSP dashboard - calculated in real-time"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        return {
            "apps_monitored": 0,
            "interactions_monitored": 0,
            "agents_deployed": 0,
            "avg_risk_score": 0
        }
    
    msp_id = UUID(user['msp_id'])
    
    # Get all clients for this MSP
    client_query = select(Client).where(Client.msp_id == msp_id)
    client_result = await session.execute(client_query)
    clients = client_result.scalars().all()
    
    # Initialize metrics calculator
    calculator = MetricsCalculator(session)
    
    # Calculate and update metrics for all clients
    total_apps = 0
    total_interactions = 0
    total_agents = 0
    risk_scores = []
    
    for client in clients:
        metrics = await calculator.calculate_client_metrics(str(client.id))
        
        # Update metrics in database
        await update_client_metrics_in_db(session, str(client.id), metrics)
        
        total_apps += metrics["apps_monitored"]
        total_interactions += metrics["interactions_monitored"]
        total_agents += metrics["agents_deployed"]
        risk_scores.append(metrics["risk_score"])
    
    # Calculate average risk score
    avg_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
    
    return {
        "apps_monitored": total_apps,
        "interactions_monitored": total_interactions,
        "agents_deployed": total_agents,
        "avg_risk_score": round(avg_risk_score, 1)
    }


