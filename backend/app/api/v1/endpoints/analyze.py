

import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthContext, require_permissions
from app.core.database import get_async_session, TenantContext
from app.core.exceptions import ValidationError
from app.services.prompt_analyzer import PromptAnalyzer
from app.services.audit_logger import AuditLogger

logger = logging.getLogger(__name__)
router = APIRouter()


class PromptAnalysisRequest(BaseModel):

    
    prompt: str = Field(..., min_length=1, max_length=10000, description="Text prompt to analyze")
    url: Optional[str] = Field(None, description="URL where prompt was entered")
    session_id: Optional[str] = Field(None, description="Browser session ID")
    user_agent: Optional[str] = Field(None, description="User agent string")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    browser_fingerprint: Optional[str] = Field(None, description="Browser fingerprint")


class DetectionResult(BaseModel):

    
    type: str = Field(..., description="Detection type: regex, keyword, ml_model")
    pattern_name: str = Field(..., description="Name of the detected pattern")
    matches: int = Field(..., description="Number of matches found")
    severity: str = Field(..., description="Severity level: low, medium, high, critical")
    framework: str = Field(..., description="Compliance framework: HIPAA, Financial, etc.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")


class PromptAnalysisResponse(BaseModel):

    
    prompt_hash: str = Field(..., description="SHA-256 hash of the prompt")
    detections: List[DetectionResult] = Field(default_factory=list, description="Detected patterns")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Overall risk score")
    enforcement_action: str = Field(..., description="Enforcement action: allowed, warned, blocked, flagged")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall confidence score")
    processing_time_ms: int = Field(..., description="Analysis processing time in milliseconds")
    analyzed_at: str = Field(..., description="ISO timestamp of analysis")


@router.post("/prompt", response_model=PromptAnalysisResponse)
async def analyze_prompt(
    request: PromptAnalysisRequest,
    auth_context: AuthContext = Depends(require_permissions(["prompt:analyze"])),
    db: AsyncSession = Depends(get_async_session),
) -> PromptAnalysisResponse:

    try:

        tenant_context = TenantContext(
            msp_id=auth_context.msp_id,
            client_id=auth_context.client_ids[0] if auth_context.client_ids else None,
            user_id=auth_context.user_id,
            role=auth_context.role,
        )
        await tenant_context.set_context(db)
        

        analyzer = PromptAnalyzer(db)
        

        start_time = __import__("time").time()
        analysis = await analyzer.analyze_prompt(
            prompt=request.prompt,
            user_id=auth_context.user_id,
            client_id=auth_context.client_ids[0] if auth_context.client_ids else None,
            msp_id=auth_context.msp_id,
        )
        processing_time = int((__import__("time").time() - start_time) * 1000)
        

        response = PromptAnalysisResponse(
            prompt_hash=analysis.prompt_hash,
            detections=[
                DetectionResult(
                    type=detection.type,
                    pattern_name=detection.pattern_name,
                    matches=detection.matches,
                    severity=detection.severity,
                    framework=detection.framework,
                    confidence=detection.confidence,
                )
                for detection in analysis.detections
            ],
            risk_score=analysis.risk_score,
            enforcement_action=analysis.enforcement_action,
            confidence_score=analysis.confidence_score,
            processing_time_ms=processing_time,
            analyzed_at=analysis.analyzed_at,
        )
        

        await AuditLogger.log_prompt_analysis(
            db=db,
            analysis=analysis,
            request_data={
                "url": request.url,
                "session_id": request.session_id,
                "user_agent": request.user_agent,
                "ip_address": request.ip_address,
                "browser_fingerprint": request.browser_fingerprint,
            },
        )
        
        logger.info(
            f"Prompt analysis completed for user {auth_context.user_id}: "
            f"risk_score={analysis.risk_score}, action={analysis.enforcement_action}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Prompt analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")


@router.get("/ai-services")
async def get_approved_ai_services(
    auth_context: AuthContext = Depends(require_permissions(["client:read"])),
    db: AsyncSession = Depends(get_async_session),
) -> Dict[str, List[Dict]]:

    try:

        tenant_context = TenantContext(
            msp_id=auth_context.msp_id,
            client_id=auth_context.client_ids[0] if auth_context.client_ids else None,
            user_id=auth_context.user_id,
            role=auth_context.role,
        )
        await tenant_context.set_context(db)
        

        from app.services.ai_service_registry import AIServiceRegistry
        
        registry = AIServiceRegistry(db)
        services = await registry.get_approved_services(
            client_id=auth_context.client_ids[0] if auth_context.client_ids else None
        )
        
        return {"services": services}
        
    except Exception as e:
        logger.error(f"Failed to get AI services: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve AI services")


@router.post("/bulk")
async def analyze_bulk_prompts(
    prompts: List[PromptAnalysisRequest],
    auth_context: AuthContext = Depends(require_permissions(["prompt:analyze"])),
    db: AsyncSession = Depends(get_async_session),
) -> Dict[str, List[PromptAnalysisResponse]]:

    try:

        tenant_context = TenantContext(
            msp_id=auth_context.msp_id,
            client_id=auth_context.client_ids[0] if auth_context.client_ids else None,
            user_id=auth_context.user_id,
            role=auth_context.role,
        )
        await tenant_context.set_context(db)
        

        analyzer = PromptAnalyzer(db)
        results = []
        
        for prompt_request in prompts:
            analysis = await analyzer.analyze_prompt(
                prompt=prompt_request.prompt,
                user_id=auth_context.user_id,
                client_id=auth_context.client_ids[0] if auth_context.client_ids else None,
                msp_id=auth_context.msp_id,
            )
            
            response = PromptAnalysisResponse(
                prompt_hash=analysis.prompt_hash,
                detections=[
                    DetectionResult(
                        type=detection.type,
                        pattern_name=detection.pattern_name,
                        matches=detection.matches,
                        severity=detection.severity,
                        framework=detection.framework,
                        confidence=detection.confidence,
                    )
                    for detection in analysis.detections
                ],
                risk_score=analysis.risk_score,
                enforcement_action=analysis.enforcement_action,
                confidence_score=analysis.confidence_score,
                processing_time_ms=0,
                analyzed_at=analysis.analyzed_at,
            )
            
            results.append(response)
        
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Bulk analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Bulk analysis failed")
