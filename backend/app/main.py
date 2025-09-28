from fastapi import FastAPI
from typing import AsyncGenerator
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.middleware import (RateLimitMiddleWare,AuthMiddleWare)
from app.core.monitoring import setup_monitoring
from prometheus_client import make_asgi_app
import logging

logging.basicConfig(
    level=logging.INFO,  
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI)->AsyncGenerator[None,None]:
    logger.info("Starting AI Compliance Platform Backend...")
    

    await init_db()
    logger.info("Database initialized")
    
    setup_monitoring()
    logger.info("Monitoring setup complete")
    yield
    

    logger.info("Shutting down AI Compliance Platform Backend...")
    




def create_app() -> FastAPI:
 app=FastAPI(title=settings.APP_NAME,
             version=settings.APP_VERSION,
            description="AI Compliance Platform Backend API",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan
             )
 
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
 app.add_middleware(
     RateLimitMiddleWare
 )
 app.add_middleware(
     AuthMiddleWare
 )
 
 app.include_router(api_router,prefix="/api/v1")
 
 if settings.PROMETHEUS_ENABLED:
     metrics_app=make_asgi_app()
     app.mount("/metrics",metrics_app)

 
 return app


app=create_app()


@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )