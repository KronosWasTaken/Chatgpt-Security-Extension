from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session, TenantContext
from app.core.auth import create_access_token, verify_token, get_password_hash, verify_password
from app.models.msp import MSP, MSPUser
from app.models.client import ClientUser
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

router = APIRouter()
security = HTTPBearer()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_info: dict

class UserInfo(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    msp_id: Optional[str] = None
    client_id: Optional[str] = None
    department: Optional[str] = None
    permissions: List[str] = []

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_async_session)
):
    try:
        msp_user = await session.execute(
            "SELECT * FROM msp_users WHERE email = :email AND is_active = true",
            {"email": login_data.email}
        )
        msp_user = msp_user.fetchone()
        
        if msp_user:
            if not verify_password(login_data.password, msp_user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            msp = await session.execute(
                "SELECT * FROM msps WHERE id = :msp_id",
                {"msp_id": msp_user.msp_id}
            )
            msp = msp.fetchone()
            
            token_data = {
                "sub": str(msp_user.id),
                "email": msp_user.email,
                "msp_id": str(msp_user.msp_id),
                "client_id": None,
                "role": msp_user.role,
                "permissions": msp_user.permissions or [],
                "exp": datetime.utcnow() + timedelta(hours=24)
            }
            
            access_token = create_access_token(token_data)
            
            return TokenResponse(
                access_token=access_token,
                token_type="bearer",
                expires_in=86400,  # 24 hours
                user_info={
                    "user_id": str(msp_user.id),
                    "email": msp_user.email,
                    "name": f"{msp_user.first_name} {msp_user.last_name}",
                    "role": msp_user.role,
                    "msp_id": str(msp_user.msp_id),
                    "client_id": None,
                    "department": msp_user.department,
                    "permissions": msp_user.permissions or []
                }
            )
        
        client_user = await session.execute(
            "SELECT * FROM client_users WHERE email = :email AND is_active = true",
            {"email": login_data.email}
        )
        client_user = client_user.fetchone()
        
        if client_user:
            if not verify_password(login_data.password, client_user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            token_data = {
                "sub": str(client_user.id),
                "email": client_user.email,
                "msp_id": None,
                "client_id": str(client_user.client_id),
                "role": client_user.role,
                "permissions": client_user.permissions or [],
                "exp": datetime.utcnow() + timedelta(hours=24)
            }
            
            access_token = create_access_token(token_data)
            
            return TokenResponse(
                access_token=access_token,
                token_type="bearer",
                expires_in=86400,
                user_info={
                    "user_id": str(client_user.id),
                    "email": client_user.email,
                    "name": f"{client_user.first_name} {client_user.last_name}",
                    "role": client_user.role,
                    "msp_id": None,
                    "client_id": str(client_user.client_id),
                    "department": client_user.department,
                    "permissions": client_user.permissions or []
                }
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )

@router.get("/me", response_model=UserInfo)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    try:
        token_data = verify_token(credentials.credentials)
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user_id = token_data.get("sub")
        role = token_data.get("role")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")
        
        if msp_id:
            user = await session.execute(
                "SELECT * FROM msp_users WHERE id = :user_id",
                {"user_id": user_id}
            )
            user = user.fetchone()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return UserInfo(
                user_id=str(user.id),
                email=user.email,
                name=f"{user.first_name} {user.last_name}",
                role=user.role,
                msp_id=str(user.msp_id),
                client_id=None,
                department=user.department,
                permissions=user.permissions or []
            )
        else:
            user = await session.execute(
                "SELECT * FROM client_users WHERE id = :user_id",
                {"user_id": user_id}
            )
            user = user.fetchone()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return UserInfo(
                user_id=str(user.id),
                email=user.email,
                name=f"{user.first_name} {user.last_name}",
                role=user.role,
                msp_id=None,
                client_id=str(user.client_id),
                department=user.department,
                permissions=user.permissions or []
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        token_data = verify_token(credentials.credentials)
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        new_token_data = token_data.copy()
        new_token_data["exp"] = datetime.utcnow() + timedelta(hours=24)
        
        access_token = create_access_token(new_token_data)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=86400,
            user_info={
                "user_id": token_data.get("sub"),
                "email": token_data.get("email"),
                "role": token_data.get("role"),
                "msp_id": token_data.get("msp_id"),
                "client_id": token_data.get("client_id")
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )