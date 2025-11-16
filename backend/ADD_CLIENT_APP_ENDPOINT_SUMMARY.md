# Add Client AI Application Endpoint

## Overview
Created a new endpoint to add AI applications to clients, allowing MSPs to manage their clients' AI service usage.

## New Endpoints

### 1. **POST `/api/v1/clients/{client_id}/ai-applications`**
Add a new AI application to a specific client.

**Request Body:**
```json
{
  "name": "ChatGPT Enterprise",
  "vendor": "OpenAI",
  "type": "Application",
  "status": "Permitted",
  "users": 25,
  "avg_daily_interactions": 150,
  "integrations": ["Slack", "Microsoft Teams"],
  "ai_service_id": "uuid-of-ai-service",
  "risk_tolerance": "Medium",
  "department_restrictions": {
    "allowed_departments": ["Engineering", "Sales"],
    "restricted_departments": ["Finance"]
  },
  "approved_at": "2024-01-15",
  "approved_by": "user-uuid-here"
}
```

**Response:**
```json
{
  "id": "new-app-uuid",
  "name": "ChatGPT Enterprise",
  "vendor": "OpenAI",
  "type": "Application",
  "status": "Permitted",
  "users": 25,
  "avg_daily_interactions": 150,
  "integrations": ["Slack", "Microsoft Teams"],
  "ai_service_id": "uuid-of-ai-service",
  "risk_tolerance": "Medium",
  "department_restrictions": {
    "allowed_departments": ["Engineering", "Sales"],
    "restricted_departments": ["Finance"]
  },
  "approved_at": "2024-01-15",
  "approved_by": "user-uuid-here",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 2. **GET `/api/v1/clients/ai-services`**
Get list of available AI services that can be added to clients.

**Response:**
```json
[
  {
    "id": "ai-service-uuid",
    "name": "ChatGPT",
    "vendor": "OpenAI",
    "category": "Text Generation",
    "risk_level": "Medium",
    "domain_patterns": ["openai.com", "chat.openai.com"],
    "detection_patterns": {...},
    "service_metadata": {...}
  }
]
```

## Features

### **Validation**
-  **Type validation**: Must be "Application" or "Agent"
-  **Status validation**: Must be "Permitted" or "Unsanctioned"
-  **Risk tolerance validation**: Must be "Low", "Medium", "High", or "Critical"
-  **Duplicate prevention**: Checks for existing applications with same name and vendor
-  **Client ownership**: Verifies client belongs to user's MSP
-  **AI service existence**: Verifies the AI service exists and is active

### **Security**
-  **Role-based access**: Only MSP admins and users can add applications
-  **Client verification**: Ensures client belongs to user's MSP
-  **Input sanitization**: Validates all input parameters

### **Data Integrity**
-  **Foreign key constraints**: Links to existing clients and AI services
-  **Required fields**: All essential fields are required
-  **Optional fields**: Integrations, department restrictions, and approval info are optional
-  **UUID handling**: Proper UUID conversion and validation

## Request/Response Models

### **AddClientAIApplicationRequest**
```python
class AddClientAIApplicationRequest(BaseModel):
    name: str                                    # Application name
    vendor: str                                  # Vendor name
    type: str                                    # "Application" or "Agent"
    status: str                                  # "Permitted" or "Unsanctioned"
    users: int = 0                              # Number of users
    avg_daily_interactions: int = 0             # Daily interaction count
    integrations: Optional[List[str]] = []       # Integration list
    ai_service_id: str                          # Reference to AI service
    risk_tolerance: str                         # Risk level
    department_restrictions: Optional[dict] = None  # Department rules
    approved_at: Optional[date] = None          # Approval date
    approved_by: Optional[str] = None           # Approver user ID
```

### **AddClientAIApplicationResponse**
```python
class AddClientAIApplicationResponse(BaseModel):
    id: str                                     # Generated application ID
    name: str                                   # Application name
    vendor: str                                 # Vendor name
    type: str                                   # Application type
    status: str                                 # Permission status
    users: int                                  # User count
    avg_daily_interactions: int                 # Daily interactions
    integrations: List[str]                     # Integration list
    ai_service_id: str                          # AI service reference
    risk_tolerance: str                         # Risk level
    department_restrictions: Optional[dict]     # Department rules
    approved_at: Optional[date]                 # Approval date
    approved_by: Optional[str]                  # Approver ID
    created_at: datetime                        # Creation timestamp
```

## Usage Examples

### **Add a ChatGPT Application**
```bash
curl -X POST "http://localhost:8000/api/v1/clients/{client_id}/ai-applications" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ChatGPT Enterprise",
    "vendor": "OpenAI",
    "type": "Application",
    "status": "Permitted",
    "users": 50,
    "avg_daily_interactions": 200,
    "integrations": ["Slack", "Teams"],
    "ai_service_id": "ai-service-uuid",
    "risk_tolerance": "Medium",
    "department_restrictions": {
      "allowed_departments": ["Engineering", "Sales"]
    }
  }'
```

### **Get Available AI Services**
```bash
curl -X GET "http://localhost:8000/api/v1/clients/ai-services" \
  -H "Authorization: Bearer your-token"
```

## Error Handling

### **400 Bad Request**
- Invalid type (must be "Application" or "Agent")
- Invalid status (must be "Permitted" or "Unsanctioned")
- Invalid risk tolerance (must be "Low", "Medium", "High", or "Critical")

### **403 Forbidden**
- User doesn't have MSP admin or user role

### **404 Not Found**
- Client not found
- AI service not found

### **409 Conflict**
- Application with same name and vendor already exists for client

## Testing

Created `test_add_client_app.py` to verify:
-  Endpoint structure and models
-  AI services endpoint functionality
-  Validation logic
-  Data preparation and testing scenarios

## Integration

The new endpoint integrates with:
-  **Client management**: Links applications to specific clients
-  **AI service catalog**: References available AI services
-  **User management**: Tracks who approved applications
-  **Department filtering**: Supports department restrictions
-  **Risk management**: Includes risk tolerance levels

## Benefits

1. **Centralized Management**: MSPs can manage all client AI applications
2. **Compliance Tracking**: Track approval status and risk levels
3. **Department Control**: Set department-specific restrictions
4. **Integration Support**: Track which systems are integrated
5. **Audit Trail**: Full history of who approved what and when
6. **Validation**: Comprehensive input validation and error handling

The endpoint is now ready for use! 
