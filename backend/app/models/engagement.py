from typing import List, Optional
from datetime import date
import uuid
from sqlalchemy import String, ForeignKey, Text, Boolean, Integer, Numeric, Date
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


# ApplicationEngagement table removed - data can be calculated from ClientAIServiceUsage at runtime
# This eliminates data duplication while maintaining the same functionality

class AgentEngagement(Base):
    __tablename__ = "agent_engagement"
    
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    
    agent: Mapped[str] = mapped_column(String(255), nullable=False)
    vendor: Mapped[str] = mapped_column(String(255), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    deployed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_prompts_per_day: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flagged_actions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    trend_pct_7d: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # 'Rising', 'Stable', 'Dormant'
    last_activity_iso: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    associated_apps: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True, default=list)
    
    client: Mapped["Client"] = relationship("Client", back_populates="agent_engagement")


class UserEngagement(Base):
    __tablename__ = "user_engagement"
    
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avg_daily_interactions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delta_7d_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    
    client: Mapped["Client"] = relationship("Client", back_populates="user_engagement")
    user: Mapped["User"] = relationship("User", back_populates="engagement_stats")


class ProductivityCorrelation(Base):
    __tablename__ = "productivity_correlations"
    
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    
    ai_interactions_7d: Mapped[List[int]] = mapped_column(JSONB, nullable=False, default=list)
    output_metric_7d: Mapped[List[int]] = mapped_column(JSONB, nullable=False, default=list)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    client: Mapped["Client"] = relationship("Client", back_populates="productivity_correlations")
