from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.core.auth import verify_token
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()
security = HTTPBearer()

class ClientResponse(BaseModel):
    id: str
    name: str
    industry: str
    company_size: str
    status: str
    subscription_tier: str
    apps_monitored: int
    interactions_monitored: int
    agents_deployed: int
    risk_score: int
    compliance_coverage: int
    created_at: datetime
    updated_at: datetime

class ClientCreate(BaseModel):
    name: str
    industry: str
    company_size: str = "small"
    subscription_tier: str = "Basic"
    contact_email: str
    primary_contact_name: str
    primary_contact_phone: str

async def get_tenant_context(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    token_data = verify_token(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return token_data

@router.get("/", response_model=List[ClientResponse])
async def get_clients(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    try:
        token_data = await get_tenant_context(credentials)
        role = token_data.get("role")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")
        
        if role in ["msp_admin", "msp_user"] and msp_id:
            result = await session.execute("""
                SELECT 
                    c.id,
                    c.name,
                    c.industry,
                    c.company_size,
                    c.status,
                    c.subscription_tier,
                    c.created_at,
                    c.updated_at,
                    COALESCE(COUNT(DISTINCT a.id), 0) as apps_monitored,
                    COALESCE(SUM(al.total_prompts), 0) as interactions_monitored,
                    COALESCE(COUNT(DISTINCT CASE WHEN a.approval_status = 'approved' THEN a.id END), 0) as agents_deployed,
                    COALESCE(AVG(al.compliance_score), 0) as risk_score,
                    COALESCE(AVG(al.compliance_score), 0) as compliance_coverage
                FROM clients c
                LEFT JOIN client_approved_ai_services a ON c.id = a.client_id
                LEFT JOIN msp_audit_summary al ON c.id = al.client_id
                WHERE c.msp_id = :msp_id
                GROUP BY c.id, c.name, c.industry, c.company_size, c.status, 
                         c.subscription_tier, c.created_at, c.updated_at
                ORDER BY c.created_at DESC
            """, {"msp_id": msp_id})
            
            clients = []
            for row in result.fetchall():
                clients.append(ClientResponse(
                    id=str(row.id),
                    name=row.name,
                    industry=row.industry,
                    company_size=row.company_size,
                    status=row.status,
                    subscription_tier=row.subscription_tier,
                    apps_monitored=row.apps_monitored or 0,
                    interactions_monitored=row.interactions_monitored or 0,
                    agents_deployed=row.agents_deployed or 0,
                    risk_score=int(row.risk_score or 0),
                    compliance_coverage=int(row.compliance_coverage or 0),
                    created_at=row.created_at,
                    updated_at=row.updated_at
                ))
            
            return clients
            
        elif role in ["client_admin", "end_user"] and client_id:
            result = await session.execute("""
                SELECT 
                    c.id,
                    c.name,
                    c.industry,
                    c.company_size,
                    c.status,
                    c.subscription_tier,
                    c.created_at,
                    c.updated_at,
                    COALESCE(COUNT(DISTINCT a.id), 0) as apps_monitored,
                    COALESCE(SUM(al.total_prompts), 0) as interactions_monitored,
                    COALESCE(COUNT(DISTINCT CASE WHEN a.type = 'Agent' THEN a.id END), 0) as agents_deployed,
                    COALESCE(AVG(al.compliance_score), 0) as risk_score,
                    COALESCE(AVG(al.compliance_score), 0) as compliance_coverage
                FROM clients c
                LEFT JOIN client_approved_ai_services a ON c.id = a.client_id
                LEFT JOIN msp_audit_summary al ON c.id = al.client_id
                WHERE c.id = :client_id
                GROUP BY c.id, c.name, c.industry, c.company_size, c.status, 
                         c.subscription_tier, c.created_at, c.updated_at
            """, {"client_id": client_id})
            
            row = result.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Client not found"
                )
            
            return [ClientResponse(
                id=str(row.id),
                name=row.name,
                industry=row.industry,
                company_size=row.company_size,
                status=row.status,
                subscription_tier=row.subscription_tier,
                apps_monitored=row.apps_monitored or 0,
                interactions_monitored=row.interactions_monitored or 0,
                agents_deployed=row.agents_deployed or 0,
                risk_score=int(row.risk_score or 0),
                compliance_coverage=int(row.compliance_coverage or 0),
                created_at=row.created_at,
                updated_at=row.updated_at
            )]
        
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get clients: {str(e)}"
        )