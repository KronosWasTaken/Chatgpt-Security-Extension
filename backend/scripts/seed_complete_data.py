import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import (
    Client, ClientMetrics, Alert, DepartmentEngagement, 
    ApplicationEngagement, AgentEngagement, UserEngagement, 
    ProductivityCorrelation, ClientAIServices, AIService, MSP, User,
    ClientPolicy, ClientComplianceReport, PortfolioValueReport
)
from sqlalchemy import select
from passlib.context import CryptContext

# Create password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Generate a proper bcrypt hash for a password using passlib"""
    return pwd_context.hash(password)

async def seed_complete_data():
    """Seed the database with complete realistic data matching frontend mock data"""
    
    async for session in get_async_session():
        try:
            # Get or create MSP
            msp_query = select(MSP).where(MSP.name == "Cybercept MSP")
            msp_result = await session.execute(msp_query)
            msp = msp_result.scalar_one_or_none()
            
            if not msp:
                msp = MSP(
                    id=uuid.uuid4(),
                    name="Cybercept MSP",
                    subscription_tier="Enterprise",
                    billing_cycle="monthly",
                    business_type="MSP",
                    contact_info={
                        "email": "admin@cybercept.com", 
                        "phone": "+1-555-0123",
                        "address": "123 Tech St, San Francisco, CA"
                    },
                    billing_info={
                        "address": "123 Tech St, San Francisco, CA",
                        "tax_id": "12-3456789"
                    },
                    settings={
                        "theme": "dark", 
                        "notifications": True,
                        "timezone": "UTC"
                    },
                    compliance_requirements={
                        "frameworks": ["NIST", "ISO_42001", "EU_AI"],
                        "audit_frequency": "quarterly"
                    },
                    status="active"
                )
                session.add(msp)
                await session.flush()
            
            # Create users for the MSP
            users_data = [
                {
                    "name": "John Smith",
                    "email": "john.smith@cybercept.com",
                    "hashed_password": hash_password("admin123"),
                    "department": "IT",
                    "user_type": "msp",
                    "role": "msp_admin",
                    "permissions": ["msp:read", "msp:write", "msp:admin", "msp:delete"]
                },
                {
                    "name": "Sarah Johnson",
                    "email": "sarah.johnson@cybercept.com",
                    "hashed_password": hash_password("admin123"),
                    "department": "Security",
                    "user_type": "msp",
                    "role": "msp_user",
                    "permissions": ["msp:read", "msp:write"]
                }
            ]
            
            users = []
            for user_data in users_data:
                user = User(
                    msp_id=msp.id,
                    **user_data
                )
                session.add(user)
                users.append(user)
            
            await session.flush()
            
            # Create clients matching frontend data
            clients_data = [
                {
                    "id": uuid.uuid4(),
                    "name": "Acme Health",
                    "industry": "Healthcare",
                    "company_size": "medium",
                    "status": "active",
                    "subscription_tier": "Professional",
                    "billing_cycle": "monthly",
                    "business_type": "Healthcare Provider",
                    "contact_info": {
                        "email": "admin@acmehealth.com", 
                        "phone": "+1-555-0101",
                        "address": "456 Health Ave, Boston, MA"
                    },
                    "billing_info": {
                        "address": "456 Health Ave, Boston, MA",
                        "tax_id": "12-3456789"
                    }
                },
                {
                    "id": uuid.uuid4(),
                    "name": "TechCorp Solutions",
                    "industry": "Technology",
                    "company_size": "large",
                    "status": "active",
                    "subscription_tier": "Enterprise",
                    "billing_cycle": "monthly",
                    "business_type": "Software Company",
                    "contact_info": {
                        "email": "admin@techcorp.com", 
                        "phone": "+1-555-0102",
                        "address": "789 Tech Blvd, Seattle, WA"
                    },
                    "billing_info": {
                        "address": "789 Tech Blvd, Seattle, WA",
                        "tax_id": "98-7654321"
                    }
                },
                {
                    "id": uuid.uuid4(),
                    "name": "Metro Finance",
                    "industry": "Financial Services",
                    "company_size": "large",
                    "status": "active",
                    "subscription_tier": "Enterprise",
                    "billing_cycle": "monthly",
                    "business_type": "Financial Institution",
                    "contact_info": {
                        "email": "admin@metrofinance.com", 
                        "phone": "+1-555-0103",
                        "address": "321 Finance St, New York, NY"
                    },
                    "billing_info": {
                        "address": "321 Finance St, New York, NY",
                        "tax_id": "45-6789012"
                    }
                }
            ]
            
            clients = []
            for client_data in clients_data:
                client = Client(
                    msp_id=msp.id,
                    **client_data
                )
                session.add(client)
                clients.append(client)
            
            await session.flush()
            
            # Create AI Services
            ai_services_data = [
                {"name": "ChatGPT", "vendor": "OpenAI", "category": "LLM", "risk_level": "Medium"},
                {"name": "Claude", "vendor": "Anthropic", "category": "LLM", "risk_level": "Medium"},
                {"name": "Microsoft Copilot", "vendor": "Microsoft", "category": "Productivity", "risk_level": "Low"},
                {"name": "GitHub Copilot", "vendor": "GitHub", "category": "Development", "risk_level": "Medium"},
                {"name": "Google Gemini", "vendor": "Google", "category": "LLM", "risk_level": "Medium"},
                {"name": "Perplexity", "vendor": "Perplexity", "category": "Search", "risk_level": "Low"},
                {"name": "MedAssist AI", "vendor": "HealthTech Inc", "category": "Healthcare", "risk_level": "High"},
                {"name": "SmartScheduler", "vendor": "AI Solutions", "category": "Productivity", "risk_level": "Low"},
                {"name": "BillBot Pro", "vendor": "FinanceAI", "category": "Finance", "risk_level": "High"},
                {"name": "CodeReviewer AI", "vendor": "DevAI Corp", "category": "Development", "risk_level": "Medium"},
                {"name": "RiskAnalyzer Pro", "vendor": "RiskTech", "category": "Finance", "risk_level": "High"},
                {"name": "FinanceGPT", "vendor": "FinAI Solutions", "category": "Finance", "risk_level": "High"},
                {"name": "Jasper", "vendor": "Jasper", "category": "Content", "risk_level": "Low"},
                {"name": "Notion Q&A", "vendor": "Notion", "category": "Productivity", "risk_level": "Low"},
                {"name": "Bloomberg GPT", "vendor": "Bloomberg", "category": "Finance", "risk_level": "High"}
            ]
            
            ai_services = []
            for service_data in ai_services_data:
                ai_service = AIService(
                    id=uuid.uuid4(),
                    domain_patterns=[f"*.{service_data['vendor'].lower()}.com"],
                    detection_patterns={"patterns": [service_data['name'].lower()]},
                    service_metadata={"description": f"{service_data['name']} by {service_data['vendor']}"},
                    **service_data
                )
                session.add(ai_service)
                ai_services.append(ai_service)
            
            await session.flush()
            
            # Create Client AI Services (Inventory) - matching frontend data exactly
            inventory_data = [
                # Acme Health
                {"client_idx": 0, "ai_service_name": "ChatGPT", "type": "Application", "status": "Permitted", "users": 145, "avg_daily_interactions": 2890, "integrations": ["Salesforce", "Outlook"]},
                {"client_idx": 0, "ai_service_name": "Microsoft Copilot", "type": "Application", "status": "Permitted", "users": 98, "avg_daily_interactions": 1567, "integrations": ["Outlook", "SharePoint"]},
                {"client_idx": 0, "ai_service_name": "Claude", "type": "Application", "status": "Unsanctioned", "users": 23, "avg_daily_interactions": 456, "integrations": []},
                {"client_idx": 0, "ai_service_name": "MedAssist AI", "type": "Agent", "status": "Permitted", "users": 67, "avg_daily_interactions": 1234, "integrations": ["Epic", "Salesforce"]},
                {"client_idx": 0, "ai_service_name": "SmartScheduler", "type": "Agent", "status": "Permitted", "users": 189, "avg_daily_interactions": 3456, "integrations": ["Outlook", "Gmail"]},
                {"client_idx": 0, "ai_service_name": "BillBot Pro", "type": "Agent", "status": "Permitted", "users": 34, "avg_daily_interactions": 890, "integrations": ["QuickBooks", "Salesforce"]},
                
                # TechCorp Solutions
                {"client_idx": 1, "ai_service_name": "GitHub Copilot", "type": "Application", "status": "Permitted", "users": 234, "avg_daily_interactions": 5670, "integrations": ["GitHub", "VS Code"]},
                {"client_idx": 1, "ai_service_name": "ChatGPT", "type": "Application", "status": "Permitted", "users": 156, "avg_daily_interactions": 3210, "integrations": ["Slack", "Jira"]},
                {"client_idx": 1, "ai_service_name": "CodeReviewer AI", "type": "Agent", "status": "Permitted", "users": 89, "avg_daily_interactions": 1890, "integrations": ["GitHub", "Jira"]},
                {"client_idx": 1, "ai_service_name": "Google Gemini", "type": "Application", "status": "Unsanctioned", "users": 67, "avg_daily_interactions": 1234, "integrations": []},
                
                # Metro Finance
                {"client_idx": 2, "ai_service_name": "FinanceGPT", "type": "Application", "status": "Permitted", "users": 123, "avg_daily_interactions": 2340, "integrations": ["QuickBooks", "Salesforce"]},
                {"client_idx": 2, "ai_service_name": "RiskAnalyzer Pro", "type": "Agent", "status": "Permitted", "users": 45, "avg_daily_interactions": 1567, "integrations": ["Bloomberg", "QuickBooks"]},
                {"client_idx": 2, "ai_service_name": "Claude", "type": "Application", "status": "Unsanctioned", "users": 78, "avg_daily_interactions": 890, "integrations": []}
            ]
            
            for item in inventory_data:
                ai_service = next(s for s in ai_services if s.name == item["ai_service_name"])
                client_ai_service = ClientAIServices(
                    client_id=clients[item["client_idx"]].id,
                    ai_service_id=ai_service.id,
                    name=item["ai_service_name"],
                    vendor=ai_service.vendor,
                    type=item["type"],
                    status=item["status"],
                    users=item["users"],
                    avg_daily_interactions=item["avg_daily_interactions"],
                    integrations=item["integrations"],
                    risk_tolerance="Medium",
                    department_restrictions={},
                    approved_at=date.today() if item["status"] == "Permitted" else None,
                    approved_by=users[0].id if item["status"] == "Permitted" else None
                )
                session.add(client_ai_service)
            
            # Note: Client metrics are now calculated in real-time during API calls
            # No need to seed hardcoded metrics data
            
            # Create Department Engagement - matching frontend data exactly
            dept_engagement_data = [
                {"client_idx": 0, "department": "Sales", "interactions": 1820, "active_users": 64, "pct_change_vs_prev_7d": 12.0},
                {"client_idx": 0, "department": "Marketing", "interactions": 1330, "active_users": 41, "pct_change_vs_prev_7d": 8.0},
                {"client_idx": 0, "department": "Customer Support", "interactions": 980, "active_users": 28, "pct_change_vs_prev_7d": 15.0},
                {"client_idx": 0, "department": "Engineering", "interactions": 720, "active_users": 22, "pct_change_vs_prev_7d": -5.0},
                {"client_idx": 0, "department": "Finance", "interactions": 310, "active_users": 11, "pct_change_vs_prev_7d": 3.0},
                {"client_idx": 0, "department": "HR", "interactions": 140, "active_users": 6, "pct_change_vs_prev_7d": -2.0}
            ]
            
            for dept in dept_engagement_data:
                dept_engagement = DepartmentEngagement(
                    client_id=clients[dept["client_idx"]].id,
                    date=date.today(),
                    department=dept["department"],
                    interactions=dept["interactions"],
                    active_users=dept["active_users"],
                    pct_change_vs_prev_7d=dept["pct_change_vs_prev_7d"]
                )
                session.add(dept_engagement)
            
            # Create Application Engagement - matching frontend data exactly
            app_engagement_data = [
                {"client_idx": 0, "application": "ChatGPT Enterprise", "vendor": "OpenAI", "icon": "chatgpt", "active_users": 72, "interactions_per_day": 210, "trend_pct_7d": 14.0, "utilization": "High", "recommendation": "Maintain momentum in Sales & Support"},
                {"client_idx": 0, "application": "Claude for Work", "vendor": "Anthropic", "icon": "claude", "active_users": 38, "interactions_per_day": 96, "trend_pct_7d": 9.0, "utilization": "Medium", "recommendation": "Promote to Marketing playbooks"},
                {"client_idx": 0, "application": "Microsoft Copilot (M365)", "vendor": "Microsoft", "icon": "copilot", "active_users": 51, "interactions_per_day": 115, "trend_pct_7d": 5.0, "utilization": "High", "recommendation": "Roll training to Finance"},
                {"client_idx": 0, "application": "Jasper", "vendor": "Jasper", "icon": "jasper", "active_users": 12, "interactions_per_day": 24, "trend_pct_7d": -7.0, "utilization": "Low", "recommendation": "Candidate to cut or consolidate"},
                {"client_idx": 0, "application": "Notion Q&A", "vendor": "Notion", "icon": "notion", "active_users": 17, "interactions_per_day": 31, "trend_pct_7d": 3.0, "utilization": "Medium", "recommendation": "Coach HR on search prompts"},
                {"client_idx": 0, "application": "Perplexity Teams", "vendor": "Perplexity", "icon": "perplexity", "active_users": 9, "interactions_per_day": 18, "trend_pct_7d": -4.0, "utilization": "Low", "recommendation": "Underutilized—consider removing seats"}
            ]
            
            for app in app_engagement_data:
                app_engagement = ApplicationEngagement(
                    client_id=clients[app["client_idx"]].id,
                    date=date.today(),
                    application=app["application"],
                    vendor=app["vendor"],
                    icon=app["icon"],
                    active_users=app["active_users"],
                    interactions_per_day=app["interactions_per_day"],
                    trend_pct_7d=app["trend_pct_7d"],
                    utilization=app["utilization"],
                    recommendation=app["recommendation"]
                )
                session.add(app_engagement)
            
            # Create Agent Engagement - matching frontend data exactly
            agent_engagement_data = [
                {"client_idx": 0, "agent": "Sales Email Coach", "vendor": "Internal", "icon": "bot", "deployed": 8, "avg_prompts_per_day": 62, "flagged_actions": 1, "trend_pct_7d": 18.0, "status": "Rising", "last_activity_iso": "2025-09-10T13:45:00Z", "associated_apps": ["ChatGPT Enterprise", "Copilot (M365)"]},
                {"client_idx": 0, "agent": "Support Reply Summarizer", "vendor": "Internal", "icon": "bot", "deployed": 5, "avg_prompts_per_day": 41, "flagged_actions": 0, "trend_pct_7d": 11.0, "status": "Rising", "last_activity_iso": "2025-09-10T14:02:00Z", "associated_apps": ["Claude for Work", "ChatGPT Enterprise"]},
                {"client_idx": 0, "agent": "Marketing Brief Generator", "vendor": "Internal", "icon": "bot", "deployed": 4, "avg_prompts_per_day": 12, "flagged_actions": 2, "trend_pct_7d": -6.0, "status": "Stable", "last_activity_iso": "2025-09-09T22:18:00Z", "associated_apps": ["Claude for Work", "Jasper"]},
                {"client_idx": 0, "agent": "Finance Reconciliation Helper", "vendor": "Internal", "icon": "bot", "deployed": 3, "avg_prompts_per_day": 7, "flagged_actions": 0, "trend_pct_7d": -3.0, "status": "Dormant", "last_activity_iso": "2025-09-04T16:10:00Z", "associated_apps": ["Copilot (M365)"]}
            ]
            
            for agent in agent_engagement_data:
                agent_engagement = AgentEngagement(
                    client_id=clients[agent["client_idx"]].id,
                    date=date.today(),
                    agent=agent["agent"],
                    vendor=agent["vendor"],
                    icon=agent["icon"],
                    deployed=agent["deployed"],
                    avg_prompts_per_day=agent["avg_prompts_per_day"],
                    flagged_actions=agent["flagged_actions"],
                    trend_pct_7d=agent["trend_pct_7d"],
                    status=agent["status"],
                    last_activity_iso=agent["last_activity_iso"],
                    associated_apps=agent["associated_apps"]
                )
                session.add(agent_engagement)
            
            # Create Productivity Correlations - matching frontend data exactly
            prod_correlation_data = [
                {"client_idx": 0, "department": "Sales", "ai_interactions_7d": [210, 235, 260, 250, 270, 295, 300], "output_metric_7d": [420, 445, 470, 465, 490, 510, 525], "note": "Higher AI usage aligns with +12% emails drafted"},
                {"client_idx": 0, "department": "Customer Support", "ai_interactions_7d": [110, 125, 140, 150, 160, 180, 215], "output_metric_7d": [88, 92, 95, 97, 101, 106, 114], "note": "Increasing AI use correlates with faster resolutions"},
                {"client_idx": 0, "department": "Marketing", "ai_interactions_7d": [160, 170, 175, 180, 190, 200, 225], "output_metric_7d": [35, 38, 37, 39, 41, 42, 45], "note": "Steady lift with creative output"}
            ]
            
            for prod in prod_correlation_data:
                prod_correlation = ProductivityCorrelation(
                    client_id=clients[prod["client_idx"]].id,
                    date=date.today(),
                    department=prod["department"],
                    ai_interactions_7d=prod["ai_interactions_7d"],
                    output_metric_7d=prod["output_metric_7d"],
                    note=prod["note"]
                )
                session.add(prod_correlation)
            
            # Create Sample Alerts - matching frontend data exactly
            alert_data = [
                {"client_idx": 0, "app": "Perplexity", "asset_kind": "Application", "family": "UNSANCTIONED_USE", "subtype": "NewApp", "severity": "High", "users_affected": 42, "details": "First seen across 42 users (↑24% 7d). Not on allowlist.", "frameworks": ["NIST", "EU_AI"], "status": "Unassigned"},
                {"client_idx": 0, "app": "ChatGPT", "asset_kind": "Application", "family": "SENSITIVE_DATA", "subtype": "Secrets", "severity": "High", "count": 3, "details": "API token sk_live_•••3a9 detected; redacted.", "frameworks": ["NIST", "ISO_42001"], "status": "Unassigned"},
                {"client_idx": 1, "app": "SmartScheduler", "asset_kind": "Agent", "family": "AGENT_RISK", "subtype": "PrivilegedAction", "severity": "High", "details": "Agent attempted 'reset admin password' outside scope.", "frameworks": ["NIST", "EU_AI"], "status": "Unassigned"},
                {"client_idx": 1, "app": "M365 Copilot", "asset_kind": "Application", "family": "USAGE_ANOMALY", "subtype": "OffHours", "severity": "Medium", "details": "5× spike 01:00–03:00 UTC by 17 users.", "frameworks": ["NIST"], "status": "Pending"},
                {"client_idx": 2, "app": "Claude", "asset_kind": "Application", "family": "UNSANCTIONED_USE", "subtype": "UsageWithoutApproval", "severity": "Medium", "users_affected": 12, "details": "12 users adopted Perplexity without policy exemption.", "frameworks": ["NIST", "EU_AI"], "status": "Unassigned"},
                {"client_idx": 0, "app": "MedAssist AI", "asset_kind": "Agent", "family": "SENSITIVE_DATA", "subtype": "PHI", "severity": "High", "count": 2, "details": "Patient MRN ****829 in prompt; redaction applied.", "frameworks": ["NIST", "ISO_42001"], "status": "Unassigned"},
                {"client_idx": 1, "app": "GitHub Copilot", "asset_kind": "Application", "family": "SENSITIVE_DATA", "subtype": "SourceCode", "severity": "Medium", "details": "Repository secret pattern found in generated snippet; blocked.", "frameworks": ["NIST", "ISO_42001"], "status": "AI Resolved"},
                {"client_idx": 2, "app": "FinanceGPT", "asset_kind": "Application", "family": "SENSITIVE_DATA", "subtype": "Financial", "severity": "High", "count": 1, "details": "Bank routing number ****1234 exposed; masked.", "frameworks": ["NIST", "ISO_42001"], "status": "Complete"}
            ]
            
            for alert in alert_data:
                alert_obj = Alert(
                    client_id=clients[alert["client_idx"]].id,
                    app=alert["app"],
                    asset_kind=alert["asset_kind"],
                    family=alert["family"],
                    subtype=alert["subtype"],
                    severity=alert["severity"],
                    users_affected=alert.get("users_affected"),
                    count=alert.get("count"),
                    details=alert["details"],
                    frameworks=alert["frameworks"],
                    status=alert["status"]
                )
                session.add(alert_obj)
            
            # Create Client Policies - matching frontend data exactly
            policy_data = [
                {
                    "client_idx": 0,
                    "name": "Default Public AI Policy",
                    "rules": [
                        {"id": "pii-acme", "category": "PII", "enabled": True, "effect": "Block", "description": "Personal identifiers, SSN, addresses"},
                        {"id": "phi-acme", "category": "PHI", "enabled": False, "effect": "Allow", "description": "Medical information (not applicable)"},
                        {"id": "secrets-acme", "category": "Secrets", "enabled": True, "effect": "Block", "description": "API keys, passwords, certificates"},
                        {"id": "source-acme", "category": "SourceCode", "enabled": True, "effect": "Redact", "description": "Proprietary code and algorithms"},
                        {"id": "customer-acme", "category": "CustomerData", "enabled": True, "effect": "Redact", "description": "Customer records and business data"}
                    ],
                    "yaml": """# Acme Corp AI Policy
name: "Acme Default Public AI Policy"
version: "2.1"
effective_date: "2025-09-05"
controls:
  pii:
    enabled: true
    action: block
    patterns:
      - ssn
      - email_address
      - phone_number
      - home_address
  secrets:
    enabled: true
    action: block
    patterns:
      - api_key
      - password
      - private_key
      - access_token
  source_code:
    enabled: true
    action: redact
    patterns:
      - function_signature
      - database_schema
      - algorithm_implementation
  customer_data:
    enabled: true
    action: redact
    patterns:
      - customer_id
      - order_number
      - contract_terms""",
                    "last_modified": "2025-09-05T10:30:00Z",
                    "is_active": True
                }
            ]
            
            for policy in policy_data:
                client_policy = ClientPolicy(
                    client_id=clients[policy["client_idx"]].id,
                    name=policy["name"],
                    rules=policy["rules"],
                    yaml=policy["yaml"],
                    last_modified=policy["last_modified"],
                    is_active=policy["is_active"],
                    approved_by=users[0].id
                )
                session.add(client_policy)
            
            # Create Client Compliance Reports
            compliance_report_data = [
                {
                    "client_idx": 0,
                    "period": "Q3 2025",
                    "coverage_percentage": 87.0,
                    "coverage_implemented": 52,
                    "coverage_total": 60,
                    "evidence_percentage": 92.0,
                    "evidence_complete": 55,
                    "evidence_total": 60,
                    "alert_summary": [
                        {"family": "Unsanctioned Use", "count": 1, "severity": "High"},
                        {"family": "Sensitive Data", "count": 2, "severity": "High"},
                        {"family": "Enforcement", "count": 1, "severity": "Low"},
                        {"family": "Config Drift", "count": 1, "severity": "High"}
                    ],
                    "implemented_controls": [
                        "AI.GOV-1.1: AI governance structure established",
                        "AI.MGT-2.3: AI risk assessment framework deployed",
                        "AI.RMF-3.1: Automated monitoring for PII/PHI detection",
                        "AI.RMF-4.2: Real-time policy enforcement controls",
                        "AI.GOV-5.1: Incident response procedures for AI systems"
                    ],
                    "open_gaps": [
                        "AI.RMF-2.4: Bias testing framework (Evidence due: Oct 15)",
                        "AI.GOV-3.2: Third-party AI vendor assessments (In progress)",
                        "AI.MGT-1.5: AI system inventory completeness (85% complete)"
                    ],
                    "engagement_highlights": {
                        "topApps": [
                            {"name": "ChatGPT", "change": 15.2},
                            {"name": "M365 Copilot", "change": -8.7},
                            {"name": "GitHub Copilot", "change": 23.1}
                        ],
                        "topAgents": [
                            {"name": "DataAnalyzer", "change": 45.3},
                            {"name": "ReportBot", "change": -12.4}
                        ]
                    },
                    "next_actions": [
                        "Complete bias testing framework implementation by Oct 15",
                        "Review and approve 3 pending vendor assessments",
                        "Address PII detection bypass in Finance department configuration",
                        "Investigate Perplexity usage spike and determine approval status"
                    ]
                }
            ]
            
            for report in compliance_report_data:
                compliance_report = ClientComplianceReport(
                    client_id=clients[report["client_idx"]].id,
                    period=report["period"],
                    coverage_percentage=report["coverage_percentage"],
                    coverage_implemented=report["coverage_implemented"],
                    coverage_total=report["coverage_total"],
                    evidence_percentage=report["evidence_percentage"],
                    evidence_complete=report["evidence_complete"],
                    evidence_total=report["evidence_total"],
                    alert_summary=report["alert_summary"],
                    implemented_controls=report["implemented_controls"],
                    open_gaps=report["open_gaps"],
                    engagement_highlights=report["engagement_highlights"],
                    next_actions=report["next_actions"]
                )
                session.add(compliance_report)
            
            # Create Portfolio Value Report
            portfolio_report = PortfolioValueReport(
                msp_id=msp.id,
                period="Q3 2025",
                coverage_delta=12.3,
                total_alerts=[
                    {"family": "Unsanctioned Use", "count": 3},
                    {"family": "Sensitive Data", "count": 5},
                    {"family": "Agent Risk", "count": 2},
                    {"family": "Policy Violation", "count": 1},
                    {"family": "Usage Anomaly", "count": 2},
                    {"family": "Compliance Gap", "count": 3},
                    {"family": "Config Drift", "count": 2},
                    {"family": "Enforcement", "count": 4}
                ],
                top_standardizations=[
                    "NIST AI RMF adoption across 85% of clients",
                    "Unified PII/PHI detection policies (3 clients)",
                    "Standardized incident response workflows",
                    "Common agent deployment guardrails"
                ],
                estimated_savings={
                    "licenseOptimization": 234000,
                    "riskReduction": 567000,
                    "complianceEfficiency": 189000
                },
                highlights=[
                    "Prevented 23 potential data breaches through automated detection",
                    "Reduced compliance prep time by 40% via standardized frameworks",
                    "Achieved 95% client satisfaction with AI governance platform",
                    "Onboarded 2 new clients with accelerated 30-day deployment"
                ],
                next_actions=[
                    "Expand EU AI Act readiness assessments to all clients",
                    "Deploy advanced agent risk controls to 3 remaining clients",
                    "Conduct quarterly business review presentations",
                    "Pilot predictive compliance gap identification system"
                ]
            )
            session.add(portfolio_report)
            
            await session.commit()
            print("✅ Complete data seeded successfully!")
            print(f"   - Created MSP: {msp.name}")
            print(f"   - Created {len(clients)} clients")
            print(f"   - Created {len(ai_services)} AI services")
            print(f"   - Created {len(inventory_data)} client AI services")
            print(f"   - Created {len(dept_engagement_data)} department engagements")
            print(f"   - Created {len(app_engagement_data)} application engagements")
            print(f"   - Created {len(agent_engagement_data)} agent engagements")
            print(f"   - Created {len(prod_correlation_data)} productivity correlations")
            print(f"   - Created {len(alert_data)} alerts")
            print(f"   - Created {len(policy_data)} policies")
            print(f"   - Created {len(compliance_report_data)} compliance reports")
            print(f"   - Created 1 portfolio report")
            print("   - Metrics will be calculated in real-time during API calls")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error seeding data: {e}")
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(seed_complete_data())
