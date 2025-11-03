"""Structured access logging middleware"""
import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("access")


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Logs all requests in structured JSON-like format"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        request_id = str(uuid.uuid4())[:8]
        method = request.method
        path = request.url.path
        origin = request.headers.get("origin", "none")
        is_preflight = method == "OPTIONS"
        # Correlation Id from middleware if already set
        corr_id = getattr(request.state, 'correlation_id', None) or request.headers.get('x-correlation-id') or request.headers.get('X-Correlation-Id') or str(uuid.uuid4())
        # Optional user id from auth
        user_id = getattr(getattr(request, 'state', object()), 'user', {}).get('id') if hasattr(request.state, 'user') else None
        
        # Log request
        logger.info(
            f"method={method} path={path} corrId={corr_id} requestId={request_id} "
            f"origin={origin} preflight={is_preflight} userId={user_id or 'none'}"
        )
        
        # Process request
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            response = Response(status_code=status_code)
            logger.error(f"method={method} path={path} corrId={corr_id} requestId={request_id} error={str(e)}")
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Log response
        logger.info(
            f"method={method} path={path} status={status_code} durationMs={latency_ms} corrId={corr_id} requestId={request_id} userId={user_id or 'none'} origin={origin}"
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-Id"] = corr_id
        
        return response

