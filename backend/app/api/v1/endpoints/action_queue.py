from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List, Optional
from datetime import datetime, date, timedelta
from uuid import UUID
from pydantic import BaseModel

from app.core.database import get_async_session
from app.models import (
    Client, ClientAIServices, Alert, ClientPolicyViolation, 
    ClientAuditLog, User, AgentEngagement
)
from app.core.client_context import get_client_context, ClientContext

router = APIRouter()

# Response Models
class ActionItemResponse(BaseModel):
    id: str
    type: str  # "unsanctioned_app", "flagged_agent", "policy_violation", "alert"
    title: str
    description: str
    severity: str
    status: str
    created_at: datetime
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    metadata: dict = {}

class UnsanctionedAppResponse(BaseModel):
    id: str
    name: str
    vendor: str
    users: int
    interactions_per_day: int
    risk_score: float
    detected_at: datetime
    status: str

class FlaggedAgentResponse(BaseModel):
    id: str
    agent_name: str
    vendor: str
    flagged_actions: int
    last_flagged: datetime
    severity: str
    associated_apps: List[str]

class PolicyViolationResponse(BaseModel):
    id: str
    violation_type: str
    description: str
    severity: str
    user_name: str
    ai_service: str
    detected_at: datetime
    is_resolved: bool

class ActionQueueResponse(BaseModel):
    unsanctioned_apps: List[UnsanctionedAppResponse]
    flagged_agents: List[FlaggedAgentResponse]
    policy_violations: List[PolicyViolationResponse]
    high_priority_alerts: List[dict]
    total_actions: int
    urgent_count: int

@router.get("/clients/{client_id}/action-queue", response_model=ActionQueueResponse)
async def get_client_action_queue(
    client_id: str,
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
):
    """Get action queue for a specific client"""
    # Verify client access
    from app.core.client_context import get_client_by_id
    client = await get_client_by_id(client_id, client_context, session)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get unsanctioned applications (status = 'Unsanctioned')
    unsanctioned_query = select(ClientAIServices).where(
        and_(
            ClientAIServices.client_id == UUID(client_id),
            ClientAIServices.status == 'Unsanctioned'
        )
    ).order_by(desc(ClientAIServices.created_at))
    
    unsanctioned_result = await session.execute(unsanctioned_query)
    unsanctioned_apps = []
    
    for app in unsanctioned_result.scalars().all():
        unsanctioned_apps.append(UnsanctionedAppResponse(
            id=str(app.id),
            name=app.name,
            vendor=app.vendor,
            users=app.active_users or 0,
            interactions_per_day=app.avg_daily_interactions or 0,
            risk_score=float(app.risk_score or 0),
            detected_at=app.created_at,
            status=app.status
        ))
    
    # Get flagged agents (from AgentEngagement with flagged_actions > 0)
    flagged_agents_query = select(AgentEngagement).where(
        and_(
            AgentEngagement.client_id == UUID(client_id),
            AgentEngagement.flagged_actions > 0
        )
    ).order_by(desc(AgentEngagement.date))
    
    flagged_agents_result = await session.execute(flagged_agents_query)
    flagged_agents = []
    
    for agent in flagged_agents_result.scalars().all():
        flagged_agents.append(FlaggedAgentResponse(
            id=str(agent.id),
            agent_name=agent.agent,
            vendor=agent.vendor,
            flagged_actions=agent.flagged_actions,
            last_flagged=agent.date,
            severity="High" if agent.flagged_actions > 5 else "Medium",
            associated_apps=agent.associated_apps or []
        ))
    
    # Get policy violations
    violations_query = select(ClientPolicyViolation).where(
        and_(
            ClientPolicyViolation.client_id == UUID(client_id),
            ClientPolicyViolation.isActive == True
        )
    ).order_by(desc(ClientPolicyViolation.created_at))
    
    violations_result = await session.execute(violations_query)
    policy_violations = []
    
    for violation in violations_result.scalars().all():
        # Get user name
        user_query = select(User).where(User.id == violation.user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        # Get AI service name
        ai_service_name = "Unknown"
        if violation.audit_log and violation.audit_log.ai_service_id:
            service_query = select(ClientAIServices).where(
                ClientAIServices.id == violation.audit_log.ai_service_id
            )
            service_result = await session.execute(service_query)
            service = service_result.scalar_one_or_none()
            if service:
                ai_service_name = service.name
        
        policy_violations.append(PolicyViolationResponse(
            id=str(violation.id),
            violation_type=violation.violation_type,
            description=violation.description,
            severity=violation.severity,
            user_name=user.name if user else "Unknown",
            ai_service=ai_service_name,
            detected_at=violation.created_at,
            is_resolved=violation.is_resolved
        ))
    
    # Get high priority alerts
    alerts_query = select(Alert).where(
        and_(
            Alert.client_id == UUID(client_id),
            Alert.severity.in_(['High', 'Critical']),
            Alert.status.in_(['Unassigned', 'Pending'])
        )
    ).order_by(desc(Alert.created_at)).limit(10)
    
    alerts_result = await session.execute(alerts_query)
    high_priority_alerts = []
    
    for alert in alerts_result.scalars().all():
        high_priority_alerts.append({
            "id": str(alert.id),
            "title": alert.title,
            "severity": alert.severity,
            "status": alert.status,
            "created_at": alert.created_at,
            "details": alert.details
        })
    
    # Calculate totals
    total_actions = len(unsanctioned_apps) + len(flagged_agents) + len(policy_violations) + len(high_priority_alerts)
    urgent_count = len([a for a in unsanctioned_apps if a.risk_score > 70]) + \
                   len([a for a in flagged_agents if a.flagged_actions > 5]) + \
                   len([v for v in policy_violations if v.severity == 'High' and not v.is_resolved]) + \
                   len([a for a in high_priority_alerts if a['severity'] == 'Critical'])
    
    return ActionQueueResponse(
        unsanctioned_apps=unsanctioned_apps,
        flagged_agents=flagged_agents,
        policy_violations=policy_violations,
        high_priority_alerts=high_priority_alerts,
        total_actions=total_actions,
        urgent_count=urgent_count
    )

@router.post("/clients/{client_id}/actions/{action_id}/resolve")
async def resolve_action(
    client_id: str,
    action_id: str,
    action_type: str = Query(..., description="Type of action: unsanctioned_app, flagged_agent, policy_violation, alert"),
    resolution: str = Query(..., description="Resolution action taken"),
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
):
    """Resolve an action item"""
    # Verify client access
    from app.core.client_context import get_client_by_id
    client = await get_client_by_id(client_id, client_context, session)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if action_type == "unsanctioned_app":
        # Update app status to permitted or blocked
        app_query = select(ClientAIServices).where(
            and_(
                ClientAIServices.id == UUID(action_id),
                ClientAIServices.client_id == UUID(client_id)
            )
        )
        app_result = await session.execute(app_query)
        app = app_result.scalar_one_or_none()
        
        if app:
            if resolution == "approve":
                app.status = "Permitted"
            elif resolution == "block":
                app.status = "Blocked"
            await session.commit()
    
    elif action_type == "policy_violation":
        # Mark violation as resolved
        violation_query = select(ClientPolicyViolation).where(
            and_(
                ClientPolicyViolation.id == UUID(action_id),
                ClientPolicyViolation.client_id == UUID(client_id)
            )
        )
        violation_result = await session.execute(violation_query)
        violation = violation_result.scalar_one_or_none()
        
        if violation:
            violation.is_resolved = True
            violation.resolved_at = date.today()
            await session.commit()
    
    elif action_type == "alert":
        # Update alert status
        alert_query = select(Alert).where(
            and_(
                Alert.id == UUID(action_id),
                Alert.client_id == UUID(client_id)
            )
        )
        alert_result = await session.execute(alert_query)
        alert = alert_result.scalar_one_or_none()
        
        if alert:
            alert.status = "Complete"
            await session.commit()
    
    return {"message": "Action resolved successfully"}

@router.get("/clients/{client_id}/compliance-summary")
async def get_client_compliance_summary(
    client_id: str,
    client_context: ClientContext = Depends(get_client_context),
    session: AsyncSession = Depends(get_async_session)
):
    """Get compliance summary for client pages"""
    # Verify client access
    from app.core.client_context import get_client_by_id
    client = await get_client_by_id(client_id, client_context, session)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get compliance metrics
    total_violations = await session.execute(
        select(func.count(ClientPolicyViolation.id)).where(
            ClientPolicyViolation.client_id == UUID(client_id)
        )
    )
    total_violations_count = total_violations.scalar() or 0
    
    unresolved_violations = await session.execute(
        select(func.count(ClientPolicyViolation.id)).where(
            and_(
                ClientPolicyViolation.client_id == UUID(client_id),
                ClientPolicyViolation.is_resolved == False
            )
        )
    )
    unresolved_count = unresolved_violations.scalar() or 0
    
    high_severity_violations = await session.execute(
        select(func.count(ClientPolicyViolation.id)).where(
            and_(
                ClientPolicyViolation.client_id == UUID(client_id),
                ClientPolicyViolation.severity == 'High',
                ClientPolicyViolation.is_resolved == False
            )
        )
    )
    high_severity_count = high_severity_violations.scalar() or 0
    
    # Get framework compliance (mock data for now)
    frameworks = [
        {"name": "EU AI Act", "status": "Compliant", "lastReviewed": "2024-01-15"},
        {"name": "NY AI Regulation", "status": "Partial", "lastReviewed": "2024-01-10"},
        {"name": "NIST AI Framework", "status": "Compliant", "lastReviewed": "2024-01-12"},
        {"name": "SOC 2", "status": "Non-Compliant", "lastReviewed": "2024-01-08"}
    ]
    
    return {
        "client_id": client_id,
        "client_name": client.name,
        "kpis": {
            "total_violations": total_violations_count,
            "unresolved_violations": unresolved_count,
            "high_severity_violations": high_severity_count,
            "frameworks_met": len([f for f in frameworks if f["status"] == "Compliant"])
        },
        "frameworks": frameworks,
        "recent_violations": []  # Could be populated with actual data
    }

