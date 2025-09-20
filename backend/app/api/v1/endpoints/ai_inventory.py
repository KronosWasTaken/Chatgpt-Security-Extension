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

# Pydantic models
class AIApplicationResponse(BaseModel):
    id: str
    name: str
    vendor: str
    type: ApplicationType
    status: ApplicationStatus
    risk_level: RiskLevel
    risk_score: int
    active_users: int
    avg_daily_interactions: int
    integrations: Optional[dict] = None
    approval_conditions: Optional[dict] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AIApplicationCreate(BaseModel):
    name: str
    vendor: str
    type: ApplicationType
    status: ApplicationStatus = ApplicationStatus.UNDER_REVIEW
    risk_level: RiskLevel = RiskLevel.MEDIUM
    risk_score: int = 50
    integrations: Optional[dict] = None
    approval_conditions: Optional[dict] = None

class AIApplicationUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    type: Optional[ApplicationType] = None
    status: Optional[ApplicationStatus] = None
    risk_level: Optional[RiskLevel] = None
    risk_score: Optional[int] = None
    integrations: Optional[dict] = None
    approval_conditions: Optional[dict] = None

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

# AI Inventory endpoints
@router.get("/", response_model=List[AIApplicationResponse])
async def get_ai_inventory(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Get AI applications and agents inventory"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")
        
        if role in ["msp_admin", "msp_user"] and msp_id:
            # MSP user - get all applications across all clients
            result = await session.execute("""
                SELECT 
                    a.id,
                    ai.name,
                    ai.vendor,
                    CASE 
                        WHEN ai.category = 'chat' THEN 'Application'
                        WHEN ai.category = 'coding' THEN 'Application'
                        WHEN ai.category = 'image' THEN 'Application'
                        ELSE 'Agent'
                    END as type,
                    a.approval_status as status,
                    ai.risk_level,
                    50 as risk_score,
                    0 as active_users,
                    0 as avg_daily_interactions,
                    '{}'::json as integrations,
                    a.conditions as approval_conditions,
                    a.approved_by,
                    a.approved_at,
                    a.created_at,
                    a.updated_at,
                    c.name as client_name
                FROM client_approved_ai_services a
                JOIN ai_services ai ON a.ai_service_id = ai.id
                JOIN clients c ON a.client_id = c.id
                WHERE c.msp_id = :msp_id
                ORDER BY a.created_at DESC
            """, {"msp_id": msp_id})
            
        elif role in ["client_admin", "end_user"] and client_id:
            # Client user - get applications for their client
            result = await session.execute("""
                SELECT 
                    a.id,
                    ai.name,
                    ai.vendor,
                    CASE 
                        WHEN ai.category = 'chat' THEN 'Application'
                        WHEN ai.category = 'coding' THEN 'Application'
                        WHEN ai.category = 'image' THEN 'Application'
                        ELSE 'Agent'
                    END as type,
                    a.approval_status as status,
                    ai.risk_level,
                    50 as risk_score,
                    0 as active_users,
                    0 as avg_daily_interactions,
                    '{}'::json as integrations,
                    a.conditions as approval_conditions,
                    a.approved_by,
                    a.approved_at,
                    a.created_at,
                    a.updated_at,
                    c.name as client_name
                FROM client_approved_ai_services a
                JOIN ai_services ai ON a.ai_service_id = ai.id
                JOIN clients c ON a.client_id = c.id
                WHERE a.client_id = :client_id
                ORDER BY a.created_at DESC
            """, {"client_id": client_id})
            
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        applications = []
        for row in result.fetchall():
            applications.append(AIApplicationResponse(
                id=str(row.id),
                name=row.name,
                vendor=row.vendor,
                type=row.type,
                status=row.status,
                risk_level=row.risk_level,
                risk_score=row.risk_score or 0,
                active_users=row.active_users or 0,
                avg_daily_interactions=row.avg_daily_interactions or 0,
                integrations=row.integrations,
                approval_conditions=row.approval_conditions,
                approved_by=row.approved_by,
                approved_at=row.approved_at,
                created_at=row.created_at,
                updated_at=row.updated_at
            ))
        
        return applications
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI inventory: {str(e)}"
        )

@router.get("/{app_id}", response_model=AIApplicationResponse)
async def get_ai_application(
    app_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Get specific AI application details"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")
        
        # Get application with client info
        result = await session.execute("""
            SELECT 
                a.id,
                a.name,
                a.vendor,
                a.type,
                a.status,
                a.risk_level,
                a.risk_score,
                a.active_users,
                a.avg_daily_interactions,
                a.integrations,
                a.approval_conditions,
                a.approved_by,
                a.approved_at,
                a.created_at,
                a.updated_at,
                a.client_id,
                c.name as client_name
            FROM client_approved_ai_services a
            JOIN clients c ON a.client_id = c.id
            WHERE a.id = :app_id
        """, {"app_id": app_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI application not found"
            )
        
        # Check permissions
        if role in ["client_admin", "end_user"] and str(row.client_id) != client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this application"
            )
        
        return AIApplicationResponse(
            id=str(row.id),
            name=row.name,
            vendor=row.vendor,
            type=row.type,
            status=row.status,
            risk_level=row.risk_level,
            risk_score=row.risk_score or 0,
            active_users=row.active_users or 0,
            avg_daily_interactions=row.avg_daily_interactions or 0,
            integrations=row.integrations,
            approval_conditions=row.approval_conditions,
            approved_by=row.approved_by,
            approved_at=row.approved_at,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI application: {str(e)}"
        )

@router.post("/", response_model=AIApplicationResponse)
async def create_ai_application(
    app_data: AIApplicationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Create new AI application"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        client_id = token_data.get("client_id")
        user_id = token_data.get("sub")
        
        if role not in ["msp_admin", "client_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Create application
        result = await session.execute("""
            INSERT INTO client_approved_ai_services (
                client_id, ai_service_id, approval_status, risk_tolerance,
                conditions, approved_by, approved_at, created_at, updated_at
            ) VALUES (
                :client_id, :ai_service_id, :approval_status, :risk_tolerance,
                :conditions, :approved_by, :approved_at, NOW(), NOW()
            ) RETURNING id
        """, {
            "client_id": client_id,
            "ai_service_id": f"APP_{app_data.name.upper().replace(' ', '_')}",
            "approval_status": app_data.status.value,
            "risk_tolerance": app_data.risk_level.value,
            "conditions": app_data.approval_conditions,
            "approved_by": user_id,
            "approved_at": datetime.utcnow() if app_data.status == ApplicationStatus.PERMITTED else None
        })
        
        app_id = result.fetchone()[0]
        await session.commit()
        
        # Return the created application
        return await get_ai_application(str(app_id), credentials, session)
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create AI application: {str(e)}"
        )

@router.put("/{app_id}", response_model=AIApplicationResponse)
async def update_ai_application(
    app_id: str,
    app_data: AIApplicationUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Update AI application"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        user_id = token_data.get("sub")
        
        if role not in ["msp_admin", "client_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Check if application exists and get client_id
        result = await session.execute("""
            SELECT client_id FROM client_approved_ai_services WHERE id = :app_id
        """, {"app_id": app_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI application not found"
            )
        
        # Check permissions
        if role == "client_admin" and str(row.client_id) != token_data.get("client_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this application"
            )
        
        # Build update query
        update_fields = []
        update_values = {"app_id": app_id}
        
        for field, value in app_data.dict(exclude_unset=True).items():
            if value is not None:
                if field == "status":
                    update_fields.append("approval_status = :status")
                    update_values["status"] = value.value
                elif field == "risk_level":
                    update_fields.append("risk_tolerance = :risk_level")
                    update_values["risk_level"] = value.value
                else:
                    update_fields.append(f"{field} = :{field}")
                    update_values[field] = value
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append("updated_at = NOW()")
        
        await session.execute(f"""
            UPDATE client_approved_ai_services 
            SET {', '.join(update_fields)}
            WHERE id = :app_id
        """, update_values)
        
        await session.commit()
        
        # Return updated application
        return await get_ai_application(app_id, credentials, session)
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update AI application: {str(e)}"
        )

@router.delete("/{app_id}")
async def delete_ai_application(
    app_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete AI application"""
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        
        if role not in ["msp_admin", "client_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Check if application exists and get client_id
        result = await session.execute("""
            SELECT client_id FROM client_approved_ai_services WHERE id = :app_id
        """, {"app_id": app_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI application not found"
            )
        
        # Check permissions
        if role == "client_admin" and str(row.client_id) != token_data.get("client_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this application"
            )
        
        # Delete application
        await session.execute("""
            DELETE FROM client_approved_ai_services WHERE id = :app_id
        """, {"app_id": app_id})
        
        await session.commit()
        
        return {"message": "AI application deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete AI application: {str(e)}"
        )
