import sys
import os
from datetime import date
import uuid


# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.database import sync_engine as engine
from app.models.users import User
from app.models import MSP, Client
from app.models import AIService, ComplianceFramework, DetectionPattern  

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# ----- Roles & Permissions -----
ROLES = ["msp_admin", "msp_user", "client_admin", "client_user", "end_user"]

PERMISSIONS = [
    "user:read",
    "user:write",
    "client:read",
    "client:write",
    "msp:read",
    "msp:write"
]


def set_msp_and_client_data(session: Session, msp_name: str, client_name: str = None):
    msp = session.query(MSP).filter_by(name=msp_name).first()
    if not msp:
        msp = MSP(
            name=msp_name,
            subscription_tier="Basic",
            billing_cycle="monthly",
            business_type="IT Services",
            status="active",
            trial_ends_at=None
        )
        session.add(msp)
        session.commit()
        session.refresh(msp)
        print(f"✅ MSP created: {msp.name}")
    else:
        print(f"ℹ️ MSP exists: {msp.name}")

    client = None
    if client_name:
        client = session.query(Client).filter_by(name=client_name, msp_id=msp.id).first()
        if not client:
            client = Client(
                name=client_name,
                industry="Software",
                company_size="small",
                subscription_tier="Basic",
                billing_cycle="monthly",
                business_type="IT Services",
                status="active",
                msp_id=msp.id
            )
            session.add(client)
            session.commit()
            session.refresh(client)
            print(f"✅ Client created: {client.name}")
        else:
            print(f"ℹ️ Client exists: {client.name}")

    return msp, client


def seed_users(session: Session, msp: MSP, client: Client):
    """Seed MSP and Client admins with direct role & permission arrays."""

    # MSP Admin
    msp_admin_email = "msp_admin@example.com"
    msp_admin = session.query(User).filter_by(email=msp_admin_email).first()
    if not msp_admin:
        msp_admin = User(
            name="MSP Admin",
            email=msp_admin_email,
            hashed_password=hash_password("password123"),
            user_type="msp",
            msp_id=msp.id,
            role="msp_admin",                 
            permissions=["msp:read", "msp:write"] 
        )
        session.add(msp_admin)
        session.commit()
        print(f"✅ MSP Admin created: {msp_admin.email}")
    else:
        print(f"ℹ️ MSP Admin exists: {msp_admin.email}")

    # Client Admin
    client_admin_email = "client_admin@example.com"
    client_admin = session.query(User).filter_by(email=client_admin_email).first()
    if not client_admin:
        client_admin = User(
            name="Client Admin",
            email=client_admin_email,
            hashed_password=hash_password("password123"),
            user_type="client",
            client_id=client.id,
            role="client_admin", 
            department="Sales",# Directly assign role
            permissions=["client:read", "client:write"] # Directly assign permissions
        )
        session.add(client_admin)
        session.commit()
        print(f"✅ Client Admin created: {client_admin.email}")
    else:
        print(f"ℹ️ Client Admin exists: {client_admin.email}")


def seed_ai_services(session: Session):
    ai_services = [
        {
            "name": "ChatGPT",
            "vendor": "OpenAI",
            "domain_patterns": ["*.openai.com", "chat.openai.com"],
            "category": "chat",
            "risk_level": "medium",
            "detection_patterns": {"keywords": ["chatgpt", "openai"]},
            "service_metadata": {"version": "4.0", "api_available": True},
            "is_active": True,
        },
        {
            "name": "Claude",
            "vendor": "Anthropic",
            "domain_patterns": ["claude.ai", "*.anthropic.com"],
            "category": "chat",
            "risk_level": "medium",
            "detection_patterns": {"keywords": ["claude", "anthropic"]},
            "service_metadata": {"version": "3.0", "api_available": True},
            "is_active": True,
        },
        {
            "name": "GitHub Copilot",
            "vendor": "GitHub",
            "domain_patterns": ["github.com"],
            "category": "coding",
            "risk_level": "low",
            "detection_patterns": {"keywords": ["copilot", "github"]},
            "service_metadata": {"version": "2.0", "api_available": True},
            "is_active": True,
        },
    ]

    for svc in ai_services:
        existing = session.execute(
            select(AIService).where(AIService.name == svc["name"])
        ).scalar_one_or_none()
        if not existing:
            session.add(AIService(**svc))
    session.commit()


def seed_compliance_frameworks(session: Session):
    frameworks = [
        {
            "name": "GDPR",
            "description": "General Data Protection Regulation for EU citizens",
            "version": "1.0",
            "regulations": {"privacy": "high", "data_retention": "limited"},
            "requirements": {"consent": True, "right_to_be_forgotten": True},
            "applicable_industries": ["tech", "finance", "healthcare"],
            "is_active": True,
        },
        {
            "name": "SOC2",
            "description": "Service Organization Control 2",
            "version": "2.0",
            "regulations": {
                "security": True,
                "availability": True,
                "processing_integrity": True,
            },
            "requirements": {"access_controls": True, "monitoring": True},
            "applicable_industries": ["Technology", "SaaS", "Cloud"],
            "is_active": True,
        },
        {
            "name": "HIPAA",
            "description": "Health Insurance Portability and Accountability Act",
            "version": "2.0",
            "regulations": {"privacy": "very_high", "data_retention": "long"},
            "requirements": {"encryption": True, "audit_logs": True},
            "applicable_industries": ["healthcare"],
            "is_active": True,
        },
    ]

    for fw in frameworks:
        existing = session.execute(
            select(ComplianceFramework).where(ComplianceFramework.name == fw["name"])
        ).scalar_one_or_none()
        if not existing:
            session.add(ComplianceFramework(**fw))
    session.commit()


def seed_detection_patterns(session: Session):
    patterns = [
        {
            "framework_name": "HIPAA",
            "pattern_type": "regex",
            "pattern_name": "SSN",
            "description": "Social Security Number detection",
            "pattern_data": {"pattern": r"\b\d{3}-?\d{2}-?\d{4}\b", "flags": "i"},
            "severity": "critical",
            "confidence_threshold": 0.95,
            "is_active": True,
        },
        {
            "framework_name": "HIPAA",
            "pattern_type": "regex",
            "pattern_name": "Phone",
            "description": "Phone number detection",
            "pattern_data": {"pattern": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "flags": "i"},
            "severity": "medium",
            "confidence_threshold": 0.85,
            "is_active": True,
        },
        {
            "framework_name": "Financial",
            "pattern_type": "regex",
            "pattern_name": "Credit Card",
            "description": "Credit card number detection",
            "pattern_data": {"pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "flags": "i"},
            "severity": "critical",
            "confidence_threshold": 0.95,
            "is_active": True,
        },
    ]

    for pat in patterns:
        framework = session.execute(
            select(ComplianceFramework).where(ComplianceFramework.name == pat["framework_name"])
        ).scalar_one_or_none()
        if not framework:
            continue  # skip if framework missing

        existing = session.execute(
            select(DetectionPattern).where(
                DetectionPattern.pattern_name == pat["pattern_name"],
                DetectionPattern.framework_id == framework.id
            )
        ).scalar_one_or_none()

        if not existing:
            data = pat.copy()
            data.pop("framework_name")
            session.add(DetectionPattern(framework_id=framework.id, **data))

    session.commit()



if __name__ == "__main__":
    with Session(engine) as session:
        msp, client = set_msp_and_client_data(session, "Example MSP", "Example Client")
        seed_users(session, msp, client)
        print("✅ Database seeding completed successfully!")
        seed_ai_services(session)
        print("ai services seeded properly")
        seed_compliance_frameworks(session)
        print("frameworks seeded properly")
        seed_detection_patterns(session)
        print("print patterns properly")
