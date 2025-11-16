#!/usr/bin/env python3
"""
Database seeding script for Bob's client data
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
from uuid import uuid4

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import async_engine, AsyncSessionLocal
from app.models.base import Base
from app.models.clients import Client, ClientAIServices, ClientAIServiceUsage, Alert
from app.models.engagement import AgentEngagement
from app.models.users import User
from app.models.shared import AIService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt

async def create_bob_client_data():
    """Create comprehensive client data for Bob"""
    
    async with async_engine.begin() as conn:
        # Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        try:
            # Check if Bob's user already exists
            result = await session.execute(select(User).where(User.email == "bob@techcorp.com"))
            bob_user = result.scalar_one_or_none()
            
            if not bob_user:
                # Create Bob's user account
                bob_user = User(
                    email="bob@techcorp.com",
                    name="Bob Johnson",
                    role="client_admin",
                    client_id=None,  # Will be set after client creation
                    department="IT",
                    user_type="client_admin",
                    is_active=True,
                    permissions=["read", "write", "admin"]
                )
                
                # Hash password
                password_hash = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt())
                bob_user.hashed_password = password_hash.decode('utf-8')
                
                session.add(bob_user)
                await session.flush()  # Get the user ID
                print(" Created new user: Bob Johnson")
            else:
                print(" Found existing user: Bob Johnson")
            
            # Check if Bob's client already exists
            client_result = await session.execute(select(Client).where(Client.name == "TechCorp Solutions"))
            bob_client = client_result.scalar_one_or_none()
            
            if not bob_client:
                # Create Bob's client
                bob_client = Client(
                    id=str(uuid4()),
                    name="TechCorp Solutions",
                    industry="Technology",
                    company_size="Medium (100-500 employees)",
                    status="Active",
                    subscription_tier="Professional",
                    apps_monitored=15,
                    interactions_monitored=1250,
                    agents_deployed=8,
                    risk_score=65,
                    compliance_coverage=85,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                session.add(bob_client)
                await session.flush()  # Get the client ID
                print(" Created new client: TechCorp Solutions")
            else:
                print(" Found existing client: TechCorp Solutions")
            
            # Update Bob's user with client_id
            bob_user.client_id = bob_client.id
            await session.flush()
            
            # First create AIService records
            ai_service_records = [
                AIService(
                    id=str(uuid4()),
                    name="ChatGPT Enterprise",
                    vendor="OpenAI",
                    domain_patterns=["openai.com", "chatgpt.com"],
                    category="Text Generation",
                    risk_level="Medium",
                    detection_patterns={"patterns": ["openai_api", "gpt_usage"]},
                    service_metadata={"description": "Advanced AI text generation and conversation", "compliance_notes": "Enterprise-grade security and data handling"}
                ),
                AIService(
                    id=str(uuid4()),
                    name="Claude Pro",
                    vendor="Anthropic",
                    domain_patterns=["anthropic.com", "claude.ai"],
                    category="Text Generation",
                    risk_level="Low",
                    detection_patterns={"patterns": ["anthropic_api", "claude_usage"]},
                    service_metadata={"description": "AI assistant for complex reasoning and analysis", "compliance_notes": "Strong safety measures and constitutional AI"}
                ),
                AIService(
                    id=str(uuid4()),
                    name="GitHub Copilot",
                    vendor="GitHub",
                    domain_patterns=["github.com", "copilot.github.com"],
                    category="Code Generation",
                    risk_level="Low",
                    detection_patterns={"patterns": ["github_copilot", "copilot_usage"]},
                    service_metadata={"description": "AI pair programmer for code completion", "compliance_notes": "Code generation with security considerations"}
                ),
                AIService(
                    id=str(uuid4()),
                    name="Microsoft Copilot",
                    vendor="Microsoft",
                    domain_patterns=["microsoft.com", "office.com"],
                    category="Productivity",
                    risk_level="High",
                    detection_patterns={"patterns": ["microsoft_copilot", "office_ai"]},
                    service_metadata={"description": "AI assistant integrated with Microsoft 365", "compliance_notes": "Requires careful data governance review"}
                ),
                AIService(
                    id=str(uuid4()),
                    name="Jasper AI",
                    vendor="Jasper",
                    domain_patterns=["jasper.ai", "jasper.com"],
                    category="Content Creation",
                    risk_level="Critical",
                    detection_patterns={"patterns": ["jasper_ai", "content_ai"]},
                    service_metadata={"description": "AI-powered content marketing and copywriting", "compliance_notes": "Blocked due to data privacy concerns"}
                )
            ]
            
            for ai_service in ai_service_records:
                session.add(ai_service)
                await session.flush()  # Flush each one individually
            
            # Create AI Services for Bob's client
            ai_services = [
                ClientAIServices(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    name="ChatGPT Enterprise",
                    vendor="OpenAI",
                    type="Application",
                    status="Permitted",
                    users=45,
                    avg_daily_interactions=120,
                    integrations=["Slack", "Microsoft Teams", "Google Workspace"],
                    ai_service_id=ai_service_records[0].id,
                    risk_tolerance="Medium",
                    department_restrictions={"departments": ["IT", "Engineering", "Marketing"]},
                    approved_by=bob_user.id,
                    approved_at=(datetime.utcnow() - timedelta(days=30)).date()
                ),
                ClientAIServices(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    name="Claude Pro",
                    vendor="Anthropic",
                    type="Application",
                    status="Permitted",
                    users=28,
                    avg_daily_interactions=85,
                    integrations=["Notion", "Confluence"],
                    ai_service_id=ai_service_records[1].id,
                    risk_tolerance="Low",
                    department_restrictions={"departments": ["IT", "Engineering", "Research"]},
                    approved_by=bob_user.id,
                    approved_at=(datetime.utcnow() - timedelta(days=25)).date()
                ),
                ClientAIServices(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    name="GitHub Copilot",
                    vendor="GitHub",
                    type="Plugin",
                    status="Permitted",
                    users=35,
                    avg_daily_interactions=200,
                    integrations=["VS Code", "JetBrains IDEs"],
                    ai_service_id=ai_service_records[2].id,
                    risk_tolerance="Low",
                    department_restrictions={"departments": ["Engineering", "IT"]},
                    approved_by=bob_user.id,
                    approved_at=(datetime.utcnow() - timedelta(days=20)).date()
                ),
                ClientAIServices(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    name="Microsoft Copilot",
                    vendor="Microsoft",
                    type="Application",
                    status="Under_Review",
                    users=12,
                    avg_daily_interactions=45,
                    integrations=["Microsoft 365", "Outlook"],
                    ai_service_id=ai_service_records[3].id,
                    risk_tolerance="High",
                    department_restrictions={"departments": []},
                    approved_by=None,
                    approved_at=None
                ),
                ClientAIServices(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    name="Jasper AI",
                    vendor="Jasper",
                    type="Application",
                    status="Blocked",
                    users=0,
                    avg_daily_interactions=0,
                    integrations=["WordPress", "HubSpot"],
                    ai_service_id=ai_service_records[4].id,
                    risk_tolerance="Critical",
                    department_restrictions={"departments": []},
                    approved_by=None,
                    approved_at=None
                )
            ]
            
            for service in ai_services:
                session.add(service)
                await session.flush()  # Flush each one individually
            
            # Create AI Service Usage data
            usage_data = [
                ClientAIServiceUsage(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    ai_service_id=ai_services[0].id,  # ChatGPT
                    user_id=bob_user.id,
                    department="IT",
                    daily_interactions=45,
                    total_interactions=1250
                ),
                ClientAIServiceUsage(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    ai_service_id=ai_services[1].id,  # Claude
                    user_id=bob_user.id,
                    department="IT",
                    daily_interactions=32,
                    total_interactions=850
                ),
                ClientAIServiceUsage(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    ai_service_id=ai_services[2].id,  # GitHub Copilot
                    user_id=bob_user.id,
                    department="Engineering",
                    daily_interactions=150,
                    total_interactions=5000
                )
            ]
            
            for usage in usage_data:
                session.add(usage)
                await session.flush()  # Flush each one individually
            
            # Create Agent Engagement data
            agent_engagements = [
                AgentEngagement(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    date=(datetime.utcnow() - timedelta(days=1)).date(),
                    agent="Code Assistant",
                    vendor="OpenAI",
                    icon="code",
                    deployed=1,
                    avg_prompts_per_day=25,
                    flagged_actions=2,
                    trend_pct_7d=15.5,
                    status="Rising",
                    last_activity_iso=datetime.utcnow().isoformat(),
                    associated_apps=["VS Code", "GitHub"]
                ),
                AgentEngagement(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    date=(datetime.utcnow() - timedelta(days=2)).date(),
                    agent="Documentation Writer",
                    vendor="Anthropic",
                    icon="file-text",
                    deployed=1,
                    avg_prompts_per_day=15,
                    flagged_actions=0,
                    trend_pct_7d=8.2,
                    status="Stable",
                    last_activity_iso=(datetime.utcnow() - timedelta(hours=2)).isoformat(),
                    associated_apps=["Notion", "Confluence"]
                ),
                AgentEngagement(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    date=(datetime.utcnow() - timedelta(days=3)).date(),
                    agent="Data Analyst",
                    vendor="Microsoft",
                    icon="bar-chart",
                    deployed=1,
                    avg_prompts_per_day=40,
                    flagged_actions=1,
                    trend_pct_7d=22.8,
                    status="Rising",
                    last_activity_iso=(datetime.utcnow() - timedelta(hours=1)).isoformat(),
                    associated_apps=["Excel", "Power BI"]
                )
            ]
            
            for engagement in agent_engagements:
                session.add(engagement)
                await session.flush()  # Flush each one individually
            
            # Create Alerts for Bob's client
            alerts = [
                Alert(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    ai_service_id=ai_services[3].id,  # Microsoft Copilot
                    app="Microsoft Copilot",
                    asset_kind="Application",
                    family="Compliance",
                    subtype="Unapproved Usage",
                    severity="High",
                    status="Pending",
                    users_affected=3,
                    count=15,
                    details="Microsoft Copilot is being used without proper approval",
                    frameworks=["SOX", "GDPR"]
                ),
                Alert(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    ai_service_id=ai_services[4].id,  # Jasper AI
                    app="Jasper AI",
                    asset_kind="Application",
                    family="Security",
                    subtype="Blocked Tool Access",
                    severity="Critical",
                    status="Complete",
                    users_affected=1,
                    count=1,
                    details="Attempted access to blocked Jasper AI tool",
                    frameworks=["Security Policy"]
                ),
                Alert(
                    id=str(uuid4()),
                    client_id=bob_client.id,
                    ai_service_id=ai_services[0].id,  # ChatGPT
                    app="ChatGPT Enterprise",
                    asset_kind="Application",
                    family="Usage",
                    subtype="High Usage",
                    severity="Medium",
                    status="Unassigned",
                    users_affected=5,
                    count=85,
                    details="ChatGPT usage approaching daily limit",
                    frameworks=["Usage Policy"]
                )
            ]
            
            for alert in alerts:
                session.add(alert)
                await session.flush()  # Flush each one individually
            
            await session.commit()
            
            print(" Successfully seeded Bob's client data!")
            print(f"   - Client: {bob_client.name} (ID: {bob_client.id})")
            print(f"   - User: {bob_user.name} (Email: {bob_user.email})")
            print(f"   - AI Services: {len(ai_services)}")
            print(f"   - Usage Records: {len(usage_data)}")
            print(f"   - Agent Engagements: {len(agent_engagements)}")
            print(f"   - Alerts: {len(alerts)}")
            print(f"\n Login credentials:")
            print(f"   Email: {bob_user.email}")
            print(f"   Password: password123")
            
        except Exception as e:
            await session.rollback()
            print(f" Error seeding data: {e}")
            raise

async def main():
    """Main function to run the seeding script"""
    print(" Starting database seeding for Bob's client data...")
    await create_bob_client_data()
    print(" Database seeding completed!")

if __name__ == "__main__":
    asyncio.run(main())
