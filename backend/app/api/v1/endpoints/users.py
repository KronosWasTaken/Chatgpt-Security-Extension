"""
User management endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions_dep
from app.core.database import get_async_session

router = APIRouter()


class UserResponse(BaseModel):
    """User response model."""
    
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool


@router.get("/", response_model=List[UserResponse])
async def get_users(
    auth_context: AuthContext = Depends(require_permissions_dep(["user:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> List[UserResponse]:
    """Get users accessible to the current user."""
    
    # Mock data for now
    return [
        UserResponse(
            id="user-1",
            email="admin@hospital.com",
            first_name="Dr. Sarah",
            last_name="Johnson",
            role="client_admin",
            is_active=True,
        ),
    ]
