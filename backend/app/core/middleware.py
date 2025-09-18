

import logging
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.auth import AuthContext, AuthService, JWTManager
from app.core.database import get_async_session, TenantContext
from app.core.exceptions import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):

    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        

        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        

        response = await call_next(request)
        

        process_time = time.time() - start_time
        logger.info(
            f"Response: {response.status_code} "
            f"in {process_time:.3f}s"
        )
        
        return response


class AuthMiddleware(BaseHTTPMiddleware):

    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:

        skip_auth_paths = [
            "/health", "/docs", "/redoc", "/openapi.json", "/metrics",
            "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout"
        ]
        
        if request.url.path in skip_auth_paths:
            return await call_next(request)
        

        from app.core.config import settings
        if settings.DEBUG:

            request.state.auth_context = None
            request.state.tenant_context = None
            return await call_next(request)
        

        authorization = request.headers.get("Authorization")
        if not authorization:
            return JSONResponse(
                status_code=401,
                content={"error": "Authorization header required"}
            )
        
        try:

            token = JWTManager.extract_token_from_header(authorization)
            payload = JWTManager.verify_token(token)
            

            async with get_async_session() as db:
                auth_service = AuthService(db)
                auth_context = await auth_service.get_user_by_token(token)
                
                if not auth_context:
                    return JSONResponse(
                        status_code=401,
                        content={"error": "Invalid token"}
                    )
                

                request.state.auth_context = auth_context
                

                tenant_context = TenantContext(
                    msp_id=auth_context.msp_id,
                    client_id=auth_context.client_ids[0] if auth_context.client_ids else None,
                    user_id=auth_context.user_id,
                    role=auth_context.role,
                )
                request.state.tenant_context = tenant_context
            
            return await call_next(request)
            
        except AuthenticationError as e:
            return JSONResponse(
                status_code=401,
                content={"error": str(e)}
            )
        except Exception as e:
            logger.error(f"Auth middleware error: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Authentication failed"}
            )


class RateLimitMiddleware(BaseHTTPMiddleware):

    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        

        self.clients = {
            ip: times for ip, times in self.clients.items()
            if any(t > now - self.period for t in times)
        }
        

        if client_ip in self.clients:
            recent_calls = [t for t in self.clients[client_ip] if t > now - self.period]
            if len(recent_calls) >= self.calls:
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded"}
                )
            self.clients[client_ip].append(now)
        else:
            self.clients[client_ip] = [now]
        
        return await call_next(request)


class SecurityMiddleware(BaseHTTPMiddleware):

    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
