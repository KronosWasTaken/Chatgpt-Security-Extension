#!/usr/bin/env python3
"""
Comprehensive mock data seeding script for the AI Compliance Platform
Seeds all necessary data including MSPs, clients, users, AI services, applications, and more.
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import (
    MSP, User, Client, ClientAIServices, AIService, ClientMetrics, Alert,
    AgentEngagement, UserEngagement, ProductivityCorrelation, ClientPolicy,
    ClientComplianceReport, PortfolioValueReport, ComplianceFramework,
    DetectionPattern, ClientAIServiceUsage, MSPAuditSummary
)
from sqlalchemy import select
from passlib.context import CryptContext

# Create password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

async def seed_msp_data(session: AsyncSession):
    """Seed MSP data"""
    print("🏢 Seeding MSP data...")
    
    msp_data = {
        "name": "Cybercept MSP",
        "subscription_tier": "Enterprise",
        "billing_cycle": "Monthly",
        "business_type": "MSP",
        "contact_info": {
            "email": "admin@cybercept.com",
            "phone": "+1-555-0123",
            "address": "123 Security Blvd, Cyber City, CC 12345"
        },
        "billing_info": {
            "billing_email": "billing@cybercept.com",
            "payment_method": "Credit Card",
            "billing_address": "123 Security Blvd, Cyber City, CC 12345"
        },
        "settings": {
            "max_clients": 100,
            "features_enabled": ["compliance_monitoring", "ai_detection", "audit_logging"]
        },
        "compliance_requirements": ["SOC2", "ISO27001"],
        "status": "active"
    }
    
    # Check if MSP already exists
    existing_msp = await session.execute(select(MSP).where(MSP.name == msp_data["name"]))
    msp = existing_msp.scalar_one_or_none()
    
    if not msp:
        msp = MSP(**msp_data)
        session.add(msp)
        await session.commit()
        await session.refresh(msp)
        print(f"  ✅ Created MSP: {msp.name}")
    else:
        print(f"  ✅ MSP already exists: {msp.name}")
    
    return msp

async def seed_users(session: AsyncSession, msp_id: uuid.UUID):
    """Seed user data"""
    print("👥 Seeding users...")
    
    users_data = [
        {
            "name": "John Admin",
            "email": "admin@cybercept.com",
            "hashed_password": hash_password("admin123"),
            "department": "IT",
            "user_type": "msp",
            "is_active": True,
            "msp_id": msp_id,
            "client_id": None,
            "role": "msp_admin",
            "permissions": ["read", "write", "admin", "compliance"]
        },
        {
            "name": "Jane User",
            "email": "user@cybercept.com",
            "hashed_password": hash_password("user123"),
            "department": "Operations",
            "user_type": "msp",
            "is_active": True,
            "msp_id": msp_id,
            "client_id": None,
            "role": "msp_user",
            "permissions": ["read", "write"]
        },
        {
            "name": "Mike Analyst",
            "email": "analyst@cybercept.com",
            "hashed_password": hash_password("analyst123"),
            "department": "Analytics",
            "user_type": "msp",
            "is_active": True,
            "msp_id": msp_id,
            "client_id": None,
            "role": "msp_user",
            "permissions": ["read", "write", "analytics"]
        }
    ]
    
    users = []
    for user_data in users_data:
        # Check if user exists
        existing_user = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = existing_user.scalar_one_or_none()
        
        if not user:
            user = User(**user_data)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"  ✅ Created user: {user.email}")
        else:
            print(f"  ✅ User already exists: {user.email}")
        
        users.append(user)
    
    return users

async def seed_ai_services(session: AsyncSession):
    """Seed AI services data"""
    print("🤖 Seeding AI services...")
    
    ai_services_data = [
        {
            "name": "ChatGPT",
            "vendor": "OpenAI",
            "domain_patterns": ["openai.com", "chat.openai.com"],
            "category": "Text Generation",
            "risk_level": "Medium",
            "detection_patterns": {
                "keywords": ["chatgpt", "openai", "gpt"],
                "domains": ["openai.com", "chat.openai.com"]
            },
            "service_metadata": {
                "version": "4.0",
                "api_endpoints": ["https://api.openai.com/v1/chat/completions"],
                "data_retention": "30 days"
            },
            "is_active": True
        },
        {
            "name": "Claude",
            "vendor": "Anthropic",
            "domain_patterns": ["claude.ai", "anthropic.com"],
            "category": "Text Generation",
            "risk_level": "Medium",
            "detection_patterns": {
                "keywords": ["claude", "anthropic"],
                "domains": ["claude.ai", "anthropic.com"]
            },
            "service_metadata": {
                "version": "3.5",
                "api_endpoints": ["https://api.anthropic.com/v1/messages"],
                "data_retention": "30 days"
            },
            "is_active": True
        },
        {
            "name": "Microsoft Copilot",
            "vendor": "Microsoft",
            "domain_patterns": ["copilot.microsoft.com", "office.com"],
            "category": "Productivity",
            "risk_level": "Low",
            "detection_patterns": {
                "keywords": ["copilot", "microsoft", "office"],
                "domains": ["copilot.microsoft.com", "office.com"]
            },
            "service_metadata": {
                "version": "1.0",
                "integrations": ["Office 365", "Teams", "Outlook"],
                "data_retention": "90 days"
            },
            "is_active": True
        },
        {
            "name": "Jasper",
            "vendor": "Jasper",
            "domain_patterns": ["jasper.ai"],
            "category": "Content Creation",
            "risk_level": "Low",
            "detection_patterns": {
                "keywords": ["jasper", "content", "writing"],
                "domains": ["jasper.ai"]
            },
            "service_metadata": {
                "version": "2.0",
                "templates": ["blog", "email", "social"],
                "data_retention": "60 days"
            },
            "is_active": True
        },
        {
            "name": "Notion AI",
            "vendor": "Notion",
            "domain_patterns": ["notion.so", "notion.site"],
            "category": "Productivity",
            "risk_level": "Low",
            "detection_patterns": {
                "keywords": ["notion", "ai", "workspace"],
                "domains": ["notion.so", "notion.site"]
            },
            "service_metadata": {
                "version": "1.0",
                "features": ["writing", "summarization", "translation"],
                "data_retention": "Unlimited"
            },
            "is_active": True
        },
        {
            "name": "Perplexity",
            "vendor": "Perplexity",
            "domain_patterns": ["perplexity.ai"],
            "category": "Research",
            "risk_level": "Medium",
            "detection_patterns": {
                "keywords": ["perplexity", "research", "search"],
                "domains": ["perplexity.ai"]
            },
            "service_metadata": {
                "version": "1.0",
                "features": ["research", "citations", "real-time"],
                "data_retention": "30 days"
            },
            "is_active": True
        }
    ]
    
    ai_services = []
    for service_data in ai_services_data:
        # Check if service exists
        existing_service = await session.execute(
            select(AIService).where(
                AIService.name == service_data["name"],
                AIService.vendor == service_data["vendor"]
            )
        )
        service = existing_service.scalar_one_or_none()
        
        if not service:
            service = AIService(**service_data)
            session.add(service)
            await session.commit()
            await session.refresh(service)
            print(f"  ✅ Created AI service: {service.name} by {service.vendor}")
        else:
            print(f"  ✅ AI service already exists: {service.name}")
        
        ai_services.append(service)
    
    return ai_services

async def seed_clients(session: AsyncSession, msp_id: uuid.UUID):
    """Seed client data"""
    print("🏢 Seeding clients...")
    
    clients_data = [
        {
            "name": "TechCorp Solutions",
            "industry": "Technology",
            "company_size": "Medium",
            "status": "active",
            "subscription_tier": "Professional",
            "billing_cycle": "Monthly",
            "business_type": "B2B",
            "contact_info": {
                "email": "it@techcorp.com",
                "phone": "+1-555-1001",
                "address": "456 Innovation Drive, Tech City, TC 54321"
            },
            "billing_info": {
                "billing_email": "billing@techcorp.com",
                "payment_method": "Credit Card"
            },
            "msp_id": msp_id
        },
        {
            "name": "FinanceFirst Bank",
            "industry": "Financial Services",
            "company_size": "Large",
            "status": "active",
            "subscription_tier": "Enterprise",
            "billing_cycle": "Monthly",
            "business_type": "B2C",
            "contact_info": {
                "email": "compliance@financefirst.com",
                "phone": "+1-555-2002",
                "address": "789 Wall Street, Finance City, FC 67890"
            },
            "billing_info": {
                "billing_email": "billing@financefirst.com",
                "payment_method": "Bank Transfer"
            },
            "msp_id": msp_id
        },
        {
            "name": "HealthCare Plus",
            "industry": "Healthcare",
            "company_size": "Medium",
            "status": "active",
            "subscription_tier": "Professional",
            "billing_cycle": "Monthly",
            "business_type": "B2C",
            "contact_info": {
                "email": "privacy@healthcareplus.com",
                "phone": "+1-555-3003",
                "address": "321 Medical Center, Health City, HC 13579"
            },
            "billing_info": {
                "billing_email": "billing@healthcareplus.com",
                "payment_method": "Credit Card"
            },
            "msp_id": msp_id
        },
        {
            "name": "RetailMax Stores",
            "industry": "Retail",
            "company_size": "Large",
            "status": "active",
            "subscription_tier": "Enterprise",
            "billing_cycle": "Monthly",
            "business_type": "B2C",
            "contact_info": {
                "email": "security@retailmax.com",
                "phone": "+1-555-4004",
                "address": "654 Commerce Ave, Retail City, RC 24680"
            },
            "billing_info": {
                "billing_email": "billing@retailmax.com",
                "payment_method": "Credit Card"
            },
            "msp_id": msp_id
        }
    ]
    
    clients = []
    for client_data in clients_data:
        # Check if client exists
        existing_client = await session.execute(
            select(Client).where(Client.name == client_data["name"])
        )
        client = existing_client.scalar_one_or_none()
        
        if not client:
            client = Client(**client_data)
            session.add(client)
            await session.commit()
            await session.refresh(client)
            print(f"  ✅ Created client: {client.name}")
        else:
            print(f"  ✅ Client already exists: {client.name}")
        
        clients.append(client)
    
    return clients

async def seed_client_users(session: AsyncSession, clients):
    """Seed client users"""
    print("👥 Seeding client users...")
    
    client_users_data = [
        # TechCorp Solutions users
        {
            "client_name": "TechCorp Solutions",
            "name": "Alice Engineer",
            "email": "alice@techcorp.com",
            "hashed_password": hash_password("password123"),
            "department": "Engineering",
            "user_type": "client",
            "is_active": True,
            "msp_id": None,
            "role": "client_user",
            "permissions": ["read", "write"]
        },
        {
            "client_name": "TechCorp Solutions",
            "name": "Bob Manager",
            "email": "bob@techcorp.com",
            "hashed_password": hash_password("password123"),
            "department": "Management",
            "user_type": "client",
            "is_active": True,
            "msp_id": None,
            "role": "client_admin",
            "permissions": ["read", "write", "admin"]
        },
        # FinanceFirst Bank users
        {
            "client_name": "FinanceFirst Bank",
            "name": "Carol Compliance",
            "email": "carol@financefirst.com",
            "hashed_password": hash_password("password123"),
            "department": "Compliance",
            "user_type": "client",
            "is_active": True,
            "msp_id": None,
            "role": "client_admin",
            "permissions": ["read", "write", "admin", "compliance"]
        },
        {
            "client_name": "FinanceFirst Bank",
            "name": "David Operations",
            "email": "david@financefirst.com",
            "hashed_password": hash_password("password123"),
            "department": "Operations",
            "user_type": "client",
            "is_active": True,
            "msp_id": None,
            "role": "client_user",
            "permissions": ["read", "write"]
        }
    ]
    
    client_map = {client.name: client for client in clients}
    users = []
    
    for user_data in client_users_data:
        client = client_map.get(user_data["client_name"])
        if not client:
            continue
            
        # Check if user exists
        existing_user = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = existing_user.scalar_one_or_none()
        
        if not user:
            user_data_copy = user_data.copy()
            del user_data_copy["client_name"]
            user_data_copy["client_id"] = client.id
            
            user = User(**user_data_copy)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"  ✅ Created client user: {user.email} for {client.name}")
        else:
            print(f"  ✅ Client user already exists: {user.email}")
        
        users.append(user)
    
    return users

async def seed_client_ai_applications(session: AsyncSession, clients, ai_services):
    """Seed client AI applications"""
    print("📱 Seeding client AI applications...")
    
    applications_data = [
        # TechCorp Solutions
        {
            "client_name": "TechCorp Solutions",
            "name": "ChatGPT Enterprise",
            "vendor": "OpenAI",
            "type": "Application",
            "status": "Permitted",
            "users": 45,
            "avg_daily_interactions": 200,
            "integrations": ["Slack", "Microsoft Teams", "Jira"],
            "risk_tolerance": "Medium",
            "department_restrictions": {
                "allowed_departments": ["Engineering", "Product", "Marketing"],
                "restricted_departments": ["Finance", "HR"]
            },
            "approved_at": date.today() - timedelta(days=30),
            "approved_by": None
        },
        {
            "client_name": "TechCorp Solutions",
            "name": "Claude for Work",
            "vendor": "Anthropic",
            "type": "Application",
            "status": "Permitted",
            "users": 25,
            "avg_daily_interactions": 120,
            "integrations": ["Notion", "Confluence"],
            "risk_tolerance": "Medium",
            "department_restrictions": {
                "allowed_departments": ["Engineering", "Product"],
                "restricted_departments": []
            },
            "approved_at": date.today() - timedelta(days=15),
            "approved_by": None
        },
        # FinanceFirst Bank
        {
            "client_name": "FinanceFirst Bank",
            "name": "Microsoft Copilot",
            "vendor": "Microsoft",
            "type": "Application",
            "status": "Permitted",
            "users": 80,
            "avg_daily_interactions": 300,
            "integrations": ["Office 365", "Teams", "Outlook"],
            "risk_tolerance": "Low",
            "department_restrictions": {
                "allowed_departments": ["Operations", "Customer Service"],
                "restricted_departments": ["Trading", "Risk Management"]
            },
            "approved_at": date.today() - timedelta(days=45),
            "approved_by": None
        },
        # HealthCare Plus
        {
            "client_name": "HealthCare Plus",
            "name": "Notion AI",
            "vendor": "Notion",
            "type": "Application",
            "status": "Permitted",
            "users": 30,
            "avg_daily_interactions": 80,
            "integrations": ["Epic", "Cerner"],
            "risk_tolerance": "Low",
            "department_restrictions": {
                "allowed_departments": ["Administration", "Research"],
                "restricted_departments": ["Clinical", "Patient Care"]
            },
            "approved_at": date.today() - timedelta(days=20),
            "approved_by": None
        },
        # RetailMax Stores
        {
            "client_name": "RetailMax Stores",
            "name": "Jasper AI",
            "vendor": "Jasper",
            "type": "Application",
            "status": "Permitted",
            "users": 60,
            "avg_daily_interactions": 150,
            "integrations": ["Shopify", "Mailchimp", "Hootsuite"],
            "risk_tolerance": "Low",
            "department_restrictions": {
                "allowed_departments": ["Marketing", "Content"],
                "restricted_departments": ["Finance", "Legal"]
            },
            "approved_at": date.today() - timedelta(days=10),
            "approved_by": None
        }
    ]
    
    # Create a mapping of client names to client objects
    client_map = {client.name: client for client in clients}
    
    applications = []
    for app_data in applications_data:
        client = client_map.get(app_data["client_name"])
        if not client:
            continue
            
        # Find matching AI service
        ai_service = None
        for service in ai_services:
            if service.name == app_data["name"] and service.vendor == app_data["vendor"]:
                ai_service = service
                break
        
        if not ai_service:
            continue
        
        # Check if application already exists
        existing_app = await session.execute(
            select(ClientAIServices).where(
                ClientAIServices.client_id == client.id,
                ClientAIServices.name == app_data["name"],
                ClientAIServices.vendor == app_data["vendor"]
            )
        )
        application = existing_app.scalar_one_or_none()
        
        if not application:
            app_data_copy = app_data.copy()
            del app_data_copy["client_name"]
            app_data_copy["client_id"] = client.id
            app_data_copy["ai_service_id"] = ai_service.id
            
            application = ClientAIServices(**app_data_copy)
            session.add(application)
            await session.commit()
            await session.refresh(application)
            print(f"  ✅ Created application: {application.name} for {client.name}")
        else:
            print(f"  ✅ Application already exists: {application.name} for {client.name}")
        
        applications.append(application)
    
    return applications

async def seed_client_usage_data(session: AsyncSession, clients, ai_services, users):
    """Seed client AI service usage data"""
    print("📊 Seeding client usage data...")
    
    # Get client users for usage data
    client_users = [user for user in users if user.client_id is not None]
    
    # Generate usage data for the last 30 days
    usage_data = []
    for client in clients:
        client_user_list = [user for user in client_users if user.client_id == client.id]
        if not client_user_list:
            continue
            
        for service in ai_services:
            for days_ago in range(30):
                usage_date = date.today() - timedelta(days=days_ago)
                
                # Generate realistic usage patterns
                base_interactions = 50 + (hash(str(client.id) + str(service.id)) % 200)
                daily_interactions = base_interactions + (hash(str(usage_date)) % 100)
                
                # Add some departments
                departments = ["Engineering", "Sales", "Marketing", "Support", "Finance"]
                department = departments[hash(str(client.id) + str(usage_date)) % len(departments)]
                
                # Pick a random user from this client
                user = client_user_list[hash(str(usage_date)) % len(client_user_list)]
                
                usage_entry = {
                    "client_id": client.id,
                    "ai_service_id": service.id,
                    "user_id": user.id,
                    "department": department,
                    "daily_interactions": daily_interactions,
                    "total_interactions": daily_interactions * (30 - days_ago),
                    "created_at": datetime.combine(usage_date, datetime.min.time())
                }
                
                usage_data.append(usage_entry)
    
    # Add usage data in batches
    batch_size = 100
    for i in range(0, len(usage_data), batch_size):
        batch = usage_data[i:i + batch_size]
        for usage in batch:
            usage_obj = ClientAIServiceUsage(**usage)
            session.add(usage_obj)
        
        await session.commit()
        print(f"  ✅ Added usage batch {i//batch_size + 1}/{(len(usage_data) + batch_size - 1)//batch_size}")
    
    print(f"  ✅ Created {len(usage_data)} usage records")

async def seed_agent_engagement(session: AsyncSession, clients):
    """Seed agent engagement data"""
    print("🤖 Seeding agent engagement data...")
    
    agents_data = [
        {
            "client_name": "TechCorp Solutions",
            "agent": "Code Review Assistant",
            "vendor": "Internal",
            "icon": "bot",
            "deployed": 8,
            "avg_prompts_per_day": 45,
            "flagged_actions": 2,
            "trend_pct_7d": 15.0,
            "status": "Rising",
            "last_activity_iso": "2024-01-15T14:30:00Z",
            "associated_apps": ["ChatGPT Enterprise", "Claude for Work"]
        },
        {
            "client_name": "FinanceFirst Bank",
            "agent": "Compliance Checker",
            "vendor": "Internal",
            "icon": "shield",
            "deployed": 5,
            "avg_prompts_per_day": 25,
            "flagged_actions": 0,
            "trend_pct_7d": 8.0,
            "status": "Stable",
            "last_activity_iso": "2024-01-15T10:15:00Z",
            "associated_apps": ["Microsoft Copilot"]
        },
        {
            "client_name": "HealthCare Plus",
            "agent": "Document Summarizer",
            "vendor": "Internal",
            "icon": "file-text",
            "deployed": 3,
            "avg_prompts_per_day": 15,
            "flagged_actions": 1,
            "trend_pct_7d": -5.0,
            "status": "Dormant",
            "last_activity_iso": "2024-01-10T09:45:00Z",
            "associated_apps": ["Notion AI"]
        }
    ]
    
    client_map = {client.name: client for client in clients}
    
    for agent_data in agents_data:
        client = client_map.get(agent_data["client_name"])
        if not client:
            continue
        
        # Check if agent already exists
        existing_agent = await session.execute(
            select(AgentEngagement).where(
                AgentEngagement.client_id == client.id,
                AgentEngagement.agent == agent_data["agent"],
                AgentEngagement.date == date.today()
            )
        )
        agent = existing_agent.scalar_one_or_none()
        
        if not agent:
            agent_data_copy = agent_data.copy()
            del agent_data_copy["client_name"]
            agent_data_copy["client_id"] = client.id
            agent_data_copy["date"] = date.today()
            
            agent = AgentEngagement(**agent_data_copy)
            session.add(agent)
            await session.commit()
            await session.refresh(agent)
            print(f"  ✅ Created agent: {agent.agent} for {client.name}")
        else:
            print(f"  ✅ Agent already exists: {agent.agent} for {client.name}")

async def seed_user_engagement(session: AsyncSession, clients, users):
    """Seed user engagement data"""
    print("👤 Seeding user engagement data...")
    
    client_users = [user for user in users if user.client_id is not None]
    
    for user in client_users:
        client = next((c for c in clients if c.id == user.client_id), None)
        if not client:
            continue
            
        # Check if user engagement already exists
        existing_engagement = await session.execute(
            select(UserEngagement).where(
                UserEngagement.client_id == client.id,
                UserEngagement.user_id == user.id,
                UserEngagement.date == date.today()
            )
        )
        engagement = existing_engagement.scalar_one_or_none()
        
        if not engagement:
            engagement_data = {
                "client_id": client.id,
                "user_id": user.id,
                "date": date.today(),
                "name": user.name,
                "department": user.department,
                "avg_daily_interactions": 25 + (hash(str(user.id)) % 50),
                "delta_7d_pct": (hash(str(user.id)) % 40) - 20  # -20 to +20
            }
            
            engagement = UserEngagement(**engagement_data)
            session.add(engagement)
            await session.commit()
            await session.refresh(engagement)
            print(f"  ✅ Created user engagement: {user.name} for {client.name}")
        else:
            print(f"  ✅ User engagement already exists: {user.name}")

async def seed_productivity_correlations(session: AsyncSession, clients):
    """Seed productivity correlations data"""
    print("📈 Seeding productivity correlations...")
    
    departments = ["Engineering", "Sales", "Marketing", "Support", "Finance"]
    
    for client in clients:
        for department in departments:
            # Check if productivity correlation already exists
            existing_correlation = await session.execute(
                select(ProductivityCorrelation).where(
                    ProductivityCorrelation.client_id == client.id,
                    ProductivityCorrelation.department == department,
                    ProductivityCorrelation.date == date.today()
                )
            )
            correlation = existing_correlation.scalar_one_or_none()
            
            if not correlation:
                # Generate 7 days of data
                ai_interactions = [20 + (hash(str(client.id) + department + str(i)) % 30) for i in range(7)]
                output_metrics = [100 + (hash(str(client.id) + department + str(i)) % 50) for i in range(7)]
                
                correlation_data = {
                    "client_id": client.id,
                    "department": department,
                    "date": date.today(),
                    "ai_interactions_7d": ai_interactions,
                    "output_metric_7d": output_metrics,
                    "note": f"Productivity correlation for {department} department"
                }
                
                correlation = ProductivityCorrelation(**correlation_data)
                session.add(correlation)
                await session.commit()
                await session.refresh(correlation)
                print(f"  ✅ Created productivity correlation: {department} for {client.name}")
            else:
                print(f"  ✅ Productivity correlation already exists: {department} for {client.name}")

async def seed_compliance_frameworks(session: AsyncSession):
    """Seed compliance frameworks"""
    print("🛡️ Seeding compliance frameworks...")
    
    frameworks_data = [
        {
            "name": "HIPAA",
            "description": "Health Insurance Portability and Accountability Act - Protects health information privacy and security",
            "version": "2023",
            "regulations": {
                "privacy_rule": "45 CFR 164.500-534",
                "security_rule": "45 CFR 164.302-318",
                "breach_notification": "45 CFR 164.400-414"
            },
            "requirements": {
                "administrative_safeguards": ["Security Officer", "Workforce Training", "Access Management"],
                "physical_safeguards": ["Facility Access Controls", "Workstation Use", "Device Controls"],
                "technical_safeguards": ["Access Control", "Audit Controls", "Integrity", "Transmission Security"]
            },
            "applicable_industries": ["Healthcare", "Insurance", "Pharmaceuticals"],
            "is_active": True
        },
        {
            "name": "GDPR",
            "description": "General Data Protection Regulation - EU data protection and privacy law",
            "version": "2018",
            "regulations": {
                "data_processing": "Article 6 - Lawfulness of processing",
                "data_subject_rights": "Articles 15-22 - Rights of the data subject",
                "data_protection_officer": "Article 37 - Designation of the data protection officer"
            },
            "requirements": {
                "principles": ["Lawfulness", "Fairness", "Transparency", "Purpose limitation"],
                "rights": ["Right of access", "Right to rectification", "Right to erasure", "Right to portability"],
                "obligations": ["Data protection by design", "Data protection impact assessments", "Breach notification"]
            },
            "applicable_industries": ["All industries processing EU data"],
            "is_active": True
        },
        {
            "name": "PCI DSS",
            "description": "Payment Card Industry Data Security Standard - Security standards for payment card data",
            "version": "4.0",
            "regulations": {
                "build_secure": "Requirement 1-4 - Build and maintain secure networks and systems",
                "protect_data": "Requirement 3-4 - Protect cardholder data",
                "maintain_vulnerability": "Requirement 5-6 - Maintain vulnerability management program"
            },
            "requirements": {
                "network_security": ["Firewall configuration", "Default password protection", "Network segmentation"],
                "data_protection": ["Data encryption", "Secure transmission", "Data retention policies"],
                "access_control": ["Unique user IDs", "Strong authentication", "Physical access restrictions"]
            },
            "applicable_industries": ["Retail", "E-commerce", "Financial Services"],
            "is_active": True
        }
    ]
    
    frameworks = []
    for framework_data in frameworks_data:
        # Check if framework exists
        existing_framework = await session.execute(
            select(ComplianceFramework).where(ComplianceFramework.name == framework_data["name"])
        )
        framework = existing_framework.scalar_one_or_none()
        
        if not framework:
            framework = ComplianceFramework(**framework_data)
            session.add(framework)
            await session.commit()
            await session.refresh(framework)
            print(f"  ✅ Created framework: {framework.name}")
        else:
            print(f"  ✅ Framework already exists: {framework.name}")
        
        frameworks.append(framework)
    
    return frameworks

async def seed_detection_patterns(session: AsyncSession, frameworks):
    """Seed detection patterns"""
    print("🔍 Seeding detection patterns...")
    
    patterns_data = [
        {
            "framework_name": "HIPAA",
            "pattern_type": "regex",
            "pattern_name": "SSN",
            "description": "Social Security Number detection",
            "pattern_data": {"pattern": r"\b\d{3}-?\d{2}-?\d{4}\b", "flags": "i"},
            "severity": "critical",
            "confidence_threshold": 0.95,
            "context_rules": {"context_keywords": ["ssn", "social security", "tax id"]},
            "is_active": True
        },
        {
            "framework_name": "HIPAA",
            "pattern_type": "regex",
            "pattern_name": "Medical Record Number",
            "description": "Medical record number detection",
            "pattern_data": {"pattern": r"\bMRN[:\s]*\d{6,12}\b", "flags": "i"},
            "severity": "high",
            "confidence_threshold": 0.90,
            "context_rules": {"context_keywords": ["medical record", "patient", "mrn"]},
            "is_active": True
        },
        {
            "framework_name": "GDPR",
            "pattern_type": "regex",
            "pattern_name": "Email Address",
            "description": "Email address detection for personal data",
            "pattern_data": {"pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "flags": "i"},
            "severity": "medium",
            "confidence_threshold": 0.85,
            "context_rules": {"context_keywords": ["email", "contact", "personal"]},
            "is_active": True
        },
        {
            "framework_name": "PCI DSS",
            "pattern_type": "regex",
            "pattern_name": "Credit Card Number",
            "description": "Credit card number detection",
            "pattern_data": {"pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "flags": "i"},
            "severity": "critical",
            "confidence_threshold": 0.98,
            "context_rules": {"context_keywords": ["credit card", "payment", "card number"]},
            "is_active": True
        }
    ]
    
    framework_map = {fw.name: fw for fw in frameworks}
    
    for pattern_data in patterns_data:
        framework = framework_map.get(pattern_data["framework_name"])
        if not framework:
            continue
            
        # Check if pattern exists
        existing_pattern = await session.execute(
            select(DetectionPattern).where(
                DetectionPattern.pattern_name == pattern_data["pattern_name"],
                DetectionPattern.framework_id == framework.id
            )
        )
        pattern = existing_pattern.scalar_one_or_none()
        
        if not pattern:
            pattern_data_copy = pattern_data.copy()
            del pattern_data_copy["framework_name"]
            pattern_data_copy["framework_id"] = framework.id
            
            pattern = DetectionPattern(**pattern_data_copy)
            session.add(pattern)
            await session.commit()
            await session.refresh(pattern)
            print(f"  ✅ Created pattern: {pattern.pattern_name} for {framework.name}")
        else:
            print(f"  ✅ Pattern already exists: {pattern.pattern_name}")

async def seed_alerts(session: AsyncSession, clients):
    """Seed alert data"""
    print("🚨 Seeding alerts...")
    
    alerts_data = [
        {
            "client_name": "TechCorp Solutions",
            "app": "ChatGPT Enterprise",
            "asset_kind": "Application",
            "family": "Usage Anomaly",
            "subtype": "High Usage",
            "severity": "Medium",
            "users_affected": 15,
            "count": 1,
            "details": "ChatGPT usage increased by 150% in Engineering department",
            "frameworks": ["SOC2"],
            "status": "Unassigned"
        },
        {
            "client_name": "FinanceFirst Bank",
            "app": "Microsoft Copilot",
            "asset_kind": "Application",
            "family": "Data Leakage",
            "subtype": "Sensitive Data",
            "severity": "High",
            "users_affected": 3,
            "count": 1,
            "details": "Sensitive financial data detected in AI prompt",
            "frameworks": ["PCI-DSS", "SOX"],
            "status": "Pending"
        },
        {
            "client_name": "HealthCare Plus",
            "app": "Notion AI",
            "asset_kind": "Application",
            "family": "Compliance Violation",
            "subtype": "Patient Data",
            "severity": "Critical",
            "users_affected": 1,
            "count": 1,
            "details": "Patient data found in AI conversation",
            "frameworks": ["HIPAA"],
            "status": "Complete"
        }
    ]
    
    client_map = {client.name: client for client in clients}
    
    for alert_data in alerts_data:
        client = client_map.get(alert_data["client_name"])
        if not client:
            continue
        
        # Check if alert already exists
        existing_alert = await session.execute(
            select(Alert).where(
                Alert.client_id == client.id,
                Alert.details == alert_data["details"]
            )
        )
        alert = existing_alert.scalar_one_or_none()
        
        if not alert:
            alert_data_copy = alert_data.copy()
            del alert_data_copy["client_name"]
            alert_data_copy["client_id"] = client.id
            
            alert = Alert(**alert_data_copy)
            session.add(alert)
            await session.commit()
            await session.refresh(alert)
            print(f"  ✅ Created alert: {alert.family} for {client.name}")
        else:
            print(f"  ✅ Alert already exists: {alert.family}")

async def seed_client_metrics(session: AsyncSession, clients):
    """Seed client metrics data"""
    print("📊 Seeding client metrics...")
    
    for client in clients:
        # Check if metrics already exist for today
        existing_metrics = await session.execute(
            select(ClientMetrics).where(
                ClientMetrics.client_id == client.id,
                ClientMetrics.date == date.today()
            )
        )
        metrics = existing_metrics.scalar_one_or_none()
        
        if not metrics:
            metrics_data = {
                "client_id": client.id,
                "date": date.today(),
                "apps_monitored": 2 + (hash(str(client.id)) % 3),
                "interactions_monitored": 100 + (hash(str(client.id)) % 500),
                "agents_deployed": 1 + (hash(str(client.id)) % 2),
                "risk_score": 2.5 + (hash(str(client.id)) % 5.0),
                "compliance_coverage": 75.0 + (hash(str(client.id)) % 20.0)
            }
            
            metrics = ClientMetrics(**metrics_data)
            session.add(metrics)
            await session.commit()
            await session.refresh(metrics)
            print(f"  ✅ Created metrics for {client.name}")
        else:
            print(f"  ✅ Metrics already exist for {client.name}")

async def main():
    """Main seeding function"""
    print("🌱 Starting comprehensive mock data seeding...")
    print("=" * 60)
    
    try:
        async for session in get_async_session():
            # Seed in order of dependencies
            msp = await seed_msp_data(session)
            msp_users = await seed_users(session, msp.id)
            ai_services = await seed_ai_services(session)
            clients = await seed_clients(session, msp.id)
            client_users = await seed_client_users(session, clients)
            all_users = msp_users + client_users
            applications = await seed_client_ai_applications(session, clients, ai_services)
            await seed_client_usage_data(session, clients, ai_services, all_users)
            await seed_agent_engagement(session, clients)
            await seed_user_engagement(session, clients, all_users)
            await seed_productivity_correlations(session, clients)
            frameworks = await seed_compliance_frameworks(session)
            await seed_detection_patterns(session, frameworks)
            await seed_alerts(session, clients)
            await seed_client_metrics(session, clients)
            
            print("\n" + "=" * 60)
            print("🎉 Mock data seeding completed successfully!")
            print("\n📊 Summary of seeded data:")
            print(f"  🏢 MSPs: 1")
            print(f"  👥 MSP Users: {len(msp_users)}")
            print(f"  👥 Client Users: {len(client_users)}")
            print(f"  🤖 AI Services: {len(ai_services)}")
            print(f"  🏢 Clients: {len(clients)}")
            print(f"  📱 Applications: {len(applications)}")
            print(f"  📊 Usage Records: ~{len(clients) * len(ai_services) * 30}")
            print(f"  🛡️ Compliance Frameworks: {len(frameworks)}")
            print(f"  🔍 Detection Patterns: 4")
            print(f"  🚨 Alerts: 3")
            
            print("\n🚀 The system is now ready for testing!")
            print("   You can now test the add client AI application endpoint")
            print("   and all other functionality with realistic data.")
            
            break  # Exit the async generator
            
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())