"""Structured logging middleware with tagged log entries"""
import time
import logging
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi.responses import Response as FastAPIResponse
from datetime import datetime

logger = logging.getLogger("structured")

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Logs requests with tags [CORS], [ACCESS], [SCAN], [ANALYZE]"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        method = request.method
        path = request.url.path
        origin = request.headers.get("origin", "none")
        
        # Get correlation ID and request ID if available
        corr_id = getattr(request.state, 'correlation_id', None) or request.headers.get('X-Correlation-Id') or request.headers.get('x-correlation-id') or 'unknown'
        request_id = request.headers.get('X-Request-ID') or request.headers.get('x-request-id') or 'unknown'
        
        # Get user ID if available
        user_id = 'none'
        if hasattr(request, 'state') and hasattr(request.state, 'user'):
            user_data = request.state.user
            user_id = getattr(user_data, 'id', None) or 'none'
        
        # Handle OPTIONS preflight immediately
        if method == "OPTIONS":
            response = await call_next(request)
            # Ensure 204 for preflight with proper headers
            if response.status_code != 204:
                # Copy CORS headers but remove Content-Length for 204 No Content
                headers = dict(response.headers)
                # Remove Content-Length for 204 responses (should have no body)
                headers.pop("content-length", None)
                headers.pop("Content-Length", None)
                response = Response(status_code=204, headers=headers)
            else:
                # Even if already 204, ensure no Content-Length header
                headers = dict(response.headers)
                headers.pop("content-length", None)
                headers.pop("Content-Length", None)
                response = Response(status_code=204, headers=headers)
            
            # Log preflight
            logger.info(
                f"[CORS] preflight=True method={method} path={path} status={response.status_code} "
                f"origin={origin} corrId={corr_id} requestId={request_id} userId={user_id}"
            )
            return response
        
        # Determine request type for key endpoints
        request_type = "file" if "/scan/file" in path else ("text" if "/analyze/prompt" in path else "unknown")

        # Process non-OPTIONS request
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            response = Response(status_code=status_code)
            logger.error(f"[ACCESS] method={method} path={path} status={status_code} error={str(e)}")
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Log access summary (all non-OPTIONS)
        logger.info(
            f"[ACCESS] method={method} path={path} status={status_code} durationMs={duration_ms} "
            f"corrId={corr_id} requestId={request_id} userId={user_id} origin={origin} type={request_type}"
        )
        
        return response

def log_scan_complete(request: Request, filename: str, risk_level: str, should_block: bool, duration_ms: int):
    """Log file scan completion with [SCAN] tag"""
    corr_id = get_correlation_id(request) if hasattr(request, 'state') else 'unknown'
    request_id = request.headers.get('X-Request-ID') or request.headers.get('x-request-id') or 'unknown'
    user_id = 'none'
    if hasattr(request, 'state') and hasattr(request.state, 'user'):
        user_data = request.state.user
        user_id = getattr(user_data, 'id', None) or 'none'
    origin = request.headers.get("origin", "none") if hasattr(request, 'headers') else "none"
    
    logger.info(
        f"[SCAN] method=POST path=/api/v1/scan/file status=200 latencyMs={duration_ms} "
        f"corrId={corr_id} requestId={request_id} userId={user_id} origin={origin} "
        f"riskLevel={risk_level} shouldBlock={should_block}"
    )

def log_analyze_complete(request: Request, prompt: str, should_block: bool, block_reason: Optional[str] = None, summary: str = ""):
    """
    Log prompt analysis completion in SUCCESS/FAILURE format.
    Only logs essential information: timestamp, logType, prompt, reason (if failure), responseSummary.
    """
    from datetime import datetime
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_type = "FAILURE" if should_block else "SUCCESS"
    
    if should_block:
        # Failure case: Prompt was blocked
        reason = block_reason or "Prompt injection / Malicious instruction"
        
        logger.info(
            f"[{timestamp}] [{log_type}] Prompt blocked.\n"
            f"Prompt: \"{prompt}\"\n"
            f"Reason: {reason}"
        )
    else:
        # Success case: Prompt was allowed
        response_summary = summary or "No threats detected."
        
        logger.info(
            f"[{timestamp}] [{log_type}] Prompt analyzed successfully.\n"
            f"Prompt: \"{prompt}\"\n"
            f"Summary: {response_summary}"
        )

def get_correlation_id(request: Request) -> str:
    """Get correlation ID from request state"""
    return getattr(request.state, 'correlation_id', None) or request.headers.get('X-Correlation-Id') or request.headers.get('x-correlation-id') or 'unknown'

