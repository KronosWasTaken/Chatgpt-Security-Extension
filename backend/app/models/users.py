from app.models.base import Base
from sqlalchemy import String, Boolean, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import date
from typing import List, Optional
import uuid


class User(Base):
    __tablename__ = "users"
 
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    user_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
   
    msp_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("msps.id"), nullable=True)
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
   
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    permissions: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)    

    msp: Mapped[Optional["MSP"]] = relationship("MSP", back_populates="users")
    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="users")
    policy_violations: Mapped[List["ClientPolicyViolation"]] = relationship(
        "ClientPolicyViolation", back_populates="user", cascade="all, delete-orphan"
    )
    
    audit_logs: Mapped[List["ClientAuditLog"]] = relationship(
        "ClientAuditLog", back_populates="user", cascade="all, delete-orphan"
    )
    usage_stats: Mapped[List["ClientAIServiceUsage"]] = relationship("ClientAIServiceUsage", back_populates="user")
    engagement_stats: Mapped[List["UserEngagement"]] = relationship("UserEngagement", back_populates="user", cascade="all, delete-orphan")



