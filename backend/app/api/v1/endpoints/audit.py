"""
Audit log endpoints.
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions
from app.core.database import get_async_session

router = APIRouter()


class AuditLogResponse(BaseModel):
    """Audit log response model."""
    
    id: str
    user_id: str
    session_id: Optional[str]
    ai_service_id: Optional[str]
    prompt_snippet: str
    enforcement_action: str
    risk_score: float
    created_at: str


@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    auth_context: AuthContext = Depends(require_permissions(["audit:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> List[AuditLogResponse]:
    """Get audit logs for the current client."""
    
    # Mock data for now
    return [
        AuditLogResponse(
            id="log-1",
            user_id="user-1",
            session_id="session-123",
            ai_service_id="ai-1",
            prompt_snippet="Patient John Doe has symptoms of...",
            enforcement_action="blocked",
            risk_score=0.95,
            created_at="2024-01-15T10:30:00Z",
        ),
    ]
