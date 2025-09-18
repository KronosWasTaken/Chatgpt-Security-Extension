

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthService, JWTManager, PasswordManager
from app.core.database import get_async_session

router = APIRouter()


class LoginRequest(BaseModel):

    
    email: EmailStr
    password: str


class LoginResponse(BaseModel):

    
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):

    
    refresh_token: str


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_async_session),
) -> LoginResponse:

    
    auth_service = AuthService(db)
    auth_context = await auth_service.authenticate_user(
        email=request.email,
        password=request.password,
    )
    
    if not auth_context:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    

    token_data = {
        "sub": auth_context.user_id,
        "email": auth_context.email,
        "msp_id": auth_context.msp_id,
        "client_ids": auth_context.client_ids,
        "role": auth_context.role,
        "permissions": auth_context.permissions,
    }
    
    access_token = JWTManager.create_access_token(token_data)
    refresh_token = JWTManager.create_refresh_token(token_data)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_async_session),
) -> LoginResponse:

    
    try:
        payload = JWTManager.verify_token(request.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        

        auth_service = AuthService(db)
        auth_context = await auth_service.get_user_by_token(request.refresh_token)
        
        if not auth_context:
            raise HTTPException(status_code=401, detail="Invalid token")
        

        token_data = {
            "sub": auth_context.user_id,
            "email": auth_context.email,
            "msp_id": auth_context.msp_id,
            "client_ids": auth_context.client_ids,
            "role": auth_context.role,
            "permissions": auth_context.permissions,
        }
        
        access_token = JWTManager.create_access_token(token_data)
        refresh_token = JWTManager.create_refresh_token(token_data)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=30 * 60,
        )
        
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout")
async def logout():

    return {"message": "Logged out successfully"}
