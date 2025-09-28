# Complete API Endpoints Documentation

## Base URL
`http://localhost:8000/api/v1`

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints Overview

### 1. Dashboard Endpoints (`/dashboard/`)

#### Get All Clients with Metrics
- **GET** `/dashboard/clients`
- **Description**: Get all clients with their current metrics for dashboard
- **Response**: Array of `ClientMetricsResponse`
- **Sample Response**:
```json
[
  {
    "id": "uuid",
    "name": "Acme Health",
    "industry": "Healthcare",
    "company_size": "medium",
    "status": "active",
    "subscription_tier": "Professional",
    "apps_monitored": 18,
    "interactions_monitored": 12450,
    "agents_deployed": 7,
    "risk_score": 75.0,
    "compliance_coverage": 87.0,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-20T15:30:00Z"
  }
]
```

#### Get Client AI Inventory
- **GET** `/dashboard/clients/{client_id}/inventory`
- **Description**: Get AI inventory for a specific client
- **Response**: `ClientInventoryResponse`
- **Sample Response**:
```json
{
  "clientId": "uuid",
  "items": [
    {
      "id": "uuid",
      "type": "Application",
      "name": "ChatGPT",
      "vendor": "OpenAI",
      "users": 145,
      "avgDailyInteractions": 2890,
      "status": "Permitted",
      "integrations": ["Salesforce", "Outlook"]
    }
  ]
}
```

#### Get Client Engagement Data
- **GET** `/dashboard/clients/{client_id}/engagement`
- **Description**: Get AI engagement data for a specific client
- **Response**: `AIEngagementDataResponse`
- **Sample Response**:
```json
{
  "departments": [
    {
      "department": "Sales",
      "interactions": 1820,
      "active_users": 64,
      "pct_change_vs_prev_7d": 12.0
    }
  ],
  "applications": [
    {
      "application": "ChatGPT Enterprise",
      "vendor": "OpenAI",
      "icon": "chatgpt",
      "active_users": 72,
      "interactions_per_day": 210,
      "trend_pct_7d": 14.0,
      "utilization": "High",
      "recommendation": "Maintain momentum in Sales & Support"
    }
  ],
  "agents": [
    {
      "agent": "Sales Email Coach",
      "vendor": "Internal",
      "icon": "bot",
      "deployed": 8,
      "avg_prompts_per_day": 62,
      "flagged_actions": 1,
      "trend_pct_7d": 18.0,
      "status": "Rising",
      "last_activity_iso": "2025-09-10T13:45:00Z",
      "associated_apps": ["ChatGPT Enterprise", "Copilot (M365)"]
    }
  ],
  "productivity_correlations": {
    "Sales": {
      "ai_interactions_7d": [210, 235, 260, 250, 270, 295, 300],
      "output_metric_7d": [420, 445, 470, 465, 490, 510, 525],
      "note": "Higher AI usage aligns with +12% emails drafted"
    }
  }
}
```

#### Get Client Alerts
- **GET** `/dashboard/clients/{client_id}/alerts`
- **Description**: Get alerts for a specific client
- **Response**: Array of `AlertResponse`
- **Sample Response**:
```json
[
  {
    "id": "uuid",
    "ts": "2025-09-09T14:12:00Z",
    "clientId": "uuid",
    "app": "Perplexity",
    "assetKind": "Application",
    "family": "UNSANCTIONED_USE",
    "subtype": "NewApp",
    "severity": "High",
    "usersAffected": 42,
    "count": null,
    "details": "First seen across 42 users (↑24% 7d). Not on allowlist.",
    "frameworks": ["NIST", "EU_AI"],
    "status": "Unassigned"
  }
]
```

#### Get Portfolio Totals
- **GET** `/dashboard/portfolio-totals`
- **Description**: Get portfolio totals for MSP dashboard
- **Response**: Object with portfolio metrics
- **Sample Response**:
```json
{
  "apps_monitored": 73,
  "interactions_monitored": 57020,
  "agents_deployed": 28,
  "avg_risk_score": 68
}
```

### 2. Policies Endpoints (`/policies/`)

#### Get Client Policies
- **GET** `/policies/clients/{client_id}/policies`
- **Description**: Get policies for a specific client
- **Response**: Array of `ClientPolicyResponse`
- **Sample Response**:
```json
[
  {
    "id": "uuid",
    "clientId": "uuid",
    "name": "Default Public AI Policy",
    "rules": [
      {
        "id": "pii-acme",
        "category": "PII",
        "enabled": true,
        "effect": "Block",
        "description": "Personal identifiers, SSN, addresses"
      }
    ],
    "yaml": "# Acme Corp AI Policy\nname: \"Acme Default Public AI Policy\"...",
    "lastModified": "2025-09-05T10:30:00Z",
    "isActive": true
  }
]
```

#### Get Policy Templates
- **GET** `/policies/templates`
- **Description**: Get policy templates
- **Response**: Array of `PolicyTemplateResponse`
- **Sample Response**:
```json
[
  {
    "id": "financial",
    "name": "Financial Services",
    "description": "Comprehensive data protection for banking, investment, and financial institutions with SOX compliance",
    "industry": "Financial",
    "rules": [
      {
        "id": "pii-fin",
        "category": "PII",
        "enabled": true,
        "effect": "Block",
        "description": "SSN, driver license, passport numbers"
      }
    ],
    "yaml": "# Financial Services AI Policy\nname: \"Financial Services Policy\"..."
  }
]
```

### 3. Reports Endpoints (`/reports/`)

#### Get Client Compliance Report
- **GET** `/reports/clients/{client_id}/compliance`
- **Description**: Get compliance report for a specific client
- **Response**: `ClientComplianceReportResponse`
- **Sample Response**:
```json
{
  "clientId": "uuid",
  "clientName": "Acme Corporation",
  "period": "Q3 2025",
  "coverage": {
    "percentage": 87,
    "implemented": 52,
    "total": 60
  },
  "evidence": {
    "percentage": 92,
    "complete": 55,
    "total": 60
  },
  "alertSummary": [
    {
      "family": "Unsanctioned Use",
      "count": 1,
      "severity": "High"
    }
  ],
  "implementedControls": [
    "AI.GOV-1.1: AI governance structure established"
  ],
  "openGaps": [
    "AI.RMF-2.4: Bias testing framework (Evidence due: Oct 15)"
  ],
  "engagementHighlights": {
    "topApps": [
      {"name": "ChatGPT", "change": 15.2}
    ],
    "topAgents": [
      {"name": "DataAnalyzer", "change": 45.3}
    ]
  },
  "nextActions": [
    "Complete bias testing framework implementation by Oct 15"
  ]
}
```

#### Get Portfolio Report
- **GET** `/reports/portfolio`
- **Description**: Get portfolio value report for MSP
- **Response**: `PortfolioValueReportResponse`
- **Sample Response**:
```json
{
  "period": "Q3 2025",
  "coverageDelta": 12.3,
  "totalAlerts": [
    {"family": "Unsanctioned Use", "count": 3}
  ],
  "topStandardizations": [
    "NIST AI RMF adoption across 85% of clients"
  ],
  "estimatedSavings": {
    "licenseOptimization": 234000,
    "riskReduction": 567000,
    "complianceEfficiency": 189000
  },
  "highlights": [
    "Prevented 23 potential data breaches through automated detection"
  ],
  "nextActions": [
    "Expand EU AI Act readiness assessments to all clients"
  ]
}
```

### 4. Existing Endpoints

#### Clients (`/clients/`)
- **GET** `/clients/` - Get all clients (existing, updated with new fields)

#### AI Inventory (`/ai-inventory/`)
- **GET** `/ai-inventory/` - Get AI inventory (existing)

#### MSP (`/msp/`)
- **GET** `/msp/` - MSP management (existing)

#### Auth (`/auth/`)
- **POST** `/auth/login` - User login (existing)
- **POST** `/auth/register` - User registration (existing)

## Data Models

### Client Metrics
- `apps_monitored`: Number of AI applications being monitored
- `interactions_monitored`: Total AI interactions monitored
- `agents_deployed`: Number of AI agents deployed
- `risk_score`: Risk score (0-100)
- `compliance_coverage`: Compliance coverage percentage (0-100)

### Alert Types
- `UNSANCTIONED_USE`: Unauthorized AI service usage
- `SENSITIVE_DATA`: Sensitive data exposure
- `AGENT_RISK`: AI agent security risks
- `POLICY_VIOLATION`: Policy violations
- `USAGE_ANOMALY`: Unusual usage patterns
- `COMPLIANCE_GAP`: Compliance gaps
- `CONFIG_DRIFT`: Configuration changes
- `ENFORCEMENT`: Policy enforcement actions

### Severity Levels
- `Low`: Low priority alerts
- `Medium`: Medium priority alerts
- `High`: High priority alerts
- `Critical`: Critical alerts requiring immediate attention

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Access denied"
}
```

### 404 Not Found
```json
{
  "detail": "Client not found"
}
```

## Usage Examples

### Frontend Integration

```javascript
// Get all clients with metrics
const clients = await fetch('/api/v1/dashboard/clients', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(res => res.json());

// Get client inventory
const inventory = await fetch(`/api/v1/dashboard/clients/${clientId}/inventory`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(res => res.json());

// Get client engagement data
const engagement = await fetch(`/api/v1/dashboard/clients/${clientId}/engagement`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(res => res.json());
```

## Database Schema

The API uses the following new tables:
- `client_metrics` - Client dashboard metrics
- `alerts` - Security alerts
- `department_engagement` - Department-level engagement data
- `application_engagement` - Application usage data
- `agent_engagement` - AI agent usage data
- `user_engagement` - User-level engagement data
- `productivity_correlations` - Productivity correlation data
- `client_compliance_reports` - Compliance reports
- `portfolio_value_reports` - Portfolio reports

All tables include proper foreign key relationships and indexes for optimal performance.
