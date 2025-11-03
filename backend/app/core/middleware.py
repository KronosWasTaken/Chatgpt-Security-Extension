
from starlette.middleware.base import BaseHTTPMiddleware
import time
from typing import Callable
from fastapi import Request, Response,HTTPException
from fastapi.responses import JSONResponse
from app.core.auth import JWTManager


class AuthMiddleWare(BaseHTTPMiddleware):
     async def dispatch(self, request: Request, call_next: Callable) -> Response:
        skip_auth_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/metrics",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/logout",
            "/api/v1/test/test",
            "/api/v1/test/mock-clients",
            "/api/v1/test/mock-ai-inventory",
            "/api/v1/test/mock-alerts",
            # Auth required for protected APIs
            # "/api/v1/scan/file",  
            # "/api/v1/scan/file/legacy", 
        ]
        
        if request.method == "OPTIONS" or request.url.path in skip_auth_paths:
            return await call_next(request)
        
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(
                status_code=401,
                detail={"error": "Missing authorization header", "detail": "Authorization header is required"}
            )
        
        if not auth_header.startswith("Bearer"):
            raise HTTPException(
                status_code=401,
                detail={"error": "Invalid authorization header", "detail": "Authorization header must start with 'Bearer '"}
            )
        
        token = auth_header.split(" ")[1]
        
        token_data = JWTManager.verify_token(token)
       
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        
        
        request.state.user = {
    "id": token_data.get("sub"),
    "role": token_data.get("role"),
    "msp_id": token_data.get("msp_id"),
    "client_id": token_data.get("client_id"),
    "type":token_data.get("type")

}
        
        return await call_next(request)





class RateLimitMiddleWare(BaseHTTPMiddleware):
     def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = {}
     async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        self.clients={
            ip:times for ip,times in self.clients.items()
            if any(t>now-self.period for t in times)
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
        
        
        