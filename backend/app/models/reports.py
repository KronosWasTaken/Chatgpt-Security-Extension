from typing import List, Optional
from datetime import date
import uuid
from sqlalchemy import String, ForeignKey, Text, Boolean, Integer, Numeric, Date
from sqlalchemy.dialects.postgresql import JSONB, UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class ClientComplianceReport(Base):
    __tablename__ = "client_compliance_reports"
    
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "Q3 2025"
    
    # Coverage metrics
    coverage_percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    coverage_implemented: Mapped[int] = mapped_column(Integer, nullable=False)
    coverage_total: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Evidence metrics
    evidence_percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    evidence_complete: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_total: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Alert summary
    alert_summary: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    # Control information
    implemented_controls: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True, default=list)
    open_gaps: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True, default=list)
    
    # Engagement highlights
    engagement_highlights: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    # Next actions
    next_actions: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True, default=list)
    
    client: Mapped["Client"] = relationship("Client", back_populates="compliance_reports")


class PortfolioValueReport(Base):
    __tablename__ = "portfolio_value_reports"
    
    msp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "Q3 2025"
    
    coverage_delta: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    
    # Alert summary
    total_alerts: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    # Standardizations
    top_standardizations: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True, default=list)
    
    # Estimated savings
    estimated_savings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    # Highlights and actions
    highlights: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True, default=list)
    next_actions: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True, default=list)
    
    msp: Mapped["MSP"] = relationship("MSP", back_populates="portfolio_reports")
