

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    msp,
    clients,
    users,
    policies,
    ai_services,
    ai_inventory,
    alerts,
    analyze,
    audit,
    reports,
)

api_router = APIRouter()


api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(msp.router, prefix="/msp", tags=["msp"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(policies.router, prefix="/policies", tags=["policies"])
api_router.include_router(ai_services.router, prefix="/ai-services", tags=["ai-services"])
api_router.include_router(ai_inventory.router, prefix="/ai-inventory", tags=["ai-inventory"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
