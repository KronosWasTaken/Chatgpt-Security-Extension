from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.core.auth import verify_token
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

router = APIRouter()
security = HTTPBearer()

# Enums
class AlertFamily(str, Enum):
    UNSANCTIONED_USE = "Unsanctioned Use"
    SENSITIVE_DATA = "Sensitive Data"
    AGENT_RISK = "Agent Risk"
    POLICY_VIOLATION = "Policy Violation"
    USAGE_ANOMALY = "Usage Anomaly"
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
class AlertResponse(BaseModel):
    id: str
    client_id: str
    application_id: Optional[str] = None
    user_id: Optional[str] = None
    alert_family: AlertFamily
    subtype: Optional[str] = None
    severity: Severity
    status: AlertStatus
    title: str
    description: str
    users_affected: int
    interaction_count: int
    frameworks: Optional[dict] = None
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None

# Helper function to get tenant context
async def get_tenant_context(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Extract tenant context from JWT token"""
    token_data = verify_token(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return token_data

# Alert endpoints
@router.get("/", response_model=List[AlertResponse])
async def get_alerts(
    status: Optional[AlertStatus] = None,
    severity: Optional[Severity] = None,
    limit: int = 100,
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Get alerts with optional filtering"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")
        
        # Build query based on user role
        if role in ["msp_admin", "msp_user"] and msp_id:
            # MSP user - get all alerts across all clients
            query = """
                SELECT 
                    a.id,
                    a.client_id,
                    a.audit_log_id as application_id,
                    a.user_id,
                    a.violation_type as alert_family,
                    a.violation_type as subtype,
                    a.severity,
                    CASE 
                        WHEN a.is_resolved = true THEN 'Complete'
                        ELSE 'Unassigned'
                    END as status,
                    a.violation_type as title,
                    a.description,
                    1 as users_affected,
                    1 as interaction_count,
                    '[]'::json as frameworks,
                    NULL as assigned_to,
                    a.resolved_at,
                    a.created_at,
                    a.updated_at,
                    c.name as client_name
                FROM client_policy_violations a
                JOIN clients c ON a.client_id = c.id
                WHERE c.msp_id = :msp_id
            """
            params = {"msp_id": msp_id}
            
        elif role in ["client_admin", "end_user"] and client_id:
            # Client user - get alerts for their client
            query = """
                SELECT 
                    a.id,
                    a.client_id,
                    a.audit_log_id as application_id,
                    a.user_id,
                    a.violation_type as alert_family,
                    a.violation_type as subtype,
                    a.severity,
                    CASE 
                        WHEN a.is_resolved = true THEN 'Complete'
                        ELSE 'Unassigned'
                    END as status,
                    a.violation_type as title,
                    a.description,
                    1 as users_affected,
                    1 as interaction_count,
                    '[]'::json as frameworks,
                    NULL as assigned_to,
                    a.resolved_at,
                    a.created_at,
                    a.updated_at,
                    c.name as client_name
                FROM client_policy_violations a
                JOIN clients c ON a.client_id = c.id
                WHERE a.client_id = :client_id
            """
            params = {"client_id": client_id}
            
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        # Add filters
        if status:
            query += " AND a.status = :status"
            params["status"] = status.value
        
        if severity:
            query += " AND a.severity = :severity"
            params["severity"] = severity.value
        
        # Add ordering and pagination
        query += " ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset"
        params.update({"limit": limit, "offset": offset})
        
        result = await session.execute(query, params)
        
        alerts = []
        for row in result.fetchall():
            alerts.append(AlertResponse(
                id=str(row.id),
                client_id=str(row.client_id),
                application_id=str(row.application_id) if row.application_id else None,
                user_id=str(row.user_id) if row.user_id else None,
                alert_family=row.alert_family,
                subtype=row.subtype,
                severity=row.severity,
                status=row.status,
                title=row.title,
                description=row.description,
                users_affected=row.users_affected or 0,
                interaction_count=row.interaction_count or 0,
                frameworks=row.frameworks,
                assigned_to=row.assigned_to,
                resolved_at=row.resolved_at,
                created_at=row.created_at,
                updated_at=row.updated_at
            ))
        
        return alerts
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alerts: {str(e)}"
        )

@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Get specific alert details"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")
        
        # Get alert with client info
        result = await session.execute("""
            SELECT 
                a.id,
                a.client_id,
                a.application_id,
                a.user_id,
                a.alert_family,
                a.subtype,
                a.severity,
                a.status,
                a.title,
                a.description,
                a.users_affected,
                a.interaction_count,
                a.frameworks,
                a.assigned_to,
                a.resolved_at,
                a.created_at,
                a.updated_at,
                c.name as client_name,
                c.msp_id
            FROM client_policy_violations a
            JOIN clients c ON a.client_id = c.id
            WHERE a.id = :alert_id
        """, {"alert_id": alert_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Check permissions
        if role in ["client_admin", "end_user"] and str(row.client_id) != client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this alert"
            )
        
        return AlertResponse(
            id=str(row.id),
            client_id=str(row.client_id),
            application_id=str(row.application_id) if row.application_id else None,
            user_id=str(row.user_id) if row.user_id else None,
            alert_family=row.alert_family,
            subtype=row.subtype,
            severity=row.severity,
            status=row.status,
            title=row.title,
            description=row.description,
            users_affected=row.users_affected or 0,
            interaction_count=row.interaction_count or 0,
            frameworks=row.frameworks,
            assigned_to=row.assigned_to,
            resolved_at=row.resolved_at,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alert: {str(e)}"
        )

@router.put("/{alert_id}/status", response_model=AlertResponse)
async def update_alert_status(
    alert_id: str,
    alert_update: AlertUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Update alert status"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        user_id = token_data.get("sub")
        
        if role not in ["msp_admin", "client_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Check if alert exists and get client_id
        result = await session.execute("""
            SELECT client_id FROM client_policy_violations WHERE id = :alert_id
        """, {"alert_id": alert_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Check permissions
        if role == "client_admin" and str(row.client_id) != token_data.get("client_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this alert"
            )
        
        # Build update query
        update_fields = []
        update_values = {"alert_id": alert_id}
        
        for field, value in alert_update.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = :{field}")
                update_values[field] = value.value if hasattr(value, 'value') else value
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append("updated_at = NOW()")
        
        await session.execute(f"""
            UPDATE client_policy_violations 
            SET {', '.join(update_fields)}
            WHERE id = :alert_id
        """, update_values)
        
        await session.commit()
        
        # Return updated alert
        return await get_alert(alert_id, credentials, session)
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update alert: {str(e)}"
        )

@router.post("/{alert_id}/assign")
async def assign_alert(
    alert_id: str,
    assigned_to: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Assign alert to user"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        
        if role not in ["msp_admin", "client_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Check if alert exists and get client_id
        result = await session.execute("""
            SELECT client_id FROM client_policy_violations WHERE id = :alert_id
        """, {"alert_id": alert_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Check permissions
        if role == "client_admin" and str(row.client_id) != token_data.get("client_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this alert"
            )
        
        # Update alert assignment
        await session.execute("""
            UPDATE client_policy_violations 
            SET assigned_to = :assigned_to, updated_at = NOW()
            WHERE id = :alert_id
        """, {"alert_id": alert_id, "assigned_to": assigned_to})
        
        await session.commit()
        
        return {"message": "Alert assigned successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign alert: {str(e)}"
        )

@router.get("/feed/real-time")
async def get_alerts_feed(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Get real-time alerts feed (for WebSocket implementation)"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")
        
        # Get recent alerts (last 24 hours)
        if role in ["msp_admin", "msp_user"] and msp_id:
            result = await session.execute("""
                SELECT 
                    a.id,
                    a.title,
                    a.severity,
                    a.status,
                    a.created_at,
                    c.name as client_name
                FROM client_policy_violations a
                JOIN clients c ON a.client_id = c.id
                WHERE c.msp_id = :msp_id
                AND a.created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY a.created_at DESC
                LIMIT 50
            """, {"msp_id": msp_id})
            
        elif role in ["client_admin", "end_user"] and client_id:
            result = await session.execute("""
                SELECT 
                    a.id,
                    a.title,
                    a.severity,
                    a.status,
                    a.created_at,
                    c.name as client_name
                FROM client_policy_violations a
                JOIN clients c ON a.client_id = c.id
                WHERE a.client_id = :client_id
                AND a.created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY a.created_at DESC
                LIMIT 50
            """, {"client_id": client_id})
            
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        alerts = []
        for row in result.fetchall():
            alerts.append({
                "id": str(row.id),
                "title": row.title,
                "severity": row.severity,
                "status": row.status,
                "created_at": row.created_at.isoformat(),
                "client_name": row.client_name
            })
        
        return {"alerts": alerts}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alerts feed: {str(e)}"
        )
