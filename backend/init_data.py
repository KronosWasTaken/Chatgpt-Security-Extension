#!/usr/bin/env python3
"""
Initialize database with sample data that matches frontend structure
"""
import asyncio
import uuid
from datetime import datetime, date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.base import Base
from app.models.msp import MSP, MSPUser, Client
from app.models.client import ClientUser, ClientApprovedAIService, ClientAuditLog, ClientPolicyViolation
from app.models.shared import AIService, ComplianceFramework, DetectionPattern, MSPAuditSummary
from app.core.auth import get_password_hash

async def init_database():
    """Initialize database with sample data"""
    
    # Create engine
    engine = create_async_engine(settings.DATABASE_URL_ASYNC)
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Create sample MSP
        msp = MSP(
            id="msp-001",
            name="Demo MSP",
            subscription_tier="Enterprise",
            billing_cycle="annual",
            status="active",
            contact_info={"email": "admin@demo.com", "phone": "+1-555-0123"},
            billing_info={"address": "123 Main St", "city": "San Francisco", "state": "CA"},
            settings={"theme": "dark", "notifications": True},
            compliance_requirements=["HIPAA", "SOC2", "GDPR"]
        )
        session.add(msp)
        
        # Create sample clients matching frontend data exactly
        clients_data = [
            {
                "id": "acme-health",
                "name": "Acme Health",
                "industry": "Healthcare",
                "company_size": "medium",
                "status": "active",
                "subscription_tier": "Professional",
                "contact_email": "admin@acmehealth.com",
                "primary_contact_name": "John Smith",
                "primary_contact_phone": "+1-555-0123",
                "schema_name": "client_acme_health"
            },
            {
                "id": "techcorp-solutions",
                "name": "TechCorp Solutions",
                "industry": "Technology",
                "company_size": "large",
                "status": "active",
                "subscription_tier": "Enterprise",
                "contact_email": "admin@techcorp.com",
                "primary_contact_name": "Jane Doe",
                "primary_contact_phone": "+1-555-0456",
                "schema_name": "client_techcorp"
            },
            {
                "id": "metro-finance",
                "name": "Metro Finance",
                "industry": "Financial Services",
                "company_size": "large",
                "status": "active",
                "subscription_tier": "Enterprise",
                "contact_email": "admin@metrofinance.com",
                "primary_contact_name": "Bob Johnson",
                "primary_contact_phone": "+1-555-0789",
                "schema_name": "client_metro_finance"
            }
        ]
        
        for client_data in clients_data:
            client = Client(
                msp_id="msp-001",
                compliance_requirements=["HIPAA", "SOC2"],
                **client_data
            )
            session.add(client)
        
        # Create sample MSP user
        msp_user = MSPUser(
            id="msp-user-001",
            msp_id="msp-001",
            email="admin@demo.com",
            first_name="Demo",
            last_name="Admin",
            role="msp_admin",
            permissions=["user:read", "user:write", "client:read", "client:write", "msp:read", "msp:write"],
            department="IT",
            auth_provider_id="demo-provider"
        )
        session.add(msp_user)
        
        # Create sample client users
        client_users_data = [
            {
                "id": "client-user-001",
                "client_id": "acme-health",
                "email": "user@acmehealth.com",
                "first_name": "Jane",
                "last_name": "Doe",
                "role": "client_admin",
                "permissions": ["user:read", "user:write", "client:read", "client:write"],
                "department": "IT",
                "auth_provider_id": "demo-provider"
            },
            {
                "id": "client-user-002",
                "client_id": "techcorp-solutions",
                "email": "user@techcorp.com",
                "first_name": "Alice",
                "last_name": "Smith",
                "role": "client_admin",
                "permissions": ["user:read", "user:write", "client:read", "client:write"],
                "department": "IT",
                "auth_provider_id": "demo-provider"
            },
            {
                "id": "client-user-003",
                "client_id": "metro-finance",
                "email": "user@metrofinance.com",
                "first_name": "Charlie",
                "last_name": "Brown",
                "role": "client_admin",
                "permissions": ["user:read", "user:write", "client:read", "client:write"],
                "department": "IT",
                "auth_provider_id": "demo-provider"
            }
        ]
        
        for user_data in client_users_data:
            client_user = ClientUser(**user_data)
            session.add(client_user)
        
        # Create sample AI services matching frontend inventory
        ai_services_data = [
            {
                "id": "chatgpt-app",
                "name": "ChatGPT",
                "vendor": "OpenAI",
                "category": "chat",
                "risk_level": "medium",
                "domain_patterns": ["chat.openai.com", "chatgpt.com"]
            },
            {
                "id": "copilot-app",
                "name": "Microsoft Copilot",
                "vendor": "Microsoft",
                "category": "coding",
                "risk_level": "medium",
                "domain_patterns": ["microsoft.com", "copilot.microsoft.com"]
            },
            {
                "id": "claude-app",
                "name": "Claude",
                "vendor": "Anthropic",
                "category": "chat",
                "risk_level": "medium",
                "domain_patterns": ["claude.ai", "console.anthropic.com"]
            },
            {
                "id": "medical-ai-agent",
                "name": "MedAssist AI",
                "vendor": "HealthTech Inc",
                "category": "agent",
                "risk_level": "high",
                "domain_patterns": ["medassist.ai"]
            },
            {
                "id": "scheduling-agent",
                "name": "SmartScheduler",
                "vendor": "AI Solutions",
                "category": "agent",
                "risk_level": "low",
                "domain_patterns": ["smartscheduler.ai"]
            },
            {
                "id": "billing-agent",
                "name": "BillBot Pro",
                "vendor": "FinanceAI",
                "category": "agent",
                "risk_level": "medium",
                "domain_patterns": ["billbot.ai"]
            }
        ]
        
        for service_data in ai_services_data:
            ai_service = AIService(**service_data)
            session.add(ai_service)
        
        # Create sample approved AI services matching frontend inventory
        approved_services_data = [
            {
                "id": "approved-001",
                "client_id": "acme-health",
                "ai_service_id": "chatgpt-app",
                "approval_status": "approved",
                "risk_tolerance": "medium",
                "approved_by": "client-user-001",
                "approved_at": datetime.utcnow()
            },
            {
                "id": "approved-002",
                "client_id": "acme-health",
                "ai_service_id": "copilot-app",
                "approval_status": "approved",
                "risk_tolerance": "medium",
                "approved_by": "client-user-001",
                "approved_at": datetime.utcnow()
            },
            {
                "id": "approved-003",
                "client_id": "acme-health",
                "ai_service_id": "claude-app",
                "approval_status": "under_review",
                "risk_tolerance": "medium",
                "approved_by": None,
                "approved_at": None
            },
            {
                "id": "approved-004",
                "client_id": "acme-health",
                "ai_service_id": "medical-ai-agent",
                "approval_status": "approved",
                "risk_tolerance": "high",
                "approved_by": "client-user-001",
                "approved_at": datetime.utcnow()
            },
            {
                "id": "approved-005",
                "client_id": "acme-health",
                "ai_service_id": "scheduling-agent",
                "approval_status": "approved",
                "risk_tolerance": "low",
                "approved_by": "client-user-001",
                "approved_at": datetime.utcnow()
            },
            {
                "id": "approved-006",
                "client_id": "acme-health",
                "ai_service_id": "billing-agent",
                "approval_status": "approved",
                "risk_tolerance": "medium",
                "approved_by": "client-user-001",
                "approved_at": datetime.utcnow()
            }
        ]
        
        for approved_data in approved_services_data:
            approved_service = ClientApprovedAIService(**approved_data)
            session.add(approved_service)
        
        # Create sample audit summaries matching frontend data
        audit_summaries = [
            MSPAuditSummary(
                id="summary-001",
                msp_id="msp-001",
                client_id="acme-health",
                report_date=datetime.utcnow(),
                total_prompts=12450,
                violations_count=15,
                blocked_attempts=3,
                warned_attempts=12,
                compliance_score=87
            ),
            MSPAuditSummary(
                id="summary-002",
                msp_id="msp-001",
                client_id="techcorp-solutions",
                report_date=datetime.utcnow(),
                total_prompts=28900,
                violations_count=8,
                blocked_attempts=2,
                warned_attempts=6,
                compliance_score=93
            ),
            MSPAuditSummary(
                id="summary-003",
                msp_id="msp-001",
                client_id="metro-finance",
                report_date=datetime.utcnow(),
                total_prompts=15670,
                violations_count=12,
                blocked_attempts=5,
                warned_attempts=7,
                compliance_score=91
            )
        ]
        
        for audit_summary in audit_summaries:
            session.add(audit_summary)
        
        # Create sample policy violations (alerts)
        violations_data = [
            {
                "id": "violation-001",
                "audit_log_id": "audit-001",
                "policy_id": "policy-001",
                "user_id": "client-user-001",
                "violation_type": "Sensitive Data Exposure",
                "severity": "High",
                "description": "Potential PHI data detected in AI prompt",
                "is_resolved": False
            },
            {
                "id": "violation-002",
                "audit_log_id": "audit-002",
                "policy_id": "policy-002",
                "user_id": "client-user-001",
                "violation_type": "Unsanctioned AI Use",
                "severity": "Medium",
                "description": "Unauthorized AI service access detected",
                "is_resolved": False
            },
            {
                "id": "violation-003",
                "audit_log_id": "audit-003",
                "policy_id": "policy-003",
                "user_id": "client-user-001",
                "violation_type": "Policy Violation",
                "severity": "Low",
                "description": "Minor policy deviation in AI interaction",
                "is_resolved": True,
                "resolved_at": datetime.utcnow()
            }
        ]
        
        for violation_data in violations_data:
            violation = ClientPolicyViolation(**violation_data)
            session.add(violation)
        
        # Set password hashes (demo password: demo123)
        demo_password_hash = get_password_hash("demo123")
        
        # Update user password hashes
        await session.execute(
            "UPDATE msp_users SET password_hash = :password WHERE email = 'admin@demo.com'",
            {"password": demo_password_hash}
        )
        
        await session.execute(
            "UPDATE client_users SET password_hash = :password WHERE email LIKE '%@%'",
            {"password": demo_password_hash}
        )
        
        await session.commit()
        print("✅ Database initialized with sample data!")
        print("📧 Demo credentials:")
        print("   MSP Admin: admin@demo.com / demo123")
        print("   Client Admin: user@acmehealth.com / demo123")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_database())
