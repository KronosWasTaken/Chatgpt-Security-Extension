import asyncio
import uuid
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import (
    Client, ClientMetrics, Alert, DepartmentEngagement, 
    ApplicationEngagement, AgentEngagement, ProductivityCorrelation, 
    ClientAIServices, AIService, MSP, User, ClientPolicy
)
from sqlalchemy import select
from passlib.context import CryptContext

# Create password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Generate a proper bcrypt hash for a password using passlib"""
    return pwd_context.hash(password)

async def seed_minimal_data():
    """Seed the database with minimal data for testing"""
    
    async for session in get_async_session():
        try:
            # Create MSP
            msp = MSP(
                id=uuid.uuid4(),
                name="Test MSP",
                subscription_tier="Enterprise",
                billing_cycle="monthly",
                business_type="MSP",
                contact_info={"email": "admin@testmsp.com"},
                billing_info={"address": "123 Test St"},
                settings={"theme": "light"},
                compliance_requirements={"frameworks": ["NIST"]},
                status="active"
            )
            session.add(msp)
            await session.flush()
            
            # Create test user
            user = User(
                id=uuid.uuid4(),
                msp_id=msp.id,
                name="Test User",
                email="test@testmsp.com",
                hashed_password=hash_password("admin123"),
                department="IT",
                user_type="msp_admin",
                role="Administrator",
                permissions=["read", "write", "admin"]
            )
            session.add(user)
            await session.flush()
            
            # Create test client
            client = Client(
                id=uuid.uuid4(),
                msp_id=msp.id,
                name="Test Client",
                industry="Technology",
                company_size="medium",
                status="active",
                subscription_tier="Professional",
                billing_cycle="monthly",
                business_type="Software Company",
                contact_info={"email": "admin@testclient.com"},
                billing_info={"address": "456 Client St"}
            )
            session.add(client)
            await session.flush()
            
            # Create AI service
            ai_service = AIService(
                id=uuid.uuid4(),
                name="ChatGPT",
                vendor="OpenAI",
                domain_patterns=["*.openai.com"],
                category="LLM",
                risk_level="Medium",
                detection_patterns={"patterns": ["chatgpt"]},
                service_metadata={"description": "ChatGPT by OpenAI"},
                is_active=True
            )
            session.add(ai_service)
            await session.flush()
            
            # Create client AI service
            client_ai_service = ClientAIServices(
                client_id=client.id,
                ai_service_id=ai_service.id,
                name="ChatGPT",
                vendor="OpenAI",
                type="Application",
                status="Permitted",
                users=50,
                avg_daily_interactions=1000,
                integrations=["Slack"],
                risk_tolerance="Medium",
                department_restrictions={},
                approved_at=date.today(),
                approved_by=user.id
            )
            session.add(client_ai_service)
            
            # Create client metrics
            client_metrics = ClientMetrics(
                client_id=client.id,
                date=date.today(),
                apps_monitored=1,
                interactions_monitored=1000,
                agents_deployed=0,
                risk_score=50.0,
                compliance_coverage=80.0
            )
            session.add(client_metrics)
            
            # Create department engagement
            dept_engagement = DepartmentEngagement(
                client_id=client.id,
                date=date.today(),
                department="Engineering",
                interactions=500,
                active_users=25,
                pct_change_vs_prev_7d=10.0
            )
            session.add(dept_engagement)
            
            # Create application engagement
            app_engagement = ApplicationEngagement(
                client_id=client.id,
                date=date.today(),
                application="ChatGPT",
                vendor="OpenAI",
                icon="chatgpt",
                active_users=50,
                interactions_per_day=1000,
                trend_pct_7d=15.0,
                utilization="High",
                recommendation="Continue current usage"
            )
            session.add(app_engagement)
            
            # Create sample alert
            alert = Alert(
                client_id=client.id,
                app="ChatGPT",
                asset_kind="Application",
                family="SENSITIVE_DATA",
                subtype="Secrets",
                severity="Medium",
                details="API key detected in prompt",
                frameworks=["NIST"],
                status="Unassigned"
            )
            session.add(alert)
            
            # Create client policy
            client_policy = ClientPolicy(
                client_id=client.id,
                name="Default Policy",
                rules=[
                    {"id": "pii-1", "category": "PII", "enabled": True, "effect": "Block", "description": "Personal data protection"}
                ],
                yaml="# Default Policy\nname: \"Default Policy\"",
                last_modified="2025-09-28T10:00:00Z",
                is_active=True,
                approved_by=user.id
            )
            session.add(client_policy)
            
            await session.commit()
            print("✅ Minimal test data seeded successfully!")
            print(f"   - MSP: {msp.name}")
            print(f"   - Client: {client.name}")
            print(f"   - User: {user.email}")
            print(f"   - AI Service: {ai_service.name}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error seeding minimal data: {e}")
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(seed_minimal_data())
