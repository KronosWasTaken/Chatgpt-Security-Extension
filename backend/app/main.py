

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ValidationError,
)
from app.core.logging import setup_logging
from app.core.middleware import (
    AuthMiddleware,
    LoggingMiddleware,
    RateLimitMiddleware,
    SecurityMiddleware,
)
from app.core.monitoring import setup_monitoring


setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:


    logger.info("Starting AI Compliance Platform Backend...")
    

    await init_db()
    logger.info("Database initialized")
    

    setup_monitoring()
    logger.info("Monitoring setup complete")
    
    yield
    

    logger.info("Shutting down AI Compliance Platform Backend...")


def create_app() -> FastAPI:

    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI Compliance Platform Backend API",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    

    app.add_middleware(SecurityMiddleware)
    

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=settings.ALLOWED_CREDENTIALS,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )
    

    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"] if settings.DEBUG else ["localhost", "127.0.0.1"]
    )
    

    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(AuthMiddleware)
    

    app.include_router(api_router, prefix="/api/v1")
    

    if settings.PROMETHEUS_ENABLED:
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)
    

    @app.get("/health")
    async def health_check():

        return {"status": "healthy", "version": settings.APP_VERSION}
    

    @app.exception_handler(AuthenticationError)
    async def authentication_exception_handler(request, exc):
        return JSONResponse(
            status_code=401,
            content={"error": "Authentication failed", "detail": str(exc)}
        )
    
    @app.exception_handler(AuthorizationError)
    async def authorization_exception_handler(request, exc):
        return JSONResponse(
            status_code=403,
            content={"error": "Insufficient permissions", "detail": str(exc)}
        )
    
    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request, exc):
        return JSONResponse(
            status_code=422,
            content={"error": "Validation error", "detail": str(exc)}
        )
    
    return app



app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )
