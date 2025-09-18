

from typing import List, Optional

from sqlalchemy import Column, String, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AIService(Base):

    
    __tablename__ = "ai_services"
    __table_args__ = {"schema": "shared"}
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_patterns: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    detection_patterns: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    service_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    

    client_approvals: Mapped[List["ClientApprovedAIService"]] = relationship(
        "ClientApprovedAIService",
        back_populates="ai_service",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[List["ClientAuditLog"]] = relationship(
        "ClientAuditLog",
        back_populates="ai_service",
    )


class ComplianceFramework(Base):

    
    __tablename__ = "compliance_frameworks"
    __table_args__ = {"schema": "shared"}
    
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    regulations: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    requirements: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    applicable_industries: Mapped[List[str]] = mapped_column(
        ARRAY(String), 
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    

    detection_patterns: Mapped[List["DetectionPattern"]] = relationship(
        "DetectionPattern",
        back_populates="framework",
        cascade="all, delete-orphan",
    )
    client_policies: Mapped[List["ClientPolicy"]] = relationship(
        "ClientPolicy",
        back_populates="framework",
    )


class DetectionPattern(Base):

    
    __tablename__ = "detection_patterns"
    __table_args__ = {"schema": "shared"}
    
    framework_id: Mapped[str] = mapped_column(
        String(36), 
        nullable=False,
        index=True,
    )
    pattern_type: Mapped[str] = mapped_column(String(50), nullable=False)
    pattern_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pattern_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence_threshold: Mapped[float] = mapped_column(nullable=False, default=0.8)
    context_rules: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    

    framework: Mapped["ComplianceFramework"] = relationship(
        "ComplianceFramework",
        back_populates="detection_patterns",
    )
