
import logging
from datetime import datetime, timedelta
from typing import Optional, List,Any,Dict
from uuid import UUID

from fastapi import Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, AuthorizationError

from app.models.users import User

logger = logging.getLogger(__name__)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")




class AuthContext:
    def __init__(
        self,
        user_id: UUID,
        email: str,
        msp_id: Optional[UUID] = None,
        client_ids: Optional[List[UUID]] = None,
        role: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ):
        self.user_id = user_id
        self.email = email
        self.msp_id = msp_id
        self.client_ids = client_ids
        self.role = role
        self.permissions = permissions or []
        
    
    def has_permission(self,permission:str)->bool:
        return permission in self.permissions
    
    def has_any_permission(self, permissions: List[str]) -> bool:
        return any(perm in self.permissions for perm in permissions)
    
    def has_all_permissions(self, permissions: List[str]) -> bool:
        return all(perm in self.permissions for perm in permissions)
    
    def can_access_client(self,client_id:UUID)->bool:
        return client_id in self.client_ids or self.role=="msp_admin"

class JWTManager:

    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
    ) -> str:

        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        to_encode.update({"exp": expire, "type": "access"})
        
        return jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:

        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(
            days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        
        to_encode.update({"exp": expire, "type": "refresh"})
        
        return jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
    
    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:

        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            raise AuthenticationError("Invalid token")
    
    @staticmethod
    def extract_token_from_header(authorization: str) -> str:

        if not authorization.startswith("Bearer "):
            raise AuthenticationError("Invalid authorization header")
        
        return authorization.split(" ")[1]




class PasswordManager:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:

        return pwd_context.verify(plain_password, hashed_password)


