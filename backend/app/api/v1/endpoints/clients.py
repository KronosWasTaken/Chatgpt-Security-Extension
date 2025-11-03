from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query, HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from typing import List, Optional
from datetime import datetime, date, timedelta
from uuid import UUID
from app.models import (
    Client, ClientAIServices, MSPAuditSummary, ClientMetrics, 
    Alert, AgentEngagement, UserEngagement, ProductivityCorrelation,
    AIService, ClientComplianceReport, PortfolioValueReport, MSP,
    ClientAIServiceUsage
)
from sqlalchemy import select, func, case, join, and_, desc
from sqlalchemy.orm import aliased
from app.core.utils import *
from app.services.metrics_calculator import MetricsCalculator
from app.services.engagement_service import EngagementService
from app.core.client_context import (
    get_client_context, 
    get_client_by_context, 
    get_client_by_id,
    require_client_access,
    ClientContext
)
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
    apps_added_7d: int
    interactions_pct_change_7d: float
    agents_deployed_change_7d: int

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



@router.get("/{client_id}/dashboard")
async def get_client_dashboard(
    client_id: str,
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
):
    """Get dashboard data for a specific client - accessible by both MSP and client users"""
    client = await get_client_by_id(client_id, client_context, session)
    
    # Calculate metrics for this client
    calculator = MetricsCalculator(session)
    metrics = await calculator.calculate_client_metrics(str(client.id))
    
    # Update metrics in database
    await update_client_metrics_in_db(session, str(client.id), metrics)
    
    return {
        "client_id": str(client.id),
        "client_name": client.name,
        "apps_monitored": metrics.get('apps_monitored', 0),
        "interactions_monitored": metrics.get('interactions_monitored', 0),
        "agents_deployed": metrics.get('agents_deployed', 0),
        "risk_score": metrics.get('risk_score', 0),
        "compliance_coverage": int(round(metrics.get('compliance_coverage', 0))),
        "status": client.status,
        "subscription_tier": client.subscription_tier,
        "industry": client.industry,
        "company_size": client.company_size
    }

@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
):
    """Get a specific client by ID - accessible by both MSP and client users"""
    client = await get_client_by_id(client_id, client_context, session)
    
    # Calculate metrics for this client
    calculator = MetricsCalculator(session)
    metrics = await calculator.calculate_client_metrics(str(client.id))
    
    # Update metrics in database
    await update_client_metrics_in_db(session, str(client.id), metrics)
    
    # Calculate additional metrics
    seven_days_ago = date.today() - timedelta(days=7)
    
    # Apps added in last 7 days
    apps_added_query = select(func.count()).where(
        and_(
            ClientAIServices.client_id == client.id,
            ClientAIServices.created_at >= seven_days_ago
        )
    )
    apps_added_result = await session.execute(apps_added_query)
    apps_added_7d = int(apps_added_result.scalar() or 0)
    
    # Interactions percentage change
    current_start = seven_days_ago
    prev_start = seven_days_ago - timedelta(days=7)
    
    interactions_current_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client.id,
            ClientAIServiceUsage.created_at >= current_start
        )
    )
    interactions_current_result = await session.execute(interactions_current_query)
    interactions_current_7d = int(interactions_current_result.scalar() or 0)
    
    interactions_prev_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
        and_(
            ClientAIServiceUsage.client_id == client.id,
            ClientAIServiceUsage.created_at >= prev_start,
            ClientAIServiceUsage.created_at < current_start
        )
    )
    interactions_prev_result = await session.execute(interactions_prev_query)
    interactions_prev_7d = int(interactions_prev_result.scalar() or 0)
    
    # Calculate percentage change
    if interactions_prev_7d > 0:
        interactions_change_pct = ((interactions_current_7d - interactions_prev_7d) / interactions_prev_7d) * 100
    else:
        interactions_change_pct = 0 if interactions_current_7d == 0 else 100
    
    return ClientResponse(
        id=str(client.id),
        name=client.name,
        industry=client.industry,
        company_size=client.company_size,
        status=client.status,
        subscription_tier=client.subscription_tier,
        apps_monitored=metrics.get('apps_monitored', 0),
        interactions_monitored=metrics.get('interactions_monitored', 0),
        agents_deployed=metrics.get('agents_deployed', 0),
        risk_score=metrics.get('risk_score', 0),
        compliance_coverage=int(round(metrics.get('compliance_coverage', 0))),
        created_at=client.created_at,
        updated_at=client.updated_at,
        apps_added_7d=apps_added_7d,
        interactions_pct_change_7d=interactions_change_pct,
        agents_deployed_change_7d=0
    )

@router.get("/", response_model=List[ClientResponse])
async def get_clients(
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
):
    """Get clients based on user role and permissions"""
    clients = []
    
    if client_context.is_msp_user():
        # MSP users can see all clients under their MSP
        msp_id = UUID(client_context.msp_id)
       
        
        # Get basic client data
        client_query = select(Client).where(Client.msp_id == msp_id).order_by(Client.created_at.desc())
        client_result = await session.execute(client_query)
        client_rows = client_result.scalars().all()
        
        # Initialize metrics calculator
        calculator = MetricsCalculator(session)
        
        for client in client_rows:
          
            # Calculate and update metrics in real-time
            metrics = await calculator.calculate_client_metrics(str(client.id))
            
            # Update metrics in database
            await update_client_metrics_in_db(session, str(client.id), metrics)
            
            # 7-day comparisons
            seven_days_ago = date.today() - timedelta(days=7)

            # Apps added in last 7 days (applications and agents as services)
            apps_added_query = select(func.count()).where(
                and_(
                    ClientAIServices.client_id == client.id,
                    ClientAIServices.created_at >= seven_days_ago
                )
            )
            apps_added_result = await session.execute(apps_added_query)
            apps_added_7d = int(apps_added_result.scalar() or 0)

            # Interactions percentage change: last 7 days vs previous 7 days
            current_start = seven_days_ago
            prev_start = seven_days_ago - timedelta(days=7)

            interactions_current_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
                and_(
                    ClientAIServiceUsage.client_id == client.id,
                    ClientAIServiceUsage.created_at >= current_start,
                    ClientAIServiceUsage.created_at < date.today() + timedelta(days=1)
                )
            )
            interactions_prev_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
                and_(
                    ClientAIServiceUsage.client_id == client.id,
                    ClientAIServiceUsage.created_at >= prev_start,
                    ClientAIServiceUsage.created_at < current_start
                )
            )
            interactions_current = (await session.execute(interactions_current_query)).scalar() or 0
            interactions_prev = (await session.execute(interactions_prev_query)).scalar() or 0
            if interactions_prev == 0:
                interactions_pct_change_7d = 0.0
            else:
                interactions_pct_change_7d = round(((interactions_current - interactions_prev) / interactions_prev) * 100, 2)

            # Agents deployed change: compare total deployed today vs 7 days ago
            agents_today_query = select(func.sum(AgentEngagement.deployed)).where(
                and_(
                    AgentEngagement.client_id == client.id,
                    AgentEngagement.date == date.today()
                )
            )
            agents_prev_query = select(func.sum(AgentEngagement.deployed)).where(
                and_(
                    AgentEngagement.client_id == client.id,
                    AgentEngagement.date == seven_days_ago
                )
            )
            agents_today = (await session.execute(agents_today_query)).scalar() or 0
            agents_prev = (await session.execute(agents_prev_query)).scalar() or 0
            agents_deployed_change_7d = int(agents_today - agents_prev)

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
                updated_at=client.updated_at,
                apps_added_7d=apps_added_7d,
                interactions_pct_change_7d=interactions_pct_change_7d,
                agents_deployed_change_7d=agents_deployed_change_7d
            ))
    
    elif client_context.is_client_user():
        # Client users can only see their own client
        client = await get_client_by_context(client_context, session)
        
        if client:
            # Calculate metrics for this client
            calculator = MetricsCalculator(session)
            metrics = await calculator.calculate_client_metrics(str(client.id))
            
            # Update metrics in database
            await update_client_metrics_in_db(session, str(client.id), metrics)
            
            # 7-day comparisons
            seven_days_ago = date.today() - timedelta(days=7)

            # Apps added in last 7 days
            apps_added_query = select(func.count()).where(
                and_(
                    ClientAIServices.client_id == client.id,
                    ClientAIServices.created_at >= seven_days_ago
                )
            )
            apps_added_result = await session.execute(apps_added_query)
            apps_added_7d = int(apps_added_result.scalar() or 0)

            # Interactions percentage change
            current_start = seven_days_ago
            prev_start = seven_days_ago - timedelta(days=7)

            interactions_current_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
                and_(
                    ClientAIServiceUsage.client_id == client.id,
                    ClientAIServiceUsage.created_at >= current_start,
                    ClientAIServiceUsage.created_at < date.today() + timedelta(days=1)
                )
            )
            interactions_prev_query = select(func.sum(ClientAIServiceUsage.daily_interactions)).where(
                and_(
                    ClientAIServiceUsage.client_id == client.id,
                    ClientAIServiceUsage.created_at >= prev_start,
                    ClientAIServiceUsage.created_at < current_start
                )
            )
            interactions_current = (await session.execute(interactions_current_query)).scalar() or 0
            interactions_prev = (await session.execute(interactions_prev_query)).scalar() or 0
            if interactions_prev == 0:
                interactions_pct_change_7d = 0.0
            else:
                interactions_pct_change_7d = round(((interactions_current - interactions_prev) / interactions_prev) * 100, 2)

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
                updated_at=client.updated_at,
                apps_added_7d=apps_added_7d,
                interactions_pct_change_7d=interactions_pct_change_7d,
                agents_deployed_change_7d=0  # Set to 0 for client users
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
            session, client_id, str(service.id)
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
    department: Optional[str] = None,
    target_date: Optional[date] = None,
    session: AsyncSession = Depends(get_async_session)
):
    """Get AI engagement data for a specific client with optional department filtering"""
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

    safe_default = {
        "apps_monitored": 0,
        "interactions_monitored": 0,
        "agents_deployed": 0,
        "avg_risk_score": 0.0,
    }

    if user.get('role') not in ["msp_admin", "msp_user"]:
        return safe_default

    try:
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
        risk_scores: List[float] = []

        for client in clients:
            metrics = await calculator.calculate_client_metrics(str(client.id))

            # Update metrics in database (best-effort)
            try:
                await update_client_metrics_in_db(session, str(client.id), metrics)
            except Exception:
                pass

            # Accumulate with safe casting
            total_apps += int(metrics.get("apps_monitored", 0) or 0)
            total_interactions += int(metrics.get("interactions_monitored", 0) or 0)
            total_agents += int(metrics.get("agents_deployed", 0) or 0)
            try:
                risk_scores.append(float(metrics.get("risk_score", 0) or 0))
            except Exception:
                continue

        avg_risk_score = float(sum(risk_scores) / len(risk_scores)) if risk_scores else 0.0

        return {
            "apps_monitored": int(total_apps),
            "interactions_monitored": int(total_interactions),
            "agents_deployed": int(total_agents),
            "avg_risk_score": round(avg_risk_score, 1),
        }
    except Exception:
        return safe_default


# Request/Response models for adding client AI applications
class AddClientAIApplicationRequest(BaseModel):
    name: str
    vendor: str
    type: str  # 'Application' or 'Agent'
    status: str  # 'Permitted' or 'Unsanctioned'
    users: int = 0
    avg_daily_interactions: int = 0
    integrations: Optional[List[str]] = []
    ai_service_id: str
    risk_tolerance: str
    department_restrictions: Optional[dict] = None
    approved_at: Optional[date] = None
    approved_by: Optional[str] = None

class AddClientAIApplicationResponse(BaseModel):
    id: str
    name: str
    vendor: str
    type: str
    status: str
    users: int
    avg_daily_interactions: int
    integrations: List[str]
    ai_service_id: str
    risk_tolerance: str
    department_restrictions: Optional[dict]
    approved_at: Optional[date]
    approved_by: Optional[str]
    created_at: datetime

@router.post("/{client_id}/ai-applications", response_model=AddClientAIApplicationResponse)
async def add_client_ai_application(
    client_id: str,
    request_data: AddClientAIApplicationRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Add a new AI application to a client"""
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
    
    # Verify AI service exists
    ai_service_query = select(AIService).where(AIService.id == UUID(request_data.ai_service_id))
    ai_service_result = await session.execute(ai_service_query)
    ai_service = ai_service_result.scalar_one_or_none()
    
    if not ai_service:
        raise HTTPException(status_code=404, detail="AI service not found")
    
    # Validate type
    if request_data.type not in ["Application", "Agent"]:
        raise HTTPException(status_code=400, detail="Type must be 'Application' or 'Agent'")
    
    # Validate status
    if request_data.status not in ["Permitted", "Unsanctioned"]:
        raise HTTPException(status_code=400, detail="Status must be 'Permitted' or 'Unsanctioned'")
    
    # Validate risk tolerance
    valid_risk_tolerances = ["Low", "Medium", "High", "Critical"]
    if request_data.risk_tolerance not in valid_risk_tolerances:
        raise HTTPException(status_code=400, detail=f"Risk tolerance must be one of: {', '.join(valid_risk_tolerances)}")
    
    # Check if application already exists for this client
    existing_query = select(ClientAIServices).where(
        and_(
            ClientAIServices.client_id == UUID(client_id),
            ClientAIServices.name == request_data.name,
            ClientAIServices.vendor == request_data.vendor
        )
    )
    existing_result = await session.execute(existing_query)
    existing_app = existing_result.scalar_one_or_none()
    
    if existing_app:
        raise HTTPException(status_code=409, detail="AI application with this name and vendor already exists for this client")
    
    # Create new client AI application
    client_ai_app = ClientAIServices(
        client_id=UUID(client_id),
        name=request_data.name,
        vendor=request_data.vendor,
        type=request_data.type,
        status=request_data.status,
        users=request_data.users,
        avg_daily_interactions=request_data.avg_daily_interactions,
        integrations=request_data.integrations or [],
        ai_service_id=UUID(request_data.ai_service_id),
        risk_tolerance=request_data.risk_tolerance,
        department_restrictions=request_data.department_restrictions,
        approved_at=request_data.approved_at,
        approved_by=UUID(request_data.approved_by) if request_data.approved_by else None
    )
    
    session.add(client_ai_app)
    await session.commit()
    await session.refresh(client_ai_app)
    
    return AddClientAIApplicationResponse(
        id=str(client_ai_app.id),
        name=client_ai_app.name,
        vendor=client_ai_app.vendor,
        type=client_ai_app.type,
        status=client_ai_app.status,
        users=client_ai_app.users,
        avg_daily_interactions=client_ai_app.avg_daily_interactions,
        integrations=client_ai_app.integrations or [],
        ai_service_id=str(client_ai_app.ai_service_id),
        risk_tolerance=client_ai_app.risk_tolerance,
        department_restrictions=client_ai_app.department_restrictions,
        approved_at=client_ai_app.approved_at,
        approved_by=str(client_ai_app.approved_by) if client_ai_app.approved_by else None,
        created_at=client_ai_app.created_at
    )

@router.get("/ai-services", response_model=List[dict])
async def get_available_ai_services(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get list of available AI services for adding to clients"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all active AI services
    ai_services_query = select(AIService).where(AIService.is_active == True)
    result = await session.execute(ai_services_query)
    ai_services = result.scalars().all()
    
    return [
        {
            "id": str(service.id),
            "name": service.name,
            "vendor": service.vendor,
            "category": service.category,
            "risk_level": service.risk_level,
            "domain_patterns": service.domain_patterns,
            "detection_patterns": service.detection_patterns,
            "service_metadata": service.service_metadata
        }
        for service in ai_services
        
    ]


