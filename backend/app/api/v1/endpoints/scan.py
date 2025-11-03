from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, Request, Depends, HTTPException
from pydantic import BaseModel
import time

from app.services.file_analysis_service import FileAnalysisService
from app.services.pattern_service import (
    contains_pattern, all_matches, is_sensitive_file, is_malicious_file,
    DANGEROUS_PATTERNS, QUICK_PATTERNS
)
from app.services.virus_total_service import VirusTotalService
from app.services.detection_pattern_service import DetectionPatternService
from app.services.upload_validator import get_upload_validator, UploadValidationError
from app.core.database import get_async_session
from app.core.correlation import get_correlation_id
from app.core.structured_logging import log_scan_complete
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)


router = APIRouter()


class LogEntry(BaseModel):
    level: str
    timestamp: str
    message: str
    context: str


class FileScanResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    isMalicious: bool
    detectionCount: int
    totalEngines: int
    threats: List[str]
    riskLevel: str
    summary: str
    shouldBlock: Optional[bool] = None
    blockReason: Optional[str] = None
    isSensitiveFile: Optional[bool] = None
    isMaliciousFile: Optional[bool] = None
    piiDetection: Optional[dict] = None
    fileSize: Optional[int] = None
    fileHash: Optional[str] = None
    logs: List[LogEntry] = []


@router.post("/file", response_model=FileScanResponse)
async def scan_file(
    file: UploadFile = File(...),
    text: Optional[str] = Form(None),
    request: Request = None,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Enhanced file scanning endpoint with comprehensive analysis including:
    - Hardened upload validation (size, extension, MIME, magic bytes)
    - Sensitive data scanning
    - Pattern matching for sensitive/malicious files
    - PII detection in content
    - VirusTotal malware scanning
    - File metadata analysis
    - Audit logging
    """
    start_time = time.time()
    corr_id = get_correlation_id(request) if request else "unknown"
    log_context = {"correlationId": corr_id}
    
    try:
        logs: List[dict] = []
        def add(level: str, msg: str):
            logs.append({
                "level": level,
                "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
                "message": msg,
                "context": "scan/file"
            })
        
        add("info", "request received")
        # Check if file is actually received
        if not file:
            logger.warning(f"upload_rejected corrId={corr_id} code=NO_FILE reason='No file received'")
            add("error", "no file received")
            return FileScanResponse(
                success=False,
                error="No file received",
                isMalicious=False,
                detectionCount=0,
                totalEngines=0,
                threats=[],
                riskLevel="safe",
                summary="No file provided",
                logs=[LogEntry(**e) for e in logs]
            )
        
        filename = file.filename or "unknown"
        # Simple filename validation replacing any extension whitelist
        if not file.filename:
            raise HTTPException(status_code=400, detail="Missing filename.")
        logger.info(f"Received file: {file.filename}")
        content_type = file.content_type or ""
        
        # Read file content
        content = await file.read()
        
        logger.info(f"upload_received corrId={corr_id} name={filename} size={len(content)} mime={content_type}")
        # Required human-readable receipt line
        try:
            logger.info(f"File received: {filename} ({len(content)} bytes, {content_type})")
        except Exception:
            pass
        
        # Use hardened upload validator
        validator = get_upload_validator()
        try:
            validation_result = validator.validate_upload(
                filename=filename,
                file_content=content,
                mime_type=content_type,
                log_context=log_context
            )
            logger.info(f"upload_validated corrId={corr_id} fileId={validation_result.get('fileId')}")
            add("info", "validation ok")
            
            # Store sensitive file detection info for later use
            is_sensitive_upload = validation_result.get('hasSensitiveData', False)
            sensitive_reason = validation_result.get('sensitiveReason')
            
        except UploadValidationError as e:
            logger.error(f"upload_rejected corrId={corr_id} code={e.code} reason={e.reason}")
            add("error", f"validation failed: {e.reason}")
            return FileScanResponse(
                success=False,
                error=e.reason,
                isMalicious=False,
                detectionCount=0,
                totalEngines=0,
                threats=[],
                riskLevel="safe",
                summary=f"Upload rejected: {e.reason}",
                logs=[LogEntry(**e) for e in logs]
            )
        
        # Continue with existing file analysis
        logger.info(f"scan_file corrId={corr_id} name={filename} size={len(content)} bytes")
        
        # Pass sensitive file detection to analysis service
        if is_sensitive_upload:
            logger.warning(f"sensitive_file_detected corrId={corr_id} reason={sensitive_reason}")
        
        # Ensure DB-backed detection patterns are loaded
        await DetectionPatternService.ensure_loaded(session)

        # Use the comprehensive file analysis service
        print(f"🔍 SCAN_FILE: Starting file analysis...")
        add("info", "scan started")
        analysis_result = await FileAnalysisService.analyze_file_for_extension(
            content, filename, text
        )
        
        # If upload validator detected sensitive file, mark it as threat and block
        if is_sensitive_upload:
            analysis_result['isMalicious'] = True  # Mark as threat
            analysis_result['shouldBlock'] = True  # Block it
            analysis_result['blockReason'] = f"Sensitive file detected: {sensitive_reason}"
            analysis_result['isSensitiveFile'] = True
            analysis_result['riskLevel'] = 'high'
            if not analysis_result.get('threats'):
                analysis_result['threats'] = []
            analysis_result['threats'].append(f"Sensitive file detected: {sensitive_reason}")
            analysis_result['summary'] = f"Sensitive file detected: {sensitive_reason}"
        
        print(f"🔍 SCAN_FILE: Analysis completed: {analysis_result}")
        
        # Log file analysis result
        logger.info(f"File scanned: {filename}")
        logger.info(f"Scan analysis result: {analysis_result}")
        # Outcome line
        try:
            if analysis_result.get('shouldBlock', False):
                logger.info("File analysis completed blocked")
            else:
                logger.info("File analysis completed successfully")
        except Exception:
            pass

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Extract user/client information from request if available
        user_id = None
        client_id = None
        msp_id = None
        
        if hasattr(request, 'state') and hasattr(request.state, 'user'):
            user_data = request.state.user
            user_id = getattr(user_data, 'id', None)
            client_id = getattr(user_data, 'client_id', None)
            msp_id = getattr(user_data, 'msp_id', None)
        
        # Log the scan event for audit purposes (DISABLED FOR NOW)
        # try:
        #     await FileScanAuditService.log_file_scan(
        #         session=session,
        #         filename=filename,
        #         file_size=len(content),
        #         file_hash=analysis_result.get("fileHash", ""),
        #         scan_result=analysis_result,
        #         user_id=str(user_id) if user_id else None,
        #         client_id=str(client_id) if client_id else None,
        #         msp_id=str(msp_id) if msp_id else None,
        #         source="extension",
        #         user_agent=request.headers.get("user-agent"),
        #         ip_address=request.client.host if request.client else None,
        #         processing_time_ms=processing_time_ms,
        #         additional_metadata={
        #             "endpoint": "scan_file",
        #             "file_mime_type": file.content_type,
        #             "request_timestamp": start_time
        #         }
        #     )
        # except Exception as audit_error:
        #     # Don't fail the scan if audit logging fails
        #     print(f"Audit logging failed: {audit_error}")
        
        print(f"✅ SCAN_FILE: File scan completed: {filename} - Risk: {analysis_result.get('riskLevel', 'unknown')} - Block: {analysis_result.get('shouldBlock', False)}")
        add("success", f"result computed: risk={analysis_result.get('riskLevel', 'unknown')}")
        add("info", "response ready")
        print(f"✅ SCAN_FILE: Full result: {analysis_result}")
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Log structured [SCAN] entry after scanning completes
        risk_level = analysis_result.get('riskLevel', 'safe')
        should_block = analysis_result.get('shouldBlock', False)
        log_scan_complete(request, filename, risk_level, should_block, processing_time_ms)
        
        return FileScanResponse(
            success=True,
            isMalicious=analysis_result.get("isMalicious", False),
            detectionCount=analysis_result.get("detectionCount", 0),
            totalEngines=analysis_result.get("totalEngines", 0),
            threats=analysis_result.get("threats", []),
            riskLevel=analysis_result.get("riskLevel", "safe"),
            summary=analysis_result.get("summary", "File scan completed"),
            shouldBlock=analysis_result.get("shouldBlock", False),
            blockReason=analysis_result.get("blockReason"),
            isSensitiveFile=analysis_result.get("isSensitiveFile", False),
            isMaliciousFile=analysis_result.get("isMaliciousFile", False),
            fileSize=len(content),
            fileHash=analysis_result.get("fileHash")
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (from validation)
        raise
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.error(
            f"scan_error corrId={corr_id} latencyMs={processing_time_ms} "
            f"errType={type(e).__name__} errMsg={str(e)}"
        )
        try:
            logger.error("File analysis completed failed")
        except Exception:
            pass
        
        # Return safe error response with logs
        logs.append({
            "level": "error",
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
            "message": f"error: {str(e)}",
            "context": "scan/file"
        })
        return FileScanResponse(
            success=False,
            error=f"Scan failed: {str(e)}",
            isMalicious=False,
            detectionCount=0,
            totalEngines=0,
            threats=[],
            riskLevel="safe",
            summary=f"Error during scan: {str(e)}",
            shouldBlock=True,
            blockReason="Scan error occurred",
            logs=[LogEntry(**e) for e in logs]
        )


@router.post("/file/legacy", response_model=FileScanResponse)
async def scan_file_legacy(
    file: UploadFile = File(...),
    text: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Legacy file scanning endpoint for backward compatibility
    """
    try:
        # Ensure DB-backed detection patterns are loaded
        await DetectionPatternService.ensure_loaded(session)

        content = await file.read()
        filename = file.filename or ""

        # Local pattern/filename checks
        dangerous_all = all_matches(text, DANGEROUS_PATTERNS)
        quick_all = all_matches(text, QUICK_PATTERNS)
        sensitive = is_sensitive_file(filename)
        malicious_ext = is_malicious_file(filename)
        threats = list({*(dangerous_all or []), *(quick_all or [])})

        # VirusTotal flow: prefer existing report by hash via VT API itself (relies on backend client to give us the report)
        vt_report = None
        vt_stats = None
        vt_detect = {"isMalicious": False, "detectionCount": 0, "totalEngines": 0}

        # Upload to VT when available
        analysis_id = await VirusTotalService.upload_file_and_get_analysis_id(content, filename)
        if analysis_id:
            analysis = await VirusTotalService.get_analysis(analysis_id)
            stats = (analysis or {}).get("data", {}).get("attributes", {}).get("stats")
            if stats:
                vt_detect = VirusTotalService.summarize_stats(stats)

        # Risk scoring
        if vt_detect["isMalicious"] or sensitive or malicious_ext or (dangerous_all and len(dangerous_all) > 0):
            risk_level = "high"
        elif quick_all:
            risk_level = "medium"
        elif (dangerous_all or quick_all):
            risk_level = "low"
        else:
            risk_level = "safe"

        parts: List[str] = []
        if sensitive:
            parts.append("sensitive filename")
        if malicious_ext:
            parts.append("malicious file extension")
        if vt_detect["isMalicious"]:
            parts.append(f"VirusTotal detections: {vt_detect['detectionCount']}/{vt_detect['totalEngines']}")
        if threats:
            parts.append("patterns detected")
        summary = ", ".join(parts) if parts else "no risky signals detected"

        return FileScanResponse(
            success=True,
            error=None,
            isMalicious=bool(vt_detect["isMalicious"]),
            detectionCount=int(vt_detect["detectionCount"]),
            totalEngines=int(vt_detect["totalEngines"]),
            threats=threats,
            risk_level=risk_level,
            summary=summary,
        )
    except Exception as e:
        return FileScanResponse(
            success=False,
            error=str(e),
            isMalicious=False,
            detectionCount=0,
            totalEngines=0,
            threats=[],
            risk_level="safe",
            summary="scan failed",
        )


