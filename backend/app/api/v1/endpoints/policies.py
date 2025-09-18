"""
Policy management endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions_dep
from app.core.database import get_async_session

router = APIRouter()


class PolicyResponse(BaseModel):
    """Policy response model."""
    
    id: str
    name: str
    description: str
    enforcement_level: str
    status: str
    created_at: str


@router.get("/", response_model=List[PolicyResponse])
async def get_policies(
    auth_context: AuthContext = Depends(require_permissions_dep(["policy:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> List[PolicyResponse]:
    """Get policies for the current client."""
    
    # Mock data for now
    return [
        PolicyResponse(
            id="policy-1",
            name="HIPAA Compliance Policy",
            description="Policy for handling PHI data",
            enforcement_level="block",
            status="active",
            created_at="2024-01-01T00:00:00Z",
        ),
    ]
