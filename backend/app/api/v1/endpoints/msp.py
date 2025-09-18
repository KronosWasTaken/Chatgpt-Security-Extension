"""
MSP management endpoints.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions_dep
from app.core.database import get_async_session

router = APIRouter()


class MSPResponse(BaseModel):
    """MSP response model."""
    
    id: str
    name: str
    business_type: str
    subscription_tier: str
    status: str
    created_at: str


class ClientSummaryResponse(BaseModel):
    """Client summary response model."""
    
    id: str
    name: str
    industry: str
    company_size: str
    status: str
    compliance_requirements: List[str]
    created_at: str


class MSPSummaryResponse(BaseModel):
    """MSP summary response model."""
    
    msp: MSPResponse
    total_clients: int
    active_clients: int
    total_users: int
    recent_activity: dict


@router.get("/summary", response_model=MSPSummaryResponse)
async def get_msp_summary(
    auth_context: AuthContext = Depends(require_permissions_dep(["msp:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> MSPSummaryResponse:
    """Get MSP summary and statistics."""
    
    # This would typically query the database for MSP data
    # For now, returning mock data
    return MSPSummaryResponse(
        msp=MSPResponse(
            id="msp-123",
            name="TechCorp MSP Solutions",
            business_type="MSP",
            subscription_tier="enterprise",
            status="active",
            created_at="2024-01-01T00:00:00Z",
        ),
        total_clients=15,
        active_clients=12,
        total_users=450,
        recent_activity={
            "prompts_analyzed": 1250,
            "violations_detected": 45,
            "compliance_score": 94.5,
        },
    )


@router.get("/clients", response_model=List[ClientSummaryResponse])
async def get_msp_clients(
    auth_context: AuthContext = Depends(require_permissions_dep(["msp:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> List[ClientSummaryResponse]:
    """Get all clients managed by the MSP."""
    
    # This would query the database for client data
    # For now, returning mock data
    return [
        ClientSummaryResponse(
            id="client-1",
            name="General Hospital System",
            industry="Healthcare",
            company_size="large",
            status="active",
            compliance_requirements=["HIPAA", "SOC2"],
            created_at="2024-01-15T00:00:00Z",
        ),
        ClientSummaryResponse(
            id="client-2",
            name="TechCorp Startup",
            industry="Technology",
            company_size="small",
            status="active",
            compliance_requirements=["SOC2"],
            created_at="2024-02-01T00:00:00Z",
        ),
    ]


@router.get("/reports/summary")
async def get_msp_reports_summary(
    auth_context: AuthContext = Depends(require_permissions_dep(["msp:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """Get MSP-level reporting summary."""
    
    return {
        "total_prompts": 12500,
        "total_violations": 125,
        "compliance_score": 94.5,
        "top_violations": [
            {"type": "PHI Exposure", "count": 45},
            {"type": "Unauthorized AI Use", "count": 30},
        ],
        "client_breakdown": [
            {"client_id": "client-1", "name": "General Hospital", "score": 96.2},
            {"client_id": "client-2", "name": "TechCorp Startup", "score": 92.8},
        ],
    }
