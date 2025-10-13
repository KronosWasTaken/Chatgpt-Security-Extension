from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, Request, Depends
from pydantic import BaseModel
import time

from app.services.file_analysis_service import FileAnalysisService
from app.services.pattern_service import (
    contains_pattern, all_matches, is_sensitive_file, is_malicious_file,
    DANGEROUS_PATTERNS, QUICK_PATTERNS
)
from app.services.virus_total_service import VirusTotalService
from app.services.detection_pattern_service import DetectionPatternService
from app.core.database import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter()


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


@router.post("/file", response_model=FileScanResponse)
async def scan_file(
    file: UploadFile = File(...),
    text: Optional[str] = Form(None),
    request: Request = None,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Enhanced file scanning endpoint with comprehensive analysis including:
    - Pattern matching for sensitive/malicious files
    - PII detection in content
    - VirusTotal malware scanning
    - File metadata analysis
    - Audit logging
    """
    start_time = time.time()
    
    try:
        print(f"🔍 SCAN_FILE: Received file scan request")
        print(f"🔍 SCAN_FILE: File details: {file.filename}, size: {file.size if hasattr(file, 'size') else 'unknown'}")
        print(f"🔍 SCAN_FILE: Content type: {file.content_type}")
        print(f"🔍 SCAN_FILE: Text content: {text[:100] if text else 'None'}")
        print(f"🔍 SCAN_FILE: Request headers: {dict(request.headers) if request else 'None'}")
        print(f"🔍 SCAN_FILE: Request method: {request.method if request else 'None'}")
        print(f"🔍 SCAN_FILE: Request URL: {request.url if request else 'None'}")
        
        # Check if file is actually received
        if not file:
            print("❌ SCAN_FILE: No file received in request")
            return FileScanResponse(
                success=False,
                error="No file received",
                isMalicious=False,
                detectionCount=0,
                totalEngines=0,
                threats=[],
                riskLevel="safe",
                summary="No file provided"
            )
        
        content = await file.read()
        filename = file.filename or ""
        
        print(f"🔍 SCAN_FILE: File content read, size: {len(content)} bytes")
        print(f"🔍 SCAN_FILE: File content preview: {content[:50]}...")
        
        # Ensure DB-backed detection patterns are loaded
        await DetectionPatternService.ensure_loaded(session)

        # Use the comprehensive file analysis service
        print(f"🔍 SCAN_FILE: Starting file analysis...")
        analysis_result = await FileAnalysisService.analyze_file_for_extension(
            content, filename, text
        )
        
        print(f"🔍 SCAN_FILE: Analysis completed: {analysis_result}")
        
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
        print(f"✅ SCAN_FILE: Full result: {analysis_result}")
        
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
        
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        print(f"❌ SCAN_FILE: File scan failed: {file.filename if file else 'unknown'} - Error: {str(e)}")
        print(f"❌ SCAN_FILE: Error type: {type(e).__name__}")
        print(f"❌ SCAN_FILE: Error details: {e}")
        
        return FileScanResponse(
            success=False,
            error=f"Scan failed: {str(e)}",
            isMalicious=False,
            detectionCount=0,
            totalEngines=0,
            threats=[],
            riskLevel="safe",
            summary=f"Error during scan: {str(e)}"
        )
        #     await FileScanAuditService.log_file_scan(
        #         session=session,
        #         filename=file.filename or "unknown",
        #         file_size=0,
        #         file_hash="",
        #         scan_result={
        #             "success": False,
        #             "error": str(e),
        #             "isMalicious": False,
        #             "detectionCount": 0,
        #             "totalEngines": 0,
        #             "threats": [],
        #             "riskLevel": "safe",
        #             "summary": "scan failed",
        #             "shouldBlock": True,
        #             "blockReason": f"Scan failed: {str(e)}"
        #         },
        #         user_id=str(user_id) if user_id else None,
        #         client_id=str(client_id) if client_id else None,
        #         msp_id=str(msp_id) if msp_id else None,
        #         source="extension",
        #         user_agent=request.headers.get("user-agent") if request else None,
        #         ip_address=request.client.host if request and request.client else None,
        #         processing_time_ms=processing_time_ms,
        #         additional_metadata={
        #             "endpoint": "scan_file",
        #             "error_type": type(e).__name__,
        #             "request_timestamp": start_time
        #         }
        #     )
        # except Exception as audit_error:
        #     print(f"Audit logging failed for error case: {audit_error}")
        
        
        
    
        return FileScanResponse(
            success=False,
            error=str(e),
            isMalicious=False,
            detectionCount=0,
            totalEngines=0,
            threats=[],
            risk_level="safe",
            summary="scan failed",
            shouldBlock=True,
            blockReason=f"Scan failed: {str(e)}"
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


