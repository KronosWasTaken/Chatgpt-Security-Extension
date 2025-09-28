# Updated API Endpoints Documentation

## Base URL
`http://localhost:8000/api/v1`

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Updated Route Structure

### 1. **Clients Endpoints** (`/clients/`)

#### Get All Clients with Metrics
- **GET** `/clients/`
- **Description**: Get all clients with their current metrics for dashboard
- **Response**: Array of `ClientResponse`

#### Get Client AI Inventory
- **GET** `/clients/{client_id}/inventory`
- **Description**: Get AI inventory for a specific client
- **Response**: `ClientInventoryResponse`

#### Get Client Engagement Data
- **GET** `/clients/{client_id}/engagement`
- **Description**: Get AI engagement data for a specific client
- **Response**: `AIEngagementDataResponse`

#### Get Client Alerts
- **GET** `/clients/{client_id}/alerts`
- **Description**: Get alerts for a specific client
- **Response**: Array of `AlertResponse`

#### Get Portfolio Totals
- **GET** `/clients/portfolio-totals`
- **Description**: Get portfolio totals for MSP dashboard
- **Response**: Object with portfolio metrics

### 2. **AI Inventory Endpoints** (`/ai-inventory/`)

#### Get All AI Inventory
- **GET** `/ai-inventory/`
- **Description**: Get AI inventory for all clients
- **Response**: Array of client inventory objects
- **Sample Response**:
```json
[
  {
    "clientId": "uuid",
    "clientName": "Acme Health",
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
]
```

### 3. **AI Engagement Endpoints** (`/ai-engagement/`)

#### Get Client Engagement Data
- **GET** `/ai-engagement/clients/{client_id}`
- **Description**: Get complete AI engagement data for a specific client
- **Response**: `AIEngagementDataResponse`

#### Get Department Engagement
- **GET** `/ai-engagement/clients/{client_id}/departments`
- **Description**: Get department engagement data for a specific client
- **Response**: Array of `DepartmentEngagementResponse`

#### Get Application Engagement
- **GET** `/ai-engagement/clients/{client_id}/applications`
- **Description**: Get application engagement data for a specific client
- **Response**: Array of `ApplicationEngagementResponse`

#### Get Agent Engagement
- **GET** `/ai-engagement/clients/{client_id}/agents`
- **Description**: Get agent engagement data for a specific client
- **Response**: Array of `AgentEngagementResponse`

### 4. **Policies Endpoints** (`/policies/`)

#### Get Client Policies
- **GET** `/policies/clients/{client_id}/policies`
- **Description**: Get policies for a specific client
- **Response**: Array of `ClientPolicyResponse`

#### Get Policy Templates
- **GET** `/policies/templates`
- **Description**: Get policy templates
- **Response**: Array of `PolicyTemplateResponse`

### 5. **Reports Endpoints** (`/reports/`)

#### Get Client Compliance Report
- **GET** `/reports/clients/{client_id}/compliance`
- **Description**: Get compliance report for a specific client
- **Response**: `ClientComplianceReportResponse`

#### Get Portfolio Report
- **GET** `/reports/portfolio`
- **Description**: Get portfolio value report for MSP
- **Response**: `PortfolioValueReportResponse`

### 6. **Existing Endpoints**

#### MSP (`/msp/`)
- **GET** `/msp/` - MSP management

#### Auth (`/auth/`)
- **POST** `/auth/login` - User login
- **POST** `/auth/register` - User registration

## Key Changes Made

### 1. **Database Integration**
- All endpoints now fetch data from the database instead of hardcoded responses
- Proper error handling for missing data
- Sample data returned when no database records exist

### 2. **Route Reorganization**
- Moved all dashboard functionality to `/clients/` endpoints
- Created dedicated `/ai-engagement/` endpoints
- Removed separate `/dashboard/` routes

### 3. **Data Fetching**
- **Clients**: Fetches from `Client`, `ClientMetrics`, `ClientAIServices` tables
- **Inventory**: Fetches from `ClientAIServices` table
- **Engagement**: Fetches from `DepartmentEngagement`, `ApplicationEngagement`, `AgentEngagement`, `ProductivityCorrelation` tables
- **Alerts**: Fetches from `Alert` table
- **Policies**: Fetches from `ClientPolicy` table
- **Reports**: Fetches from `ClientComplianceReport`, `PortfolioValueReport` tables

### 4. **Authentication & Authorization**
- All endpoints use `request.state.user` from middleware
- Proper MSP-based access control
- Client ownership verification

## Sample API Calls

### Get All Clients
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/
```

### Get Client Inventory
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/{client_id}/inventory
```

### Get Client Engagement
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/{client_id}/engagement
```

### Get AI Engagement Data
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/ai-engagement/clients/{client_id}
```

### Get Client Alerts
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/{client_id}/alerts
```

### Get Portfolio Totals
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/portfolio-totals
```

## Database Schema Requirements

The API expects the following tables to exist:
- `clients` - Client information
- `client_metrics` - Client dashboard metrics
- `clients_ai_services` - AI services per client
- `alerts` - Security alerts
- `department_engagement` - Department-level engagement data
- `application_engagement` - Application usage data
- `agent_engagement` - AI agent usage data
- `user_engagement` - User-level engagement data
- `productivity_correlations` - Productivity correlation data
- `client_policies` - Client policies
- `client_compliance_reports` - Compliance reports
- `portfolio_value_reports` - Portfolio reports

## Error Handling

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

## Next Steps

1. **Run Migration**: `uv run alembic upgrade head`
2. **Seed Data**: `uv run python scripts/seed_dashboard_data.py`
3. **Start Server**: `uv run uvicorn app.main:app --reload`
4. **Test Endpoints**: Use the provided curl commands or API documentation

All endpoints are now properly integrated with the database and follow the requested route structure!
