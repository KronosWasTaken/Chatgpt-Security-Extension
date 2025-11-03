"""Extension logs model for SQLite storage"""
from sqlalchemy import Column, String, DateTime, Text, Integer, Index
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

# Import existing Base from database if exists
try:
    from app.core.database import Base as DBBase
except ImportError:
    pass


class ExtensionLog(Base):
    """
    Extension logs stored in SQLite
    Max entry size: 32KB per row for privacy and performance
    """
    __tablename__ = "extension_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Request metadata (no raw bytes, keep < 32KB)
    level = Column(String(20), nullable=False)  # success, error, info, warning
    component = Column(String(50), nullable=False)  # background, content, ui
    event_type = Column(String(100), nullable=False)  # prompt_analysis, file_scan, audit_event
    
    # Core message (< 32KB)
    message = Column(Text, nullable=False)
    details = Column(Text)  # JSON string, truncated if needed
    
    # Context
    url = Column(String(500))  # Max URL length, truncated if needed
    extension_version = Column(String(20))
    browser_type = Column(String(20))
    session_id = Column(String(100))
    
    # Request tracking
    correlation_id = Column(String(36))
    request_method = Column(String(10))
    request_path = Column(String(200))
    
    # Response tracking
    response_status = Column(Integer)
    response_time_ms = Column(Integer)
    body_length = Column(Integer)  # Log size, not raw bytes
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_level_created', 'level', 'created_at'),
        Index('idx_event_type', 'event_type'),
        Index('idx_correlation_id', 'correlation_id'),
        Index('idx_session_id', 'session_id'),
    )


def ensure_table_exists(engine):
    """Create table if it doesn't exist"""
    ExtensionLog.metadata.create_all(bind=engine, checkfirst=True)
