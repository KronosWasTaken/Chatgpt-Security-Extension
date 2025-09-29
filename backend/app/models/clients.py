from typing import List, Optional
from datetime import date, datetime
import uuid
from sqlalchemy import String, ForeignKey, Text, Boolean, Integer, Numeric, Index, Date
from sqlalchemy.dialects.postgresql import JSONB, UUID, INET, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Client(Base):
    __tablename__ = "clients" 
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)
    company_size: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    subscription_tier: Mapped[str] = mapped_column(String(50), nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(50), nullable=False)
    business_type: Mapped[str] = mapped_column(String(50), nullable=False)
    contact_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    billing_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
 
    msp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=False)
    
    msp: Mapped["MSP"] = relationship("MSP", back_populates="clients")
    users: Mapped[List["User"]] = relationship("User", back_populates="client")
    ai_services: Mapped[List["ClientAIServices"]] = relationship("ClientAIServices", back_populates="client")
    policies: Mapped[List["ClientPolicy"]] = relationship("ClientPolicy", back_populates="client")
    audit_summaries: Mapped[List["MSPAuditSummary"]] = relationship(
        "MSPAuditSummary",
        back_populates="client",
        cascade="all, delete-orphan"
    )
    usage_stats: Mapped[List["ClientAIServiceUsage"]] = relationship("ClientAIServiceUsage", back_populates="client")
    metrics: Mapped[List["ClientMetrics"]] = relationship("ClientMetrics", back_populates="client", cascade="all, delete-orphan")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="client", cascade="all, delete-orphan")
    # DepartmentEngagement and ApplicationEngagement relationships removed - data calculated at runtime
    agent_engagement: Mapped[List["AgentEngagement"]] = relationship("AgentEngagement", back_populates="client", cascade="all, delete-orphan")
    user_engagement: Mapped[List["UserEngagement"]] = relationship("UserEngagement", back_populates="client", cascade="all, delete-orphan")
    productivity_correlations: Mapped[List["ProductivityCorrelation"]] = relationship("ProductivityCorrelation", back_populates="client", cascade="all, delete-orphan")
    compliance_reports: Mapped[List["ClientComplianceReport"]] = relationship("ClientComplianceReport", back_populates="client", cascade="all, delete-orphan")


class ClientAIServices(Base):
    __tablename__ = "clients_ai_services"

    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    vendor: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)  # 'Application' or 'Agent'
    status: Mapped[str] = mapped_column(String(100), nullable=False)  # 'Permitted' or 'Unsanctioned'
    
    # Frontend inventory fields
    users: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_daily_interactions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    integrations: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True, default=list)
    
    ai_service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shared.ai_services.id"), nullable=False, index=True)
    risk_tolerance: Mapped[str] = mapped_column(String(20), nullable=False)
    department_restrictions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    approved_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    client: Mapped["Client"] = relationship("Client", back_populates="ai_services")
    ai_service: Mapped["AIService"] = relationship("AIService", back_populates="client_approvals")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="ai_service")


class ClientPolicy(Base):
    __tablename__ = "client_policies"

    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rules: Mapped[Optional[list]] = mapped_column(JSONB, nullable=False, default=list)
    yaml: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Frontend YAML field
    last_modified: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    client: Mapped["Client"] = relationship("Client", back_populates="policies")
    violations: Mapped[List["ClientPolicyViolation"]] = relationship(
        "ClientPolicyViolation",
        back_populates="policy",
        cascade="all, delete-orphan"
    )



class ClientAIServiceUsage(Base):
    __tablename__="client_ai_service_usage"
    
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    ai_service_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients_ai_services.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    daily_interactions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Interactions on this specific day
    total_interactions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  
    
    client: Mapped["Client"] = relationship("Client", back_populates="usage_stats")
    ai_service: Mapped["ClientAIServices"] = relationship("ClientAIServices")
    user: Mapped["User"] = relationship("User", back_populates="usage_stats")


class ClientMetrics(Base):
    __tablename__ = "client_metrics"
    
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    
    apps_monitored: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    interactions_monitored: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    agents_deployed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    compliance_coverage: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    client: Mapped["Client"] = relationship("Client", back_populates="metrics")


class Alert(Base):
    __tablename__ = "alerts"
    
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    ai_service_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients_ai_services.id"), nullable=True, index=True)
    app: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Keep for backward compatibility
    asset_kind: Mapped[str] = mapped_column(String(50), nullable=False)  # 'Application' or 'Agent'
    family: Mapped[str] = mapped_column(String(50), nullable=False)  # Alert family type
    subtype: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # 'Low', 'Medium', 'High', 'Critical'
    users_affected: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    frameworks: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # 'Unassigned', 'Pending', 'Complete', 'AI Resolved'
    
    client: Mapped["Client"] = relationship("Client", back_populates="alerts")
    ai_service: Mapped[Optional["ClientAIServices"]] = relationship("ClientAIServices", back_populates="alerts")


# DepartmentEngagement table removed - data can be calculated from ClientAIServiceUsage at runtime
# This eliminates data duplication while maintaining the same functionality
    
    
    












class ClientPolicyViolation(Base):
    __tablename__ = "client_policy_violations"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    audit_log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("client_audit_logs.id"), nullable=False, index=True)
    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("client_policies.id"), nullable=False, index=True)
    
    isActive:Mapped[Boolean]=mapped_column(Boolean,default=True,nullable=False)

    violation_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    remediation_suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    violation_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    audit_log: Mapped["ClientAuditLog"] = relationship("ClientAuditLog", back_populates="violations")
    policy: Mapped["ClientPolicy"] = relationship("ClientPolicy", back_populates="violations")
    user: Mapped["User"] = relationship("User", back_populates="policy_violations")


class ClientAuditLog(Base):
    __tablename__ = "client_audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_client_created", "client_id", "created_at"),
        Index("idx_audit_logs_user_created", "user_id", "created_at"),
        Index("idx_audit_logs_ai_service", "ai_service_id"),
    )
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    ai_service_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("shared.ai_services.id"), nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    prompt_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_snippet: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_length: Mapped[int] = mapped_column(Integer, nullable=False)
    detected_patterns: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    policy_violations: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    enforcement_action: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    browser_fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    processing_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    audit_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    
    user: Mapped["User"] = relationship("User", back_populates="audit_logs")
    violations: Mapped[List["ClientPolicyViolation"]] = relationship(
        "ClientPolicyViolation", back_populates="audit_log"
    )
    ai_service: Mapped["AIService"] = relationship("AIService", back_populates="client_audit_logs")
