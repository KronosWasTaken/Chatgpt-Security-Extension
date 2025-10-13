from typing import Optional, List
from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json

from app.core.database import get_async_session
from app.models.file_scan_audit import FileScanAuditLog

router = APIRouter()

# Audit Log Models
class AuditLogEntry(BaseModel):
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    msp_id: Optional[str] = None
    event_type: str
    event_category: str
    severity: str
    message: str
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: Optional[str] = None
    source: str
    session_id: Optional[str] = None

class AuditLogResponse(BaseModel):
    success: bool
    message: str
    log_id: Optional[str] = None

class AuditLogFilter(BaseModel):
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
async def log_audit_event(
    audit_entry: AuditLogEntry,
    request: Request
):
    """
    Log an audit event (simplified version with file-based logging)
    """
    try:
        print(f"🔍 Received audit log entry: {audit_entry}")
        print(f"🔍 Request headers: {dict(request.headers)}")
        print(f"🔍 Request method: {request.method}")
        print(f"🔍 Request URL: {request.url}")
        
        # Create a simple audit log entry
        import os
        import json
        from datetime import datetime
        
        # Create audit logs directory if it doesn't exist
        audit_dir = "audit_logs"
        if not os.path.exists(audit_dir):
            os.makedirs(audit_dir)
        
        # Create log entry
        log_entry = {
            "id": f"audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{audit_entry.event_type}",
            "timestamp": audit_entry.timestamp or datetime.utcnow().isoformat(),
            "event_type": audit_entry.event_type,
            "event_category": audit_entry.event_category,
            "severity": audit_entry.severity,
            "message": audit_entry.message,
            "details": audit_entry.details,
            "source": audit_entry.source,
            "session_id": audit_entry.session_id,
            "user_agent": audit_entry.user_agent,
            "ip_address": audit_entry.ip_address,
            "user_id": audit_entry.user_id,
            "client_id": audit_entry.client_id,
            "msp_id": audit_entry.msp_id,
        }
        
        # Save to file
        log_filename = f"{audit_dir}/audit_{datetime.utcnow().strftime('%Y%m%d')}.jsonl"
        with open(log_filename, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        
        print(f"✅ Audit log saved to file: {log_filename}")
        
        return AuditLogResponse(
            success=True,
            message="Audit event logged successfully",
            log_id=log_entry["id"]
        )
        
    except Exception as e:
        print(f"❌ Failed to log audit event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log audit event: {str(e)}"
        )

@router.get("/logs")
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
        print(f"❌ Failed to retrieve audit logs: {e}")
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
        print(f"❌ Failed to export audit logs: {e}")
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
