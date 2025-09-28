from app.models.base import Base

from typing import List, Optional
from datetime import date
import uuid
from sqlalchemy import String, Text, Boolean, Integer, Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class MSP(Base):
    __tablename__ = "msps"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subscription_tier: Mapped[str] = mapped_column(String(50), nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(50), nullable=False)
    business_type: Mapped[str] = mapped_column(String(50), nullable=False)
    contact_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    billing_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    compliance_requirements: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    trial_ends_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    users: Mapped[List["User"]] = relationship("User", back_populates="msp", cascade="all, delete-orphan")
    clients: Mapped[List["Client"]] = relationship("Client", back_populates="msp", cascade="all, delete-orphan")
    audit_summaries: Mapped[List["MSPAuditSummary"]] = relationship(
        "MSPAuditSummary",
        back_populates="msp",
        cascade="all, delete-orphan"
    )
    portfolio_reports: Mapped[List["PortfolioValueReport"]] = relationship("PortfolioValueReport", back_populates="msp", cascade="all, delete-orphan")


class MSPAuditSummary(Base):
    __tablename__ = "msp_audit_summary"
    
    msp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_prompts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    violations_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blocked_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warned_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    compliance_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    framework_scores: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    ai_service_usage: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    department_breakdown: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    msp: Mapped["MSP"] = relationship("MSP", back_populates="audit_summaries")
    client: Mapped["Client"] = relationship("Client", back_populates="audit_summaries")
