from fastapi import APIRouter

from app.api.v1.endpoints import(
    auth,
    clients,
    msp,
    ai_inventory,
    ai_engagement,
    policies,
    reports,
    alerts,
    analyze,
    scan,
    audit,
    client_interactions,
    action_queue,
    test,
    websocket
)



api_router = APIRouter()

api_router.include_router(auth.router,prefix="/auth", tags=["authentication"])

api_router.include_router(msp.router,prefix="/msp",tags=["msp"])

api_router.include_router(clients.router,prefix="/clients",tags=["clients"])

api_router.include_router(ai_inventory.router,prefix="/ai-inventory",tags=["ai-services"])

api_router.include_router(ai_engagement.router,prefix="/ai-engagement",tags=["ai-engagement"])

api_router.include_router(policies.router,prefix="/policies",tags=["policies"])

api_router.include_router(reports.router,prefix="/reports",tags=["reports"])

api_router.include_router(alerts.router,prefix="/alerts",tags=["alerts"])

# api_router.include_router(pattern_scan.router,prefix="/pattern",tags=["scan"])

api_router.include_router(analyze.router,prefix="/analyze",tags=["analyze"])

api_router.include_router(scan.router,prefix="/scan",tags=["scan"])

api_router.include_router(audit.router,prefix="/audit",tags=["audit"])

api_router.include_router(client_interactions.router,prefix="/clients",tags=["client-interactions"])

api_router.include_router(action_queue.router,prefix="/action-queue",tags=["action-queue"])

api_router.include_router(test.router,prefix="/test",tags=["test"])

api_router.include_router(websocket.router,prefix="",tags=["websocket"])





