"""
AI service registry endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions
from app.core.database import get_async_session

router = APIRouter()


class AIServiceResponse(BaseModel):
    """AI service response model."""
    
    id: str
    name: str
    domain_patterns: List[str]
    category: str
    risk_level: str
    is_active: bool


@router.get("/", response_model=List[AIServiceResponse])
async def get_ai_services(
    auth_context: AuthContext = Depends(require_permissions(["client:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> List[AIServiceResponse]:
    """Get AI services registry."""
    
    # Mock data for now
    return [
        AIServiceResponse(
            id="ai-1",
            name="ChatGPT",
            domain_patterns=["*.openai.com", "chat.openai.com"],
            category="chat",
            risk_level="medium",
            is_active=True,
        ),
        AIServiceResponse(
            id="ai-2",
            name="Claude",
            domain_patterns=["claude.ai", "*.anthropic.com"],
            category="chat",
            risk_level="medium",
            is_active=True,
        ),
    ]
