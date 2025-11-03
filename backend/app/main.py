from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import status as http_status
import asyncio
import sys
from typing import AsyncGenerator
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.middleware import (RateLimitMiddleWare, AuthMiddleWare)
from app.core.correlation import CorrelationIdMiddleware
from app.core.monitoring import setup_monitoring
from app.core.logging import configure_logging
from app.services.gemini_client import GeminiClient
from prometheus_client import make_asgi_app
import logging
from pydantic import ValidationError  # noqa: F401  (kept if you use it elsewhere)
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    logger.info("Starting AI Compliance Platform Backend...")

    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database initialization failed: {e}")
        logger.warning("Continuing without database for testing purposes")

    setup_monitoring()
    logger.info("Monitoring setup complete")

    # Probe Gemini once on startup
    try:
        GeminiClient.self_test()
    except Exception:
        logger.warning("Gemini self-test failed during startup")

    yield

    logger.info("Shutting down AI Compliance Platform Backend...")


def create_app() -> FastAPI:
    # Ensure Windows compatible event loop for asyncpg during tests
    if sys.platform.startswith("win"):
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception:
            pass

    # Ensure logging is configured before middleware
    try:
        configure_logging()
    except Exception:
        pass

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI Compliance Platform Backend API",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # --- CORS ---
    cors_origins_env = (
        [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
        if getattr(settings, "CORS_ORIGINS", "")
        else []
    )
    cors_origins_base = [
        "https://gemini.google.com",
        "chrome-extension://nipfdihhjjedhpdhbeaodpbfldngnfkb",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    cors_origins = list(set(cors_origins_base + cors_origins_env))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"chrome-extension://.*|moz-extension://.*",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        max_age=86400,
    )

    # --- Trusted hosts ---
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"] if settings.DEBUG else ["localhost", "127.0.0.1"],
    )

    # --- Correlation ID first ---
    app.add_middleware(CorrelationIdMiddleware)

    # --- Structured logging (replaces AccessLogMiddleware) ---
    from app.core.structured_logging import StructuredLoggingMiddleware

    app.add_middleware(StructuredLoggingMiddleware)

    # --- Rate limit & auth ---
    app.add_middleware(RateLimitMiddleWare)
    app.add_middleware(AuthMiddleWare)

    # --- Content-Type guard for JSON endpoints ---
    class ContentTypeMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            # Allow CORS preflight through
            if request.method == "OPTIONS":
                return await call_next(request)

            # Check content-type for JSON endpoints on write methods
            if request.method in {"POST", "PUT", "PATCH"}:
                path = str(request.url.path)
                content_type = request.headers.get("content-type", "")

                # Allow multipart for file uploads
                if "/api/v1/scan/file" in path:
                    return await call_next(request)

                # Require application/json for specific JSON endpoints
                if any(p in path for p in ["/api/v1/analyze/prompt", "/api/v1/audit/events"]):
                    if not content_type.startswith("application/json"):
                        corr_id = getattr(request.state, "correlation_id", "unknown")
                        logger.warning(
                            "unsupported_media_type corrId=%s method=%s path=%s contentType=%s",
                            corr_id,
                            request.method,
                            path,
                            content_type,
                        )
                        origin = request.headers.get("origin")
                        headers = {"X-Correlation-ID": corr_id}
                        # Only echo origin when present (credentials=True disallows '*')
                        if origin:
                            headers.update(
                                {
                                    "Access-Control-Allow-Origin": origin,
                                    "Access-Control-Allow-Credentials": "true",
                                }
                            )
                        return JSONResponse(
                            status_code=http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            content={
                                "detail": "Unsupported media type",
                                "expected": "application/json",
                                "received": content_type or "none",
                                "correlation_id": corr_id,
                            },
                            headers=headers,
                        )

            return await call_next(request)

    app.add_middleware(ContentTypeMiddleware)

    # --- Routers ---
    app.include_router(api_router, prefix="/api/v1")

    # --- Exception handlers ---
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle Pydantic validation errors - return 422 for validation errors"""
        corr_id = getattr(request.state, "correlation_id", "unknown")
        errors = exc.errors()

        body_length = request.headers.get("content-length", "unknown")
        logger.warning(
            "validation_error corrId=%s method=%s path=%s errors=%s bodyLength=%s",
            corr_id,
            request.method,
            request.url.path,
            len(errors),
            body_length,
        )

        error_details = []
        for error in errors:
            error_details.append(
                {
                    "field": ".".join(str(loc) for loc in error["loc"] if loc != "body"),
                    "message": error["msg"],
                    "type": error["type"],
                }
            )

        origin = request.headers.get("origin")
        headers = {"X-Correlation-ID": corr_id}
        if origin:
            headers.update(
                {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                }
            )

        return JSONResponse(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Validation error", "errors": error_details, "correlation_id": corr_id},
            headers=headers,
        )

    # --- Metrics ---
    if getattr(settings, "PROMETHEUS_ENABLED", False):
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)

    # --- Health ---
    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",  # adjust if your module path is different
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )
