"""
Client management endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions_dep
from app.core.database import get_async_session

router = APIRouter()


class ClientResponse(BaseModel):
    """Client response model."""
    
    id: str
    name: str
    industry: str
    company_size: str
    status: str
    compliance_requirements: List[str]


@router.get("/", response_model=List[ClientResponse])
async def get_clients(
    auth_context: AuthContext = Depends(require_permissions_dep(["client:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> List[ClientResponse]:
    """Get clients accessible to the current user."""
    
    # Mock data for now
    return [
        ClientResponse(
            id="client-1",
            name="General Hospital System",
            industry="Healthcare",
            company_size="large",
            status="active",
            compliance_requirements=["HIPAA", "SOC2"],
        ),
    ]
