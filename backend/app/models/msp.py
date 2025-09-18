

from typing import List, Optional
from datetime import date

from sqlalchemy import Column, String, Text, Boolean, Integer, Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MSP(Base):

    
    __tablename__ = "msps"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    subscription_tier: Mapped[str] = mapped_column(String(50), nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    billing_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    compliance_requirements: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    trial_ends_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    users: Mapped[List["MSPUser"]] = relationship(
        "MSPUser",
        back_populates="msp",
        cascade="all, delete-orphan",
    )
    clients: Mapped[List["Client"]] = relationship(
        "Client",
        back_populates="msp",
        cascade="all, delete-orphan",
    )
    audit_summaries: Mapped[List["MSPAuditSummary"]] = relationship(
        "MSPAuditSummary",
        back_populates="msp",
        cascade="all, delete-orphan",
    )


class MSPUser(Base):

    
    __tablename__ = "msp_users"
    
    msp_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    permissions: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    auth_provider_id: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    msp: Mapped["MSP"] = relationship("MSP", back_populates="users")
    client_assignments: Mapped[List["MSPClientAssignment"]] = relationship(
        "MSPClientAssignment",
        back_populates="msp_user",
        cascade="all, delete-orphan",
    )


class Client(Base):

    
    __tablename__ = "clients"
    
    msp_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)
    company_size: Mapped[str] = mapped_column(String(20), nullable=False)
    compliance_requirements: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    schema_name: Mapped[str] = mapped_column(String(63), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    primary_contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    company_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    onboarding_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    contract_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contract_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    msp: Mapped["MSP"] = relationship("MSP", back_populates="clients")
    assignments: Mapped[List["MSPClientAssignment"]] = relationship(
        "MSPClientAssignment",
        back_populates="client",
        cascade="all, delete-orphan",
    )
    audit_summaries: Mapped[List["MSPAuditSummary"]] = relationship(
        "MSPAuditSummary",
        back_populates="client",
        cascade="all, delete-orphan",
    )


class MSPClientAssignment(Base):

    
    __tablename__ = "msp_client_assignments"
    
    msp_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=False)
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    msp_user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("msp_users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    responsibilities: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)
    is_primary_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assigned_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    msp: Mapped["MSP"] = relationship("MSP")
    client: Mapped["Client"] = relationship("Client", back_populates="assignments")
    msp_user: Mapped["MSPUser"] = relationship("MSPUser", back_populates="client_assignments")


class MSPAuditSummary(Base):

    
    __tablename__ = "msp_audit_summary"
    
    msp_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=False)
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_prompts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    violations_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blocked_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warned_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    compliance_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    framework_scores: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ai_service_usage: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    department_breakdown: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    generated_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    

    msp: Mapped["MSP"] = relationship("MSP", back_populates="audit_summaries")
    client: Mapped["Client"] = relationship("Client", back_populates="audit_summaries")
