

from typing import List, Optional
from datetime import date

from sqlalchemy import Column, String, Text, Boolean, Integer, Date, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID, INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ClientUser(Base):

    
    __tablename__ = "client_users"
    
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    permissions: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    employee_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    manager_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    auth_provider_id: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    audit_logs: Mapped[List["ClientAuditLog"]] = relationship(
        "ClientAuditLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    policy_violations: Mapped[List["ClientPolicyViolation"]] = relationship(
        "ClientPolicyViolation",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class ClientDepartment(Base):

    
    __tablename__ = "client_departments"
    
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    compliance_requirements: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ClientPolicy(Base):

    
    __tablename__ = "client_policies"
    
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    framework_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    rules: Mapped[dict] = mapped_column(JSONB, nullable=False)
    enforcement_level: Mapped[str] = mapped_column(String(20), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    conditions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    exceptions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=True), nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    violations: Mapped[List["ClientPolicyViolation"]] = relationship(
        "ClientPolicyViolation",
        back_populates="policy",
        cascade="all, delete-orphan",
    )


class ClientApprovedAIService(Base):

    
    __tablename__ = "client_approved_ai_services"
    
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    ai_service_id: Mapped[str] = mapped_column(String(36), nullable=False)
    approval_status: Mapped[str] = mapped_column(String(20), nullable=False)
    conditions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    risk_tolerance: Mapped[str] = mapped_column(String(20), nullable=False)
    department_restrictions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    time_restrictions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    data_restrictions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=True), nullable=True)
    approval_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expires_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    ai_service: Mapped["AIService"] = relationship("AIService", back_populates="client_approvals")


class ClientAuditLog(Base):

    
    __tablename__ = "client_audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_client_created", "client_id", "created_at"),
        Index("idx_audit_logs_user_created", "user_id", "created_at"),
        Index("idx_audit_logs_ai_service", "ai_service_id"),
    )
    
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ai_service_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    prompt_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_snippet: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_length: Mapped[int] = mapped_column(Integer, nullable=False)
    detected_patterns: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    policy_violations: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    enforcement_action: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    browser_fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    processing_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    audit_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    

    user: Mapped["ClientUser"] = relationship("ClientUser", back_populates="audit_logs")
    ai_service: Mapped["AIService"] = relationship("AIService", back_populates="audit_logs")
    violations: Mapped[List["ClientPolicyViolation"]] = relationship(
        "ClientPolicyViolation",
        back_populates="audit_log",
        cascade="all, delete-orphan",
    )


class ClientPolicyViolation(Base):

    
    __tablename__ = "client_policy_violations"
    
    audit_log_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    policy_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    violation_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    remediation_suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    violation_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    audit_log: Mapped["ClientAuditLog"] = relationship("ClientAuditLog", back_populates="violations")
    policy: Mapped["ClientPolicy"] = relationship("ClientPolicy", back_populates="violations")
    user: Mapped["ClientUser"] = relationship("ClientUser", back_populates="policy_violations")
