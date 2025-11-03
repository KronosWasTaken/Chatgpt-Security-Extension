from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class TestResponse(BaseModel):
    message: str
    status: str
    data: Dict[str, Any] = {}

@router.get("/test", response_model=TestResponse)
async def test_endpoint():
    """Simple test endpoint that doesn't require database"""
    return TestResponse(
        message="Backend API is working!",
        status="success",
        data={
            "version": "1.0.0",
            "endpoints": [
                "/health",
                "/docs",
                "/api/v1/test",
                "/api/v1/scan/test"
            ]
        }
    )

@router.get("/mock-clients", response_model=List[Dict[str, Any]])
async def get_mock_clients():
    """Mock clients data for testing frontend integration"""
    return [
        {
            "id": "client-1",
            "name": "TechCorp Solutions",
            "industry": "Technology",
            "company_size": "500-1000",
            "status": "Active",
            "subscription_tier": "Enterprise",
            "apps_monitored": 15,
            "interactions_monitored": 1250,
            "agents_deployed": 8,
            "risk_score": 75,
            "compliance_coverage": 85,
            "created_at": "2024-01-15T10:00:00Z",
            "updated_at": "2024-10-19T16:00:00Z"
        },
        {
            "id": "client-2", 
            "name": "FinanceFirst Inc",
            "industry": "Financial Services",
            "company_size": "100-500",
            "status": "Active",
            "subscription_tier": "Professional",
            "apps_monitored": 8,
            "interactions_monitored": 650,
            "agents_deployed": 4,
            "risk_score": 60,
            "compliance_coverage": 90,
            "created_at": "2024-02-20T14:30:00Z",
            "updated_at": "2024-10-19T15:45:00Z"
        }
    ]

@router.get("/mock-ai-inventory", response_model=List[Dict[str, Any]])
async def get_mock_ai_inventory():
    """Mock AI inventory data for testing frontend integration"""
    return [
        {
            "id": "app-1",
            "name": "ChatGPT",
            "vendor": "OpenAI",
            "type": "Application",
            "status": "Permitted",
            "risk_level": "Medium",
            "risk_score": 65,
            "active_users": 45,
            "avg_daily_interactions": 120,
            "integrations": ["Slack", "Teams", "Email"],
            "approval_conditions": {"requires_approval": True, "max_file_size": "10MB"},
            "approved_by": "admin@techcorp.com",
            "approved_at": "2024-10-15T09:00:00Z",
            "created_at": "2024-10-01T08:00:00Z",
            "updated_at": "2024-10-19T16:00:00Z"
        },
        {
            "id": "app-2",
            "name": "Claude",
            "vendor": "Anthropic",
            "type": "Application", 
            "status": "Under_Review",
            "risk_level": "Low",
            "risk_score": 35,
            "active_users": 20,
            "avg_daily_interactions": 80,
            "integrations": ["Slack"],
            "approval_conditions": {"requires_approval": False, "max_file_size": "5MB"},
            "approved_by": None,
            "approved_at": None,
            "created_at": "2024-10-10T10:00:00Z",
            "updated_at": "2024-10-19T15:30:00Z"
        }
    ]

@router.get("/mock-alerts", response_model=List[Dict[str, Any]])
async def get_mock_alerts():
    """Mock alerts data for testing frontend integration"""
    return [
        {
            "id": "alert-1",
            "client_id": "client-1",
            "application_id": "app-1",
            "user_id": "user-123",
            "alert_family": "Data_Exposure",
            "subtype": "Sensitive_File_Upload",
            "severity": "High",
            "status": "Unassigned",
            "title": "Sensitive file uploaded to ChatGPT",
            "description": "A file containing customer PII was uploaded to ChatGPT without proper authorization.",
            "users_affected": 1,
            "interaction_count": 1,
            "frameworks": ["GDPR", "CCPA"],
            "assigned_to": None,
            "resolved_at": None,
            "created_at": "2024-10-19T14:30:00Z",
            "updated_at": "2024-10-19T14:30:00Z"
        },
        {
            "id": "alert-2",
            "client_id": "client-1",
            "application_id": "app-2",
            "user_id": "user-456",
            "alert_family": "Compliance",
            "subtype": "Unsanctioned_Usage",
            "severity": "Medium",
            "status": "Pending",
            "title": "Unsanctioned AI application detected",
            "description": "Claude application is being used without proper approval process.",
            "users_affected": 3,
            "interaction_count": 15,
            "frameworks": ["SOC2"],
            "assigned_to": "admin@techcorp.com",
            "resolved_at": None,
            "created_at": "2024-10-19T13:15:00Z",
            "updated_at": "2024-10-19T15:00:00Z"
        }
    ]
