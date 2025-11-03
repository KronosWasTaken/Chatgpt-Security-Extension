from fastapi import APIRouter, Request, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import UUID
from typing import List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from app.core.database import get_async_session
from app.models.clients import Alert, Client, ClientAIServices
from pydantic import BaseModel
import uuid

router = APIRouter()

class AlertFamily(str, Enum):
    UNSANCTIONED_USE = "Unsanctioned Use"
    SENSITIVE_DATA = "Sensitive Data"
    AGENT_RISK = "Agent Risk"
    POLICY_VIOLATION = "Policy Violation"
    USAGE_ANOMALY = "Usage Anomaly"
    COMPLIANCE = "Compliance"
    COMPLIANCE_GAP = "Compliance Gap"
    CONFIG_DRIFT = "Config Drift"
    ENFORCEMENT = "Enforcement"

class Severity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class AlertStatus(str, Enum):
    UNASSIGNED = "Unassigned"
    PENDING = "Pending"
    COMPLETE = "Complete"
    AI_RESOLVED = "AI Resolved"

# Pydantic models
class AIApplicationInfo(BaseModel):
    id: str
    name: str
    vendor: str
    type: str
    status: str

class AlertResponse(BaseModel):
    id: str
    client_id: str
    application_id: Optional[str] = None
    ai_application: Optional[AIApplicationInfo] = None
    user_id: Optional[str] = None
    alert_family: AlertFamily
    subtype: Optional[str] = None
    severity: Severity
    status: AlertStatus
    title: str
    description: str
    users_affected: int
    interaction_count: int
    frameworks: Any = None
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None

@router.get("/", response_model=List[AlertResponse])
async def get_alerts(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    status: Optional[AlertStatus] = Query(None, description="Filter by alert status"),
    severity: Optional[Severity] = Query(None, description="Filter by alert severity"),
    alert_family: Optional[AlertFamily] = Query(None, description="Filter by alert family"),
    days: Optional[int] = Query(None, description="Filter alerts from last N days (7, 30, or 90)"),
    limit: Optional[int] = Query(100, description="Maximum number of alerts to return"),
    offset: Optional[int] = Query(0, description="Number of alerts to skip")
):
    user = request.state.user
    
    alerts = []
    
    if user['role'] in ["msp_admin", "msp_user"]:
     msp_id = user['msp_id']
      
      # Get all clients for this MSP
     clients_query = select(Client.id).where(Client.msp_id == msp_id)
     clients_result = await session.execute(clients_query)
     client_ids = [str(client_id) for client_id in clients_result.scalars().all()]
     
     if not client_ids:
         return []
    
    elif user['role'] in ["client_admin","client_user"]:
        client_ids=[user['client_id']]
     

     
    alerts_query = select(Alert).options(
        selectinload(Alert.ai_service)
    ).where(
        Alert.client_id.in_([uuid.UUID(cid) for cid in client_ids])
    )
    
    # Add date filtering if specified
    if days is not None:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        alerts_query = alerts_query.where(Alert.created_at >= cutoff_date)
    # If days is None, return all alerts (original behavior)
    
    if status:
        alerts_query = alerts_query.where(Alert.status == status.value)
    
    if severity:
        alerts_query = alerts_query.where(Alert.severity == severity.value)
    
    if alert_family:
        alerts_query = alerts_query.where(Alert.family == alert_family.value)
    
    alerts_query = alerts_query.order_by(desc(Alert.created_at))
    
    if limit:
        alerts_query = alerts_query.limit(limit)
    
    if offset:
        alerts_query = alerts_query.offset(offset)
    
    # Execute the query
    alerts_result = await session.execute(alerts_query)
    
    for alert in alerts_result.scalars().all():
        # Create AI application info if available
        ai_application = None
        if alert.ai_service:
            ai_application = AIApplicationInfo(
                id=str(alert.ai_service.id),
                name=alert.ai_service.name,
                vendor=alert.ai_service.vendor,
                type=alert.ai_service.type,
                status=alert.ai_service.status
            )
        
        alerts.append(AlertResponse(
            id=str(alert.id),
            client_id=str(alert.client_id),
            application_id=alert.app, 
            ai_application=ai_application,
            user_id=user['id'], 
            alert_family=AlertFamily(alert.family) if alert.family in [e.value for e in AlertFamily] else AlertFamily.UNSANCTIONED_USE,
            subtype=alert.subtype,
            severity=Severity(alert.severity) if alert.severity in [e.value for e in Severity] else Severity.LOW,
            status=AlertStatus(alert.status) if alert.status in [e.value for e in AlertStatus] else AlertStatus.UNASSIGNED,
            title=f"{alert.family} - {alert.subtype or 'Alert'}",  # Generate title from family and subtype
            description=alert.details,
            users_affected=alert.users_affected or 0,
            interaction_count=alert.count or 0,
            frameworks=alert.frameworks or {},
            assigned_to=None, 
            resolved_at=None, 
            created_at=alert.created_at,
            updated_at=alert.updated_at
        ))
     
    return alerts

@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get a specific alert by ID"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    msp_id = user['msp_id']
    
    # Verify the alert belongs to a client of this MSP
    alert_query = select(Alert).options(
        selectinload(Alert.ai_service)
    ).join(Client).where(
        and_(
            Alert.id == alert_id,
            Client.msp_id == msp_id
        )
    )
    
    alert_result = await session.execute(alert_query)
    alert = alert_result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Create AI application info if available
    ai_application = None
    if alert.ai_service:
        ai_application = AIApplicationInfo(
            id=str(alert.ai_service.id),
            name=alert.ai_service.name,
            vendor=alert.ai_service.vendor,
            type=alert.ai_service.type,
            status=alert.ai_service.status
        )
    
    return AlertResponse(
        id=str(alert.id),
        client_id=str(alert.client_id),
        application_id=alert.app,
        ai_application=ai_application,
        user_id=None,
        alert_family=AlertFamily(alert.family),
        subtype=alert.subtype,
        severity=Severity(alert.severity),
        status=AlertStatus(alert.status),
        title=f"{alert.family} - {alert.subtype or 'Alert'}",
        description=alert.details,
        users_affected=alert.users_affected or 0,
        interaction_count=alert.count or 0,
        frameworks=alert.frameworks or {},
        assigned_to=None,
        resolved_at=None,
        created_at=alert.created_at,
        updated_at=alert.updated_at
    )

@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    alert_update: AlertUpdate,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Update an alert's status, assignment, or resolution"""
    user = request.state.user
    
    if user['role'] not in ["msp_admin", "msp_user"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    msp_id = user['msp_id']
    
    # Verify the alert belongs to a client of this MSP
    alert_query = select(Alert).options(
        selectinload(Alert.ai_service)
    ).join(Client).where(
        and_(
            Alert.id == alert_id,
            Client.msp_id == msp_id
        )
    )
    
    alert_result = await session.execute(alert_query)
    alert = alert_result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Update fields if provided
    if alert_update.status is not None:
        alert.status = alert_update.status.value
    
    if alert_update.assigned_to is not None:
        # Note: This would require adding assigned_to field to the Alert model
        pass  # For now, skip this field
    
    if alert_update.resolved_at is not None:
        # Note: This would require adding resolved_at field to the Alert model
        pass  # For now, skip this field
    
    alert.updated_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(alert)
    
    # Create AI application info if available
    ai_application = None
    if alert.ai_service:
        ai_application = AIApplicationInfo(
            id=str(alert.ai_service.id),
            name=alert.ai_service.name,
            vendor=alert.ai_service.vendor,
            type=alert.ai_service.type,
            status=alert.ai_service.status
        )
    
    return AlertResponse(
        id=str(alert.id),
        client_id=str(alert.client_id),
        application_id=alert.app,
        ai_application=ai_application,
        user_id=None,
        alert_family=AlertFamily(alert.family),
        subtype=alert.subtype,
        severity=Severity(alert.severity),
        status=AlertStatus(alert.status),
        title=f"{alert.family} - {alert.subtype or 'Alert'}",
        description=alert.details,
        users_affected=alert.users_affected or 0,
        interaction_count=alert.count or 0,
        frameworks=alert.frameworks or {},
        assigned_to=None,
        resolved_at=None,
        created_at=alert.created_at,
        updated_at=alert.updated_at
    )
        