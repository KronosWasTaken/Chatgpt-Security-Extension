from typing import Optional, List
import logging

from fastapi import APIRouter, Depends, HTTPException, status as http_status, Request, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
from starlette.requests import Request

from app.core.auth import JWTManager
from app.core.structured_logging import log_analyze_complete
from app.services.file_analysis_service import FileAnalysisService
from app.services.detection_pattern_service import DetectionPatternService
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.services.prompt_analysis_service import PromptAnalysisService
from app.services.pattern_service import contains_pattern, DANGEROUS_PATTERNS, QUICK_PATTERNS, detect_pii


router = APIRouter()
logger = logging.getLogger("app.api.analyze")
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify token and return user data"""
    try:
        token_data = JWTManager.verify_token(credentials.credentials)
        if not token_data:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return token_data
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


class PromptAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to analyze for prompt injection")
    clientId: Optional[str] = None
    mspId: Optional[str] = None


class PiiDetection(BaseModel):
    hasPII: bool
    types: List[str] = []
    count: int = 0
    riskLevel: str = "low"


class LogEntry(BaseModel):
    level: str
    timestamp: str
    message: str
    context: str


class PromptAnalysisResponse(BaseModel):
    isThreats: bool
    threats: List[str]
    riskLevel: str
    summary: str
    quickPattern: Optional[str] = None
    dangerousPattern: Optional[str] = None
    shouldBlock: bool = False
    blockReason: Optional[str] = None
    piiDetection: Optional[PiiDetection] = None
    logs: List[LogEntry] = []


@router.post("/prompt", response_model=PromptAnalysisResponse)
async def analyze_prompt(
    prompt_data: PromptAnalysisRequest,
    request: Request
) -> PromptAnalysisResponse:
    """
    Analyze prompt for injection threats with CORS support
    Returns 200 with well-formed JSON, never 400 for normal inputs
    Validation errors return 422 automatically via global handler
    """
    # Extract the text from the validated request
    text = prompt_data.text
    # Log receipt with truncation
    try:
        truncated = (text[:200] + "…") if len(text) > 200 else text
        logger.info(f"Prompt received: {truncated}")
    except Exception:
        pass
    
    try:
        quick = contains_pattern(text, QUICK_PATTERNS)
        danger = contains_pattern(text, DANGEROUS_PATTERNS)

        # LLM-based prompt injection analysis
        llm_result = await PromptAnalysisService.analyze_prompt(text)

        # PII detection shifted to backend
        pii_items = detect_pii(text)
        pii_types = list({item.get('type', 'unknown') for item in pii_items}) if pii_items else []
        pii_count = len(pii_items or [])
        pii_risk = 'high' if pii_count > 3 else 'medium' if pii_count > 0 else 'low'

        # Determine combined risk level
        llm_risk = llm_result.get("riskLevel", "safe")
        combined_risk = llm_risk
        risk_order = ["safe", "low", "medium", "high"]
        if risk_order.index(pii_risk) > risk_order.index(combined_risk):
            combined_risk = pii_risk
        if danger or quick:
            # elevate at least to medium if static patterns hit
            if risk_order.index("medium") > risk_order.index(combined_risk):
                combined_risk = "medium"

        # Determine blocking decision similar to FileGuard semantics
        reasons: List[str] = []
        should_block = False

        if llm_result.get("isThreats", False):
            should_block = True
            reasons.append("Prompt injection indicators detected")

        if danger:
            should_block = True
            reasons.append(f"Dangerous pattern: {danger}")

        if quick and not danger:
            # Quick patterns contribute to medium severity but can be blocked depending on policy
            reasons.append(f"Quick pattern: {quick}")

        if pii_count > 0 and pii_risk in {"high", "medium"}:
            should_block = True
            reasons.append(f"PII detected ({pii_count} items)")

        block_reason = "; ".join(reasons) if should_block else None
        
        # Get summary from LLM result
        result_summary = str(llm_result.get("summary", ""))
        if not result_summary or result_summary.strip() == "":
            result_summary = "No threats detected." if not should_block else "Threat detected."

        # Create response
        response = PromptAnalysisResponse(
            isThreats=bool(llm_result.get("isThreats", False)),
            threats=llm_result.get("threats", []) or [],
            riskLevel=combined_risk,
            summary=result_summary,
            quickPattern=quick,
            dangerousPattern=danger,
            shouldBlock=should_block,
            blockReason=block_reason,
            piiDetection=PiiDetection(
                hasPII=pii_count > 0,
                types=pii_types,
                count=pii_count,
                riskLevel=pii_risk
            ) if pii_count > 0 else PiiDetection(hasPII=False),
            logs=[]  # Remove verbose logs from response
        )
        
        # Log the analysis result AFTER response is determined (SUCCESS/FAILURE format only)
        log_analyze_complete(request, text, should_block, block_reason, result_summary)
        # Also emit succinct verdict line
        verdict = "blocked" if should_block else "allowed"
        logger.info(f"Prompt analysis result: {verdict} (risk={combined_risk})")
        
        return response
    
    except Exception as e:
        # Log failure for exception case
        error_reason = f"Analysis error: {str(e)}"
        log_analyze_complete(request, text if 'text' in locals() else "Unknown prompt", True, error_reason, "Analysis failed")
        try:
            logger.error("Prompt analysis result: failed")
        except Exception:
            pass
        
        # Return error response
        return JSONResponse(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Prompt analysis failed: {str(e)}"
            }
        )



# Compatibility endpoint: analyze file via multipart and normalize fields similar to prompt response
class FileAnalyzeResponse(BaseModel):
    isThreats: bool
    threats: List[str]
    riskLevel: str
    summary: str
    shouldBlock: bool = False
    blockReason: Optional[str] = None
    fileSize: Optional[int] = None
    fileHash: Optional[str] = None
    logs: List[LogEntry] = []


@router.post("/file", response_model=FileAnalyzeResponse)
async def analyze_file(
    file: UploadFile = File(...),
    text: Optional[str] = Form(None),
    request: Request = None,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Analyze uploaded file (compat with extension posting to /api/v1/analyze/file).
    Returns normalized fields: isThreats, shouldBlock, riskLevel, summary, threats[].
    Always returns JSON; includes minimal logs for UI when available.
    """
    try:
        filename = file.filename or "unknown"
        content_type = file.content_type or ""
        content = await file.read()

        # Ensure dynamic detection patterns are available
        await DetectionPatternService.ensure_loaded(session)

        # Reuse existing comprehensive analysis path
        analysis_result = await FileAnalysisService.analyze_file_for_extension(
            content,
            filename,
            text
        )

        # Map to normalized response
        is_threats = bool(
            analysis_result.get("isMalicious")
            or analysis_result.get("shouldBlock")
            or (analysis_result.get("riskLevel") in {"high", "medium"})
        )

        threats = analysis_result.get("threats", []) or []
        risk_level = analysis_result.get("riskLevel", "safe")
        summary = analysis_result.get("summary", "File scan completed")
        should_block = bool(analysis_result.get("shouldBlock", False))
        block_reason = analysis_result.get("blockReason")

        # Minimal inline logs for extension UI (the scan service may also emit logs)
        logs: List[LogEntry] = []
        try:
            logs = [
                LogEntry(level="info", timestamp=__import__("datetime").datetime.utcnow().isoformat(), message=f"file received: {filename} ({len(content)} bytes, {content_type})", context="analyze/file"),
                LogEntry(level="success", timestamp=__import__("datetime").datetime.utcnow().isoformat(), message=f"result: risk={risk_level} block={should_block}", context="analyze/file"),
            ]
        except Exception:
            logs = []

        return FileAnalyzeResponse(
            isThreats=is_threats,
            threats=threats,
            riskLevel=risk_level,
            summary=summary,
            shouldBlock=should_block,
            blockReason=block_reason,
            fileSize=len(content),
            fileHash=analysis_result.get("fileHash"),
            logs=logs,
        )
    except Exception as e:
        # On error, return FAILURE-style payload with reason in summary
        return JSONResponse(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "isThreats": True,
                "shouldBlock": True,
                "riskLevel": "high",
                "summary": f"File analysis failed: {str(e)}",
                "blockReason": f"Analysis error: {str(e)}",
                "threats": [],
                "logs": [
                    {
                        "level": "error",
                        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
                        "message": f"error: {str(e)}",
                        "context": "analyze/file",
                    }
                ],
            },
        )
