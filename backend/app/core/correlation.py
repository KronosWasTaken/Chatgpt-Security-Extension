"""Correlation ID handling for structured logging"""
import uuid
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Adds correlation ID to requests for request tracing"""
    
    async def dispatch(self, request: Request, call_next):
        # Get or create correlation ID
        corr_id = request.headers.get('x-correlation-id')
        if not corr_id:
            corr_id = str(uuid.uuid4())
        
        # Add to request state
        request.state.correlation_id = corr_id
        
        # Process request
        response = await call_next(request)
        
        # Add correlation ID to response headers (canonical header casing)
        response.headers['X-Correlation-Id'] = corr_id
        
        return response


def get_correlation_id(request: Request) -> str:
    """Get correlation ID from request"""
    return getattr(request.state, 'correlation_id', str(uuid.uuid4()))

