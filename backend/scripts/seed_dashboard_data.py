import asyncio
import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import (
    Client, ClientMetrics, Alert, DepartmentEngagement, 
    ApplicationEngagement, AgentEngagement, UserEngagement, 
    ProductivityCorrelation, ClientAIServices, AIService, MSP, User
)
from sqlalchemy import select

async def seed_dashboard_data():
    """Seed the database with dashboard data matching frontend mock data"""
    
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
                    contact_info={"email": "admin@cybercept.com", "phone": "+1-555-0123"},
                    billing_info={"address": "123 Tech St, San Francisco, CA"},
                    settings={"theme": "dark", "notifications": True},
                    compliance_requirements={"frameworks": ["NIST", "ISO_42001", "EU_AI"]},
                    status="active"
                )
                session.add(msp)
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
                    "contact_info": {"email": "admin@acmehealth.com", "phone": "+1-555-0101"},
                    "billing_info": {"address": "456 Health Ave, Boston, MA"}
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
                    "contact_info": {"email": "admin@techcorp.com", "phone": "+1-555-0102"},
                    "billing_info": {"address": "789 Tech Blvd, Seattle, WA"}
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
                    "contact_info": {"email": "admin@metrofinance.com", "phone": "+1-555-0103"},
                    "billing_info": {"address": "321 Finance St, New York, NY"}
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
                {"name": "FinanceGPT", "vendor": "FinAI Solutions", "category": "Finance", "risk_level": "High"}
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
            
            # Create Client AI Services (Inventory)
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
                    approved_by=uuid.uuid4() if item["status"] == "Permitted" else None
                )
                session.add(client_ai_service)
            
            # Create Client Metrics
            metrics_data = [
                {"client_idx": 0, "apps_monitored": 18, "interactions_monitored": 12450, "agents_deployed": 7, "risk_score": 75.0, "compliance_coverage": 87.0},
                {"client_idx": 1, "apps_monitored": 24, "interactions_monitored": 28900, "agents_deployed": 12, "risk_score": 45.0, "compliance_coverage": 93.0},
                {"client_idx": 2, "apps_monitored": 31, "interactions_monitored": 15670, "agents_deployed": 9, "risk_score": 85.0, "compliance_coverage": 91.0}
            ]
            
            for metric in metrics_data:
                client_metric = ClientMetrics(
                    client_id=clients[metric["client_idx"]].id,
                    date=date.today(),
                    apps_monitored=metric["apps_monitored"],
                    interactions_monitored=metric["interactions_monitored"],
                    agents_deployed=metric["agents_deployed"],
                    risk_score=metric["risk_score"],
                    compliance_coverage=metric["compliance_coverage"]
                )
                session.add(client_metric)
            
            # Create Department Engagement
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
            
            # Create Application Engagement
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
            
            # Create Agent Engagement
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
            
            # Create Productivity Correlations
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
            
            # Create Sample Alerts
            alert_data = [
                {"client_idx": 0, "app": "Perplexity", "asset_kind": "Application", "family": "UNSANCTIONED_USE", "subtype": "NewApp", "severity": "High", "users_affected": 42, "details": "First seen across 42 users (↑24% 7d). Not on allowlist.", "frameworks": ["NIST", "EU_AI"], "status": "Unassigned"},
                {"client_idx": 0, "app": "ChatGPT", "asset_kind": "Application", "family": "SENSITIVE_DATA", "subtype": "Secrets", "severity": "High", "count": 3, "details": "API token sk_live_•••3a9 detected; redacted.", "frameworks": ["NIST", "ISO_42001"], "status": "Unassigned"},
                {"client_idx": 1, "app": "SmartScheduler", "asset_kind": "Agent", "family": "AGENT_RISK", "subtype": "PrivilegedAction", "severity": "High", "details": "Agent attempted 'reset admin password' outside scope.", "frameworks": ["NIST", "EU_AI"], "status": "Unassigned"},
                {"client_idx": 1, "app": "M365 Copilot", "asset_kind": "Application", "family": "USAGE_ANOMALY", "subtype": "OffHours", "severity": "Medium", "details": "5× spike 01:00–03:00 UTC by 17 users.", "frameworks": ["NIST"], "status": "Pending"},
                {"client_idx": 2, "app": "Claude", "asset_kind": "Application", "family": "UNSANCTIONED_USE", "subtype": "UsageWithoutApproval", "severity": "Medium", "users_affected": 12, "details": "12 users adopted Perplexity without policy exemption.", "frameworks": ["NIST", "EU_AI"], "status": "Unassigned"}
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
            
            await session.commit()
            print("Dashboard data seeded successfully!")
            
        except Exception as e:
            await session.rollback()
            print(f"Error seeding data: {e}")
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(seed_dashboard_data())
