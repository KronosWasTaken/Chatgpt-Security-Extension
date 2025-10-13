from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.models.file_scan_audit import FileScanAuditLog
from app.models.users import User
from app.models.clients import Client
from app.models.msp import MSP


class FileScanAuditService:
    """Service for logging file scan events to the audit system"""
    
    @staticmethod
    async def log_file_scan(
        session: AsyncSession,
        filename: str,
        file_size: int,
        file_hash: str,
        scan_result: Dict[str, Any],
        user_id: Optional[str] = None,
        client_id: Optional[str] = None,
        msp_id: Optional[str] = None,
        source: str = "extension",
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
        processing_time_ms: int = 0,
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> FileScanAuditLog:
        """Log a file scan event to the audit system"""
        
        # Convert string IDs to UUIDs if provided
        user_uuid = None
        client_uuid = None
        msp_uuid = None
        
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
            except ValueError:
                pass
        
        if client_id:
            try:
                client_uuid = uuid.UUID(client_id)
            except ValueError:
                pass
        
        if msp_id:
            try:
                msp_uuid = uuid.UUID(msp_id)
            except ValueError:
                pass
        
        # Extract scan result data
        virus_total_analysis = scan_result.get("virusTotalAnalysis", {})
        
        audit_log = FileScanAuditLog(
            user_id=user_uuid,
            client_id=client_uuid,
            msp_id=msp_uuid,
            
            # File information
            filename=filename,
            file_size=file_size,
            file_hash=file_hash,
            mime_type=scan_result.get("mimeType"),
            
            # Scan results
            scan_success=scan_result.get("success", False),
            scan_error=scan_result.get("error"),
            is_malicious=scan_result.get("isMalicious", False),
            detection_count=scan_result.get("detectionCount", 0),
            total_engines=scan_result.get("totalEngines", 0),
            risk_level=scan_result.get("riskLevel", "safe"),
            should_block=scan_result.get("shouldBlock", False),
            block_reason=scan_result.get("blockReason"),
            
            # Pattern detection results
            is_sensitive_file=scan_result.get("isSensitiveFile", False),
            is_malicious_file=scan_result.get("isMaliciousFile", False),
            detected_threats=scan_result.get("threats", []),
            pii_detection=scan_result.get("piiDetection", {}),
            
            # VirusTotal results
            vt_enabled=virus_total_analysis.get("enabled", False),
            vt_method=virus_total_analysis.get("method"),
            vt_scan_id=virus_total_analysis.get("scanId"),
            
            # Request metadata
            source=source,
            user_agent=user_agent,
            ip_address=ip_address,
            session_id=session_id,
            
            # Processing metrics
            processing_time_ms=processing_time_ms,
            scan_summary=scan_result.get("summary", ""),
            
            # Additional metadata
            audit_metadata=additional_metadata or {}
        )
        
        session.add(audit_log)
        await session.commit()
        await session.refresh(audit_log)
        
        return audit_log
    
    @staticmethod
    async def get_file_scan_history(
        session: AsyncSession,
        client_id: Optional[str] = None,
        user_id: Optional[str] = None,
        msp_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[FileScanAuditLog]:
        """Get file scan history for a client, user, or MSP"""
        
        query = select(FileScanAuditLog)
        
        if client_id:
            try:
                client_uuid = uuid.UUID(client_id)
                query = query.where(FileScanAuditLog.client_id == client_uuid)
            except ValueError:
                pass
        
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                query = query.where(FileScanAuditLog.user_id == user_uuid)
            except ValueError:
                pass
        
        if msp_id:
            try:
                msp_uuid = uuid.UUID(msp_id)
                query = query.where(FileScanAuditLog.msp_id == msp_uuid)
            except ValueError:
                pass
        
        query = query.order_by(FileScanAuditLog.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await session.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_file_scan_stats(
        session: AsyncSession,
        client_id: Optional[str] = None,
        user_id: Optional[str] = None,
        msp_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get file scan statistics for a given period"""
        
        from sqlalchemy import func, and_
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = select(
            func.count(FileScanAuditLog.id).label("total_scans"),
            func.count().filter(FileScanAuditLog.scan_success == True).label("successful_scans"),
            func.count().filter(FileScanAuditLog.is_malicious == True).label("malicious_files"),
            func.count().filter(FileScanAuditLog.should_block == True).label("blocked_files"),
            func.count().filter(FileScanAuditLog.is_sensitive_file == True).label("sensitive_files"),
            func.count().filter(FileScanAuditLog.pii_detection != None).label("pii_detected"),
            func.avg(FileScanAuditLog.processing_time_ms).label("avg_processing_time")
        ).where(FileScanAuditLog.created_at >= start_date)
        
        if client_id:
            try:
                client_uuid = uuid.UUID(client_id)
                query = query.where(FileScanAuditLog.client_id == client_uuid)
            except ValueError:
                pass
        
        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                query = query.where(FileScanAuditLog.user_id == user_uuid)
            except ValueError:
                pass
        
        if msp_id:
            try:
                msp_uuid = uuid.UUID(msp_id)
                query = query.where(FileScanAuditLog.msp_id == msp_uuid)
            except ValueError:
                pass
        
        result = await session.execute(query)
        stats = result.first()
        
        return {
            "total_scans": stats.total_scans or 0,
            "successful_scans": stats.successful_scans or 0,
            "malicious_files": stats.malicious_files or 0,
            "blocked_files": stats.blocked_files or 0,
            "sensitive_files": stats.sensitive_files or 0,
            "pii_detected": stats.pii_detected or 0,
            "avg_processing_time_ms": float(stats.avg_processing_time or 0),
            "period_days": days
        }

