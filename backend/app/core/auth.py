

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.models.msp import MSPUser
from app.models.client import ClientUser

logger = logging.getLogger(__name__)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthContext:

    
    def __init__(
        self,
        user_id: str,
        email: str,
        msp_id: Optional[str] = None,
        client_ids: Optional[List[str]] = None,
        role: Optional[str] = None,
        permissions: Optional[List[str]] = None,
    ):
        self.user_id = user_id
        self.email = email
        self.msp_id = msp_id
        self.client_ids = client_ids or []
        self.role = role
        self.permissions = permissions or []
    
    def has_permission(self, permission: str) -> bool:

        return permission in self.permissions
    
    def has_any_permission(self, permissions: List[str]) -> bool:

        return any(perm in self.permissions for perm in permissions)
    
    def has_all_permissions(self, permissions: List[str]) -> bool:

        return all(perm in self.permissions for perm in permissions)
    
    def can_access_client(self, client_id: str) -> bool:

        return client_id in self.client_ids or self.role == "msp_admin"




    
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


class AuthService:

    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def authenticate_user(self, email: str, password: str) -> Optional[AuthContext]:


        msp_user = await self._get_msp_user(email)
        if msp_user and PasswordManager.verify_password(password, msp_user.hashed_password):
            return AuthContext(
                user_id=str(msp_user.id),
                email=msp_user.email,
                msp_id=str(msp_user.msp_id),
                role=msp_user.role,
                permissions=msp_user.permissions,
            )
        

        client_user = await self._get_client_user(email)
        if client_user and PasswordManager.verify_password(password, client_user.hashed_password):
            return AuthContext(
                user_id=str(client_user.id),
                email=client_user.email,
                client_ids=[str(client_user.client_id)],
                role=client_user.role,
                permissions=client_user.permissions,
            )
        
        return None
    
    async def get_user_by_token(self, token: str) -> Optional[AuthContext]:

        try:
            payload = JWTManager.verify_token(token)
            user_id = payload.get("sub")
            email = payload.get("email")
            
            if not user_id or not email:
                return None
            

            msp_user = await self._get_msp_user_by_id(user_id)
            if msp_user:
                return AuthContext(
                    user_id=str(msp_user.id),
                    email=msp_user.email,
                    msp_id=str(msp_user.msp_id),
                    role=msp_user.role,
                    permissions=msp_user.permissions,
                )
            
            client_user = await self._get_client_user_by_id(user_id)
            if client_user:
                return AuthContext(
                    user_id=str(client_user.id),
                    email=client_user.email,
                    client_ids=[str(client_user.client_id)],
                    role=client_user.role,
                    permissions=client_user.permissions,
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user by token: {e}")
            return None
    
    async def _get_msp_user(self, email: str) -> Optional[MSPUser]:

        result = await self.db_session.execute(
            select(MSPUser).where(MSPUser.email == email)
        )
        return result.scalar_one_or_none()
    
    async def _get_msp_user_by_id(self, user_id: str) -> Optional[MSPUser]:

        result = await self.db_session.execute(
            select(MSPUser).where(MSPUser.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def _get_client_user(self, email: str) -> Optional[ClientUser]:

        result = await self.db_session.execute(
            select(ClientUser).where(ClientUser.email == email)
        )
        return result.scalar_one_or_none()
    
    async def _get_client_user_by_id(self, user_id: str) -> Optional[ClientUser]:

        result = await self.db_session.execute(
            select(ClientUser).where(ClientUser.id == user_id)
        )
        return result.scalar_one_or_none()


def require_permissions(required_permissions: List[str]):

    def decorator(func):
        async def wrapper(*args, **kwargs):
            auth_context = kwargs.get("auth_context")
            if not auth_context:
                raise AuthenticationError("Authentication required")
            
            if not auth_context.has_all_permissions(required_permissions):
                raise AuthorizationError(
                    f"Required permissions: {', '.join(required_permissions)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user(request: Request) -> Optional[AuthContext]:

    return getattr(request.state, 'auth_context', None)


def require_auth(request: Request) -> AuthContext:

    auth_context = getattr(request.state, 'auth_context', None)
    if auth_context is None:

        from app.core.config import settings
        if settings.DEBUG:
            return AuthContext(
                user_id="dev-user",
                email="dev@example.com",
                msp_id="dev-msp",
                client_ids=["dev-client"],
                role="dev_admin",
                permissions=["user:read", "user:write", "client:read", "client:write", "msp:read", "msp:write"]
            )
        raise AuthenticationError("Authentication required")
    return auth_context


def require_permissions_dep(required_permissions: List[str]):

    def dependency(request: Request) -> AuthContext:
        auth_context = getattr(request.state, 'auth_context', None)
        if auth_context is None:

            from app.core.config import settings
            if settings.DEBUG:
                return AuthContext(
                    user_id="dev-user",
                    email="dev@example.com",
                    msp_id="dev-msp",
                    client_ids=["dev-client"],
                    role="dev_admin",
                    permissions=required_permissions + ["user:read", "user:write", "client:read", "client:write", "msp:read", "msp:write"]
                )
            raise AuthenticationError("Authentication required")
        
        if not auth_context.has_all_permissions(required_permissions):
            raise AuthorizationError(
                f"Required permissions: {', '.join(required_permissions)}"
            )
        
        return auth_context
    return dependency


def require_role(required_role: str):

    def decorator(func):
        async def wrapper(*args, **kwargs):
            auth_context = kwargs.get("auth_context")
            if not auth_context:
                raise AuthenticationError("Authentication required")
            
            if auth_context.role != required_role:
                raise AuthorizationError(f"Required role: {required_role}")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def create_access_token(data: Dict[str, Any]) -> str:
    return JWTManager.create_access_token(data)

def verify_token(token: str) -> Dict[str, Any]:
    return JWTManager.verify_token(token)

def get_password_hash(password: str) -> str:
    return PasswordManager.hash_password(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return PasswordManager.verify_password(plain_password, hashed_password)