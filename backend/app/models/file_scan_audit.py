from app.models.base import Base
from sqlalchemy import String, Boolean, ForeignKey, Integer, Text, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from typing import List, Optional
import uuid


class FileScanAuditLog(Base):
    __tablename__ = "file_scan_audit_logs"
    __table_args__ = (
        Index("idx_file_scan_logs_client_created", "client_id", "created_at"),
        Index("idx_file_scan_logs_user_created", "user_id", "created_at"),
        Index("idx_file_scan_logs_file_hash", "file_hash"),
    )
    
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True, index=True)
    msp_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=True, index=True)
    
    # File information
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Scan results
    scan_success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    scan_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_malicious: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    detection_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_engines: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="safe")
    should_block: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    block_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Pattern detection results
    is_sensitive_file: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_malicious_file: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    detected_threats: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    pii_detection: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    # VirusTotal results
    vt_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    vt_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vt_scan_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Request metadata
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="extension")  # extension, api, etc.
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Processing metrics
    processing_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scan_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    
    # Additional metadata
    audit_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="file_scan_logs")
