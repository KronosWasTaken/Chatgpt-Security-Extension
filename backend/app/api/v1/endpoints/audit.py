from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from datetime import datetime
import json
import logging

from app.core.database import get_async_session, get_sync_session
from app.models.file_scan_audit import FileScanAuditLog
from app.models.extension_logs import ExtensionLog, ensure_table_exists
from app.core.correlation import get_correlation_id

router = APIRouter()
logger = logging.getLogger(__name__)

# Request/Response Models
class AuditLogEntryRequest(BaseModel):
    """Request model for creating audit log"""
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    msp_id: Optional[str] = None
    event_type: str = Field(..., min_length=1, max_length=100)
    event_category: str = Field(..., min_length=1, max_length=100)
    severity: str = Field(..., min_length=1, max_length=20)
    message: str = Field(..., min_length=1, max_length=1000)
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: Optional[str] = None
    source: str = Field(..., min_length=1, max_length=50)
    session_id: Optional[str] = None

class AuditLogSearchRequest(BaseModel):
    """Request model for searching audit logs"""
    event_type: Optional[str] = None
    event_category: Optional[str] = None
    severity: Optional[str] = None
    level: Optional[str] = None
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    msp_id: Optional[str] = None
    component: Optional[str] = None
    correlation_id: Optional[str] = None
    session_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    search_text: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)

class AuditLogResponse(BaseModel):
    """Response model for audit log creation"""
    success: bool
    message: str
    log_id: Optional[str] = None
    correlation_id: Optional[str] = None

class AuditLogEntryResponse(BaseModel):
    """Response model for audit log entry"""
    id: str
    level: str
    component: str
    event_type: str
    message: str
    details: Optional[str] = None
    url: Optional[str] = None
    extension_version: Optional[str] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None
    response_status: Optional[int] = None
    response_time_ms: Optional[int] = None
    created_at: str

class AuditLogSearchResponse(BaseModel):
    """Response model for audit log search"""
    logs: List[AuditLogEntryResponse]
    total: int
    limit: int
    offset: int
    has_more: bool

class AuditLogFilter(BaseModel):
    """Legacy filter model kept for backward compatibility with older endpoints.
    Note: New integrations should use POST /api/v1/audit/events/search with AuditLogSearchRequest.
    """
    event_type: Optional[str] = None
    event_category: Optional[str] = None
    severity: Optional[str] = None
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    msp_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: Optional[int] = 50
    offset: Optional[int] = 0

@router.post("/events", response_model=AuditLogResponse)
async def create_audit_event(
    audit_entry: AuditLogEntryRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Create an audit log event - stores in SQLite
    Returns 200 with well-formed JSON, never 400 for normal inputs
    """
    corr_id = get_correlation_id(request)
    body_length = request.headers.get('content-length', 'unknown')
    
    try:
        # Ensure table exists
        from app.core.database import sync_engine
        ensure_table_exists(sync_engine)
        
        # Prepare details JSON (truncate if needed to stay < 32KB)
        details_str = None
        if audit_entry.details:
            details_json = json.dumps(audit_entry.details)
            # Truncate to ~30KB to leave room for other fields
            if len(details_json) > 30000:
                details_json = details_json[:30000] + "...(truncated)"
            details_str = details_json
        
        # Create log entry
        from app.models.extension_logs import ExtensionLog
        log_entry = ExtensionLog(
            level=audit_entry.severity,
            component="extension",
            event_type=audit_entry.event_type,
            message=audit_entry.message[:32768],  # Ensure < 32KB
            details=details_str,
            url=request.headers.get("referer", "")[:500] if request.headers.get("referer") else None,
            extension_version=request.headers.get("user-agent", "")[:20],
            browser_type="chrome",
            session_id=audit_entry.session_id,
            correlation_id=corr_id,
            request_method=request.method,
            request_path=str(request.url.path)[:200],
            body_length=int(body_length) if body_length != 'unknown' else 0
        )
        
        # Save using sync session for SQLite
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            db.add(log_entry)
            db.commit()
            log_id = log_entry.id
        finally:
            db.close()
        
        logger.info(f"audit_event_created corrId={corr_id} logId={log_id} eventType={audit_entry.event_type} level={audit_entry.severity}")
        
        return AuditLogResponse(
            success=True,
            message="Audit event logged successfully",
            log_id=log_id,
            correlation_id=corr_id
        )
        
    except Exception as e:
        logger.error(f"audit_event_create_error corrId={corr_id} error={str(e)} errorType={type(e).__name__}")
        # Return 500, not 400 - we've already validated input
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create audit event: {str(e)}"
        )

@router.post("/events/search", response_model=AuditLogSearchResponse)
async def search_audit_events(
    search_request: AuditLogSearchRequest,
    request: Request
):
    """
    Search audit events with filters and pagination
    Returns 200 with well-formed JSON, never 400 for normal inputs
    """
    corr_id = get_correlation_id(request)
    
    try:
        # Use sync session for SQLite
        from app.core.database import SessionLocal, sync_engine
        ensure_table_exists(sync_engine)
        db = SessionLocal()
        
        try:
            # Build query
            query = db.query(ExtensionLog)
            
            # Apply filters
            if search_request.event_type:
                query = query.filter(ExtensionLog.event_type == search_request.event_type)
            
            if search_request.event_category:
                query = query.filter(ExtensionLog.event_category == search_request.event_category)
            
            if search_request.severity:
                query = query.filter(ExtensionLog.level == search_request.severity)
            
            if search_request.level:
                query = query.filter(ExtensionLog.level == search_request.level)
            
            if search_request.component:
                query = query.filter(ExtensionLog.component == search_request.component)
            
            if search_request.session_id:
                query = query.filter(ExtensionLog.session_id == search_request.session_id)
            
            if search_request.correlation_id:
                query = query.filter(ExtensionLog.correlation_id == search_request.correlation_id)
            
            if search_request.start_date:
                start_dt = datetime.fromisoformat(search_request.start_date)
                query = query.filter(ExtensionLog.created_at >= start_dt)
            
            if search_request.end_date:
                end_dt = datetime.fromisoformat(search_request.end_date)
                query = query.filter(ExtensionLog.created_at <= end_dt)
            
            if search_request.search_text:
                search_term = f"%{search_request.search_text}%"
                query = query.filter(
                    or_(
                        ExtensionLog.message.like(search_term),
                        ExtensionLog.details.like(search_term)
                    )
                )
            
            # Get total count
            total_count = query.count()
            
            # Apply pagination
            logs = query.order_by(desc(ExtensionLog.created_at))\
                       .limit(search_request.limit)\
                       .offset(search_request.offset)\
                       .all()
            
            # Convert to response format
            log_entries = []
            for log in logs:
                log_entries.append(AuditLogEntryResponse(
                    id=log.id,
                    level=log.level,
                    component=log.component,
                    event_type=log.event_type,
                    message=log.message,
                    details=log.details,
                    url=log.url,
                    extension_version=log.extension_version,
                    session_id=log.session_id,
                    correlation_id=log.correlation_id,
                    response_status=log.response_status,
                    response_time_ms=log.response_time_ms,
                    created_at=log.created_at.isoformat()
                ))
            
            has_more = (search_request.offset + search_request.limit) < total_count
            
            logger.info(f"audit_event_search corrId={corr_id} filters={len([x for x in search_request.dict().values() if x])} results={len(log_entries)} total={total_count}")
            
            return AuditLogSearchResponse(
                logs=log_entries,
                total=total_count,
                limit=search_request.limit,
                offset=search_request.offset,
                has_more=has_more
            )
        
        finally:
            db.close()
        
    except Exception as e:
        logger.error(f"audit_event_search_error corrId={corr_id} error={str(e)} errorType={type(e).__name__}")
        # Return 500, not 400 - we've already validated input
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search audit events: {str(e)}"
        )
async def get_audit_logs(
    filter_params: AuditLogFilter = Depends(),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Retrieve audit logs with filtering
    """
    try:
        query = session.query(FileScanAuditLog)
        
        # Apply filters
        if filter_params.event_type:
            query = query.filter(FileScanAuditLog.scan_result['event_type'].astext == filter_params.event_type)
        
        if filter_params.event_category:
            query = query.filter(FileScanAuditLog.scan_result['event_category'].astext == filter_params.event_category)
        
        if filter_params.severity:
            query = query.filter(FileScanAuditLog.risk_level == filter_params.severity)
        
        if filter_params.user_id:
            query = query.filter(FileScanAuditLog.user_id == filter_params.user_id)
        
        if filter_params.client_id:
            query = query.filter(FileScanAuditLog.client_id == filter_params.client_id)
        
        if filter_params.msp_id:
            query = query.filter(FileScanAuditLog.msp_id == filter_params.msp_id)
        
        if filter_params.start_date:
            query = query.filter(FileScanAuditLog.created_at >= datetime.fromisoformat(filter_params.start_date))
        
        if filter_params.end_date:
            query = query.filter(FileScanAuditLog.created_at <= datetime.fromisoformat(filter_params.end_date))
        
        # Get total count
        from sqlalchemy import func
        count_query = session.query(func.count(FileScanAuditLog.id))
        
        # Apply same filters to count query
        if filter_params.event_type:
            count_query = count_query.filter(FileScanAuditLog.scan_result['event_type'].astext == filter_params.event_type)
        
        if filter_params.event_category:
            count_query = count_query.filter(FileScanAuditLog.scan_result['event_category'].astext == filter_params.event_category)
        
        if filter_params.severity:
            count_query = count_query.filter(FileScanAuditLog.risk_level == filter_params.severity)
        
        if filter_params.user_id:
            count_query = count_query.filter(FileScanAuditLog.user_id == filter_params.user_id)
        
        if filter_params.client_id:
            count_query = count_query.filter(FileScanAuditLog.client_id == filter_params.client_id)
        
        if filter_params.msp_id:
            count_query = count_query.filter(FileScanAuditLog.msp_id == filter_params.msp_id)
        
        if filter_params.start_date:
            count_query = count_query.filter(FileScanAuditLog.created_at >= datetime.fromisoformat(filter_params.start_date))
        
        if filter_params.end_date:
            count_query = count_query.filter(FileScanAuditLog.created_at <= datetime.fromisoformat(filter_params.end_date))
        
        total_result = await session.execute(count_query)
        total_count = total_result.scalar()
        
        # Apply pagination
        query = query.offset(filter_params.offset).limit(filter_params.limit)
        
        # Order by created_at descending
        query = query.order_by(FileScanAuditLog.created_at.desc())
        
        # Execute query
        result = await session.execute(query)
        logs = result.scalars().all()
        
        # Convert to response format
        audit_logs = []
        for log in logs:
            scan_result = log.scan_result or {}
            audit_logs.append({
                "id": str(log.id),
                "user_id": log.user_id,
                "client_id": log.client_id,
                "msp_id": log.msp_id,
                "event_type": scan_result.get("event_type"),
                "event_category": scan_result.get("event_category"),
                "severity": log.risk_level,
                "message": scan_result.get("message"),
                "details": scan_result.get("details"),
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "timestamp": log.created_at.isoformat(),
                "source": log.source,
                "session_id": scan_result.get("session_id"),
            })
        
        return {
            "logs": audit_logs,
            "total": total_count,
            "page": (filter_params.offset // filter_params.limit) + 1,
            "page_size": filter_params.limit,
        }
        
    except Exception as e:
        print(f" Failed to retrieve audit logs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve audit logs: {str(e)}"
        )

@router.post("/export")
async def export_audit_logs(
    filter_params: AuditLogFilter,
    format: str = "json",
    session: AsyncSession = Depends(get_async_session)
):
    """
    Export audit logs in CSV or JSON format
    """
    try:
        # Get logs using the same filtering logic as get_audit_logs
        query = session.query(FileScanAuditLog)
        
        # Apply same filters as get_audit_logs
        if filter_params.event_type:
            query = query.filter(FileScanAuditLog.scan_result['event_type'].astext == filter_params.event_type)
        
        if filter_params.event_category:
            query = query.filter(FileScanAuditLog.scan_result['event_category'].astext == filter_params.event_category)
        
        if filter_params.severity:
            query = query.filter(FileScanAuditLog.risk_level == filter_params.severity)
        
        if filter_params.user_id:
            query = query.filter(FileScanAuditLog.user_id == filter_params.user_id)
        
        if filter_params.client_id:
            query = query.filter(FileScanAuditLog.client_id == filter_params.client_id)
        
        if filter_params.msp_id:
            query = query.filter(FileScanAuditLog.msp_id == filter_params.msp_id)
        
        if filter_params.start_date:
            query = query.filter(FileScanAuditLog.created_at >= datetime.fromisoformat(filter_params.start_date))
        
        if filter_params.end_date:
            query = query.filter(FileScanAuditLog.created_at <= datetime.fromisoformat(filter_params.end_date))
        
        # Order by created_at descending
        query = query.order_by(FileScanAuditLog.created_at.desc())
        
        # Execute query
        result = await session.execute(query)
        logs = result.scalars().all()
        
        if format.lower() == "csv":
            # Generate CSV
            csv_content = "timestamp,event_type,event_category,severity,message,user_id,client_id,msp_id,source,ip_address\n"
            
            for log in logs:
                scan_result = log.scan_result or {}
                csv_content += f'"{log.created_at.isoformat()}","{scan_result.get("event_type", "")}","{scan_result.get("event_category", "")}","{log.risk_level}","{scan_result.get("message", "")}","{log.user_id or ""}","{log.client_id or ""}","{log.msp_id or ""}","{log.source}","{log.ip_address or ""}"\n'
            
            return {
                "content": csv_content,
                "content_type": "text/csv",
                "filename": f"audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        
        else:  # JSON format
            audit_logs = []
            for log in logs:
                scan_result = log.scan_result or {}
                audit_logs.append({
                    "id": str(log.id),
                    "user_id": log.user_id,
                    "client_id": log.client_id,
                    "msp_id": log.msp_id,
                    "event_type": scan_result.get("event_type"),
                    "event_category": scan_result.get("event_category"),
                    "severity": log.risk_level,
                    "message": scan_result.get("message"),
                    "details": scan_result.get("details"),
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "timestamp": log.created_at.isoformat(),
                    "source": log.source,
                    "session_id": scan_result.get("session_id"),
                })
            
            return {
                "content": json.dumps(audit_logs, indent=2),
                "content_type": "application/json",
                "filename": f"audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            }
        
    except Exception as e:
        print(f" Failed to export audit logs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export audit logs: {str(e)}"
        )

@router.get("/test")
async def test_audit_endpoint():
    """
    Test endpoint to verify audit service is working
    """
    return {
        "status": "ok",
        "message": "Audit endpoint is working",
        "timestamp": datetime.utcnow().isoformat()
    }
