"""
Reporting endpoints.
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions
from app.core.database import get_async_session

router = APIRouter()


class ComplianceReportResponse(BaseModel):
    """Compliance report response model."""
    
    client_id: str
    framework: str
    period_start: str
    period_end: str
    total_prompts: int
    violations_count: int
    compliance_score: float
    generated_at: str


@router.get("/compliance", response_model=ComplianceReportResponse)
async def get_compliance_report(
    framework: str = Query(..., description="Compliance framework: HIPAA, SOC2, GDPR"),
    start_date: datetime = Query(..., description="Report start date"),
    end_date: datetime = Query(..., description="Report end date"),
    auth_context: AuthContext = Depends(require_permissions(["audit:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> ComplianceReportResponse:
    """Generate compliance report for the specified framework and period."""
    
    # Mock data for now
    return ComplianceReportResponse(
        client_id="client-1",
        framework=framework,
        period_start=start_date.isoformat(),
        period_end=end_date.isoformat(),
        total_prompts=1250,
        violations_count=45,
        compliance_score=94.5,
        generated_at=datetime.utcnow().isoformat(),
    )
