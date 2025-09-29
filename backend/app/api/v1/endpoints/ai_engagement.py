from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from typing import List, Optional, Dict, Any
from datetime import date
from uuid import UUID
from app.models import Client, AgentEngagement, ProductivityCorrelation, UserEngagement,ClientAIServiceUsage
from app.services.engagement_service import EngagementService
from sqlalchemy import select, and_, desc, func

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

class ClientAIEngagementResponse(BaseModel):
    client_id: str
    client_name: str
    engagement: AIEngagementDataResponse

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


# @router.get("/msp/clients", response_model=List[ClientAIEngagementResponse])
# async def get_msp_clients_engagement(
#     request: Request,
#     department: Optional[str] = Query(None, description="Filter by department"),
#     target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
#     session: AsyncSession = Depends(get_async_session)
# ):
#     """Get AI engagement data for ALL clients under the authenticated MSP.

#     Returns a list of per-client engagement summaries.
#     """
#     user = request.state.user

#     if user['role'] not in ["msp_admin", "msp_user"]:
#         raise HTTPException(status_code=403, detail="Access denied")

#     # Fetch all clients for this MSP
#     client_query = select(Client).where(
#         Client.msp_id == UUID(user['msp_id'])
#     ).order_by(Client.created_at.desc())
#     clients_result = await session.execute(client_query)
#     clients = clients_result.scalars().all()

#     engagement_service = EngagementService(session)
#     target_date = target_date or date.today()

#     responses: List[ClientAIEngagementResponse] = []

#     for client in clients:
#         engagement_data = await engagement_service.get_engagement_summary(
#             str(client.id), target_date, department
#         )

#         departments = [
#             DepartmentEngagementResponse(
#                 department=dept['department'],
#                 interactions=dept['interactions'],
#                 active_users=dept['active_users'],
#                 pct_change_vs_prev_7d=dept['pct_change_vs_prev_7d']
#             )
#             for dept in engagement_data['departments']
#         ]

#         applications = [
#             ApplicationEngagementResponse(
#                 application=app['application'],
#                 vendor=app['vendor'],
#                 icon=app['icon'] or "default",
#                 active_users=app['active_users'],
#                 interactions_per_day=app['interactions_per_day'],
#                 trend_pct_7d=app['trend_pct_7d'],
#                 utilization=app['utilization'],
#                 recommendation=app['recommendation']
#             )
#             for app in engagement_data['applications']
#         ]

#         agents_data = await engagement_service.get_agent_engagement_from_table(str(client.id), target_date)
#         productivity_data = await engagement_service.get_productivity_correlations_from_table(str(client.id), target_date)

#         agents = [
#             AgentEngagementResponse(
#                 agent=agent['agent'],
#                 vendor=agent['vendor'],
#                 icon=agent['icon'],
#                 deployed=agent['deployed'],
#                 avg_prompts_per_day=agent['avg_prompts_per_day'],
#                 flagged_actions=agent['flagged_actions'],
#                 trend_pct_7d=agent['trend_pct_7d'],
#                 status=agent['status'],
#                 last_activity_iso=agent['last_activity_iso'],
#                 associated_apps=agent['associated_apps']
#             )
#             for agent in agents_data
#         ]

#         productivity_correlations = {
#             dept: ProductivityCorrelationResponse(
#                 ai_interactions_7d=corr['ai_interactions_7d'],
#                 output_metric_7d=corr['output_metric_7d'],
#                 note=corr['note']
#             )
#             for dept, corr in productivity_data.items()
#         }

#         responses.append(ClientAIEngagementResponse(
#             client_id=str(client.id),
#             client_name=client.name,
#             engagement=AIEngagementDataResponse(
#                 departments=departments,
#                 applications=applications,
#                 agents=agents,
#                 productivity_correlations=productivity_correlations
#             )
#         ))

#     return responses


@router.get("/msp/departments", response_model=List[DepartmentEngagementResponse])
async def get_msp_departments_engagement(
    request: Request,
    target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
    session: AsyncSession = Depends(get_async_session)
):
    """Aggregate department engagement across ALL clients for the authenticated MSP."""
    user = request.state.user

    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")

    target_date = target_date or date.today()

    # Get all clients for MSP
    clients_query = select(Client.id).where(Client.msp_id == UUID(user['msp_id']))
    clients_result = await session.execute(clients_query)
    client_ids = [row.id for row in clients_result]

    if not client_ids:
        return []

   

    query = select(
        ClientAIServiceUsage.department,
        func.sum(ClientAIServiceUsage.daily_interactions).label('interactions'),
        func.count(func.distinct(ClientAIServiceUsage.user_id)).label('active_users')
    ).where(
        and_(
            ClientAIServiceUsage.client_id.in_(client_ids),
            ClientAIServiceUsage.created_at >= target_date,
            ClientAIServiceUsage.created_at < target_date + date.resolution
        )
    ).group_by(ClientAIServiceUsage.department)

    result = await session.execute(query)
    
    print(result,"results")


    # Build response (trend left as 0 for cross-client aggregate or could be added later)
    departments: List[DepartmentEngagementResponse] = []
    for row in result:
        departments.append(DepartmentEngagementResponse(
            department=row.department or "Unknown",
            interactions=row.interactions or 0,
            active_users=row.active_users or 0,
            pct_change_vs_prev_7d=0.0
        ))

    # Sort by interactions desc for consistency
    departments.sort(key=lambda d: d.interactions, reverse=True)

    return departments


@router.get("/msp/clients", response_model=AIEngagementDataResponse)
async def get_msp_aggregate_engagement(
    request: Request,
    department: Optional[str] = Query(None, description="Filter by department"),
    target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
    session: AsyncSession = Depends(get_async_session)
):
    """Return a single MSP-wide aggregate of departments, applications, and agents across all clients."""
    user = request.state.user

    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Gather all client IDs for MSP
    clients_query = select(Client.id).where(Client.msp_id == UUID(user['msp_id']))
    clients_result = await session.execute(clients_query)
    client_ids = [row.id for row in clients_result]

    if not client_ids:
        return AIEngagementDataResponse(departments=[], applications=[], agents=[], productivity_correlations={})

    engagement_service = EngagementService(session)
    target_date = target_date or date.today()

    # Aggregate departments and applications
    # Reuse usage-based calculations from service across each client and merge
    dept_map = {}
    app_map = {}
    agents_all: List[AgentEngagementResponse] = []
    prod_corr: dict = {}

    for cid in client_ids:
        summary = await engagement_service.get_engagement_summary(str(cid), target_date, department)

        for d in summary['departments']:
            key = d['department'] or 'Unknown'
            agg = dept_map.get(key, {'department': key, 'interactions': 0, 'active_users': 0, 'pct_change_vs_prev_7d': 0.0, 'contributors': 0})
            agg['interactions'] += d['interactions']
            agg['active_users'] += d['active_users']
            # Average pct across contributing clients
            agg['pct_change_vs_prev_7d'] = ((agg['pct_change_vs_prev_7d'] * agg['contributors']) + d['pct_change_vs_prev_7d']) / (agg['contributors'] + 1)
            agg['contributors'] += 1
            dept_map[key] = agg

        # Only aggregate Application-type items into applications bucket
        for a in summary['applications']:
            if a.get('type') != 'Application':
                continue
            key = (a['application'], a['vendor'])
            agg = app_map.get(key, {
                'application': a['application'], 'vendor': a['vendor'], 'icon': a['icon'] or 'default',
                'active_users': 0, 'interactions_per_day': 0, 'trend_pct_7d': 0.0, 'contributors': 0,
                'utilization_counts': {'High': 0, 'Medium': 0, 'Low': 0}, 'recommendation': a['recommendation']
            })
            agg['active_users'] += a['active_users']
            agg['interactions_per_day'] += a['interactions_per_day']
            agg['trend_pct_7d'] = ((agg['trend_pct_7d'] * agg['contributors']) + a['trend_pct_7d']) / (agg['contributors'] + 1)
            # Track most common utilization tier
            util = a['utilization']
            if util in agg['utilization_counts']:
                agg['utilization_counts'][util] += 1
            agg['contributors'] += 1
            app_map[key] = agg

        # Agents: concatenate from table-based method for fidelity
        for ag in summary['agents']:
            agents_all.append(AgentEngagementResponse(
                agent=ag['agent'],
                vendor=ag['vendor'],
                icon=ag['icon'],
                deployed=ag['deployed'],
                avg_prompts_per_day=ag['avg_prompts_per_day'],
                flagged_actions=ag['flagged_actions'],
                trend_pct_7d=ag['trend_pct_7d'],
                status=ag['status'],
                last_activity_iso=ag['last_activity_iso'],
                associated_apps=ag['associated_apps']
            ))

        # Merge productivity correlations per department by concatenating arrays if present
        for dept, corr in summary['productivity_correlations'].items():
            if dept not in prod_corr:
                prod_corr[dept] = corr
            else:
                # Simple merge strategy: keep existing (can be enhanced later)
                continue

    # Build final lists
    departments = [
        DepartmentEngagementResponse(
            department=v['department'],
            interactions=v['interactions'],
            active_users=v['active_users'],
            pct_change_vs_prev_7d=round(v['pct_change_vs_prev_7d'], 2)
        ) for v in dept_map.values()
    ]
    departments.sort(key=lambda d: d.interactions, reverse=True)

    applications = []
    for v in app_map.values():
        # Pick the dominant utilization tier
        utilization = max(v['utilization_counts'], key=v['utilization_counts'].get)
        applications.append(ApplicationEngagementResponse(
            application=v['application'],
            vendor=v['vendor'],
            icon=v['icon'],
            active_users=v['active_users'],
            interactions_per_day=v['interactions_per_day'],
            trend_pct_7d=round(v['trend_pct_7d'], 2),
            utilization=utilization,
            recommendation=v['recommendation']
        ))

    # Sort apps by interactions
    applications.sort(key=lambda a: a.interactions_per_day, reverse=True)

    return AIEngagementDataResponse(
        departments=departments,
        applications=applications,
        agents=agents_all,
        productivity_correlations=prod_corr
    )
