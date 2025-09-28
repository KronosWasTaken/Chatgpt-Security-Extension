from fastapi import APIRouter,Depends,HTTPException,status as http_status
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from pydantic import BaseModel,EmailStr
import uuid
from typing import Optional,List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.core.auth import PasswordManager,JWTManager
from app.models.users import User
from sqlalchemy import select
from datetime import datetime,timedelta
router=APIRouter()
security=HTTPBearer()


class LoginRequest(BaseModel):
    email:EmailStr
    password:str
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_info: dict

class UserInfo(BaseModel):
    user_id:str
    email: str
    name: str
    role: str
    msp_id: Optional[str] = None
    client_id: Optional[str] = None
    department: Optional[str] = None
    permissions: List[str] = []

    



@router.post("/login",response_model=TokenResponse)
async def login(
    login_data:LoginRequest,
    session:AsyncSession=Depends(get_async_session)
):
    try:
        user = (await session.execute(
    select(User).where(User.email == login_data.email, User.is_active == True)
)).scalars().first()
        
        if user:
            if not PasswordManager.verify_password(login_data.password,user.hashed_password):
                raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
            
            user.last_login=datetime.utcnow().date()
            await session.commit()
            token_data={
                "sub":str(user.id),
                "email":user.email,
                "type":user.user_type,
                "msp_id":str(user.msp_id) if user.msp_id else None,
                "client_id":str(user.client_id) if user.client_id else None,
                "role":user.role,
                "permissions":user.permissions or [],
                 "exp": datetime.utcnow() + timedelta(hours=24)
                
            }
            print(token_data)
            access_token=JWTManager.create_access_token(token_data)
            user_info={
        "user_id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "msp_id": str(user.msp_id) if user.msp_id else None,
        "client_id": str(user.client_id) if user.client_id else None,
        "department": user.department,
        "permissions": user.permissions or []
    }
            return TokenResponse(
                access_token=access_token,
                token_type="bearer",
                expires_in=86400,
               user_info=user_info
                
            )
            
        raise HTTPException(
               status_code=http_status.HTTP_401_UNAUTHORIZED,
               detail="Invalid credentials"
           )
        
            
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )

@router.get("/me", response_model=UserInfo)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session)
):
    try:
        token_data = JWTManager.verify_token(credentials.credentials)
        if not token_data:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        user_id = token_data.get("sub")
        msp_id = token_data.get("msp_id")
        client_id = token_data.get("client_id")

        if msp_id:
            result = await session.execute(
                select(User).where((User.id == user_id) & (User.msp_id == msp_id))
            )
        else:
            result = await session.execute(
                select(User).where((User.id == user_id) & (User.client_id == client_id))
            )

        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        print(user,"user exists")

        return UserInfo(
            user_id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            msp_id=str(user.msp_id) if user.msp_id else None,
            client_id=str(user.client_id) if user.client_id else None,
            department=user.department,
            permissions=user.permissions or []
        )

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get current user: {str(e)}"
        )

@router.post("/refresh" )
def refresh_token( credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token_data = verify_token(credentials.credentials)
        if not token_data:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        new_token_data = token_data.copy()
        new_token_data["exp"] = datetime.utcnow() + timedelta(hours=24)
        access_token=JWTManager.create_access_token(new_token_data)
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
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )
        
        
    